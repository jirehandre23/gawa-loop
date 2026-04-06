"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResetPassword() {
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState("");
  const [ready, setReady]         = useState(false);

  useEffect(() => {
    // Supabase sets the session automatically from the URL hash
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
      else setError("Invalid or expired reset link. Please request a new one.");
    });
  }, []);

  const inp: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: "8px",
    border: "1px solid #d1d5db", fontSize: "14px", color: "#111827",
    outline: "none", boxSizing: "border-box", background: "#fff",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setSubmitting(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) { setError(updateErr.message); setSubmitting(false); return; }
    setDone(true);
    setSubmitting(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: "32px 16px", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", display: "flex", alignItems: "center" }}>
      <div style={{ maxWidth: "440px", width: "100%", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <a href="/"><img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width: "52px", height: "52px", objectFit: "contain", marginBottom: "8px" }}/></a>
          <h1 style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: 800, color: "#0a2e1a" }}>Set New Password</h1>
          <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>Choose a new password for your account</p>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          {done ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>✅</div>
              <h2 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: 800, color: "#0a2e1a" }}>Password updated!</h2>
              <p style={{ margin: "0 0 20px", fontSize: "14px", color: "#6b7280" }}>Your password has been changed. You can now sign in.</p>
              <a href="/customer/login" style={{ display: "inline-block", background: "#16a34a", color: "#fff", fontWeight: 700, padding: "12px 28px", borderRadius: "10px", textDecoration: "none", fontSize: "15px" }}>
                Sign In
              </a>
            </div>
          ) : error && !ready ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚠️</div>
              <p style={{ margin: "0 0 20px", fontSize: "14px", color: "#991b1b" }}>{error}</p>
              <a href="/customer/login" style={{ display: "inline-block", background: "#16a34a", color: "#fff", fontWeight: 700, padding: "12px 28px", borderRadius: "10px", textDecoration: "none", fontSize: "15px" }}>
                Back to Sign In
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", color: "#991b1b", fontSize: "13px" }}>{error}</div>}
              <div style={{ marginBottom: "14px" }}>
                <label style={lbl}>New Password *</label>
                <input style={inp} type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters"/>
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={lbl}>Confirm Password *</label>
                <input style={inp} type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}/>
              </div>
              <button type="submit" disabled={submitting || !ready}
                style={{ width: "100%", background: (submitting || !ready) ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", padding: "13px", borderRadius: "10px", cursor: (submitting || !ready) ? "not-allowed" : "pointer", fontSize: "15px", fontWeight: 700 }}>
                {submitting ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
