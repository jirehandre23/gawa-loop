export async function sendEmail(to: string, subject: string, html: string) {
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "GAWA Loop <noreply@gawaloop.com>",
        to,
        subject,
        html,
      }),
    });
  } catch (_) {}
}

// Real GAWA Loop logo — used in all emails
export const EMAIL_LOGO = `<img src="https://gawaloop.com/gawa-logo-green.png" width="48" height="48" style="object-fit:contain;display:block;margin:0 auto 8px;" alt="GAWA Loop"/>`;

export const EMAIL_HEADER = `
<div style="background:#0a2e1a;padding:28px 32px;text-align:center;">
  ${EMAIL_LOGO}
  <p style="margin:0;font-size:20px;font-weight:800;color:#fff;letter-spacing:0.5px;">GAWA Loop</p>
  <p style="margin:4px 0 0;font-size:12px;color:#a3c9b0;">Free food. Less waste. Real impact.</p>
</div>`;

export const EMAIL_FOOTER = `
<div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
  <p style="margin:0;font-size:12px;color:#9ca3af;">gawaloop.com · Free food. Less waste. Real impact.</p>
</div>`;

export function emailWrapper(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:540px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    ${EMAIL_HEADER}
    <div style="padding:32px;">
      ${content}
    </div>
    ${EMAIL_FOOTER}
  </div>
</body></html>`;
}
