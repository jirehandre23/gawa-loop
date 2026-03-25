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

  await supabase.from("listings").update({ status: "PICKED_UP" }).eq("id", listingId);

  const { data: claim } = await supabase.from("claims").select("*").eq("listing_id", listingId).eq("status", "active").single();

  const foodName     = listing.food_name || "food";
  const businessName = listing.business_name || "the business";

  // ✅ Email customer — thank you!
  if (claim?.email) {
    await sendEmail(claim.email, `🎉 Enjoy your food! — ${foodName} from ${businessName}`,
      emailWrapper(`
        <h2 style="margin:0 0 4px;font-size:24px;font-weight:800;color:#111827;">🎉 Enjoy your meal!</h2>
        <p style="margin:0 0 20px;font-size:15px;color:#6b7280;">Hi ${claim.first_name || "there"}, your pickup has been confirmed. Thank you!</p>

        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
          <p style="margin:0 0 6px;font-size:16px;font-weight:800;color:#0a2e1a;">${foodName}</p>
          <p style="margin:2px 0;font-size:14px;color:#374151;">🏪 ${businessName}</p>
        </div>

        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px;">
          By claiming this food, you helped reduce waste and supported your local community. 🌍<br/>
          Check back soon for more free food near you!
        </p>

        <div style="text-align:center;">
          <a href="https://gawaloop.com/browse" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:15px;padding:13px 32px;border-radius:12px;text-decoration:none;">Browse More Free Food</a>
        </div>
      `)
    );
  }

  return NextResponse.json({ success: true });
}

