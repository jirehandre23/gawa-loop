import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function sendEmail(to: string, subject: string, html: string) {
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: "GAWA Loop <noreply@gawaloop.com>", to, subject, html }),
    });
  } catch (_) {}
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Accept both snake_case and camelCase field names
  const listingId  = body.listing_id  || body.listingId;
  const firstName  = body.first_name  || body.firstName;
  const email      = body.email;
  const phone      = body.phone       || null;
  const etaMinutes = Number(body.eta_minutes ?? body.etaMinutes ?? 15);

  if (!listingId || !firstName || !email) {
    return NextResponse.json(
      { success: false, error: "Missing required fields: listing_id, first_name, email" },
      { status: 400 }
    );
  }

  // Check listing is still available
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .eq("status", "AVAILABLE")
    .single();

  if (listingError || !listing) {
    return NextResponse.json(
      { success: false, error: "This listing is no longer available." },
      { status: 409 }
    );
  }

  // Generate 6-digit confirmation code
  const confirmationCode = String(Math.floor(100000 + Math.random() * 900000));

  // Calculate reserved_until from claim_hold_minutes
  const holdMinutes = listing.claim_hold_minutes || 30;
  const reservedUntil = new Date(Date.now() + holdMinutes * 60 * 1000).toISOString();

  // Create the claim
  const { data: claim, error: claimError } = await supabase
    .from("claims")
    .insert({
      listing_id:        listingId,
      first_name:        firstName,
      email:             email,
      phone:             phone,
      eta_minutes:       etaMinutes,
      confirmation_code: confirmationCode,
      status:            "active",
    })
    .select()
    .single();

  if (claimError || !claim) {
    return NextResponse.json(
      { success: false, error: "Failed to create reservation. Please try again." },
      { status: 500 }
    );
  }

  // Update listing to RESERVED
  await supabase
    .from("listings")
    .update({
      status:        "RESERVED",
      reserved_until: reservedUntil,
      claim_code:    confirmationCode,
    })
    .eq("id", listingId);

  // Build maps links from address
  const encoded = encodeURIComponent(listing.address || "");
  const googleMaps = listing.maps_url || `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  const appleMaps  = `https://maps.apple.com/?q=${encoded}`;
  const waze       = `https://waze.com/ul?q=${encoded}`;

  // Cancel link
  const cancelUrl = `https://gawaloop.com/cancel-claim?id=${claim.id}&code=${confirmationCode}`;

  // Email the customer
  await sendEmail(
    email,
    `✅ Reservation Confirmed — ${listing.food_name} at ${listing.business_name}`,
    `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="max-width:540px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <div style="background:#0a2e1a;padding:28px 32px;text-align:center;">
          <p style="margin:0;font-size:22px;font-weight:800;color:#fff;">🤲 GAWA Loop</p>
          <p style="margin:6px 0 0;font-size:13px;color:#a3c9b0;">Free food. Less waste. Real impact.</p>
        </div>
        <div style="padding:36px 32px;">
          <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111;">✅ You're confirmed!</h2>
          <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Hi ${firstName}, your reservation is ready.</p>

          <div style="background:#f0fdf4;border:2px solid #16a34a;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
            <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Your confirmation code</p>
            <p style="margin:0;font-size:48px;font-weight:900;color:#16a34a;letter-spacing:8px;">${confirmationCode}</p>
            <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;">Show this code when you pick up</p>
          </div>

          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
            <p style="margin:0 0 6px;font-size:17px;font-weight:800;color:#0a2e1a;">${listing.food_name}</p>
            <p style="margin:0 0 4px;font-size:14px;color:#374151;">🏪 ${listing.business_name}</p>
            <p style="margin:0 0 4px;font-size:14px;color:#374151;">📍 ${listing.address || ""}</p>
            <p style="margin:0 0 4px;font-size:14px;color:#374151;">⏱ Please arrive within ${etaMinutes} minutes</p>
            <p style="margin:0;font-size:14px;color:#374151;">🔒 Held for you until ${new Date(reservedUntil).toLocaleTimeString()}</p>
          </div>

          <div style="margin-bottom:20px;">
            <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#374151;">Get directions:</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <a href="${googleMaps}" style="display:inline-block;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;color:#374151;text-decoration:none;">🗺️ Google Maps</a>
              <a href="${appleMaps}" style="display:inline-block;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;color:#374151;text-decoration:none;">🍎 Apple Maps</a>
              <a href="${waze}" style="display:inline-block;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;color:#374151;text-decoration:none;">🔵 Waze</a>
            </div>
          </div>

          <div style="text-align:center;padding-top:16px;border-top:1px solid #f0f0f0;">
            <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Plans changed?</p>
            <a href="${cancelUrl}" style="display:inline-block;background:#f3f4f6;color:#374151;font-size:13px;font-weight:600;padding:10px 24px;border-radius:8px;text-decoration:none;">Cancel Reservation</a>
          </div>
        </div>
        <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">gawaloop.com · Free food. Less waste. Real impact.</p>
        </div>
      </div>
    </body></html>`
  );

  return NextResponse.json({ success: true, code: confirmationCode, claimId: claim.id });
}

