import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailWrapper } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();

  const listingId  = body.listing_id  || body.listingId;
  const firstName  = body.first_name  || body.firstName;
  const email      = body.email;
  const phone      = body.phone       || null;
  const etaMinutes = Number(body.eta_minutes ?? body.etaMinutes ?? 15);
  const customerUserId = body.customer_user_id || null;

  if (!listingId || !firstName || !email) {
    return NextResponse.json(
      { success: false, error: "Missing required fields: listing_id, first_name, email" },
      { status: 400 }
    );
  }

  // CHECK SUSPENSION — block if customer is currently suspended
  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("suspended_until, noshow_count")
    .eq("email", email.trim().toLowerCase())
    .single();

  if (profile?.suspended_until && new Date(profile.suspended_until) > new Date()) {
    const resumeDate = new Date(profile.suspended_until).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric"
    });
    return NextResponse.json({
      success: false,
      error: `Your account is suspended until ${resumeDate} due to missed pickups. You can claim food again after that date.`,
    }, { status: 403 });
  }

  // ATOMIC CLAIM — race-condition safe
  const { data: claimResult, error: claimError } = await supabase.rpc("claim_listing", {
    p_listing_id:       listingId,
    p_first_name:       firstName.trim(),
    p_email:            email.trim().toLowerCase(),
    p_phone:            phone?.trim() || "",
    p_eta_minutes:      etaMinutes,
    p_customer_user_id: customerUserId,
  });

  if (claimError) {
    console.error("claim_listing rpc error:", claimError.message);
    return NextResponse.json(
      { success: false, error: "Failed to reserve. Please try again." },
      { status: 500 }
    );
  }

  if (!claimResult.success) {
    return NextResponse.json(
      { success: false, error: claimResult.error },
      { status: 409 }
    );
  }

  const confirmationCode = claimResult.confirmation_code;
  const claimId          = claimResult.claim_id;
  const reservedUntil    = claimResult.reserved_until;

  // Fetch listing details for emails
  const { data: listing } = await supabase
    .from("listings")
    .select("food_name, business_name, address, maps_url, claim_hold_minutes")
    .eq("id", listingId)
    .single();

  // ✅ RESPOND IMMEDIATELY
  const response = NextResponse.json({ success: true, code: confirmationCode, confirmation_code: confirmationCode, claimId });

  if (listing) {
    const enc        = encodeURIComponent(listing.address || "");
    const googleMaps = listing.maps_url || `https://www.google.com/maps/search/?api=1&query=${enc}`;
    const appleMaps  = `https://maps.apple.com/?q=${enc}`;
    const waze       = `https://waze.com/ul?q=${enc}`;
    const cancelUrl  = `https://gawaloop.com/cancel-claim?id=${claimId}&code=${confirmationCode}`;
    const mapsRow    = `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
        <a href="${googleMaps}" style="display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:7px;padding:7px 13px;font-size:13px;font-weight:600;color:#374151;text-decoration:none;">🗺️ Google Maps</a>
        <a href="${appleMaps}"  style="display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:7px;padding:7px 13px;font-size:13px;font-weight:600;color:#374151;text-decoration:none;">🍎 Apple Maps</a>
        <a href="${waze}"      style="display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:7px;padding:7px 13px;font-size:13px;font-weight:600;color:#374151;text-decoration:none;">🔵 Waze</a>
      </div>`;

    Promise.all([
      sendEmail(email, `✅ Reserved — ${listing.food_name} at ${listing.business_name}`,
        emailWrapper(`
          <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;">You're confirmed!</h2>
          <p style="margin:0 0 20px;font-size:15px;color:#6b7280;">Hi ${firstName}, your reservation is ready.</p>
          <div style="background:#f0fdf4;border:2px solid #16a34a;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center;">
            <p style="margin:0 0 4px;font-size:13px;color:#6b7280;font-weight:600;">YOUR CODE</p>
            <p style="margin:0;font-size:52px;font-weight:900;color:#16a34a;letter-spacing:8px;">${confirmationCode}</p>
            <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;">Show this at pickup</p>
          </div>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
            <p style="margin:0 0 6px;font-size:17px;font-weight:800;color:#0a2e1a;">${listing.food_name}</p>
            <p style="margin:2px 0;font-size:14px;color:#374151;">🏪 <b>${listing.business_name}</b></p>
            <p style="margin:2px 0;font-size:14px;color:#374151;">📍 ${listing.address || ""}</p>
            <p style="margin:2px 0;font-size:14px;color:#374151;">⏱ Arrive within <b>${etaMinutes} minutes</b></p>
            <p style="margin:2px 0;font-size:14px;color:#374151;">🔒 Held until <b>${new Date(reservedUntil).toLocaleTimeString()}</b></p>
            ${mapsRow}
          </div>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin-bottom:20px;">
            <p style="margin:0;font-size:13px;color:#92400e;">📬 <b>Don't see this email?</b> Check your spam folder.</p>
          </div>
          <div style="text-align:center;padding-top:16px;border-top:1px solid #f0f0f0;">
            <p style="margin:0 0 10px;font-size:13px;color:#6b7280;">Plans changed?</p>
            <a href="${cancelUrl}" style="display:inline-block;background:#f3f4f6;color:#374151;font-size:13px;font-weight:600;padding:10px 24px;border-radius:8px;text-decoration:none;">Cancel Reservation</a>
          </div>
        `)
      ),
      supabase.from("businesses").select("email").eq("name", listing.business_name).single().then(({ data: biz }) => {
        if (biz?.email) return sendEmail(biz.email, `🔔 New Reservation — ${listing.food_name}`,
          emailWrapper(`
            <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;">New reservation!</h2>
            <p style="margin:0 0 20px;font-size:15px;color:#6b7280;">A customer just reserved your listing.</p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
              <p style="margin:0 0 8px;font-size:16px;font-weight:800;color:#0a2e1a;">${listing.food_name}</p>
              <p style="margin:2px 0;font-size:14px;color:#374151;"><b>Customer:</b> ${firstName}</p>
              <p style="margin:2px 0;font-size:14px;color:#374151;"><b>Email:</b> ${email}</p>
              ${phone ? `<p style="margin:2px 0;font-size:14px;color:#374151;"><b>Phone:</b> ${phone}</p>` : ""}
              <p style="margin:2px 0;font-size:14px;color:#374151;"><b>ETA:</b> ${etaMinutes} minutes</p>
              <p style="margin:2px 0;font-size:14px;color:#374151;"><b>Code:</b> <span style="font-weight:900;font-size:18px;color:#16a34a;letter-spacing:3px;">${confirmationCode}</span></p>
            </div>
            <div style="text-align:center;">
              <a href="https://gawaloop.com/business/dashboard" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">View Dashboard</a>
            </div>
          `)
        );
      }),
      sendEmail("jireh@gawaloop.com", `🔔 New Claim — ${listing.food_name} at ${listing.business_name}`,
        emailWrapper(`
          <h2 style="color:#0a2e1a;">New Claim</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:8px;background:#f9fafb;font-weight:600;">Food</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;">${listing.food_name}</td></tr>
            <tr><td style="padding:8px;background:#f9fafb;font-weight:600;">Business</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;">${listing.business_name}</td></tr>
            <tr><td style="padding:8px;background:#f9fafb;font-weight:600;">Customer</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;">${firstName} — ${email}</td></tr>
            <tr><td style="padding:8px;background:#f9fafb;font-weight:600;">Code</td><td style="padding:8px;">${confirmationCode}</td></tr>
          </table>
        `)
      ),
    ]).catch(() => {});
  }

  return response;
}
