import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailWrapper } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Suspension ladder for customers only (not NGOs)
// noshow_count after increment:
// 1 → warning email only, no suspension
// 2 → 3 days
// 3 → 7 days
// 4 → 14 days
// 5 → 30 days
// 6+ → permanent ban
function getSuspension(noshowCount: number): { days: number | null; permanent: boolean } {
  if (noshowCount === 1) return { days: null,  permanent: false }; // warning only
  if (noshowCount === 2) return { days: 3,     permanent: false };
  if (noshowCount === 3) return { days: 7,     permanent: false };
  if (noshowCount === 4) return { days: 14,    permanent: false };
  if (noshowCount === 5) return { days: 30,    permanent: false };
  return                        { days: null,  permanent: true  }; // 6+
}

export async function GET(req: NextRequest) {
  try {
    // Find all active claims where ETA has passed and listing has not yet expired
    const { data: overdueClaimsRaw } = await supabase
      .from("claims")
      .select(`
        id, first_name, email, eta_minutes, created_at,
        customer_user_id, quantity_claimed,
        listings!inner (
          id, food_name, business_name, expires_at, status,
          quantity_total, quantity_remaining
        )
      `)
      .eq("status", "active")
      .lt("created_at", new Date(Date.now() - 0).toISOString()); // fetch all active, filter below

    if (!overdueClaimsRaw || overdueClaimsRaw.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    const now = Date.now();
    const overdueClaims = (overdueClaimsRaw as any[]).filter(claim => {
      const listing = claim.listings;
      // Listing must still be active (not expired, not cancelled)
      if (!listing || !["AVAILABLE", "RESERVED", "CLAIMED"].includes(listing.status)) return false;
      // Listing must not have expired
      if (new Date(listing.expires_at).getTime() <= now) return false;
      // ETA must have passed — use a 15 minute grace period on top of their stated ETA
      const etaDeadline = new Date(claim.created_at).getTime() + (claim.eta_minutes + 15) * 60000;
      return now > etaDeadline;
    });

    if (overdueClaims.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    let processed = 0;
    for (const claim of overdueClaims) {
      const listing = claim.listings;

      // Mark claim as noshow
      await supabase.from("claims").update({
        status:    "noshow",
        noshow:    true,
        noshow_at: new Date().toISOString(),
        cancelled_at: new Date().toISOString(),
      }).eq("id", claim.id);

      // Restore quantity to listing
      await supabase.rpc("restore_listing_quantity", { p_claim_id: claim.id });

      // Apply suspension only if claim belongs to a customer user (not NGO)
      if (claim.customer_user_id) {
        // Check if this user is an NGO — skip suspension if so
        const { data: bizCheck } = await supabase
          .from("businesses")
          .select("id, account_type")
          .eq("account_type", "ngo")
          .maybeSingle();

        // Check their customer profile directly
        const { data: profile } = await supabase
          .from("customer_profiles")
          .select("noshow_count, total_suspensions, permanently_banned, suspended_until")
          .eq("user_id", claim.customer_user_id)
          .maybeSingle();

        if (profile && !profile.permanently_banned) {
          const newNoshowCount = (profile.noshow_count || 0) + 1;
          const { days, permanent } = getSuspension(newNoshowCount);

          let suspendedUntil: string | null = null;
          if (days) {
            suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
          }

          await supabase.from("customer_profiles").update({
            noshow_count:       newNoshowCount,
            total_suspensions:  days ? (profile.total_suspensions || 0) + 1 : (profile.total_suspensions || 0),
            suspended_until:    suspendedUntil,
            permanently_banned: permanent,
          }).eq("user_id", claim.customer_user_id);

          if (suspendedUntil || permanent) {
            await supabase.from("suspension_log").insert({
              customer_user_id:   claim.customer_user_id,
              customer_email:     claim.email,
              customer_name:      claim.first_name,
              suspension_number:  days ? (profile.total_suspensions || 0) + 1 : null,
              noshow_count:       newNoshowCount,
              suspended_until:    suspendedUntil,
              permanently_banned: permanent,
            });
          }

          // Send appropriate email
          if (permanent) {
            sendEmail(claim.email, "Your GAWA Loop account has been permanently suspended", emailWrapper(`
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#dc2626;">Account Permanently Suspended</h2>
              <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${claim.first_name},</p>
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px 18px;margin-bottom:16px;">
                <p style="margin:0;font-size:14px;color:#991b1b;">
                  Due to ${newNoshowCount} no-shows, your account has been permanently suspended. You will no longer be able to claim food on GAWA Loop.
                </p>
              </div>
              <p style="font-size:13px;color:#6b7280;">If you believe this is a mistake, please contact us at support@gawaloop.com.</p>
            `)).catch(() => {});
          } else if (days) {
            const until = new Date(suspendedUntil!).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
            sendEmail(claim.email, `Your GAWA Loop account is suspended until ${until}`, emailWrapper(`
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#92400e;">Account Suspended</h2>
              <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${claim.first_name},</p>
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px 18px;margin-bottom:16px;">
                <p style="margin:0;font-size:14px;color:#92400e;">
                  You did not pick up your reserved food at ${listing.business_name} within your stated arrival time. This is your <b>no-show #${newNoshowCount}</b>. Your account has been suspended for <b>${days} days</b> (until ${until}).
                </p>
              </div>
              <p style="font-size:13px;color:#6b7280;">Please only claim food you can genuinely pick up. Repeated no-shows affect the whole community.</p>
            `)).catch(() => {});
          } else {
            // Warning only (first no-show)
            sendEmail(claim.email, `Missed pickup — ${listing.food_name}`, emailWrapper(`
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">Missed Pickup Warning</h2>
              <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${claim.first_name},</p>
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px 18px;margin-bottom:16px;">
                <p style="margin:0;font-size:14px;color:#92400e;">
                  You reserved food at <b>${listing.business_name}</b> but did not arrive within your stated time. Your reservation has been cancelled and the food returned to the listing.
                </p>
              </div>
              <p style="font-size:13px;color:#6b7280;">This is your first no-show. Future no-shows will result in account suspension. Please only claim food you can genuinely pick up.</p>
              <a href="https://gawaloop.com/browse" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;margin-top:12px;">Browse Available Food</a>
            `)).catch(() => {});
          }
        }
      } else {
        // No customer_user_id — guest claim, just send a missed pickup email
        sendEmail(claim.email, `Missed pickup — ${listing.food_name}`, emailWrapper(`
          <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">Missed Pickup</h2>
          <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${claim.first_name},</p>
          <p style="font-size:14px;color:#374151;">
            Your reservation for <b>${listing.food_name}</b> at ${listing.business_name} has been cancelled because you did not arrive within your stated time. The food has been returned to the listing for others to claim.
          </p>
          <a href="https://gawaloop.com/browse" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;margin-top:12px;">Browse Available Food</a>
        `)).catch(() => {});
      }

      processed++;
    }

    return NextResponse.json({ success: true, processed });
  } catch (err) {
    console.error("eta-noshow-check error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
