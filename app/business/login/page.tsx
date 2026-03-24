"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_EMAIL = "admin@gawaloop.com";

export default function BusinessLogin() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
      return;
    }

    // Admin goes to admin panel, everyone else to dashboard
    if (data.user?.email === ADMIN_EMAIL) {
      window.location.href = "/admin/business-lookup";
    } else {
      window.location.href = "/business/dashboard";
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError("Please enter your email address first, then click Forgot your password.");
      return;
    }
    setResetLoading(true);
    setError("");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: "https://gawaloop.com/business/reset-password" }
    );

    if (resetError) {
      setError("Could not send reset email: " + resetError.message);
    } else {
      setResetSent(true);
    }
    setResetLoading(false);
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: "8px",
    border: "1px solid #d1d5db", fontSize: "15px", color: "#111827",
    background: "#fff", outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width: "52px", height: "52px", objectFit: "contain", marginBottom: "12px" }} />
          <h1 style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: 800, color: "#0a2e1a" }}>Business Login</h1>
          <p style={{ margin: 0, fontSize: "14px", color: "#4b5563" }}>Log in to manage your food listings and dashboard.</p>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "28px 32px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>

          {/* Success: reset email sent */}
          {resetSent ? (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div style={{ fontSize: "44px", marginBottom: "12px" }}>📧</div>
              <h2 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800, color: "#0a2e1a" }}>Check your email</h2>
              <p style={{ margin: "0 0 20px", fontSize: "14px", color: "#4b5563", lineHeight: "1.6" }}>
                We sent a password reset link to <b>{email}</b>. Click the link in the email to set a new password.
              </p>
              <button
                onClick={() => { setResetSent(false); setError(""); }}
                style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}
              >
                ← Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin}>
              {/* Error */}
              {error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" }}>
                  <p style={{ margin: 0, color: "#991b1b", fontSize: "13px", fontWeight: 500 }}>{error}</p>
                </div>
              )}

              {/* Email */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#111827", marginBottom: "6px" }}>
                  Business email
                </label>
                <input
                  style={inp}
                  type="email"
                  placeholder="you@yourbusiness.com"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: "8px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#111827", marginBottom: "6px" }}>
                  Password
                </label>
                <input
                  style={inp}
                  type="password"
                  placeholder="Your password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>

              {/* Forgot password */}
              <div style={{ textAlign: "right", marginBottom: "20px" }}>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  style={{ background: "none", border: "none", color: "#2563eb", fontSize: "13px", cursor: "pointer", fontWeight: 500, padding: 0 }}
                >
                  {resetLoading ? "Sending..." : "Forgot your password?"}
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{ width: "100%", background: loading ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", padding: "13px", borderRadius: "10px", cursor: loading ? "not-allowed" : "pointer", fontSize: "15px", fontWeight: 700 }}
              >
                {loading ? "Logging in..." : "Log In"}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "#6b7280" }}>
          Need help? Contact us at{" "}
          <a href="mailto:admin@gawaloop.com" style={{ color: "#16a34a", fontWeight: 600, textDecoration: "none" }}>
            admin@gawaloop.com
          </a>
        </p>

      </div>
    </div>
  );
}
