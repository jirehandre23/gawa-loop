import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailWrapper } from "@/lib/email";

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { searchParams } = new URL(req.url);
  const claimId = searchParams.get("id");
  const code    = searchParams.get("code");

  if (!claimId || !code) {
    return NextResponse.json({ success: false, error: "Missing id or code." }, { status: 400 });
  }

  const { data: claim } = await supabase
    .from("claims")
    .select("id, status, first_name, email, confirmation_code, listing_id, quantity_claimed, listings(id, business_name, food_name, address, status, expires_at, quantity_remaining, quantity_total)")
    .eq("id", claimId)
    .eq("confirmation_code", code)
    .single();

  if (!claim) {
    return NextResponse.json({ success: false, error: "Reservation not found." }, { status: 404 });
  }

  if (claim.status === "cancelled") {
    return NextResponse.json({ success: false, already: true, food: (claim.listings as any)?.food_name, business: (claim.listings as any)?.business_name });
  }

  const listing = claim.listings as any;
  const now = new Date();
  const expiryTime = listing?.expires_at ? new Date(listing.expires_at) : null;
  const stillActive = !expiryTime || expiryTime > now;

  // Cancel the claim
  await supabase.from("claims")
    .update({ status: "cancelled", cancelled_at: now.toISOString() })
    .eq("id", claimId);

  // ← FIXED: use restore_listing_quantity instead of manual quantity math
  // This correctly handles multi-portion listings with other active claims,
  // respects expiry, and only sets AVAILABLE when appropriate.
  if (stillActive) {
    await supabase.rpc("restore_listing_quantity", { p_claim_id: claimId });
  } else if (listing) {
    await supabase.from("listings")
      .update({ status: "EXPIRED", reserved_until: null })
      .eq("id", listing.id)
      .neq("status", "PICKED_UP");
  }

  const customerName = claim.first_name || "Customer";
  const foodName     = listing?.food_name || "food";
  const businessName = listing?.business_name || "the business";
  const address      = listing?.address || "";

  if (claim.email) {
    await sendEmail(claim.email, `Reservation Cancelled — ${foodName}`,
      emailWrapper(`
        <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;">Reservation Cancelled</h2>
        <p style="margin:0 0 20px;font-size:15px;color:#6b7280;">Hi ${customerName}, your reservation has been cancelled.</p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
          <p style="margin:0 0 6px;font-size:16px;font-weight:800;color:#0a2e1a;">${foodName}</p>
          <p style="margin:2px 0;font-size:14px;color:#374151;">🏪 ${businessName}</p>
          ${address ? `<p style="margin:2px 0;font-size:14px;color:#374151;">📍 ${address}</p>` : ""}
        </div>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px;">
          ${stillActive ? "The listing has been released and is now available for someone else to claim." : "The pickup window for this listing has passed."}
        </p>
        <div style="text-align:center;">
          <a href="https://gawaloop.com/browse" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:15px;padding:13px 32px;border-radius:12px;text-decoration:none;">Browse More Free Food</a>
        </div>
      `)
    );
  }

  const { data: bizData } = await supabase.from("businesses").select("email").eq("name", businessName).single();
  if (bizData?.email) {
    await sendEmail(bizData.email, `Reservation Cancelled — ${foodName}`,
      emailWrapper(`
        <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;">Reservation Cancelled</h2>
        <p style="margin:0 0 20px;font-size:15px;color:#6b7280;">A customer cancelled their reservation for your listing.</p>
        <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
          <p style="margin:0 0 8px;font-size:16px;font-weight:800;color:#0a2e1a;">${foodName}</p>
          <p style="margin:2px 0;font-size:14px;color:#374151;"><b>Cancelled by:</b> ${customerName}</p>
          <p style="margin:2px 0;font-size:14px;color:#374151;"><b>Email:</b> ${claim.email || "N/A"}</p>
        </div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 20px;margin-bottom:20px;">
          <p style="margin:0;font-size:14px;color:#166534;font-weight:600;">
            ${stillActive ? "Your listing is now AVAILABLE again — others can claim it." : "The listing window has passed — marked as expired."}
          </p>
        </div>
        <div style="text-align:center;">
          <a href="https://gawaloop.com/business/dashboard" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">View Dashboard</a>
        </div>
      `)
    );
  }

  await sendEmail("jireh@gawaloop.com", `Cancellation — ${foodName} at ${businessName}`,
    emailWrapper(`
      <h2 style="color:#dc2626;">Customer Cancelled</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600;">Customer</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;">${customerName} — ${claim.email}</td></tr>
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600;">Food</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;">${foodName}</td></tr>
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600;">Business</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;">${businessName}</td></tr>
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600;">Listing</td><td style="padding:8px;">${stillActive ? "Back to AVAILABLE" : "Expired"}</td></tr>
      </table>
    `)
  );

  return NextResponse.json({ success: true, food: foodName, business: businessName, relisted: stillActive });
}

// POST handler — called from customer profile page
export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { claimId, userId } = await req.json();
    if (!claimId) return NextResponse.json({ error: "Missing claimId" }, { status: 400 });

    const { data: claim } = await supabase
      .from("claims")
      .select("id, listing_id, status, customer_user_id, quantity_claimed, first_name, email")
      .eq("id", claimId)
      .maybeSingle();

    if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    if (claim.status === "cancelled") return NextResponse.json({ error: "Already cancelled" }, { status: 400 });
    if (userId && claim.customer_user_id !== userId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { data: listing } = await supabase
      .from("listings")
      .select("id, status, expires_at, quantity_remaining, quantity_total, food_name, business_name, address")
      .eq("id", claim.listing_id)
      .maybeSingle();

    const now = new Date();
    const stillActive = listing?.expires_at ? new Date(listing.expires_at) > now : false;

    // Cancel the claim
    await supabase.from("claims")
      .update({ status: "cancelled", cancelled_at: now.toISOString() })
      .eq("id", claimId);

    // ← FIXED: use restore_listing_quantity instead of manual quantity math
    if (listing && stillActive) {
      await supabase.rpc("restore_listing_quantity", { p_claim_id: claimId });
    }

    const customerName = claim.first_name || "Customer";
    const foodName     = listing?.food_name || "food";
    const businessName = listing?.business_name || "the business";
    const address      = listing?.address || "";

    if (claim.email) {
      sendEmail(claim.email, `Reservation Cancelled — ${foodName}`,
        emailWrapper(`
          <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;">Reservation Cancelled</h2>
          <p style="margin:0 0 20px;font-size:15px;color:#6b7280;">Hi ${customerName}, your reservation has been cancelled.</p>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
            <p style="margin:0 0 6px;font-size:16px;font-weight:800;color:#0a2e1a;">${foodName}</p>
            <p style="margin:2px 0;font-size:14px;color:#374151;">🏪 ${businessName}</p>
            ${address ? `<p style="margin:2px 0;font-size:14px;color:#374151;">📍 ${address}</p>` : ""}
          </div>
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px;">
            ${stillActive ? "The listing has been released and is now available for someone else to claim." : "The pickup window has passed."}
          </p>
          <div style="text-align:center;">
            <a href="https://gawaloop.com/browse" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:15px;padding:13px 32px;border-radius:12px;text-decoration:none;">Browse More Free Food</a>
          </div>
        `)
      ).catch(() => {});
    }

    supabase.from("businesses").select("email").eq("name", businessName).single().then(({ data: biz }) => {
      if (biz?.email) {
        sendEmail(biz.email, `Reservation Cancelled — ${foodName}`,
          emailWrapper(`
            <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;">Reservation Cancelled</h2>
            <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">A customer cancelled their reservation for <b>${foodName}</b>.</p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 20px;margin-bottom:20px;">
              <p style="margin:0;font-size:14px;color:#166534;font-weight:600;">
                ${stillActive ? "Your listing is now AVAILABLE again — others can claim it." : "The listing window has passed — marked as expired."}
              </p>
            </div>
            <div style="text-align:center;">
              <a href="https://gawaloop.com/business/dashboard" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">View Dashboard</a>
            </div>
          `)
        ).catch(() => {});
      }
    });

    return NextResponse.json({ success: true, relisted: stillActive });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
