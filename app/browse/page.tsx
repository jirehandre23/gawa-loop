
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
  address: string; maps_url?: string; allergy_note: string;
  estimated_value: number; note: string; status: string;
  expires_at: string; created_at: string; business_name: string;
};

export default function BrowsePage() {
  const [locale, setLocale]         = useState<Locale>("en");
  const [listings, setListings]     = useState<Listing[]>([]);
  const [search, setSearch]         = useState("");
  const [loading, setLoading]       = useState(true);
  const [claiming, setClaiming]     = useState<string | null>(null);
  const [firstName, setFirstName]   = useState("");
  const [email, setEmail]           = useState("");
  const [phone, setPhone]           = useState("");
  const [eta, setEta]               = useState(15);
  const [claimed, setClaimed]       = useState<{ code: string } | null>(null);
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

  async function handleClaim(e: React.FormEvent, listingId: string) {
    e.preventDefault();
    setSubmitting(true);
    setClaimError("");

    const res = await fetch("/api/claim-submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listing_id:  listingId,
        first_name:  firstName,
        email:       email,
        phone:       phone || null,
        eta_minutes: eta,
      }),
    });

    const data = await res.json();
    if (data.success) {
      setClaimed({ code: data.code });
      setClaiming(null);
      setListings(prev => prev.filter(l => l.id !== listingId));
      setFirstName(""); setEmail(""); setPhone(""); setEta(15);
    } else {
      setClaimError(data.error || "Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  function getMapsLinks(address: string, mapsUrl?: string) {
    const enc = encodeURIComponent(address);
    return {
      google: mapsUrl || `https://www.google.com/maps/search/?api=1&query=${enc}`,
      apple:  `https://maps.apple.com/?q=${enc}`,
      waze:   `https://waze.com/ul?q=${enc}`,
    };
  }

  const inp: React.CSSProperties = {
    width:"100%", padding:"10px 14px", borderRadius:"8px",
    border:"1px solid #d1d5db", fontSize:"14px",
    color:"#111827", background:"#fff", outline:"none", boxSizing:"border-box",
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} style={{ minHeight:"100vh", background:"#f9fafb", fontFamily: isRTL ? "'Noto Sans Arabic',sans-serif" : "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* Header — logo links to homepage */}
      <div style={{ background:"#0a2e1a", padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <a href="/" style={{ display:"flex", alignItems:"center", gap:"10px", textDecoration:"none" }}>
          <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width:"36px", height:"36px", objectFit:"contain" }} />
          <span style={{ fontWeight:800, fontSize:"18px", color:"#fff" }}>GAWA Loop</span>
        </a>
        <LanguageSwitcher />
      </div>

      {/* Hero */}
      <div style={{ background:"#0a2e1a", padding:"32px 24px 48px", textAlign:"center" }}>
        <h1 style={{ margin:"0 0 10px", fontSize:"28px", fontWeight:800, color:"#fff" }}>{T.browse_title}</h1>
        <p style={{ margin:"0 0 24px", fontSize:"15px", color:"#e2f5ea", maxWidth:"560px", marginLeft:"auto", marginRight:"auto", lineHeight:1.6 }}>
          {T.browse_subtitle}
        </p>
        {/* Search — white background, dark text, visible */}
        <div style={{ maxWidth:"560px", margin:"0 auto", position:"relative" }}>
          <span style={{ position:"absolute", left:"16px", top:"50%", transform:"translateY(-50%)", fontSize:"16px", pointerEvents:"none" }}>🔍</span>
          <input
            style={{ width:"100%", padding:"14px 20px 14px 48px", borderRadius:"12px", border:"2px solid #fff", fontSize:"15px", outline:"none", color:"#111827", background:"#fff", boxSizing:"border-box" }}
            placeholder={T.browse_search}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Claimed success banner */}
      {claimed && (
        <div style={{ background:"#f0fdf4", border:"2px solid #16a34a", margin:"24px auto", maxWidth:"600px", borderRadius:"16px", padding:"24px", textAlign:"center" }}>
          <p style={{ margin:"0 0 8px", fontSize:"18px", fontWeight:800, color:"#166534" }}>✅ {T.claim_success}</p>
          <p style={{ margin:"0 0 4px", fontSize:"48px", fontWeight:900, color:"#16a34a", letterSpacing:"8px" }}>{claimed.code}</p>
          <p style={{ margin:0, fontSize:"13px", color:"#6b7280" }}>{T.claim_show}</p>
        </div>
      )}

      {/* Listings */}
      <div style={{ maxWidth:"760px", margin:"0 auto", padding:"24px 16px" }}>
        {loading ? (
          <p style={{ textAlign:"center", color:"#6b7280", padding:"40px" }}>...</p>
        ) : filtered.length === 0 ? (
          <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:"16px", padding:"60px", textAlign:"center" }}>
            <p style={{ fontSize:"48px", marginBottom:"12px" }}>🍽️</p>
            <h3 style={{ margin:"0 0 8px", color:"#0a2e1a", fontWeight:800 }}>{T.browse_empty}</h3>
            <p style={{ color:"#6b7280", fontSize:"14px" }}>{T.browse_empty_sub}</p>
          </div>
        ) : filtered.map(listing => {
          const maps = getMapsLinks(listing.address, listing.maps_url);
          return (
            <div key={listing.id} style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:"16px", padding:"24px", marginBottom:"16px", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>

              {/* Title + badge */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"14px", gap:"8px" }}>
                <h2 style={{ margin:0, fontSize:"20px", fontWeight:800, color:"#0a2e1a" }}>{listing.food_name}</h2>
                <span style={{ background:"#dcfce7", color:"#166534", fontSize:"12px", fontWeight:700, padding:"4px 12px", borderRadius:"20px", flexShrink:0, display:"flex", alignItems:"center", gap:"5px" }}>
                  <span style={{ width:"7px", height:"7px", borderRadius:"50%", background:"#16a34a", display:"inline-block" }}></span>
                  AVAILABLE
                </span>
              </div>

              {/* Details */}
              <div style={{ fontSize:"14px", color:"#374151", lineHeight:"1.9" }}>
                <p style={{ margin:"2px 0" }}><b>{T.category}:</b> {listing.category || "N/A"}</p>
                <p style={{ margin:"2px 0" }}><b>{T.quantity}:</b> {listing.quantity || "N/A"}</p>
                {listing.allergy_note && <p style={{ margin:"2px 0" }}><b>{T.allergy}:</b> {listing.allergy_note}</p>}
                {listing.estimated_value > 0 && <p style={{ margin:"2px 0" }}><b>{T.value}:</b> ${Number(listing.estimated_value).toFixed(2)}</p>}
                {listing.note && <p style={{ margin:"2px 0" }}><b>Note:</b> {listing.note}</p>}
                <p style={{ margin:"2px 0" }}><b>{T.expires}:</b> {new Date(listing.expires_at).toLocaleString()}</p>
              </div>

              {/* Address + Maps — always visible, clickable */}
              <div style={{ marginTop:"14px", padding:"14px 16px", background:"#f9fafb", borderRadius:"12px", border:"1px solid #e5e7eb" }}>
                <p style={{ margin:"0 0 10px", fontSize:"14px", color:"#1f2937", fontWeight:600 }}>
                  📍 {listing.address}
                </p>
                <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                  <a href={maps.google} target="_blank" rel="noopener noreferrer"
                    style={{ display:"inline-flex", alignItems:"center", gap:"5px", background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:"8px", padding:"7px 14px", fontSize:"13px", fontWeight:600, color:"#374151", textDecoration:"none" }}>
                    🗺️ Google Maps
                  </a>
                  <a href={maps.apple} target="_blank" rel="noopener noreferrer"
                    style={{ display:"inline-flex", alignItems:"center", gap:"5px", background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:"8px", padding:"7px 14px", fontSize:"13px", fontWeight:600, color:"#374151", textDecoration:"none" }}>
                    🍎 Apple Maps
                  </a>
                  <a href={maps.waze} target="_blank" rel="noopener noreferrer"
                    style={{ display:"inline-flex", alignItems:"center", gap:"5px", background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:"8px", padding:"7px 14px", fontSize:"13px", fontWeight:600, color:"#374151", textDecoration:"none" }}>
                    🔵 Waze
                  </a>
                </div>
              </div>

              {/* Claim form */}
              {claiming === listing.id ? (
                <form onSubmit={e => handleClaim(e, listing.id)} style={{ marginTop:"16px", background:"#f9fafb", borderRadius:"12px", padding:"20px", border:"1px solid #e5e7eb" }}>
                  <h3 style={{ margin:"0 0 16px", fontSize:"16px", fontWeight:800, color:"#0a2e1a" }}>{T.claim_title}</h3>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
                    <div>
                      <label style={{ display:"block", fontSize:"12px", fontWeight:600, color:"#374151", marginBottom:"4px" }}>{T.claim_name} *</label>
                      <input style={inp} required value={firstName} onChange={e => setFirstName(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ display:"block", fontSize:"12px", fontWeight:600, color:"#374151", marginBottom:"4px" }}>{T.claim_email} *</label>
                      <input style={inp} type="email" required value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ display:"block", fontSize:"12px", fontWeight:600, color:"#374151", marginBottom:"4px" }}>{T.claim_phone}</label>
                      <input style={inp} type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ display:"block", fontSize:"12px", fontWeight:600, color:"#374151", marginBottom:"4px" }}>{T.claim_eta} *</label>
                      <select style={{ ...inp, cursor:"pointer" }} value={eta} onChange={e => setEta(Number(e.target.value))}>
                        <option value={5}>5 min</option>
                        <option value={10}>10 min</option>
                        <option value={15}>15 min</option>
                        <option value={20}>20 min</option>
                        <option value={30}>30 min</option>
                        <option value={45}>45 min</option>
                        <option value={60}>1 hour</option>
                      </select>
                    </div>
                  </div>
                  {claimError && (
                    <p style={{ color:"#dc2626", fontSize:"13px", fontWeight:600, marginBottom:"10px" }}>{claimError}</p>
                  )}
                  <div style={{ display:"flex", gap:"10px" }}>
                    <button type="submit" disabled={submitting}
                      style={{ flex:1, background: submitting ? "#9ca3af" : "#16a34a", color:"#fff", border:"none", padding:"13px", borderRadius:"10px", cursor: submitting ? "not-allowed" : "pointer", fontSize:"15px", fontWeight:700 }}>
                      {submitting ? "..." : T.claim_submit}
                    </button>
                    <button type="button" onClick={() => { setClaiming(null); setClaimError(""); }}
                      style={{ background:"#f3f4f6", color:"#374151", border:"1px solid #e5e7eb", padding:"13px 20px", borderRadius:"10px", cursor:"pointer", fontSize:"15px" }}>
                      ✕
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => { setClaiming(listing.id); setClaimError(""); setFirstName(""); setEmail(""); setPhone(""); setEta(15); }}
                  style={{ marginTop:"16px", background:"#16a34a", color:"#fff", border:"none", padding:"13px 24px", borderRadius:"10px", cursor:"pointer", fontSize:"15px", fontWeight:700, width:"100%" }}>
                  {T.claim_btn}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
