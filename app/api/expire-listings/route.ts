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
        // Mark claim as noshow
        await supabase.from("claims")
          .update({ status: "noshow", noshow: true, noshow_at: now })
          .eq("id", activeClaim.id);

        // Increment no-show count and possibly suspend customer
        const { data: suspendResult } = await supabase.rpc("handle_customer_noshow", {
          p_email: activeClaim.email,
        });

        // If customer just got suspended, send them an email
        if (suspendResult?.suspended && activeClaim.email) {
          const suspendedUntil = new Date(suspendResult.suspended_until).toLocaleDateString("en-US", {
            weekday: "long", year: "numeric", month: "long", day: "numeric"
          });
          await sendEmail(
            activeClaim.email,
            "Your GAWA Loop account has been temporarily suspended",
            emailWrapper(`
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">Account Suspended</h2>
              <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${activeClaim.first_name},</p>
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
                <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#991b1b;">Your account has been suspended until ${suspendedUntil}.</p>
                <p style="margin:0;font-size:14px;color:#374151;">You have missed 3 food pickups without cancelling your reservation. When you reserve food, a real organization is holding it for you — no-shows mean that food goes to waste and others miss out.</p>
              </div>
              <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">
                After your suspension ends, your account will be restored. Please remember to cancel any reservation you can't make — it only takes a tap in your profile.
              </p>
              <p style="font-size:13px;color:#9ca3af;">Questions? Reply to this email or contact us at admin@gawaloop.com</p>
            `)
          );
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
    error: expireError?.message ?? null,
    ran_at: now,
  });
}
