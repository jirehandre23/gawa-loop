import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailWrapper } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { claimId, listingId } = await req.json();

  if (!claimId) {
    return NextResponse.json({ error: "Missing claimId" }, { status: 400 });
  }

  // 1. Get the claim
  const { data: claim } = await supabase
    .from("claims")
    .select("*, listings(food_name, business_name)")
    .eq("id", claimId)
    .single();

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  // 2. Mark claim as no-show
  await supabase.from("claims").update({
    status:     "noshow",
    noshow:     true,
    noshow_at:  new Date().toISOString(),
    cancelled_at: new Date().toISOString(),
  }).eq("id", claimId);

  // 3. Free the listing back to AVAILABLE
  await supabase.from("listings").update({
    status:         "AVAILABLE",
    reserved_until: null,
    claim_code:     null,
  }).eq("id", listingId || claim.listing_id);

  // 4. If no customer_user_id, nothing more to do (anonymous claim)
  if (!claim.customer_user_id) {
    return NextResponse.json({ success: true, suspended: false });
  }

  // 5. Get customer profile
  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("*")
    .eq("user_id", claim.customer_user_id)
    .single();

  if (!profile) {
    return NextResponse.json({ success: true, suspended: false });
  }

  // 6. Increment no-show count
  const newNoShowCount = (profile.noshow_count || 0) + 1;
  const customerName   = `${profile.first_name || ""}`.trim() || claim.first_name || "Customer";
  const customerEmail  = profile.email || claim.email;

  // 7. Determine suspension based on no-show count
  let suspendedUntil: Date | null = null;
  let suspensionMessage            = "";
  let suspensionNumber             = (profile.total_suspensions || 0);
  let permanentlyBanned            = profile.permanently_banned || false;
  let newTotalSuspensions          = profile.total_suspensions || 0;
  let triggered                    = false;

  if (!permanentlyBanned) {
    if (newNoShowCount === 3) {
      // 1st suspension — 1 week
      suspendedUntil    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      suspensionNumber  = 1;
      newTotalSuspensions = 1;
      triggered         = true;
      suspensionMessage = `Your account has been suspended for **1 week** (until ${suspendedUntil.toLocaleDateString()}).`;

    } else if (newNoShowCount === 6) {
      // 2nd suspension — 1 month
      suspendedUntil    = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      suspensionNumber  = 2;
      newTotalSuspensions = 2;
      triggered         = true;
      suspensionMessage = `Your account has been suspended for **1 month** (until ${suspendedUntil.toLocaleDateString()}).`;

    } else if (newNoShowCount === 9) {
      // 3rd suspension — 3 months
      suspendedUntil    = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      suspensionNumber  = 3;
      newTotalSuspensions = 3;
      triggered         = true;
      suspensionMessage = `Your account has been suspended for **3 months** (until ${suspendedUntil.toLocaleDateString()}).`;

    } else if (newNoShowCount >= 12) {
      // Permanent ban
      permanentlyBanned = true;
      suspensionNumber  = 4;
      newTotalSuspensions = 4;
      triggered         = true;
      suspensionMessage = `Your account has been **permanently banned** due to repeated missed pickups.`;
    }
  }

  // 8. Update customer profile
  await supabase.from("customer_profiles").update({
    noshow_count:        newNoShowCount,
    suspended_until:     suspendedUntil ? suspendedUntil.toISOString() : profile.suspended_until,
    total_suspensions:   newTotalSuspensions,
    permanently_banned:  permanentlyBanned,
  }).eq("user_id", claim.customer_user_id);

  // 9. Log the suspension
  if (triggered) {
    await supabase.from("suspension_log").insert({
      customer_user_id:   claim.customer_user_id,
      customer_email:     customerEmail,
      customer_name:      customerName,
      suspension_number:  suspensionNumber,
      noshow_count:       newNoShowCount,
      suspended_until:    suspendedUntil ? suspendedUntil.toISOString() : null,
      permanently_banned: permanentlyBanned,
    });
  }

  // 10. Send emails — non-blocking
  const foodName     = (claim.listings as any)?.food_name     || "the food";
  const businessName = (claim.listings as any)?.business_name || "the business";

  const warningThresholds: Record<number, string> = {
    1: "⚠️ This is your 1st missed pickup. Missing 2 more will suspend your account for 1 week.",
    2: "⚠️ This is your 2nd missed pickup. Missing 1 more will suspend your account for 1 week.",
    4: "⚠️ This is your 4th missed pickup. Missing 2 more will suspend your account for 1 month.",
    5: "⚠️ This is your 5th missed pickup. Missing 1 more will suspend your account for 1 month.",
    7: "⚠️ This is your 7th missed pickup. Missing 2 more will suspend your account for 3 months.",
    8: "⚠️ This is your 8th missed pickup. Missing 1 more will suspend your account for 3 months.",
    10: "⚠️ This is your 10th missed pickup. Missing 2 more will result in a permanent ban.",
    11: "⚠️ This is your 11th missed pickup. Missing 1 more will result in a permanent ban.",
  };

  const warningMsg = warningThresholds[newNoShowCount];

  Promise.all([
    // Email to customer
    sendEmail(
      customerEmail,
      triggered
        ? permanentlyBanned
          ? "🚫 Your GAWA Loop account has been permanently banned"
          : `⏸️ Your GAWA Loop account has been suspended`
        : warningMsg
          ? "⚠️ Missed pickup warning — GAWA Loop"
          : "Missed pickup recorded — GAWA Loop",
      emailWrapper(`
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">
          ${triggered
            ? permanentlyBanned ? "Account Permanently Banned 🚫" : "Account Suspended ⏸️"
            : "Missed Pickup Recorded ⚠️"}
        </h2>

        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
          <p style="margin:0;font-size:14px;color:#991b1b;line-height:1.6;">
            Hi ${customerName}, we noticed you did not pick up <b>${foodName}</b>
            from <b>${businessName}</b>. This reservation has been marked as a no-show.
          </p>
        </div>

        ${triggered ? `
        <div style="background:${permanentlyBanned ? "#1f2937" : "#fffbeb"};border:1px solid ${permanentlyBanned ? "#374151" : "#fde68a"};border-radius:12px;padding:16px 20px;margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:${permanentlyBanned ? "#f9fafb" : "#92400e"};">
            ${permanentlyBanned ? "🚫 Permanent Ban" : `⏸️ Suspension #${suspensionNumber}`}
          </p>
          <p style="margin:0;font-size:14px;color:${permanentlyBanned ? "#d1d5db" : "#78350f"};line-height:1.6;">
            ${permanentlyBanned
              ? "After 12+ missed pickups, your account has been permanently banned from GAWA Loop. You can no longer claim food listings."
              : suspensionNumber === 1
                ? `You have now missed 3 pickups. Your account has been suspended for <b>1 week</b> (until ${suspendedUntil?.toLocaleDateString()}). During this time you cannot claim food.`
                : suspensionNumber === 2
                  ? `You have now missed 6 pickups. Your account has been suspended for <b>1 month</b> (until ${suspendedUntil?.toLocaleDateString()}).`
                  : `You have now missed 9 pickups. Your account has been suspended for <b>3 months</b> (until ${suspendedUntil?.toLocaleDateString()}).`
            }
          </p>
        </div>
        ` : warningMsg ? `
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
          <p style="margin:0;font-size:14px;color:#92400e;line-height:1.6;">${warningMsg}</p>
        </div>
        ` : ""}

        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#0a2e1a;">GAWA Loop Community Rules</p>
          <ul style="margin:0;padding-left:18px;font-size:13px;color:#374151;line-height:2;">
            <li>Only claim food you genuinely intend to pick up</li>
            <li>If you can't make it, cancel your reservation using the link in your confirmation email</li>
            <li>3 missed pickups → 1 week suspension</li>
            <li>6 missed pickups → 1 month suspension</li>
            <li>9 missed pickups → 3 month suspension</li>
            <li>12 missed pickups → Permanent ban</li>
          </ul>
        </div>

        ${!permanentlyBanned ? `
        <p style="font-size:13px;color:#6b7280;margin:0;">
          Questions? Contact us at <a href="mailto:admin@gawaloop.com" style="color:#16a34a;">admin@gawaloop.com</a>
        </p>
        ` : `
        <p style="font-size:13px;color:#6b7280;margin:0;">
          If you believe this is a mistake, contact us at <a href="mailto:admin@gawaloop.com" style="color:#16a34a;">admin@gawaloop.com</a>
        </p>
        `}
      `)
    ),

    // Alert Jireh when a suspension or ban is triggered
    triggered ? sendEmail(
      "jireh@gawaloop.com",
      `🚨 Customer ${permanentlyBanned ? "Banned" : "Suspended"} — ${customerName}`,
      emailWrapper(`
        <h2 style="margin:0 0 16px;font-size:18px;font-weight:800;color:#0a2e1a;">
          ${permanentlyBanned ? "Permanent Ban Issued" : `Suspension #${suspensionNumber} Issued`}
        </h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:700;border-bottom:1px solid #e5e7eb;">Customer</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${customerName}</td></tr>
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:700;border-bottom:1px solid #e5e7eb;">Email</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${customerEmail}</td></tr>
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:700;border-bottom:1px solid #e5e7eb;">No-show count</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${newNoShowCount}</td></tr>
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:700;border-bottom:1px solid #e5e7eb;">Suspension</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">#${suspensionNumber}</td></tr>
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:700;">Suspended until</td><td style="padding:8px 12px;">${permanentlyBanned ? "PERMANENT" : suspendedUntil?.toLocaleDateString()}</td></tr>
        </table>
      `)
    ) : Promise.resolve(),
  ]).catch(() => {});

  return NextResponse.json({
    success:      true,
    suspended:    triggered,
    banned:       permanentlyBanned,
    noshow_count: newNoShowCount,
    suspended_until: suspendedUntil?.toISOString() || null,
  });
}
