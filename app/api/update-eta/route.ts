import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { claimId, userId, eta_minutes } = await req.json();
    if (!claimId || !eta_minutes) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const { data: claim } = await supabase
      .from("claims")
      .select("id, listing_id, status, customer_user_id")
      .eq("id", claimId)
      .maybeSingle();

    if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    if (claim.status !== "active") return NextResponse.json({ error: "Claim is not active" }, { status: 400 });
    if (userId && claim.customer_user_id !== userId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { data: listing } = await supabase
      .from("listings")
      .select("expires_at")
      .eq("id", claim.listing_id)
      .maybeSingle();

    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    const maxEta = Math.floor((new Date(listing.expires_at).getTime() - Date.now()) / 60000);
    if (maxEta <= 0) return NextResponse.json({ error: "This listing has already expired." }, { status: 400 });
    if (eta_minutes > maxEta) {
      return NextResponse.json({ error: `That time exceeds when the listing expires. Max: ${maxEta} min.` }, { status: 400 });
    }

    await supabase.from("claims").update({ eta_minutes }).eq("id", claimId);

    return NextResponse.json({ success: true, eta_minutes });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
