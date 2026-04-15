import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailWrapper } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, listingId, ...params } = body;

  if (!listingId || !action) {
    return NextResponse.json({ error: "Missing listingId or action" }, { status: 400 });
  }

  const { data: listing } = await supabase
    .from("listings").select("*").eq("id", listingId).single();

  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  // ─── 1. EDIT DETAILS ─────────────────────────────────────────────────────
  if (action === "edit_details") {
    const { food_name, category, allergy_note, note, estimated_value, weight_lbs, max_portions_per_claim } = params;
    const weightKg = weight_lbs ? Number(weight_lbs) * 0.453592 : null;

    const updates: Record<string, any> = {};
    if (food_name    !== undefined) updates.food_name    = food_name;
    if (category     !== undefined) updates.category     = category;
    if (allergy_note !== undefined) updates.allergy_note = allergy_note || null;
    if (note         !== undefined) updates.note         = note || null;
    if (estimated_value !== undefined) updates.estimated_value = estimated_value ? Number(estimated_value) : null;
    if (weight_lbs   !== undefined) updates.weight_kg    = weightKg;
    // ← ADDED: save max_portions_per_claim — empty string or 0 clears the limit
    if (max_portions_per_claim !== undefined) {
      const parsed = max_portions_per_claim === "" || max_portions_per_claim === null
        ? null
        : Math.max(1, Math.floor(Number(max_portions_per_claim)));
      updates.max_portions_per_claim = parsed || null;
    }

    await supabase.from("listings").update(updates).eq("id", listingId);

    // Notify active claimers if food name changed
    if (food_name && food_name !== listing.food_name) {
      const { data: activeClaims } = await supabase
        .from("claims").select("*").eq("listing_id", listingId).eq("status", "active");

      for (const claim of activeClaims || []) {
        const msg = `The listing you reserved has been updated: "${listing.food_name}" is now "${food_name}". Your reservation is still active.`;
        await supabase.from("listing_notifications").insert({
          claim_id: claim.id, customer_user_id: claim.customer_user_id || null,
          customer_email: claim.email, listing_id: listingId,
          type: "listing_updated", message: msg,
          old_value: listing.food_name, new_value: food_name,
        });
        sendEmail(claim.email, `Listing updated — ${food_name}`, emailWrapper(`
          <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">Listing Updated</h2>
          <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${claim.first_name}, a listing you reserved has been updated by the business.</p>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px 18px;margin-bottom:16px;">
            <p style="margin:0;font-size:14px;color:#92400e;">${msg}</p>
          </div>
          <p style="font-size:13px;color:#6b7280;">Your pickup code <b>${claim.confirmation_code}</b> is still valid.</p>
        `)).catch(() => {});
      }
    }

    return NextResponse.json({ success: true });
  }

  // ─── 2. EDIT QUANTITY ────────────────────────────────────────────────────
  if (action === "edit_quantity") {
    const newTotal = Math.max(1, Number(params.new_total));
    const oldTotal = listing.quantity_total || 1;
    const oldRemaining = listing.quantity_remaining || 0;

    const { data: activeClaims } = await supabase
      .from("claims").select("*").eq("listing_id", listingId)
      .eq("status", "active").order("created_at", { ascending: true });

    const claims = activeClaims || [];
    const totalClaimed = claims.reduce((s, c) => s + (c.quantity_claimed || 1), 0);

    if (newTotal >= totalClaimed) {
      const newRemaining = newTotal - totalClaimed;
      await supabase.from("listings").update({
        quantity_total:     newTotal,
        quantity_remaining: newRemaining,
        quantity:           String(newTotal),
        status:             newRemaining === 0 && claims.length > 0 ? "CLAIMED" : "AVAILABLE",
      }).eq("id", listingId);

      if (newTotal < oldTotal) {
        for (const claim of claims) {
          const msg = `The total quantity for "${listing.food_name}" was updated from ${oldTotal} to ${newTotal} portions. Your reservation of ${claim.quantity_claimed || 1} portion(s) is still fully active.`;
          await supabase.from("listing_notifications").insert({
            claim_id: claim.id, customer_user_id: claim.customer_user_id || null,
            customer_email: claim.email, listing_id: listingId,
            type: "listing_updated", message: msg,
            old_value: String(oldTotal), new_value: String(newTotal),
          });
          sendEmail(claim.email, `Quantity updated — ${listing.food_name}`, emailWrapper(`
            <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">Listing Quantity Updated</h2>
            <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${claim.first_name},</p>
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px 18px;margin-bottom:16px;">
              <p style="margin:0;font-size:14px;color:#92400e;">${msg}</p>
            </div>
            <p style="font-size:13px;color:#6b7280;">Your pickup code <b>${claim.confirmation_code}</b> is still valid.</p>
          `)).catch(() => {});
        }
      }
    } else {
      let budget = newTotal;
      const claimsLatestFirst = [...claims].reverse();

      for (const claim of claimsLatestFirst) {
        const originalQty = claim.quantity_claimed || 1;
        if (budget <= 0) {
          await supabase.from("claims").update({
            status: "cancelled", cancelled_at: new Date().toISOString(), quantity_claimed: 0,
          }).eq("id", claim.id);

          const msg = `Unfortunately your reservation for "${listing.food_name}" has been cancelled because the business reduced the available quantity to ${newTotal}. We're sorry for the inconvenience.`;
          await supabase.from("listing_notifications").insert({
            claim_id: claim.id, customer_user_id: claim.customer_user_id || null,
            customer_email: claim.email, listing_id: listingId,
            type: "claim_cancelled", message: msg,
            old_value: String(originalQty), new_value: "0",
          });
          sendEmail(claim.email, `Reservation cancelled — ${listing.food_name}`, emailWrapper(`
            <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#dc2626;">Reservation Cancelled</h2>
            <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${claim.first_name},</p>
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px 18px;margin-bottom:16px;">
              <p style="margin:0;font-size:14px;color:#991b1b;">${msg}</p>
            </div>
            <a href="https://gawaloop.com/browse" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;">Browse Other Food</a>
          `)).catch(() => {});
        } else if (originalQty > budget) {
          const newQty = budget;
          await supabase.from("claims").update({ quantity_claimed: newQty }).eq("id", claim.id);
          budget = 0;

          const msg = `Your reservation for "${listing.food_name}" has been reduced from ${originalQty} to ${newQty} portion(s) because the business updated the available quantity. Your pickup code is still valid.`;
          await supabase.from("listing_notifications").insert({
            claim_id: claim.id, customer_user_id: claim.customer_user_id || null,
            customer_email: claim.email, listing_id: listingId,
            type: "quantity_reduced", message: msg,
            old_value: String(originalQty), new_value: String(newQty),
          });
          sendEmail(claim.email, `Your reservation was updated — ${listing.food_name}`, emailWrapper(`
            <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#92400e;">Reservation Updated</h2>
            <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${claim.first_name},</p>
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px 18px;margin-bottom:16px;">
              <p style="margin:0;font-size:14px;color:#92400e;">${msg}</p>
            </div>
            <p style="font-size:13px;color:#6b7280;">Your pickup code <b>${claim.confirmation_code}</b> is still valid for ${newQty} portion(s).</p>
          `)).catch(() => {});
        } else {
          budget -= originalQty;
        }
      }

      const { data: updatedClaims } = await supabase
        .from("claims").select("quantity_claimed").eq("listing_id", listingId).eq("status", "active");
      const newTotalClaimed = (updatedClaims || []).reduce((s, c) => s + (c.quantity_claimed || 0), 0);
      const newRemaining = Math.max(0, newTotal - newTotalClaimed);
      await supabase.from("listings").update({
        quantity_total:     newTotal,
        quantity_remaining: newRemaining,
        quantity:           String(newTotal),
        status:             newRemaining === 0 ? "CLAIMED" : "AVAILABLE",
      }).eq("id", listingId);
    }

    return NextResponse.json({ success: true });
  }

  // ─── 3. EDIT EXPIRY ──────────────────────────────────────────────────────
  if (action === "edit_expiry") {
    const { new_expires_at } = params;
    if (!new_expires_at) return NextResponse.json({ error: "Missing new_expires_at" }, { status: 400 });

    const oldExpiry = listing.expires_at;
    await supabase.from("listings").update({ expires_at: new_expires_at }).eq("id", listingId);

    const isExtension = new Date(new_expires_at) > new Date(oldExpiry);
    const { data: activeClaims } = await supabase
      .from("claims").select("*").eq("listing_id", listingId).eq("status", "active");

    const newDateStr = new Date(new_expires_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    for (const claim of activeClaims || []) {
      const msg = isExtension
        ? `Great news! The pickup window for "${listing.food_name}" has been extended to ${newDateStr}. You have more time to pick up your food.`
        : `The pickup window for "${listing.food_name}" has been shortened to ${newDateStr}. Please make sure to pick up your food before then.`;
      await supabase.from("listing_notifications").insert({
        claim_id: claim.id, customer_user_id: claim.customer_user_id || null,
        customer_email: claim.email, listing_id: listingId,
        type: "expiry_extended",
        message: msg,
        old_value: oldExpiry, new_value: new_expires_at,
      });
      sendEmail(claim.email,
        isExtension ? `Pickup window extended — ${listing.food_name}` : `Pickup window updated — ${listing.food_name}`,
        emailWrapper(`
          <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">Pickup Time Updated</h2>
          <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${claim.first_name},</p>
          <div style="background:${isExtension ? "#f0fdf4" : "#fffbeb"};border:1px solid ${isExtension ? "#bbf7d0" : "#fde68a"};border-radius:12px;padding:14px 18px;margin-bottom:16px;">
            <p style="margin:0;font-size:14px;color:${isExtension ? "#166534" : "#92400e"};">${msg}</p>
          </div>
          <p style="font-size:13px;color:#6b7280;">Your pickup code <b>${claim.confirmation_code}</b> is still valid.</p>
        `)
      ).catch(() => {});
    }

    return NextResponse.json({ success: true });
  }

  // ─── 4. REDUCE INDIVIDUAL CLAIM PORTIONS ─────────────────────────────────
  if (action === "reduce_claim_portions") {
    const { claimId, new_quantity } = params;
    const newQty = Math.max(0, Number(new_quantity));

    const { data: claim } = await supabase.from("claims").select("*").eq("id", claimId).single();
    if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

    const oldQty = claim.quantity_claimed || 1;
    const diff   = oldQty - newQty;
    if (diff <= 0) return NextResponse.json({ error: "New quantity must be less than current" }, { status: 400 });

    if (newQty === 0) {
      await supabase.from("claims").update({
        status: "cancelled", cancelled_at: new Date().toISOString(), quantity_claimed: 0,
      }).eq("id", claimId);
      await supabase.rpc("restore_listing_quantity", { p_claim_id: claimId });

      const msg = `Your reservation for "${listing.food_name}" has been cancelled by the business. We're sorry for the inconvenience.`;
      await supabase.from("listing_notifications").insert({
        claim_id: claimId, customer_user_id: claim.customer_user_id || null,
        customer_email: claim.email, listing_id: listingId,
        type: "claim_cancelled", message: msg, old_value: String(oldQty), new_value: "0",
      });
      sendEmail(claim.email, `Reservation cancelled — ${listing.food_name}`, emailWrapper(`
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#dc2626;">Reservation Cancelled</h2>
        <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${claim.first_name},</p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px 18px;margin-bottom:16px;">
          <p style="margin:0;font-size:14px;color:#991b1b;">${msg}</p>
        </div>
        <a href="https://gawaloop.com/browse" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;">Browse Other Food</a>
      `)).catch(() => {});
    } else {
      await supabase.from("claims").update({ quantity_claimed: newQty }).eq("id", claimId);
      await supabase.from("listings").update({
        quantity_remaining: Math.min(listing.quantity_total, (listing.quantity_remaining || 0) + diff),
        status: "AVAILABLE",
      }).eq("id", listingId);

      const msg = `Your reservation for "${listing.food_name}" was updated from ${oldQty} to ${newQty} portion(s) by the business. Your pickup code is still valid.`;
      await supabase.from("listing_notifications").insert({
        claim_id: claimId, customer_user_id: claim.customer_user_id || null,
        customer_email: claim.email, listing_id: listingId,
        type: "quantity_reduced", message: msg, old_value: String(oldQty), new_value: String(newQty),
      });
      sendEmail(claim.email, `Your reservation was updated — ${listing.food_name}`, emailWrapper(`
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#92400e;">Reservation Updated</h2>
        <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${claim.first_name},</p>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px 18px;margin-bottom:16px;">
          <p style="margin:0;font-size:14px;color:#92400e;">${msg}</p>
        </div>
        <p style="font-size:13px;color:#6b7280;">Your pickup code <b>${claim.confirmation_code}</b> is still valid for ${newQty} portion(s).</p>
      `)).catch(() => {});
    }

    return NextResponse.json({ success: true });
  }

  // ─── 5. RE-LIST CANCELLED LISTING ────────────────────────────────────────
  if (action === "relist") {
    const { new_expires_at } = params;
    if (!new_expires_at) return NextResponse.json({ error: "Missing new_expires_at" }, { status: 400 });

    await supabase.from("listings").update({
      status:             "AVAILABLE",
      expires_at:         new_expires_at,
      quantity_remaining: listing.quantity_total || 1,
    }).eq("id", listingId);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
