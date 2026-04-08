import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, message, subject } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 });
    }

    // 1. Save to Supabase
    await supabase.from("contact_submissions").insert({
      name:    name.trim(),
      email:   email.trim().toLowerCase(),
      subject: subject || "Contact form submission",
      message: message.trim(),
      type:    "contact",
    });

    // 2. Send email to admin via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "GAWA Loop Contact <noreply@gawaloop.com>",
          to:   ["admin@gawaloop.com"],
          reply_to: email.trim(),
          subject: `New contact from ${name.trim()} — GAWA Loop`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px;">
              <div style="background:#0a2e1a;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
                <h2 style="color:#4ade80;margin:0;font-size:18px;">New Contact Form Submission</h2>
                <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:13px;">gawaloop.com</p>
              </div>
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;width:110px;">Name</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-weight:600;color:#111;">${name.trim()}</td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;">Email</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;"><a href="mailto:${email.trim()}" style="color:#16a34a;">${email.trim()}</a></td></tr>
                <tr><td style="padding:10px 0;color:#6b7280;vertical-align:top;padding-top:14px;">Message</td><td style="padding:10px 0;color:#111;padding-top:14px;line-height:1.6;">${message.trim().replace(/\n/g, "<br/>")}</td></tr>
              </table>
              <p style="margin-top:24px;font-size:12px;color:#9ca3af;">Reply directly to this email to respond to ${name.trim()}.</p>
            </div>
          `,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Contact route error:", err.message);
    return NextResponse.json({ success: false, error: "Server error." }, { status: 500 });
  }
}
