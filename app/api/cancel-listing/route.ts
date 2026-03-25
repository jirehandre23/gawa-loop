import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailWrapper } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { listingId } = await req.json();
  if (!listingId) return NextResponse.json({ success: false, error: "Missing listingId" }, { status: 400 });

  const { data: listing } = await supabase.from("listings").select("*").eq("id", listingId).single();
  if (!listing) return NextResponse.json({ success: false, error: "Listing not found" }, { status: 404 });

  await supabase.from("listings").update({ status: "CANCELLED", reserved_until: null, claim_code: null }).eq("id", listingId);

  const { data: claims } = await supabase.from("claims").select("id, first_name, email, confirmation_code").eq("listing_id", listingId).eq("status", "active");

  const foodName     = listing.food_name || "food";
  const businessName = listing.business_name || "the business";
  let notified = 0;

  for (const claim of claims || []) {
    if (!claim.email) continue;
    await supabase.from("claims").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", claim.id);

    // ✅ Email each customer — business cancelled
    await sendEmail(claim.email, `❌ Listing Cancelled — ${foodName} at ${businessName}`,
      emailWrapper(`
        <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;">Listing Cancelled</h2>
        <p style="margin:0 0 20px;font-size:15px;color:#6b7280;">Hi ${claim.first_name || "there"}, unfortunately the business has cancelled this listing.</p>

        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
          <p style="margin:0 0 6px;font-size:16px;font-weight:800;color:#0a2e1a;">${foodName}</p>
          <p style="margin:2px 0;font-size:14px;color:#374151;">🏪 ${businessName}</p>
          ${listing.address ? `<p style="margin:2px 0;font-size:14px;color:#374151;">📍 ${listing.address}</p>` : ""}
        </div>

        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px;">
          Don't worry — new listings are posted all the time. Check what else is available near you!
        </p>

        <div style="text-align:center;">
          <a href="https://gawaloop.com/browse" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:15px;padding:13px 32px;border-radius:12px;text-decoration:none;">Browse More Free Food</a>
        </div>
      `)
    );
    notified++;
  }

  // ✅ Alert GAWA team
  await sendEmail("jireh@gawaloop.com", `🏪 Business Cancelled — ${foodName} at ${businessName}`,
    emailWrapper(`
      <h2 style="color:#dc2626;">Business Cancelled a Listing</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600;">Food</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;">${foodName}</td></tr>
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600;">Business</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;">${businessName}</td></tr>
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600;">Customers notified</td><td style="padding:8px;">${notified}</td></tr>
      </table>
    `)
  );

  return NextResponse.json({ success: true, notified });
}


