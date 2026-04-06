"use client";
import { useState } from "react";
import { detectLocale, Locale } from "@/lib/i18n";
import { useEffect } from "react";

export default function ContactPage() {
  const [locale, setLocale] = useState<Locale>("en");
  const [form, setForm]     = useState({ name: "", email: "", subject: "", message: "", type: "general" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => { setLocale(detectLocale()); }, []);
  const isRTL = locale === "ar";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.subject || !form.message) {
      setError("Please fill in all fields.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) { setDone(true); }
    else { setError(data.error || "Something went wrong. Please try again."); }
    setSubmitting(false);
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: "8px",
    border: "1px solid #d1d5db", fontSize: "14px", color: "#111827",
    outline: "none", boxSizing: "border-box", background: "#fff",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px",
  };

  if (done) return (
    <div dir={isRTL ? "rtl" : "ltr"}
      style={{ minHeight: "100vh", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: "20px", padding: "48px 40px", maxWidth: "480px", width: "100%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize: "64px", marginBottom: "16px" }}>📬</div>
        <h1 style={{ margin: "0 0 12px", fontSize: "24px", fontWeight: 800, color: "#0a2e1a" }}>Message Sent!</h1>
        <p style={{ margin: "0 0 24px", fontSize: "15px", color: "#6b7280", lineHeight: 1.6 }}>
          Thank you for reaching out! We have received your message and will get back to you within 24–48 hours. Check your email for a confirmation.
        </p>
        <a href="/" style={{ display: "inline-block", background: "#16a34a", color: "#fff", fontWeight: 700, padding: "13px 32px", borderRadius: "10px", textDecoration: "none", fontSize: "15px" }}>
          Back to Home
        </a>
      </div>
    </div>
  );

  return (
    <div dir={isRTL ? "rtl" : "ltr"}
      style={{ minHeight: "100vh", background: "#f3f4f6", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* Nav */}
      <nav style={{ background: "#0a2e1a", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width: "32px", height: "32px", objectFit: "contain" }}/>
          <span style={{ fontWeight: 800, fontSize: "16px", color: "#fff" }}>GAWA Loop</span>
        </a>
        <a href="/browse" style={{ color: "#4ade80", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>Browse Food</a>
      </nav>

      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "48px 16px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{ margin: "0 0 12px", fontSize: "36px", fontWeight: 800, color: "#0a2e1a" }}>Get in Touch</h1>
          <p style={{ margin: 0, fontSize: "16px", color: "#6b7280", lineHeight: 1.6 }}>
            Have a question, need help, or want to partner with us? We would love to hear from you.
          </p>
        </div>

        {/* Type selector */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "32px" }}>
          {[
            { val: "general",     label: "💬 General",    desc: "Questions and feedback" },
            { val: "support",     label: "🆘 Support",    desc: "Need help with something" },
            { val: "partnership", label: "🤝 Partnership", desc: "Work with us" },
          ].map(opt => (
            <button key={opt.val} onClick={() => setForm(f => ({ ...f, type: opt.val }))}
              style={{ padding: "16px 12px", borderRadius: "12px", border: `2px solid ${form.type === opt.val ? "#16a34a" : "#e5e7eb"}`, background: form.type === opt.val ? "#f0fdf4" : "#fff", cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}>
              <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700, color: form.type === opt.val ? "#16a34a" : "#374151" }}>{opt.label}</p>
              <p style={{ margin: 0, fontSize: "11px", color: "#9ca3af" }}>{opt.desc}</p>
            </button>
          ))}
        </div>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "36px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", marginBottom: "20px", color: "#991b1b", fontSize: "13px" }}>
                {error}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={lbl}>Your Name *</label>
                <input style={inp} required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name"/>
              </div>
              <div>
                <label style={lbl}>Email *</label>
                <input style={inp} type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Subject *</label>
                <input style={inp} required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="What is this about?"/>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Message *</label>
                <textarea style={{ ...inp, height: "140px", resize: "vertical" }} required value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Tell us more..."/>
              </div>
            </div>
            <button type="submit" disabled={submitting}
              style={{ marginTop: "24px", width: "100%", background: submitting ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", padding: "14px", borderRadius: "10px", cursor: submitting ? "not-allowed" : "pointer", fontSize: "16px", fontWeight: 700 }}>
              {submitting ? "Sending..." : "Send Message"}
            </button>
          </form>
          <div style={{ marginTop: "24px", display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
              📧 <a href="mailto:admin@gawaloop.com" style={{ color: "#16a34a", fontWeight: 600, textDecoration: "none" }}>admin@gawaloop.com</a>
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>📍 Brooklyn, New York</p>
          </div>
        </div>
      </div>
    </div>
  );
}
