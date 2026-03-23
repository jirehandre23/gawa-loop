import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase server configuration.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

async function sendEmailSafe(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || !params.to) {
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "GAWA Loop <no-reply@gawaloop.com>",
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Resend send failed:", text);
    }
  } catch (error) {
    console.error("Support email send failed:", error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = (body?.name || "").trim();
    const email = (body?.email || "").trim();
    const phone = (body?.phone || "").trim() || null;
    const confirmationCode = (body?.confirmationCode || "").trim() || null;
    const issueType = (body?.issueType || "").trim();
    const message = (body?.message || "").trim();

    if (!name || !email || !issueType || !message) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    const { error: insertError } = await admin.from("support_issues").insert({
      name,
      email,
      phone,
      confirmation_code: confirmationCode,
      issue_type: issueType,
      message,
    });

    if (insertError) {
      return NextResponse.json(
        { error: "Could not submit issue." },
        { status: 500 }
      );
    }

    const adminHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>New GAWA Loop support issue</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
        <p><strong>Confirmation code:</strong> ${confirmationCode || "Not provided"}</p>
        <p><strong>Issue type:</strong> ${issueType}</p>
        <p><strong>Message:</strong><br/>${message}</p>
      </div>
    `;

    const customerHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>We received your support request</h2>
        <p>Hi ${name},</p>
        <p>Your GAWA Loop support request has been received.</p>
        <p><strong>Issue type:</strong> ${issueType}</p>
        <p><strong>Confirmation code:</strong> ${confirmationCode || "Not provided"}</p>
        <p>We will review it as soon as possible.</p>
      </div>
    `;

    await Promise.all([
      sendEmailSafe({
        to: "admin@gawaloop.com",
        subject: "New GAWA Loop support issue",
        html: adminHtml,
      }),
      sendEmailSafe({
        to: email,
        subject: "We received your GAWA Loop support request",
        html: customerHtml,
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("support-issue error:", error);
    return NextResponse.json(
      { error: "Could not submit issue." },
      { status: 500 }
    );
  }
}
