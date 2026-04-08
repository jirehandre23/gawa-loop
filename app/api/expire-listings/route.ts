import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, emailWrapper } from "@/lib/email";

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const authHeader = req.headers.get("authorization");
  const secret     = req.nextUrl.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;
  const validVercelCron = authHeader === `Bearer ${cronSecret}`;
  const validManual     = secret === cronSecret;
  if (cronSecret && !validVercelCron && !validManual) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();

  // 1. RESERVED listings past reserved_until → no-show
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
        await supabase.from("claims")
          .update({ status: "noshow", noshow: true, noshow_at: now })
          .eq("id", activeClaim.id);

        // Escalating suspension check
        const { data: result } = await supabase.rpc("handle_customer_noshow", {
          p_email: activeClaim.email,
        });

        if (result && activeClaim.email) {
          const name = activeClaim.first_name || "there";

          if (result.suspended && result.permanent) {
            // PERMANENT BAN email
            await sendEmail(activeClaim.email, "Your GAWA Loop account has been permanently banned",
              emailWrapper(`
                <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#991b1b;">Account Permanently Banned</h2>
                <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${name},</p>
                <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
                  <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#991b1b;">Your account has been permanently banned from GAWA Loop.</p>
                  <p style="margin:0;font-size:14px;color:#374151;">This is the result of 4 separate suspensions due to repeated no-shows. Every missed pickup means real food goes to waste and someone else misses a meal.</p>
                </div>
                <p style="font-size:13px;color:#9ca3af;">If you believe this is an error, contact admin@gawaloop.com</p>
              `)
            );
          } else if (result.suspended) {
            // SUSPENSION email (1 wk / 3 wks / 8 wks)
            const weeks = result.suspension_weeks;
            const count = result.suspension_count;
            const until = new Date(result.suspended_until).toLocaleDateString("en-US", {
              weekday: "long", year: "numeric", month: "long", day: "numeric"
            });
            const nextWarning = count === 1 ? "A second suspension will last 3 weeks." :
                                count === 2 ? "A third suspension will last 8 weeks." :
                                "One more suspension will result in a permanent ban.";
            await sendEmail(activeClaim.email, `Your GAWA Loop account is suspended for ${weeks} week${weeks > 1 ? "s" : ""}`,
              emailWrapper(`
                <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">Account Suspended</h2>
                <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${name},</p>
                <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
                  <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#991b1b;">Your account is suspended for ${weeks} week${weeks > 1 ? "s" : ""}, until ${until}.</p>
                  <p style="margin:0;font-size:14px;color:#374151;">You have missed 3 food pickups without cancelling. When you reserve food, a real organization holds it for you — no-shows mean food goes to waste.</p>
                </div>
                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin-bottom:20px;">
                  <p style="margin:0;font-size:13px;color:#92400e;">⚠️ ${nextWarning}</p>
                </div>
                <p style="font-size:14px;color:#374151;line-height:1.6;">After ${until}, your account will be restored automatically. Always cancel reservations you can't make — it takes one tap in your profile.</p>
                <p style="font-size:13px;color:#9ca3af;">Questions? Contact admin@gawaloop.com</p>
              `)
            );
          } else if (result.noshow_count % 3 !== 0) {
            // WARNING email (no-shows 1, 2 before first suspension; 4, 5 before second, etc.)
            const remaining = 3 - (result.noshow_count % 3);
            await sendEmail(activeClaim.email, "⚠️ Missed pickup warning — GAWA Loop",
              emailWrapper(`
                <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">Missed Pickup Warning</h2>
                <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${name},</p>
                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
                  <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#92400e;">You missed a food pickup without cancelling your reservation.</p>
                  <p style="margin:0;font-size:14px;color:#374151;">You have <b>${remaining} more missed pickup${remaining > 1 ? "s" : ""}</b> before your account is temporarily suspended.</p>
                </div>
                <p style="font-size:14px;color:#374151;line-height:1.6;">If you can't make it to a pickup, please cancel your reservation in your profile so the food can go to someone else.</p>
                <div style="text-align:center;margin-top:20px;">
                  <a href="https://gawaloop.com/customer/profile" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">View My Profile</a>
                </div>
              `)
            );
          }
        }
      }

      // Return listing to AVAILABLE
      await supabase.from("listings")
        .update({ status: "AVAILABLE", reserved_until: null, claim_code: null })
        .eq("id", listing.id);

      noshowCount++;
    }
  }

  // 2. AVAILABLE listings past expires_at → EXPIRED
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
    ran_at: now,
  });
}
