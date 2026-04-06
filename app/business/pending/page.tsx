"use client";
export default function PendingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: "20px", padding: "48px 40px", maxWidth: "480px", width: "100%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize: "64px", marginBottom: "16px" }}>🕐</div>
        <h1 style={{ margin: "0 0 12px", fontSize: "24px", fontWeight: 800, color: "#0a2e1a" }}>Account Under Review</h1>
        <p style={{ margin: "0 0 24px", fontSize: "15px", color: "#6b7280", lineHeight: 1.7 }}>
          Your account is being reviewed by our team.<br/>
          You will receive an email within <b>24–48 hours</b> once your account is approved and ready to use.
        </p>
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "16px", marginBottom: "24px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#166534" }}>
            Questions? Contact us at{" "}
            <a href="mailto:admin@gawaloop.com" style={{ color: "#16a34a", fontWeight: 600 }}>admin@gawaloop.com</a>
          </p>
        </div>
        <a href="/" style={{ display: "inline-block", background: "#16a34a", color: "#fff", fontWeight: 700, padding: "13px 32px", borderRadius: "10px", textDecoration: "none", fontSize: "15px" }}>
          Back to Home
        </a>
      </div>
    </div>
  );
}
