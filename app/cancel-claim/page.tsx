"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { detectLocale, t, Locale } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

function CancelContent() {
  const params = useSearchParams();
  const id = params.get("id");
  const code = params.get("code");
  const [locale, setLocale] = useState<Locale>("en");
  const [status, setStatus] = useState<"loading"|"success"|"already"|"expired"|"error">("loading");
  const [info, setInfo] = useState<{ food?: string; business?: string; relisted?: boolean }>({});

  useEffect(() => { setLocale(detectLocale()); }, []);

  useEffect(() => {
    if (!id || !code) { setStatus("error"); return; }
    fetch(`/api/cancel-claim?id=${encodeURIComponent(id)}&code=${encodeURIComponent(code)}`)
      .then(r => r.json())
      .then(d => {
        setInfo({ food: d.food, business: d.business, relisted: d.relisted });
        if (d.success)       setStatus("success");
        else if (d.already)  setStatus("already");
        else if (d.expired)  setStatus("expired");
        else                 setStatus("error");
      })
      .catch(() => setStatus("error"));
  }, [id, code]);

  const T = t[locale];
  const isRTL = locale === "ar";

  const cfg: Record<string, { icon: string; title: string; color: string; bg: string; border: string }> = {
    loading: { icon: "⏳", title: "...",                          color: "#374151", bg: "#f9fafb", border: "#e5e7eb" },
    success: { icon: "✅", title: T.cancel_success_title,         color: "#166534", bg: "#f0fdf4", border: "#16a34a" },
    already: { icon: "ℹ️", title: T.cancel_already_title,         color: "#1e40af", bg: "#eff6ff", border: "#3b82f6" },
    expired: { icon: "⏰", title: T.cancel_expired_title,         color: "#92400e", bg: "#fffbeb", border: "#f59e0b" },
    error:   { icon: "❌", title: T.cancel_error_title,           color: "#991b1b", bg: "#fef2f2", border: "#ef4444" },
  };
  const c = cfg[status];

  const message: Record<string, string> = {
    loading: "...",
    success: T.cancel_success_msg,
    already: T.cancel_already_msg,
    expired: T.cancel_expired_msg,
    error:   T.cancel_error_msg,
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} style={{ minHeight:"100vh", background:"#f9fafb", display:"flex", alignItems:"center", justifyContent:"center", fontFamily: isRTL ? "'Noto Sans Arabic', sans-serif" : "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", padding:"24px" }}>
      <div style={{ position:"fixed", top:"16px", right:"16px" }}>
        <LanguageSwitcher />
      </div>
      <div style={{ background:c.bg, border:`2px solid ${c.border}`, borderRadius:"20px", padding:"48px 40px", maxWidth:"460px", width:"100%", textAlign:"center", boxShadow:"0 8px 32px rgba(0,0,0,0.08)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"10px", marginBottom:"32px" }}>
          <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width:"40px", height:"40px", objectFit:"contain" }} />
          <span style={{ fontWeight:800, fontSize:"20px", color:"#0a2e1a" }}>GAWA Loop</span>
        </div>
        <div style={{ fontSize:"56px", marginBottom:"16px", lineHeight:1 }}>{c.icon}</div>
        <h1 style={{ fontSize:"24px", fontWeight:800, color:c.color, margin:"0 0 12px" }}>{c.title}</h1>
        <p style={{ fontSize:"15px", color:c.color, lineHeight:1.6, margin:"0 0 32px", opacity:0.9 }}>{message[status]}</p>
        {status !== "loading" && (
          <a href="/browse" style={{ display:"inline-block", background:"#16a34a", color:"#fff", fontWeight:700, fontSize:"15px", padding:"14px 32px", borderRadius:"12px", textDecoration:"none" }}>
            {T.browse_more}
          </a>
        )}
        <p style={{ fontSize:"12px", color:"#9ca3af", marginTop:"28px" }}>gawaloop.com</p>
      </div>
    </div>
  );
}

export default function CancelClaimPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>Loading...</div>}>
      <CancelContent />
    </Suspense>
  );
}
