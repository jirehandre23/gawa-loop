"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Suspense } from "react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function ResetContent() {
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [status, setStatus]       = useState<"idle"|"loading"|"success"|"error">("idle");
  const [message, setMessage]     = useState("");
  const [ready, setReady]         = useState(false);

  useEffect(() => {
    // Supabase puts the token in the URL hash — this detects the session
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      setStatus("error");
      return;
    }
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      setStatus("error");
    } else {
      setStatus("success");
      setMessage("Password updated! You can now log in with your new password.");
    }
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: "8px",
    border: "1px solid #d1d5db", fontSize: "15px", color: "#111827",
    background: "#fff", outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", padding: "24px" }}>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "20px", padding: "40px", maxWidth: "420px", width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>

        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width: "48px", height: "48px", objectFit: "contain", marginBottom: "12px" }} />
          <h1 style={{ margin: "0 0 6px", fontSize: "22px", fontWeight: 800, color: "#0a2e1a" }}>Set New Password</h1>
          <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>GAWA Loop Business Account</p>
        </div>

        {status === "success" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
            <p style={{ fontSize: "15px", color: "#16a34a", fontWeight: 600, marginBottom: "24px" }}>{message}</p>
            <a href="/business/login" style={{ display: "inline-block", background: "#16a34a", color: "#fff", padding: "12px 28px", borderRadius: "10px", textDecoration: "none", fontWeight: 700 }}>
              Go to Login
            </a>
          </div>
        ) : !ready ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <p style={{ color: "#6b7280", fontSize: "14px" }}>
              ⏳ Verifying your reset link... If nothing happens, please check your email and click the link again.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                New Password
              </label>
              <input style={inp} type="password" placeholder="Minimum 6 characters" required
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                Confirm Password
              </label>
              <input style={inp} type="password" placeholder="Repeat your new password" required
                value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
            {message && status === "error" && (
              <p style={{ margin: "0 0 14px", fontSize: "13px", color: "#dc2626", fontWeight: 600 }}>{message}</p>
            )}
            <button type="submit" disabled={status === "loading"}
              style={{ width: "100%", background: status === "loading" ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", padding: "13px", borderRadius: "10px", cursor: status === "loading" ? "not-allowed" : "pointer", fontSize: "15px", fontWeight: 700 }}>
              {status === "loading" ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>}>
      <ResetContent />
    </Suspense>
  );
}
