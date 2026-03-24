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
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: "GAWA Loop <noreply@gawaloop.com>", to, subject, html }),
    });
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const claimId = searchParams.get("id");
  const code    = searchParams.get("code");

  if (!claimId || !code) {
    return NextResponse.json({ success: false, error: "Missing id or code." }, { status: 400 });
  }

  // Fetch claim + listing
  const { data: claim, error } = await supabase
    .from("claims")
    .select("id, status, first_name, email, confirmation_code, listing_id, listings(id, business_name, food_name, address, status, expires_at, listing_expires_at)")
    .eq("id", claimId)
    .eq("confirmation_code", code)
    .single();

  if (error || !claim) {
    return NextResponse.json({ success: false, error: "Reservation not found." }, { status: 404 });
  }

  // Already cancelled?
  if (claim.status === "cancelled") {
    return NextResponse.json({ success: false, already: true, food: (claim.listings as any)?.food_name, business: (claim.listings as any)?.business_name });
  }

  const listing = claim.listings as any;
  const now = new Date();

  // Check business timeline — use expires_at first, fall back to listing_expires_at
  const expiryTime = listing?.expires_at
    ? new Date(listing.expires_at)
    : listing?.listing_expires_at
    ? new Date(listing.listing_expires_at)
    : null;

  const stillActive = !expiryTime || expiryTime > now;

  // Cancel the claim
  const { error: cancelError } = await supabase
    .from("claims")
    .update({ status: "cancelled", cancelled_at: now.toISOString() })
    .eq("id", claimId);

  if (cancelError) {
    return NextResponse.json({ success: false, error: "Failed to cancel. Please try again." }, { status: 500 });
  }

  // Release listing based on timeline
  if (listing) {
    if (stillActive) {
      // Still within business window → put back as AVAILABLE
      await supabase
        .from("listings")
        .update({ status: "AVAILABLE", reserved_until: null, claim_code: null })
        .eq("id", listing.id)
        .in("status", ["RESERVED", "AVAILABLE"]);
    } else {
      // Business window has passed → mark EXPIRED, do not relist
      await supabase
        .from("listings")
        .update({ status: "EXPIRED", reserved_until: null })
        .eq("id", listing.id)
        .neq("status", "PICKED_UP");
    }
  }

  const customerName = claim.first_name || "Customer";
  const foodName     = listing?.food_name     || "food";
  const businessName = listing?.business_name || "the business";
  const address      = listing?.address       || "";

  // Email customer
  if (claim.email) {
    await sendEmail(
      claim.email,
      `Reservation Cancelled — ${foodName} at ${businessName}`,
      `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
      <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <div style="background:#0a2e1a;padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:800;color:#fff;">🤲 GAWA Loop</p>
            <p style="margin:6px 0 0;font-size:13px;color:#a3c9b0;">Free food. Less waste. Real impact.</p>
          </div>
          <div style="padding:36px 32px;">
            <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1a1a1a;">Reservation Cancelled</h2>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Hi ${customerName}, your reservation has been cancelled.</p>
            <div style="background:#f9fafb;border-radius:12px;padding:20px 24px;margin-bottom:24px;border:1px solid #e5e7eb;">
              <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#0a2e1a;">${foodName}</p>
              <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">📍 ${businessName}</p>
              ${address ? `<p style="margin:0;font-size:13px;color:#9ca3af;">${address}</p>` : ""}
            </div>
            <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
              ${stillActive ? "The food listing has been released and is now available for someone else." : "The pickup window for this listing has passed."}
              Check out what else is available near you!
            </p>
            <div style="text-align:center;">
              <a href="https://gawaloop.com/browse" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">
                Browse More Free Food
              </a>
            </div>
          </div>
          <div style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">gawaloop.com · Free food. Less waste. Real impact.</p>
          </div>
        </div>
      </body></html>`
    );
  }

  // Alert GAWA Loop team
  await sendEmail(
    "jireh@gawaloop.com",
    `⚠️ Reservation Cancelled — ${foodName} at ${businessName}`,
    `<html><body style="font-family:sans-serif;padding:24px;color:#1a1a1a;">
      <h2 style="color:#dc2626;">⚠️ Reservation Cancelled</h2>
      <table style="border-collapse:collapse;width:100%;font-size:14px;">
        <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;width:160px;">Customer</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${customerName}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;">Email</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${claim.email||"N/A"}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;">Food</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${foodName}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;">Business</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${businessName}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;">Listing</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${stillActive?"✅ Released back to AVAILABLE":"⏰ Window passed — marked EXPIRED"}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;">Claim ID</td><td style="padding:8px 12px;">${claimId}</td></tr>
      </table>
    </body></html>`
  );

  return NextResponse.json({ success: true, food: foodName, business: businessName, relisted: stillActive });
}
