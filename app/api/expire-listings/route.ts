import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  // Accept Vercel cron Authorization header OR manual ?secret= param
  const authHeader = req.headers.get("authorization");
  const secret     = req.nextUrl.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;

  const validVercelCron = authHeader === `Bearer ${cronSecret}`;
  const validManual     = secret === cronSecret;

  if (cronSecret && !validVercelCron && !validManual) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();

  // 1. RESERVED listings whose claim hold time expired → noshow, return to AVAILABLE
  const { data: noShowListings } = await supabase
    .from("listings")
    .select("id, claims(*)")
    .eq("status", "RESERVED")
    .lt("reserved_until", now);

  let noshowCount = 0;
  if (noShowListings && noShowListings.length > 0) {
    for (const listing of noShowListings) {
      const activeClaim = (listing.claims as any[])?.find((c: any) => c.status === "active");
      if (activeClaim) {
        await supabase
          .from("claims")
          .update({ status: "noshow", noshow: true, noshow_at: now })
          .eq("id", activeClaim.id);
      }
      // Return listing to AVAILABLE so it can be claimed again
      await supabase
        .from("listings")
        .update({ status: "AVAILABLE", reserved_until: null, claim_code: null })
        .eq("id", listing.id);
      noshowCount++;
    }
  }

  // 2. AVAILABLE listings whose overall expiry passed → EXPIRED
  const { data: expiredListings, error: expireError } = await supabase
    .from("listings")
    .update({ status: "EXPIRED" })
    .eq("status", "AVAILABLE")
    .lt("expires_at", now)
    .select("id");

  return NextResponse.json({
    success: true,
    noshows_returned: noshowCount,
    expired: expiredListings?.length ?? 0,
    error: expireError?.message ?? null,
    ran_at: now,
  });
}
