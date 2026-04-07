import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  // Protect the endpoint so only Vercel cron can call it
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();

  // Find all RESERVED listings that have passed their expiry time
  const { data: expiredListings, error: fetchError } = await supabase
    .from("listings")
    .select("id")
    .eq("status", "RESERVED")
    .or(`listing_expires_at.lt.${now},expires_at.lt.${now}`);

  if (fetchError) {
    console.error("expire-listings fetch error:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!expiredListings || expiredListings.length === 0) {
    return NextResponse.json({ expired: 0, message: "Nothing to expire" });
  }

  const ids = expiredListings.map((l: { id: string }) => l.id);

  // Mark listings as EXPIRED
  const { error: updateError } = await supabase
    .from("listings")
    .update({ status: "EXPIRED" })
    .in("id", ids);

  if (updateError) {
    console.error("expire-listings update error:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Cancel any active claims on those listings
  await supabase
    .from("claims")
    .update({ status: "cancelled", cancelled_at: now })
    .in("listing_id", ids)
    .eq("status", "active");

  console.log(`Expired ${ids.length} listings`);
  return NextResponse.json({ expired: ids.length, listing_ids: ids });
}
