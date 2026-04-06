import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailWrapper } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { name, email, subject, message, type } = await req.json();

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  // Save to database
  const { error: dbErr } = await supabase.from("contact_submissions").insert({
    name, email, subject, message, type: type || "general",
  });

  if (dbErr) {
    return NextResponse.json({ error: "Failed to save submission." }, { status: 500 });
  }

  // Email to Jireh
  await sendEmail(
    "jireh@gawaloop.com",
    `📬 New ${type === "partnership" ? "Partnership" : type === "support" ? "Support" : "Contact"} Message — ${name}`,
    emailWrapper(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:800;color:#0a2e1a;">New Message from GAWA Loop Contact Form</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
        <tr><td style="padding:10px 14px;background:#f9fafb;font-weight:700;border-bottom:1px solid #e5e7eb;width:30%;">Name</td><td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;">${name}</td></tr>
        <tr><td style="padding:10px 14px;background:#f9fafb;font-weight:700;border-bottom:1px solid #e5e7eb;">Email</td><td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;"><a href="mailto:${email}" style="color:#16a34a;">${email}</a></td></tr>
        <tr><td style="padding:10px 14px;background:#f9fafb;font-weight:700;border-bottom:1px solid #e5e7eb;">Type</td><td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;">${type || "general"}</td></tr>
        <tr><td style="padding:10px 14px;background:#f9fafb;font-weight:700;border-bottom:1px solid #e5e7eb;">Subject</td><td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;">${subject}</td></tr>
        <tr><td style="padding:10px 14px;background:#f9fafb;font-weight:700;">Message</td><td style="padding:10px 14px;white-space:pre-wrap;">${message}</td></tr>
      </table>
      <p style="font-size:13px;color:#6b7280;">Reply directly to ${email}</p>
    `)
  ).catch(() => {});

  // Auto-reply to sender
  await sendEmail(
    email,
    "We received your message — GAWA Loop",
    emailWrapper(`
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Message Received! 📬</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.6;">
        Hi ${name}, thank you for reaching out to GAWA Loop. We have received your message and will get back to you within 24–48 hours.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0a2e1a;">Your message:</p>
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;white-space:pre-wrap;">${message}</p>
      </div>
      <p style="font-size:13px;color:#6b7280;">
        Questions? Reply to this email or contact us at <a href="mailto:admin@gawaloop.com" style="color:#16a34a;">admin@gawaloop.com</a>
      </p>
    `)
  ).catch(() => {});

  return NextResponse.json({ success: true });
}
