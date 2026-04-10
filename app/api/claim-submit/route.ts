import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailWrapper } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      listingId, first_name, email, phone,
      eta_minutes, customer_user_id,
      quantity_claimed = 1,
    } = body;

    if (!listingId || !first_name || !email) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const qty = Math.max(1, Math.floor(Number(quantity_claimed)));

    // Check suspension
    if (customer_user_id) {
      const { data: profile } = await supabase
        .from("customer_profiles")
        .select("suspended_until, permanently_banned")
        .eq("user_id", customer_user_id)
        .maybeSingle();

      if (profile?.permanently_banned) {
        return NextResponse.json({ error: "Your account has been permanently suspended due to repeated no-shows." }, { status: 403 });
      }
      if (profile?.suspended_until && new Date(profile.suspended_until) > new Date()) {
        const until = new Date(profile.suspended_until).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        return NextResponse.json({ error: `Your account is suspended until ${until} due to no-shows.` }, { status: 403 });
      }
    }

    // Get listing and check availability
    const { data: listing, error: listingErr } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .eq("status", "AVAILABLE")
      .single();

    if (listingErr || !listing) {
      return NextResponse.json({ error: "This listing is no longer available." }, { status: 409 });
    }

    // Check remaining quantity
    const remaining = listing.quantity_remaining ?? listing.quantity_total ?? 1;
    if (qty > remaining) {
      return NextResponse.json({
        error: `Only ${remaining} portion${remaining === 1 ? "" : "s"} remaining. Please claim ${remaining} or fewer.`,
      }, { status: 409 });
    }

    const newRemaining = remaining - qty;
    const newStatus = newRemaining <= 0 ? "CLAIMED" : "AVAILABLE";

    // Atomic update — only proceeds if status still AVAILABLE and remaining sufficient
    const { error: updateErr } = await supabase
      .from("listings")
      .update({
        status: newStatus,
        quantity_remaining: newRemaining,
        reserved_until: new Date(Date.now() + (listing.claim_hold_minutes || 60) * 60000).toISOString(),
      })
      .eq("id", listingId)
      .eq("status", "AVAILABLE")
      .gte("quantity_remaining", qty);

    if (updateErr) {
      return NextResponse.json({ error: "This food was just claimed by someone else. Please try another listing." }, { status: 409 });
    }

    // Create the claim
    const confirmation_code = generateCode();
    const { data: claim, error: claimErr } = await supabase
      .from("claims")
      .insert({
        listing_id:       listingId,
        first_name:       first_name.trim(),
        email:            email.trim().toLowerCase(),
        phone:            phone?.trim() || null,
        eta_minutes:      eta_minutes || 15,
        confirmation_code,
        status:           "active",
        customer_user_id: customer_user_id || null,
        quantity_claimed: qty,
      })
      .select()
      .single();

    if (claimErr || !claim) {
      // Rollback listing quantity
      await supabase.from("listings").update({
        status: "AVAILABLE",
        quantity_remaining: remaining,
      }).eq("id", listingId);
      return NextResponse.json({ error: "Failed to create claim. Please try again." }, { status: 500 });
    }

    // Send emails (non-blocking)
    sendEmail(
      email,
      `Your ${qty > 1 ? qty + " portions" : "food"} is reserved — ${listing.food_name}`,
      emailWrapper(`
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Reservation Confirmed!</h2>
        <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${first_name}, your food is reserved. Show this code when you arrive:</p>
        <div style="background:#f0fdf4;border:2px solid #16a34a;border-radius:16px;padding:24px;text-align:center;margin-bottom:20px;">
          <p style="margin:0 0 4px;font-size:13px;color:#6b7280;font-weight:600;">PICKUP CODE</p>
          <p style="margin:0;font-size:56px;font-weight:900;color:#16a34a;letter-spacing:8px;line-height:1;">${confirmation_code}</p>
        </div>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:14px 18px;margin-bottom:20px;">
          <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#0a2e1a;">${listing.food_name}</p>
          <p style="margin:0;font-size:13px;color:#374151;line-height:2;">
            Quantity: <b>${qty} portion${qty === 1 ? "" : "s"}</b><br/>
            From: ${listing.business_name}<br/>
            Address: ${listing.address}<br/>
            Your ETA: ${eta_minutes} minutes
          </p>
        </div>
        <p style="font-size:13px;color:#6b7280;margin:0;">Cannot make it? Please cancel so someone else can claim the food.</p>
      `)
    ).catch(() => {});

    return NextResponse.json({ success: true, confirmation_code, claim });
  } catch (err) {
    console.error("claim-submit error:", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}

// Called when business marks no-show OR customer cancels
// Restores quantity to listing if it has not expired yet
export async function DELETE(req: NextRequest) {
  try {
    const { claimId, isNoshow } = await req.json();
    if (!claimId) return NextResponse.json({ error: "Missing claimId" }, { status: 400 });

    const { data: claim } = await supabase
      .from("claims").select("*").eq("id", claimId).single();
    if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

    // Mark claim cancelled or noshow
    await supabase.from("claims").update({
      status:       isNoshow ? "noshow" : "cancelled",
      cancelled_at: new Date().toISOString(),
      noshow:       isNoshow ?? false,
      noshow_at:    isNoshow ? new Date().toISOString() : null,
    }).eq("id", claimId);

    // Restore quantity to listing via DB function (checks expiry automatically)
    await supabase.rpc("restore_listing_quantity", { p_claim_id: claimId });

    // Suspension rules — unchanged
    if (isNoshow && claim.customer_user_id) {
      const { data: profile } = await supabase
        .from("customer_profiles")
        .select("noshow_count, total_suspensions, permanently_banned")
        .eq("user_id", claim.customer_user_id)
        .maybeSingle();

      if (profile && !profile.permanently_banned) {
        const newNoshowCount      = (profile.noshow_count || 0) + 1;
        const newTotalSuspensions = (profile.total_suspensions || 0);
        let suspendedUntil: string | null = null;
        let newPermanentBan = false;

        if (newNoshowCount >= 5) {
          newPermanentBan = true;
        } else if (newNoshowCount % 2 === 0) {
          const days = newTotalSuspensions === 0 ? 3 : newTotalSuspensions === 1 ? 7 : 14;
          suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        }

        await supabase.from("customer_profiles").update({
          noshow_count:       newNoshowCount,
          total_suspensions:  suspendedUntil ? newTotalSuspensions + 1 : newTotalSuspensions,
          suspended_until:    suspendedUntil,
          permanently_banned: newPermanentBan,
        }).eq("user_id", claim.customer_user_id);

        if (suspendedUntil || newPermanentBan) {
          await supabase.from("suspension_log").insert({
            customer_user_id:   claim.customer_user_id,
            customer_email:     claim.email,
            customer_name:      claim.first_name,
            suspension_number:  newTotalSuspensions + 1,
            noshow_count:       newNoshowCount,
            suspended_until:    suspendedUntil,
            permanently_banned: newPermanentBan,
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
