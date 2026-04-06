import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailWrapper } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("id");
  const action     = searchParams.get("action");
  const secret     = searchParams.get("secret");

  if (secret !== process.env.ADMIN_SECRET) {
    return new Response(`<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h1 style="color:#ef4444">❌ Unauthorized</h1></body></html>`, { headers: { "Content-Type": "text/html" } });
  }
  if (!businessId || !action) {
    return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
  }

  const { data: biz } = await supabase.from("businesses").select("*").eq("id", businessId).single();
  if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  if (action === "approve") {
    await supabase.from("businesses")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", businessId);

    await sendEmail(biz.email, "✅ Your GAWA Loop account is approved!",
      emailWrapper(`
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Welcome to GAWA Loop! 🎉</h2>
        <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${biz.name}, your account has been approved. You can now log in and start posting food listings.</p>
        <div style="text-align:center;margin-top:24px;">
          <a href="https://gawaloop.com/business/login" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:15px;padding:13px 32px;border-radius:12px;text-decoration:none;">Log In to Dashboard →</a>
        </div>
      `)
    );
    return new Response(`<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h1 style="color:#16a34a">✅ ${biz.name} approved!</h1><p>Approval email sent to ${biz.email}</p><p><a href="https://gawaloop.com">Back to GAWA Loop</a></p></body></html>`, { headers: { "Content-Type": "text/html" } });
  }

  if (action === "reject") {
    await supabase.from("businesses")
      .update({ status: "rejected", rejected_at: new Date().toISOString() })
      .eq("id", businessId);

    await sendEmail(biz.email, "Update on your GAWA Loop application",
      emailWrapper(`
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Application Update</h2>
        <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${biz.name}, unfortunately we are unable to approve your account at this time. If you believe this is a mistake, please contact us at admin@gawaloop.com.</p>
      `)
    );
    return new Response(`<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h1 style="color:#ef4444">❌ ${biz.name} rejected.</h1><p>Rejection email sent to ${biz.email}</p></body></html>`, { headers: { "Content-Type": "text/html" } });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
