import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SupportBody = {
  name: string;
  email: string;
  phone?: string;
  confirmationCode?: string;
  issueType: string;
  message: string;
};

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "GAWA Loop <no-reply@gawaloop.com>",
      to: [to],
      subject,
      html,
    }),
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SupportBody;
    const { name, email, phone, confirmationCode, issueType, message } = body;

    if (!name || !email || !issueType || !message) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase server configuration." },
        { status: 500 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    await admin.from("support_issues").insert({
      name,
      email,
      phone: phone || null,
      confirmation_code: confirmationCode || null,
      issue_type: issueType,
      message,
    });

    const adminHtml = `
      <h2>New customer support issue</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
      <p><strong>Confirmation code:</strong> ${confirmationCode || "Not provided"}</p>
      <p><strong>Issue type:</strong> ${issueType}</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
    `;

    const customerHtml = `
      <h2>We received your issue report</h2>
      <p>Hello ${name},</p>
      <p>We received your message and will review it.</p>
      <p><strong>Issue type:</strong> ${issueType}</p>
      <p><strong>Confirmation code:</strong> ${confirmationCode || "Not provided"}</p>
      <p>You can expect a follow-up from admin@gawaloop.com.</p>
    `;

    try {
      await Promise.all([
        sendEmail("admin@gawaloop.com", "New support issue", adminHtml),
        sendEmail(email, "We received your GAWA Loop issue report", customerHtml),
      ]);
    } catch (emailError) {
      console.error("Support email failed", emailError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("support-issue error", error);
    return NextResponse.json(
      { error: "Could not submit support issue." },
      { status: 500 }
    );
  }
}
