import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailWrapper } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { listingId } = await req.json();
    if (!listingId) return NextResponse.json({ error: "Missing listingId" }, { status: 400 });

    const { data: listing } = await supabase
      .from("listings").select("*").eq("id", listingId).single();
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    const { data: activeClaims } = await supabase
      .from("claims").select("*").eq("listing_id", listingId).eq("status", "active");

    const claims = (activeClaims || []) as any[];

    if (claims.length > 0) {
      await supabase.from("claims").update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      }).eq("listing_id", listingId).eq("status", "active");
    }

    await supabase.from("listings").update({
      status: "CANCELLED",
      quantity_remaining: 0,
    }).eq("id", listingId);

    const emailPromises = claims.map((claim: any) =>
      sendEmail(
        claim.email,
        `Listing cancelled — ${listing.food_name}`,
        emailWrapper(`
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#dc2626;">Listing Cancelled</h2>
          <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${claim.first_name}, the listing you reserved has been cancelled by the business.</p>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px 18px;margin-bottom:20px;">
            <p style="margin:0;font-size:14px;color:#991b1b;">
              Your reservation for <b>${listing.food_name}</b>${claim.quantity_claimed && claim.quantity_claimed > 1 ? ` (${claim.quantity_claimed} portions)` : ""} at ${listing.business_name} has been cancelled. We are sorry for the inconvenience.
            </p>
          </div>
          <a href="https://gawaloop.com/browse" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;">Browse Other Food</a>
        `)
      ).catch(() => {})
    );

    await Promise.allSettled(emailPromises);

    return NextResponse.json({ success: true, notified: claims.length });
  } catch (err) {
    console.error("cancel-listing error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
