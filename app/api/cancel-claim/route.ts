import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY!);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const claimId  = searchParams.get("id");
  const code     = searchParams.get("code");

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
        expires_at, listing_expires_at, reserved_until, claim_hold_minutes
      )
    `)
    .eq("id", claimId)
    .eq("confirmation_code", code)
    .single();

  if (claimError || !claim) {
    return NextResponse.json(
      { success: false, error: "Reservation not found. The link may be invalid or expired." },
      { status: 404 }
    );
  }

  // 2. Already cancelled?
  if (claim.status === "cancelled") {
    return NextResponse.json({
      success: false,
      already: true,
      food: claim.listings?.food_name,
      business: claim.listings?.business_name,
    });
  }

  const listing = claim.listings as any;
  const now = new Date();

  // 3. Determine the expiry time — use expires_at if set, else listing_expires_at
  const expiryTime = listing?.expires_at
    ? new Date(listing.expires_at)
    : listing?.listing_expires_at
    ? new Date(listing.listing_expires_at)
    : null;

  // 4. Is the listing still within the business's active window?
  const stillActive = !expiryTime || expiryTime > now;

  // 5. Cancel the claim
  const { error: cancelError } = await supabase
    .from("claims")
    .update({
      status: "cancelled",
      cancelled_at: now.toISOString(),
    })
    .eq("id", claimId);

  if (cancelError) {
    return NextResponse.json(
      { success: false, error: "Failed to cancel. Please try again." },
      { status: 500 }
    );
  }

  // 6. Release listing back based on timeline
  if (listing) {
    if (stillActive) {
      // Listing is still within the business window — put it back as AVAILABLE
      await supabase
        .from("listings")
        .update({
          status: "AVAILABLE",
          reserved_until: null,
          claim_code: null,
        })
        .eq("id", listing.id)
        .in("status", ["RESERVED", "AVAILABLE"]); // safety: only update if not already PICKED_UP
    } else {
      // Listing window has passed — mark as EXPIRED, don't resurface it
      await supabase
        .from("listings")
        .update({
          status: "EXPIRED",
          reserved_until: null,
        })
        .eq("id", listing.id)
        .not("status", "eq", "PICKED_UP"); // never override PICKED_UP
    }
  }

  const customerName = claim.first_name || "Customer";
  const foodName     = listing?.food_name     || "food";
  const businessName = listing?.business_name || "the business";
  const address      = listing?.address       || "";

  // 7. Email the customer — cancellation confirmation
  if (claim.email) {
    await resend.emails.send({
      from: "GAWA Loop <noreply@gawaloop.com>",
      to: claim.email,
      subject: `Reservation Cancelled — ${foodName} at ${businessName}`,
      html: `
        <!DOCTYPE html>
        <html><head><meta charset="UTF-8"></head>
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
                <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:1px;">Cancelled Item</p>
                <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#0a2e1a;">${foodName}</p>
                <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">📍 ${businessName}</p>
                ${address ? `<p style="margin:0;font-size:13px;color:#9ca3af;">${address}</p>` : ""}
              </div>
              ${stillActive
                ? `<p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
                    The food listing has been released and is now available for someone else in the community to claim.
                    There's always more free food available — check what's near you!
                   </p>`
                : `<p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
                    The pickup window for this listing has passed, so it will not be re-listed.
                    Check out what's available now!
                   </p>`
              }
              <div style="text-align:center;">
                <a href="https://gawaloop.com/browse"
                   style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">
                  Browse More Free Food
                </a>
              </div>
            </div>
            <div style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">gawaloop.com · Free food. Less waste. Real impact.</p>
            </div>
          </div>
        </body></html>
      `,
    }).catch(() => {}); // don't fail the request if email fails
  }

  // 8. Alert GAWA Loop team
  await resend.emails.send({
    from: "GAWA Loop <noreply@gawaloop.com>",
    to: "jireh@gawaloop.com",
    subject: `⚠️ Reservation Cancelled — ${foodName} at ${businessName}`,
    html: `
      <!DOCTYPE html>
      <html><body style="font-family:sans-serif;padding:24px;color:#1a1a1a;">
        <h2 style="color:#dc2626;">⚠️ Reservation Cancelled</h2>
        <p>A customer just cancelled their reservation.</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;width:160px;">Customer</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${customerName}</td></tr>
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;">Email</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${claim.email || "N/A"}</td></tr>
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;">Food</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${foodName}</td></tr>
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;">Business</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${businessName}</td></tr>
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;">Address</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${address}</td></tr>
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;">Listing Status</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${stillActive ? "✅ Released back to AVAILABLE" : "⏰ Expired — not re-listed"}</td></tr>
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;">Claim ID</td><td style="padding:8px 12px;">${claimId}</td></tr>
        </table>
      </body></html>
    `,
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    food: foodName,
    business: businessName,
    relisted: stillActive,
  });
}
