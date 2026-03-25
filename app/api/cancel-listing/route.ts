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
  const { listingId } = await req.json();
  if (!listingId) return NextResponse.json({ success: false, error: "Missing listingId" }, { status: 400 });

  // Get listing details
  const { data: listing } = await supabase
    .from("listings")
    .select("id, food_name, business_name, address, status")
    .eq("id", listingId)
    .single();

  if (!listing) return NextResponse.json({ success: false, error: "Listing not found" }, { status: 404 });

  // Mark listing as CANCELLED
  await supabase.from("listings").update({ status: "CANCELLED", reserved_until: null, claim_code: null }).eq("id", listingId);

  // Get ALL active claims for this listing
  const { data: claims } = await supabase
    .from("claims")
    .select("id, first_name, email, confirmation_code")
    .eq("listing_id", listingId)
    .eq("status", "active");

  const foodName = listing.food_name || "food";
  const businessName = listing.business_name || "the business";
  const address = listing.address || "";
  let notified = 0;

  // Email each customer
  for (const claim of claims || []) {
    if (!claim.email) continue;
    await sendEmail(
      claim.email,
      `❌ Listing Cancelled — ${foodName} at ${businessName}`,
      `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
      <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <div style="background:#0a2e1a;padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:800;color:#fff;">🤲 GAWA Loop</p>
            <p style="margin:6px 0 0;font-size:13px;color:#a3c9b0;">Free food. Less waste. Real impact.</p>
          </div>
          <div style="padding:36px 32px;">
            <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#dc2626;">❌ Listing Cancelled</h2>
            <p style="margin:0 0 20px;font-size:15px;color:#374151;">Hi ${claim.first_name || "there"}, we're sorry — the business has cancelled this listing.</p>
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
              <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#0a2e1a;">${foodName}</p>
              <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">📍 ${businessName}</p>
              ${address ? `<p style="margin:0;font-size:13px;color:#9ca3af;">${address}</p>` : ""}
            </div>
            <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
              Don't worry — new listings are posted all the time. Check what's available near you right now!
            </p>
            <div style="text-align:center;">
              <a href="https://gawaloop.com/browse" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">Browse More Free Food</a>
            </div>
          </div>
          <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">gawaloop.com · Free food. Less waste. Real impact.</p>
          </div>
        </div>
      </body></html>`
    );

    // Mark claim as cancelled too
    await supabase.from("claims").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", claim.id);
    notified++;
  }

  // Alert GAWA team
  await sendEmail(
    "jireh@gawaloop.com",
    `🏪 Business Cancelled Listing — ${foodName} at ${businessName}`,
    `<html><body style="font-family:sans-serif;padding:24px;color:#111;">
      <h2>🏪 Business Cancelled a Listing</h2>
      <p><b>Food:</b> ${foodName}</p>
      <p><b>Business:</b> ${businessName}</p>
      <p><b>Customers notified:</b> ${notified}</p>
    </body></html>`
  );

  return NextResponse.json({ success: true, notified });
}
