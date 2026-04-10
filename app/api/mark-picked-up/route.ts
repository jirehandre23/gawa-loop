import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailWrapper } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { listingId, claimId, confirmationCode } = await req.json();
    if (!listingId) return NextResponse.json({ error: "Missing listingId" }, { status: 400 });

    const { data: listing } = await supabase
      .from("listings").select("*").eq("id", listingId).single();
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    // ── Mode 1: Mark a specific claim by claimId (per-claim manual pickup) ──
    if (claimId) {
      const { data: claim } = await supabase
        .from("claims").select("*").eq("id", claimId).single();
      if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

      // If a code was provided, verify it
      if (confirmationCode && confirmationCode.trim()) {
        const trimmedCode = confirmationCode.trim().toUpperCase();
        if (claim.confirmation_code?.toUpperCase() !== trimmedCode) {
          return NextResponse.json({ error: "Invalid code. Please check and try again.", codeInvalid: true }, { status: 400 });
        }
      }

      await supabase.from("claims").update({ status: "picked_up" }).eq("id", claimId);

      // Check if all active claims on this listing are now done
      const { data: remaining } = await supabase
        .from("claims").select("id").eq("listing_id", listingId).eq("status", "active");

      if (!remaining || remaining.length === 0) {
        await supabase.from("listings").update({ status: "PICKED_UP" }).eq("id", listingId);
      }

      sendEmail(
        claim.email,
        `Pickup confirmed — ${listing.food_name}`,
        emailWrapper(`
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Pickup Confirmed!</h2>
          <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${claim.first_name}, your pickup has been confirmed. Thank you for helping reduce food waste!</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
            <p style="margin:0;font-size:14px;color:#166534;">
              ${claim.quantity_claimed && claim.quantity_claimed > 1 ? `You picked up <b>${claim.quantity_claimed} portions</b> of ` : ""}<b>${listing.food_name}</b> from ${listing.business_name}.
            </p>
          </div>
          <a href="https://gawaloop.com/browse" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;">Browse More Free Food</a>
        `)
      ).catch(() => {});

      return NextResponse.json({
        success: true,
        verified: !!confirmationCode,
        claimerName: claim.first_name,
        quantityClaimed: claim.quantity_claimed || 1,
        listingPickedUp: !remaining || remaining.length === 0,
      });
    }

    // ── Mode 2: Legacy — mark by confirmationCode (no claimId provided) ──
    const { data: activeClaims } = await supabase
      .from("claims").select("*").eq("listing_id", listingId).eq("status", "active");
    const claims = (activeClaims || []) as any[];

    if (confirmationCode && confirmationCode.trim()) {
      const trimmedCode = confirmationCode.trim().toUpperCase();
      const matchingClaim = claims.find(
        (c: any) => c.confirmation_code?.toUpperCase() === trimmedCode
      );
      if (!matchingClaim) {
        return NextResponse.json({ error: "Invalid code. Please check and try again.", codeInvalid: true }, { status: 400 });
      }

      await supabase.from("claims").update({ status: "picked_up" }).eq("id", matchingClaim.id);

      const { data: remainingActive } = await supabase
        .from("claims").select("id").eq("listing_id", listingId).eq("status", "active");

      if (!remainingActive || remainingActive.length === 0) {
        await supabase.from("listings").update({ status: "PICKED_UP" }).eq("id", listingId);
      }

      sendEmail(
        matchingClaim.email,
        `Pickup confirmed — ${listing.food_name}`,
        emailWrapper(`
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Pickup Confirmed!</h2>
          <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${matchingClaim.first_name}, your pickup has been confirmed. Thank you!</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
            <p style="margin:0;font-size:14px;color:#166534;">
              ${matchingClaim.quantity_claimed && matchingClaim.quantity_claimed > 1 ? `You picked up <b>${matchingClaim.quantity_claimed} portions</b> of ` : ""}<b>${listing.food_name}</b> from ${listing.business_name}.
            </p>
          </div>
          <a href="https://gawaloop.com/browse" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;">Browse More Free Food</a>
        `)
      ).catch(() => {});

      return NextResponse.json({
        success: true,
        verified: true,
        claimerName: matchingClaim.first_name,
        quantityClaimed: matchingClaim.quantity_claimed || 1,
      });
    }

    // No claimId, no code — mark ALL active claims as picked up
    if (claims.length > 0) {
      await supabase.from("claims").update({ status: "picked_up" })
        .eq("listing_id", listingId).eq("status", "active");
    }
    await supabase.from("listings").update({ status: "PICKED_UP" }).eq("id", listingId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("mark-picked-up error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
