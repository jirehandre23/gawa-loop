"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { detectLocale, t, Locale } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Listing = {
  id: string; food_name: string; category: string; quantity: string;
  address: string; allergy_note: string; estimated_value: number;
  note: string; status: string; expires_at: string; created_at: string;
  business_name: string; maps_url?: string; claim_code?: string;
};

type ClaimForm = {
  first_name: string; email: string; phone: string; eta_minutes: string;
};

export default function BrowsePage() {
  const [locale, setLocale]       = useState<Locale>("en");
  const [listings, setListings]   = useState<Listing[]>([]);
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [claiming, setClaiming]   = useState<string | null>(null);
  const [form, setForm]           = useState<ClaimForm>({ first_name:"", email:"", phone:"", eta_minutes:"15" });
  const [claimed, setClaimed]     = useState<{ listingId: string; code: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [claimError, setClaimError] = useState("");

  useEffect(() => { setLocale(detectLocale()); }, []);

  useEffect(() => {
    async function load() {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "AVAILABLE")
        .gt("expires_at", now)
        .order("created_at", { ascending: false });
      setListings(data || []);
      setLoading(false);
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const T = t[locale];
  const isRTL = locale === "ar";

  const filtered = listings.filter(l =>
    !search || [l.food_name, l.business_name, l.address, l.note, l.category]
      .some(f => f?.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!claiming) return;
    setSubmitting(true); setClaimError("");
    const res = await fetch("/api/claim-submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, listing_id: claiming, eta_minutes: Number(form.eta_minutes) }),
    });
    const data = await res.json();
    if (data.success) {
      setClaimed({ listingId: claiming, code: data.code });
      setClaiming(null);
      setListings(prev => prev.filter(l => l.id !== claiming));
    } else {
      setClaimError(data.error || "Error");
    }
    setSubmitting(false);
  }

  const inp: React.CSSProperties = {
    width:"100%", padding:"10px 14px", borderRadius:"8px", border:"1px solid #d1d5db",
    fontSize:"14px", color:"#111827", background:"#fff", outline:"none", boxSizing:"border-box",
    textAlign: isRTL ? "right" : "left",
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} style={{ minHeight:"100vh", background:"#f9fafb", fontFamily: isRTL ? "'Noto Sans Arabic', sans-serif" : "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* Header */}
      <div style={{ background:"#0a2e1a", padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width:"36px", height:"36px", objectFit:"contain" }} />
          <span style={{ fontWeight:800, fontSize:"18px", color:"#fff" }}>GAWA Loop</span>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Hero */}
      <div style={{ background:"#0a2e1a", padding:"32px 24px 48px", textAlign:"center" }}>
        <h1 style={{ margin:"0 0 8px", fontSize:"28px", fontWeight:800, color:"#fff" }}>{T.browse_title}</h1>
        <p style={{ margin:"0 0 24px", fontSize:"15px", color:"#a3c9b0", maxWidth:"560px", marginLeft:"auto", marginRight:"auto" }}>{T.browse_subtitle}</p>
        <input
          style={{ width:"100%", maxWidth:"560px", padding:"14px 20px", borderRadius:"12px", border:"none", fontSize:"15px", outline:"none", color:"#111827", textAlign: isRTL ? "right" : "left" }}
          placeholder={T.browse_search}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Success claimed banner */}
      {claimed && (
        <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", margin:"24px auto", maxWidth:"600px", borderRadius:"12px", padding:"20px 24px", textAlign:"center" }}>
          <p style={{ margin:0, fontSize:"20px", fontWeight:800, color:"#166534" }}>{T.claim_success}</p>
          <p style={{ margin:"8px 0 0", fontSize:"32px", fontWeight:800, color:"#16a34a", letterSpacing:"4px" }}>{claimed.code}</p>
          <p style={{ margin:"8px 0 0", fontSize:"13px", color:"#6b7280" }}>{T.claim_show}</p>
        </div>
      )}

      <div style={{ maxWidth:"760px", margin:"0 auto", padding:"24px 16px" }}>
        {loading ? (
          <p style={{ textAlign:"center", color:"#6b7280" }}>...</p>
        ) : filtered.length === 0 ? (
          <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:"16px", padding:"60px", textAlign:"center" }}>
            <p style={{ fontSize:"48px", marginBottom:"12px" }}>🍽️</p>
            <h3 style={{ margin:"0 0 8px", color:"#0a2e1a", fontWeight:800 }}>{T.browse_empty}</h3>
            <p style={{ color:"#6b7280", fontSize:"14px" }}>{T.browse_empty_sub}</p>
          </div>
        ) : (
          filtered.map(listing => (
            <div key={listing.id} style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:"16px", padding:"24px", marginBottom:"16px", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px", flexWrap:"wrap", gap:"8px" }}>
                <h2 style={{ margin:0, fontSize:"20px", fontWeight:800, color:"#0a2e1a" }}>{listing.food_name}</h2>
                <span style={{ background:"#dcfce7", color:"#166534", fontSize:"12px", fontWeight:700, padding:"4px 12px", borderRadius:"20px" }}>
                  🟢 AVAILABLE
                </span>
              </div>
              <div style={{ fontSize:"14px", color:"#374151", lineHeight:"1.9" }}>
                <p style={{ margin:"2px 0" }}><b>{T.category}:</b> {listing.category}</p>
                <p style={{ margin:"2px 0" }}><b>{T.quantity}:</b> {listing.quantity}</p>
                <p style={{ margin:"2px 0" }}><b>{T.address}:</b> {listing.address}</p>
                {listing.allergy_note && <p style={{ margin:"2px 0" }}><b>{T.allergy}:</b> {listing.allergy_note}</p>}
                {listing.estimated_value > 0 && <p style={{ margin:"2px 0" }}><b>{T.value}:</b> ${Number(listing.estimated_value).toFixed(2)}</p>}
                <p style={{ margin:"2px 0" }}><b>{T.expires}:</b> {new Date(listing.expires_at).toLocaleString()}</p>
              </div>

              {/* Claim form */}
              {claiming === listing.id ? (
                <form onSubmit={handleClaim} style={{ marginTop:"16px", background:"#f9fafb", borderRadius:"12px", padding:"20px" }}>
                  <h3 style={{ margin:"0 0 16px", fontSize:"16px", fontWeight:800, color:"#0a2e1a" }}>{T.claim_title}</h3>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
                    <div>
                      <label style={{ display:"block", fontSize:"12px", fontWeight:600, color:"#374151", marginBottom:"4px" }}>{T.claim_name} *</label>
                      <input style={inp} required value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ display:"block", fontSize:"12px", fontWeight:600, color:"#374151", marginBottom:"4px" }}>{T.claim_email} *</label>
                      <input style={inp} type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ display:"block", fontSize:"12px", fontWeight:600, color:"#374151", marginBottom:"4px" }}>{T.claim_phone}</label>
                      <input style={inp} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ display:"block", fontSize:"12px", fontWeight:600, color:"#374151", marginBottom:"4px" }}>{T.claim_eta} *</label>
                      <select style={{ ...inp, cursor:"pointer" }} value={form.eta_minutes} onChange={e => setForm(f => ({ ...f, eta_minutes: e.target.value }))}>
                        <option value="5">5 min</option>
                        <option value="10">10 min</option>
                        <option value="15">15 min</option>
                        <option value="20">20 min</option>
                        <option value="30">30 min</option>
                        <option value="45">45 min</option>
                        <option value="60">1 hour</option>
                      </select>
                    </div>
                  </div>
                  {claimError && <p style={{ color:"#dc2626", fontSize:"13px", marginBottom:"8px" }}>{claimError}</p>}
                  <div style={{ display:"flex", gap:"10px" }}>
                    <button type="submit" disabled={submitting}
                      style={{ flex:1, background: submitting ? "#9ca3af" : "#16a34a", color:"#fff", border:"none", padding:"12px", borderRadius:"10px", cursor: submitting ? "not-allowed" : "pointer", fontSize:"15px", fontWeight:700 }}>
                      {submitting ? "..." : T.claim_submit}
                    </button>
                    <button type="button" onClick={() => setClaiming(null)}
                      style={{ background:"#f3f4f6", color:"#374151", border:"1px solid #e5e7eb", padding:"12px 20px", borderRadius:"10px", cursor:"pointer", fontSize:"14px" }}>
                      ✕
                    </button>
                  </div>
                </form>
              ) : (
                <button onClick={() => { setClaiming(listing.id); setClaimError(""); }}
                  style={{ marginTop:"16px", background:"#16a34a", color:"#fff", border:"none", padding:"12px 24px", borderRadius:"10px", cursor:"pointer", fontSize:"15px", fontWeight:700, width:"100%" }}>
                  {T.claim_btn}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
