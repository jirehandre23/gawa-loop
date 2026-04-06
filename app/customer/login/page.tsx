"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CustomerLogin() {
  const [form, setForm]         = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState("");

  const inp: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: "8px",
    border: "1px solid #d1d5db", fontSize: "14px", color: "#111827",
    outline: "none", boxSizing: "border-box", background: "#fff",
  };
  const lbl: React.CSSProperties = { display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSubmitting(true);
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    if (authErr) { setError(authErr.message); setSubmitting(false); return; }
    window.location.href = "/browse";
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: "32px 16px", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", display: "flex", alignItems: "center" }}>
      <div style={{ maxWidth: "440px", width: "100%", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <a href="/"><img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width: "52px", height: "52px", objectFit: "contain", marginBottom: "8px" }}/></a>
          <h1 style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: 800, color: "#0a2e1a" }}>Welcome Back</h1>
          <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>Sign in to claim free food near you</p>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", color: "#991b1b", fontSize: "13px" }}>
                {error}
              </div>
            )}
            <div style={{ marginBottom: "14px" }}>
              <label style={lbl}>Email *</label>
              <input style={inp} type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/>
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={lbl}>Password *</label>
              <input style={inp} type="password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}/>
            </div>
            <button type="submit" disabled={submitting}
              style={{ width: "100%", background: submitting ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", padding: "13px", borderRadius: "10px", cursor: submitting ? "not-allowed" : "pointer", fontSize: "15px", fontWeight: 700 }}>
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p style={{ textAlign: "center", marginTop: "16px", fontSize: "13px", color: "#6b7280" }}>
            New here?{" "}
            <a href="/customer/signup" style={{ color: "#16a34a", fontWeight: 600, textDecoration: "none" }}>Create free account</a>
          </p>
          <p style={{ textAlign: "center", marginTop: "8px", fontSize: "13px", color: "#6b7280" }}>
            Are you a business?{" "}
            <a href="/business/login" style={{ color: "#16a34a", fontWeight: 600, textDecoration: "none" }}>Business login</a>
          </p>
        </div>
      </div>
    </div>
  );
}
