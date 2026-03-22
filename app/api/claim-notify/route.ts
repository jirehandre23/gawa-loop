import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      customerEmail,
      customerName,
      businessName,
      foodName,
      address,
      confirmationCode,
      etaMinutes,
      adminEmail,
    } = body;

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      return NextResponse.json(
        { error: "Missing RESEND_API_KEY" },
        { status: 500 }
      );
    }

    const from = "GAWA Loop <no-reply@gawaloop.com>";

    if (customerEmail) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [customerEmail],
          subject: "Your GAWA Loop reservation confirmation",
          html: `
            <h2>Your reservation is confirmed</h2>
            <p>Hi ${customerName || "there"},</p>
            <p>Your food reservation has been confirmed.</p>
            <p><strong>Business:</strong> ${businessName}</p>
            <p><strong>Food:</strong> ${foodName}</p>
            <p><strong>Pickup address:</strong> ${address}</p>
            <p><strong>ETA selected:</strong> ${etaMinutes} minutes</p>
            <p><strong>Confirmation code:</strong> ${confirmationCode}</p>
            <p>Please show this code at pickup.</p>
          `,
        }),
      });
    }

    if (adminEmail) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [adminEmail],
          subject: "New food claim on GAWA Loop",
          html: `
            <h2>New claim received</h2>
            <p><strong>Customer:</strong> ${customerName}</p>
            <p><strong>Customer email:</strong> ${customerEmail}</p>
            <p><strong>Business:</strong> ${businessName}</p>
            <p><strong>Food:</strong> ${foodName}</p>
            <p><strong>Pickup address:</strong> ${address}</p>
            <p><strong>ETA:</strong> ${etaMinutes} minutes</p>
            <p><strong>Confirmation code:</strong> ${confirmationCode}</p>
          `,
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("claim-notify error", error);
    return NextResponse.json(
      { error: "Could not send notification email" },
      { status: 500 }
    );
  }
}
