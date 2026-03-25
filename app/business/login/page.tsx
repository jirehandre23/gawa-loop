"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { detectLocale, t, Locale } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_EMAIL = "admin@gawaloop.com";

export default function BusinessLogin() {
  const [locale, setLocale]         = useState<Locale>("en");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [resetSent, setResetSent]   = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => { setLocale(detectLocale()); }, []);

  const T = t[locale];
  const isRTL = locale === "ar";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(), password,
    });
    if (authError) { setError(T.login_error); setLoading(false); return; }
    window.location.href = data.user?.email === ADMIN_EMAIL ? "/admin/business-lookup" : "/business/dashboard";
  }

  async function handleForgotPassword() {
    if (!email.trim()) { setError(T.login_error); return; }
    setResetLoading(true); setError("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: "https://gawaloop.com/business/reset-password" }
    );
    if (resetError) setError(resetError.message);
    else setResetSent(true);
    setResetLoading(false);
  }

  const inp: React.CSSProperties = {
    width:"100%", padding:"12px 14px", borderRadius:"8px", border:"1px solid #d1d5db",
    fontSize:"15px", color:"#111827", background:"#fff", outline:"none", boxSizing:"border-box",
    textAlign: isRTL ? "right" : "left",
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} style={{ minHeight:"100vh", background:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", fontFamily: isRTL ? "'Noto Sans Arabic', sans-serif" : "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", padding:"24px" }}>
      <div style={{ position:"fixed", top:"16px", right:"16px" }}>
        <LanguageSwitcher />
      </div>
      <div style={{ width:"100%", maxWidth:"400px" }}>
        <div style={{ textAlign:"center", marginBottom:"28px" }}>
          <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width:"52px", height:"52px", objectFit:"contain", marginBottom:"12px" }} />
          <h1 style={{ margin:"0 0 4px", fontSize:"26px", fontWeight:800, color:"#0a2e1a" }}>{T.login_title}</h1>
          <p style={{ margin:0, fontSize:"14px", color:"#4b5563" }}>{T.login_subtitle}</p>
        </div>
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:"16px", padding:"28px 32px", boxShadow:"0 4px 20px rgba(0,0,0,0.06)" }}>
          {resetSent ? (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:"44px", marginBottom:"12px" }}>📧</div>
              <h2 style={{ margin:"0 0 8px", fontSize:"18px", fontWeight:800, color:"#0a2e1a" }}>{T.login_reset_sent}</h2>
              <p style={{ margin:"0 0 20px", fontSize:"14px", color:"#374151", lineHeight:"1.6" }}>{T.login_reset_msg} <b>{email}</b></p>
              <button onClick={() => { setResetSent(false); setError(""); }}
                style={{ background:"#f3f4f6", color:"#374151", border:"1px solid #e5e7eb", padding:"10px 20px", borderRadius:"8px", cursor:"pointer", fontSize:"14px", fontWeight:600 }}>
                {T.login_back}
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin}>
              {error && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"8px", padding:"10px 14px", marginBottom:"16px" }}><p style={{ margin:0, color:"#991b1b", fontSize:"13px" }}>{error}</p></div>}
              <div style={{ marginBottom:"16px" }}>
                <label style={{ display:"block", fontSize:"13px", fontWeight:700, color:"#111827", marginBottom:"6px" }}>{T.login_email}</label>
                <input style={inp} type="email" required value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div style={{ marginBottom:"8px" }}>
                <label style={{ display:"block", fontSize:"13px", fontWeight:700, color:"#111827", marginBottom:"6px" }}>{T.login_password}</label>
                <input style={inp} type="password" required value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div style={{ textAlign: isRTL ? "left" : "right", marginBottom:"20px" }}>
                <button type="button" onClick={handleForgotPassword} disabled={resetLoading}
                  style={{ background:"none", border:"none", color:"#2563eb", fontSize:"13px", cursor:"pointer", fontWeight:500, padding:0 }}>
                  {resetLoading ? "..." : T.login_forgot}
                </button>
              </div>
              <button type="submit" disabled={loading}
                style={{ width:"100%", background: loading ? "#9ca3af" : "#16a34a", color:"#fff", border:"none", padding:"13px", borderRadius:"10px", cursor: loading ? "not-allowed" : "pointer", fontSize:"15px", fontWeight:700 }}>
                {loading ? T.login_loading : T.login_btn}
              </button>
            </form>
          )}
        </div>
        <p style={{ textAlign:"center", marginTop:"20px", fontSize:"13px", color:"#6b7280" }}>
          {T.login_help}{" "}
          <a href="mailto:admin@gawaloop.com" style={{ color:"#16a34a", fontWeight:600, textDecoration:"none" }}>admin@gawaloop.com</a>
        </p>
      </div>
    </div>
  );
}
