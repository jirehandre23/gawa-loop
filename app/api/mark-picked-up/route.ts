import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailWrapper } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { listingId, confirmationCode } = await req.json();
    if (!listingId) return NextResponse.json({ error: "Missing listingId" }, { status: 400 });

    // Get listing
    const { data: listing } = await supabase
      .from("listings").select("*").eq("id", listingId).single();
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    // Get active claims for this listing
    const { data: activeClaims } = await supabase
      .from("claims").select("*").eq("listing_id", listingId).eq("status", "active");

    const claims = activeClaims || [];

    // If a confirmation code was provided, verify it against active claims
    if (confirmationCode) {
      const trimmedCode = confirmationCode.trim().toUpperCase();
      const matchingClaim = claims.find(
        c => c.confirmation_code?.toUpperCase() === trimmedCode
      );
      if (!matchingClaim) {
        return NextResponse.json({
          error: "Invalid code. Please check the code and try again.",
          codeInvalid: true,
        }, { status: 400 });
      }
      // Mark only that specific claim as picked up
      await supabase.from("claims").update({
        status: "picked_up",
      }).eq("id", matchingClaim.id);

      // Check if all claims are now picked up or cancelled
      const { data: remainingActive } = await supabase
        .from("claims").select("id").eq("listing_id", listingId).eq("status", "active");

      // If no more active claims, mark listing as PICKED_UP
      if (!remainingActive || remainingActive.length === 0) {
        await supabase.from("listings").update({ status: "PICKED_UP" }).eq("id", listingId);
      }

      // Send confirmation email to customer
      sendEmail(
        matchingClaim.email,
        `Pickup confirmed — ${listing.food_name}`,
        emailWrapper(`
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Pickup Confirmed!</h2>
          <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${matchingClaim.first_name}, your pickup of "${listing.food_name}" has been confirmed. Thank you for helping reduce food waste!</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
            <p style="margin:0;font-size:14px;color:#166534;">
              ${matchingClaim.quantity_claimed && matchingClaim.quantity_claimed > 1 ? `You picked up <b>${matchingClaim.quantity_claimed} portions</b> of ` : ""}<b>${listing.food_name}</b> from ${listing.business_name}.
            </p>
          </div>
          <a href="https://gawaloop.com/browse" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;">Browse More Free Food</a>
        `)
      ).catch(() => {});

      return NextResponse.json({ success: true, verified: true, claimerName: matchingClaim.first_name, quantityClaimed: matchingClaim.quantity_claimed || 1 });
    }

    // No code provided — mark ALL active claims as picked_up (original behavior)
    if (claims.length > 0) {
      await supabase.from("claims").update({ status: "picked_up" })
        .eq("listing_id", listingId).eq("status", "active");
    }

    // Mark listing as picked up
    await supabase.from("listings").update({ status: "PICKED_UP" }).eq("id", listingId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("mark-picked-up error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

==================================================
FILE 2 — app/api/cancel-listing/route.ts (REPLACE)
GitHub → app → api → cancel-listing → route.ts → pencil → SELECT ALL → paste → Commit

FIX: Restores quantity to all active claimers and marks claims as cancelled.
Was previously not updating claims correctly after the quantity system was added.
==================================================

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

    // Get all active claims
    const { data: activeClaims } = await supabase
      .from("claims").select("*").eq("listing_id", listingId).eq("status", "active");

    const claims = activeClaims || [];

    // Cancel all active claims
    if (claims.length > 0) {
      await supabase.from("claims").update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      }).eq("listing_id", listingId).eq("status", "active");
    }

    // Cancel the listing
    await supabase.from("listings").update({
      status: "CANCELLED",
      quantity_remaining: 0,
    }).eq("id", listingId);

    // Notify all affected claimers
    const emailPromises = claims.map(claim =>
      sendEmail(
        claim.email,
        `Listing cancelled — ${listing.food_name}`,
        emailWrapper(`
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#dc2626;">Listing Cancelled</h2>
          <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${claim.first_name}, unfortunately the listing you reserved has been cancelled by the business.</p>
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
