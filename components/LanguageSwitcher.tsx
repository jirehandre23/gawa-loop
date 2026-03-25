"use client";
import { Locale, LANG_NAME, FLAG, setLocale, detectLocale } from "@/lib/i18n";
import { useState, useEffect } from "react";

const LOCALES: Locale[] = ["en", "fr", "es", "pt", "ar"];

export default function LanguageSwitcher() {
  const [current, setCurrent] = useState<Locale>("en");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setCurrent(detectLocale());
  }, []);

  return (
    <div style={{ position: "relative", zIndex: 999 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
          color: "#fff", padding: "6px 12px", borderRadius: "8px", cursor: "pointer",
          fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px",
          backdropFilter: "blur(4px)"
        }}
      >
        {FLAG[current]} {LANG_NAME[current]} ▾
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden", minWidth: "160px"
        }}>
          {LOCALES.map(loc => (
            <button key={loc} onClick={() => { setLocale(loc); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: "10px", width: "100%",
                padding: "10px 16px", background: loc === current ? "#f0fdf4" : "#fff",
                border: "none", cursor: "pointer", fontSize: "14px",
                color: loc === current ? "#16a34a" : "#111827",
                fontWeight: loc === current ? 700 : 400,
                borderBottom: "1px solid #f3f4f6", textAlign: "left"
              }}>
              {FLAG[loc]} {LANG_NAME[loc]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
