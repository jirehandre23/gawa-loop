import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailWrapper } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, phone, address, type, account_type, password, description } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check if email already exists
  const { data: existing } = await supabase.from("businesses").select("id").eq("email", email).single();
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
  }

  // Create auth user (email confirmed so they can login once approved)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // Create business record with pending status
  const { data: biz, error: bizError } = await supabase.from("businesses").insert({
    name, email, phone: phone || null, address: address || null,
    type: type || "Restaurant",
    account_type: account_type || "restaurant",
    status: "pending",
    description: description || null,
  }).select().single();

  if (bizError) {
    // Rollback auth user
    if (authData?.user) await supabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: bizError.message }, { status: 500 });
  }

  const adminSecret = process.env.ADMIN_SECRET || "gawa2026secret";
  const approveUrl  = `https://gawaloop.com/api/approve-business?id=${biz.id}&action=approve&secret=${adminSecret}`;
  const rejectUrl   = `https://gawaloop.com/api/approve-business?id=${biz.id}&action=reject&secret=${adminSecret}`;
  const accType     = account_type === "ngo" ? "NGO / Food Bank" : "Restaurant / Business";

  // Email Jireh — review notification with one-click approve/reject
  await sendEmail("jireh@gawaloop.com", `🔔 New ${accType} signup — ${name}`,
    emailWrapper(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:800;color:#0a2e1a;">New Account Pending Review</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
        <tr><td style="padding:10px 12px;background:#f9fafb;font-weight:700;border-bottom:1px solid #e5e7eb;width:35%;">Name</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${name}</td></tr>
        <tr><td style="padding:10px 12px;background:#f9fafb;font-weight:700;border-bottom:1px solid #e5e7eb;">Account Type</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${accType}</td></tr>
        <tr><td style="padding:10px 12px;background:#f9fafb;font-weight:700;border-bottom:1px solid #e5e7eb;">Business Type</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${type}</td></tr>
        <tr><td style="padding:10px 12px;background:#f9fafb;font-weight:700;border-bottom:1px solid #e5e7eb;">Email</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${email}</td></tr>
        <tr><td style="padding:10px 12px;background:#f9fafb;font-weight:700;border-bottom:1px solid #e5e7eb;">Phone</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${phone || "Not provided"}</td></tr>
        <tr><td style="padding:10px 12px;background:#f9fafb;font-weight:700;border-bottom:1px solid #e5e7eb;">Address</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${address || "Not provided"}</td></tr>
        <tr><td style="padding:10px 12px;background:#f9fafb;font-weight:700;">Description</td><td style="padding:10px 12px;">${description || "Not provided"}</td></tr>
      </table>
      <p style="margin:0 0 20px;font-size:14px;color:#6b7280;text-align:center;">Click one of the buttons below to approve or reject this account.</p>
      <div style="display:flex;gap:16px;justify-content:center;">
        <a href="${approveUrl}" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;">✅ APPROVE</a>
        <a href="${rejectUrl}"  style="display:inline-block;background:#ef4444;color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;">❌ REJECT</a>
      </div>
    `)
  );

  // Email the applicant — pending review
  await sendEmail(email, "Your GAWA Loop application is under review",
    emailWrapper(`
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Application Received! 🙌</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${name}, thank you for applying to join GAWA Loop!</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:20px;">
        <p style="margin:0 0 6px;font-size:14px;color:#166534;font-weight:700;">What happens next?</p>
        <p style="margin:0;font-size:14px;color:#166534;line-height:1.6;">Our team will review your application within 24–48 hours. You will receive an email confirmation once your account is approved and ready to use.</p>
      </div>
      <p style="font-size:14px;color:#6b7280;margin:0;">Questions? Contact us at <a href="mailto:admin@gawaloop.com" style="color:#16a34a;">admin@gawaloop.com</a></p>
    `)
  );

  return NextResponse.json({ success: true });
}
