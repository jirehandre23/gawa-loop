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

  if (!listingId || !firstName || !email) {
    return NextResponse.json({ success: false, error: "Missing required fields: listing_id, first_name, email" }, { status: 400 });
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .eq("status", "AVAILABLE")
    .single();

  if (!listing) {
    return NextResponse.json({ success: false, error: "This listing is no longer available." }, { status: 409 });
  }

  const confirmationCode = String(Math.floor(100000 + Math.random() * 900000));
  const holdMinutes = listing.claim_hold_minutes || 30;
  const reservedUntil = new Date(Date.now() + holdMinutes * 60 * 1000).toISOString();

  const { data: claim, error: claimError } = await supabase
    .from("claims")
    .insert({ listing_id: listingId, first_name: firstName, email, phone, eta_minutes: etaMinutes, confirmation_code: confirmationCode, status: "active" })
    .select().single();

  if (claimError || !claim) {
    return NextResponse.json({ success: false, error: "Failed to create reservation." }, { status: 500 });
  }

  await supabase.from("listings").update({ status: "RESERVED", reserved_until: reservedUntil, claim_code: confirmationCode }).eq("id", listingId);

  const enc = encodeURIComponent(listing.address || "");
  const googleMaps = listing.maps_url || `https://www.google.com/maps/search/?api=1&query=${enc}`;
  const appleMaps  = `https://maps.apple.com/?q=${enc}`;
  const waze       = `https://waze.com/ul?q=${enc}`;
  const cancelUrl  = `https://gawaloop.com/cancel-claim?id=${claim.id}&code=${confirmationCode}`;
  const mapsRow    = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
    <a href="${googleMaps}" style="display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:7px;padding:7px 13px;font-size:13px;font-weight:600;color:#374151;text-decoration:none;">🗺️ Google Maps</a>
    <a href="${appleMaps}" style="display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:7px;padding:7px 13px;font-size:13px;font-weight:600;color:#374151;text-decoration:none;">🍎 Apple Maps</a>
    <a href="${waze}" style="display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:7px;padding:7px 13px;font-size:13px;font-weight:600;color:#374151;text-decoration:none;">🔵 Waze</a>
  </div>`;

  // ✅ Email customer — reservation confirmed
  await sendEmail(email, `✅ Reserved — ${listing.food_name} at ${listing.business_name}`,
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

      <div style="text-align:center;padding-top:16px;border-top:1px solid #f0f0f0;">
        <p style="margin:0 0 10px;font-size:13px;color:#6b7280;">Plans changed?</p>
        <a href="${cancelUrl}" style="display:inline-block;background:#f3f4f6;color:#374151;font-size:13px;font-weight:600;padding:10px 24px;border-radius:8px;text-decoration:none;">Cancel Reservation</a>
      </div>
    `)
  );

  // ✅ Email business — new claim on their listing
  const { data: biz } = await supabase.from("businesses").select("email").eq("name", listing.business_name).single();
  if (biz?.email) {
    await sendEmail(biz.email, `🔔 New Reservation — ${listing.food_name}`,
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
  }

  // ✅ Alert GAWA team
  await sendEmail("jireh@gawaloop.com", `🔔 New Claim — ${listing.food_name} at ${listing.business_name}`,
    emailWrapper(`
      <h2 style="color:#0a2e1a;">New Claim</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600;">Food</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;">${listing.food_name}</td></tr>
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600;">Business</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;">${listing.business_name}</td></tr>
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600;">Customer</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;">${firstName} — ${email}</td></tr>
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600;">Code</td><td style="padding:8px;">${confirmationCode}</td></tr>
      </table>
    `)
  );

  return NextResponse.json({ success: true, code: confirmationCode, claimId: claim.id });
}


