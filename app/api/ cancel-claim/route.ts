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
      body: JSON.stringify({
        from: "GAWA Loop <noreply@gawaloop.com>",
        to,
        subject,
        html,
      }),
    });
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const claimId = searchParams.get("id");
  const code = searchParams.get("code");

  if (!claimId || !code) {
    return NextResponse.json({ success: false, error: "Missing id or code." }, { status: 400 });
  }

  // 1. Fetch claim + its listing in one query
  const { data: claim, error: claimError } = await supabase
    .from("claims")
    .select(`
      id, status, first_name, email, confirmation_code, listing_id,
      listings (
        id, business_name, food_name, address, status,
        expires_at, listing_expires_at
      )
    `)
    .eq("id", claimId)
    .eq("confirmation_code", code)
    .single();

  if (claimError || !claim) {
    return NextResponse.json(
      { success: false, error: "Reservation not found. Link may be invalid or expired." },
      { status: 404 }
    );
  }

  // 2. Already cancelled?
  if (claim.status === "cancelled") {
    return NextResponse.json({
      success: false,
      already: true,
      food: (claim.listings as any)?.food_name,
      business: (claim.listings as any)?.business_name,
    });
  }

  const listing = claim.listings as any;
  const now = new Date();

  // 3. Check if listing is still within business active window
  const expiryTime = listing?.expires_at
    ? new Date(listing.expires_at)
    : listing?.listing_expires_at
    ? new Date(listing.listing_expires_at)
    : null;

  const stillActive = !expiryTime || expiryTime > now;

  // 4. Cancel the claim
  const { error: cancelError } = await supabase
    .from("claims")
    .update({ status: "cancelled", cancelled_at: now.toISOString() })
    .eq("id", claimId);

  if (cancelError) {
    return NextResponse.json(
      { success: false, error: "Failed to cancel. Please try again." },
      { status: 500 }
    );
  }

  // 5. Release listing back based on business timeline
  if (listing) {
    if (stillActive) {
      // Still within window → put back as AVAILABLE so others can claim
      await supabase
        .from("listings")
        .update({ status: "AVAILABLE", reserved_until: null, claim_code: null })
        .eq("id", listing.id)
        .in("status", ["RESERVED", "AVAILABLE"]);
    } else {
      // Window passed → mark EXPIRED, never override PICKED_UP
      await supabase
        .from("listings")
        .update({ status: "EXPIRED", reserved_until: null })
        .eq("id", listing.id)
        .neq("status", "PICKED_UP");
    }
  }

  const customerName = claim.first_name || "Customer";
  const foodName = listing?.food_name || "food";
  const businessName = listing?.business_name || "the business";
  const address = listing?.address || "";

  // 6. Get business email from businesses table
  const { data: bizData } = await supabase
    .from("businesses")
    .select("email")
    .eq("name", businessName)
    .single();

  const businessEmail = bizData?.email || null;

  // 7. Email the customer — cancellation confirmed
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
              ${stillActive
                ? "The listing has been released and is now available for someone else to claim."
                : "The pickup window for this listing has passed."}
              Check out more free food near you!
            </p>
            <div style="text-align:center;">
              <a href="https://gawaloop.com/browse" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">
                Browse More Free Food
              </a>
            </div>
          </div>
          <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">gawaloop.com · Free food. Less waste. Real impact.</p>
          </div>
        </div>
      </body></html>`
    );
  }

  // 8. Email the BUSINESS OWNER — notify them of cancellation
  if (businessEmail) {
    await sendEmail(
      businessEmail,
      `⚠️ Reservation Cancelled — ${foodName}`,
      `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
      <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <div style="background:#0a2e1a;padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:800;color:#fff;">🤲 GAWA Loop</p>
            <p style="margin:6px 0 0;font-size:13px;color:#a3c9b0;">Business Notification</p>
          </div>
          <div style="padding:36px 32px;">
            <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1a1a1a;">⚠️ Reservation Cancelled</h2>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;">A customer has cancelled their reservation for your listing.</p>
            <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
              <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#0a2e1a;">${foodName}</p>
              <p style="margin:2px 0;font-size:14px;color:#374151;"><b>Cancelled by:</b> ${customerName}</p>
              <p style="margin:2px 0;font-size:14px;color:#374151;"><b>Customer email:</b> ${claim.email || "N/A"}</p>
              <p style="margin:2px 0;font-size:14px;color:#374151;"><b>Confirmation code:</b> ${claim.confirmation_code || "N/A"}</p>
            </div>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 24px;margin-bottom:24px;">
              <p style="margin:0;font-size:14px;color:#166534;font-weight:600;">
                ${stillActive
                  ? "✅ Your listing has been automatically released and is now AVAILABLE for others to claim."
                  : "⏰ The listing window has passed — it has been marked as expired."}
              </p>
            </div>
            <div style="text-align:center;">
              <a href="https://gawaloop.com/business/dashboard" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">
                View Your Dashboard
              </a>
            </div>
          </div>
          <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">gawaloop.com · Free food. Less waste. Real impact.</p>
          </div>
        </div>
      </body></html>`
    );
  }

  // 9. Alert GAWA Loop team
  await sendEmail(
    "jireh@gawaloop.com",
    `⚠️ Cancellation — ${foodName} at ${businessName}`,
    `<html><body style="font-family:sans-serif;padding:24px;color:#1a1a1a;">
      <h2 style="color:#dc2626;">⚠️ Reservation Cancelled</h2>
      <table style="border-collapse:collapse;width:100%;font-size:14px;">
        <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;width:160px;">Customer</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${customerName}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;">Customer Email</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${claim.email || "N/A"}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;">Food</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${foodName}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;">Business</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${businessName}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;">Business Email</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${businessEmail || "not found"}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;">Listing Status</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${stillActive ? "✅ Released back to AVAILABLE" : "⏰ Expired — not re-listed"}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;">Claim ID</td><td style="padding:8px 12px;">${claimId}</td></tr>
      </table>
    </body></html>`
  );

  return NextResponse.json({
    success: true,
    food: foodName,
    business: businessName,
    relisted: stillActive,
  });
}
