"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_EMAIL = "admin@gawaloop.com";

type Business = {
  id: string; name: string; email: string; phone: string; address: string;
  status: string; account_type: string;
  suspended_until: string | null; suspension_reason: string | null;
  created_at: string;
};
type Customer = {
  id: string; user_id: string; first_name: string; last_name: string;
  email: string; phone: string; city: string; noshow_count: number;
  suspension_count: number; suspended_until: string | null;
  suspension_reason: string | null; permanently_banned: boolean; created_at: string;
};

declare global { interface Window { L: any; } }

export default function AdminPanel() {
  const [tab, setTab]                     = useState<"summary" | "businesses" | "customers">("summary");
  const [businesses, setBusinesses]       = useState<Business[]>([]);
  const [customers, setCustomers]         = useState<Customer[]>([]);
  const [bizSearch, setBizSearch]         = useState("");
  const [cusSearch, setCusSearch]         = useState("");
  const [bizTypeFilter, setBizTypeFilter] = useState<"all" | "restaurant" | "ngo">("all");
  const [msg, setMsg]                     = useState("");
  const [loading, setLoading]             = useState(true);
  const [stats, setStats]                 = useState<any>(null);
  const [bizPwds, setBizPwds]             = useState<Record<string, string>>({});
  const [leafletReady, setLeafletReady]   = useState(false);
  const [mapPins, setMapPins]             = useState<{ biz: Business; lat: number; lng: number }[]>([]);
  const [geocoding, setGeocoding]         = useState(false);
  const mapRef          = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const geocodingRef    = useRef(false);

  // 1. Load Leaflet CSS + JS once on mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.L) { setLeafletReady(true); return; }
    if (document.getElementById("leaflet-css")) {
      const check = setInterval(() => {
        if (window.L) { setLeafletReady(true); clearInterval(check); }
      }, 100);
      return () => clearInterval(check);
    }
    const link  = document.createElement("link");
    link.id     = "leaflet-css";
    link.rel    = "stylesheet";
    link.href   = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script  = document.createElement("script");
    script.src    = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setLeafletReady(true);
    document.head.appendChild(script);
  }, []);

  // 2. Geocode all businesses sequentially once they load (1 req/sec for Nominatim)
  useEffect(() => {
    if (!businesses.length || geocodingRef.current || mapPins.length > 0) return;
    geocodingRef.current = true;
    setGeocoding(true);
    (async () => {
      const pins: { biz: Business; lat: number; lng: number }[] = [];
      for (const biz of businesses) {
        if (!biz.address) continue;
        try {
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(biz.address + ", New York, NY")}`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          if (data?.length) {
            pins.push({ biz, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
            setMapPins([...pins]); // progressive update — each pin appears as it resolves
          }
        } catch {}
        await new Promise(r => setTimeout(r, 1200)); // respect 1 req/sec rate limit
      }
      setGeocoding(false);
    })();
  }, [businesses]);

  // 3. Rebuild map whenever Leaflet becomes ready OR new pins arrive
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current) return;
    const L = window.L;

    // Destroy previous map instance before rebuilding
    if (mapRef.current) {
      try { mapRef.current.remove(); } catch {}
      mapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, { zoomControl: true }).setView([40.6782, -73.9442], 11);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors", maxZoom: 18,
    }).addTo(map);

    mapPins.forEach(({ biz, lat, lng }) => {
      const isNgo  = biz.account_type === "ngo";
      const color  = isNgo ? "#2563eb" : "#16a34a";
      const susp   = biz.suspended_until && new Date(biz.suspended_until) > new Date();
      const icon   = L.divIcon({
        html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
        className: "", iconSize: [16, 16], iconAnchor: [8, 8],
      });
      L.marker([lat, lng], { icon }).addTo(map).bindPopup(`
        <div style="font-family:-apple-system,sans-serif;min-width:200px;padding:4px 0">
          <p style="margin:0 0 6px;font-size:14px;font-weight:800;color:#0a2e1a">${biz.name}</p>
          <span style="display:inline-block;background:${isNgo ? "#eff6ff" : "#f0fdf4"};color:${isNgo ? "#2563eb" : "#16a34a"};font-size:11px;font-weight:700;padding:2px 8px;border-radius:12px;margin-bottom:8px">
            ${isNgo ? "🏛 NGO / Food Bank" : "🍽️ Restaurant"}
          </span><br/>
          <span style="font-size:12px;color:#374151">📍 ${biz.address}</span><br/>
          <span style="font-size:12px;color:#374151">📧 ${biz.email}</span><br/>
          <span style="font-size:12px;font-weight:700;color:${susp ? "#d97706" : "#16a34a"}">${susp ? "⚠️ Suspended" : "✅ Active"}</span>
        </div>
      `);
    });

    // Fix tiles not rendering on first paint
    setTimeout(() => { try { map.invalidateSize(); } catch {} }, 200);
  }, [leafletReady, mapPins]);

  // 4. Destroy map on unmount
  useEffect(() => {
    return () => { if (mapRef.current) { try { mapRef.current.remove(); } catch {} } };
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== ADMIN_EMAIL) { window.location.href = "/business/login"; return; }
      await Promise.all([loadBusinesses(), loadCustomers(), loadStats()]);
      setLoading(false);
    })();
  }, []);

  async function loadBusinesses() {
    const { data } = await supabase.from("businesses").select("*").order("account_type").order("name");
    setBusinesses(data || []);
  }

  async function loadCustomers() {
    const { data } = await supabase.from("customer_profiles").select("*").order("created_at", { ascending: false });
    setCustomers(data || []);
  }

  async function loadStats() {
    const [
      { count: bizTotal }, { count: ngoTotal }, { count: cusTotal }, { count: listTotal },
      { count: pickups }, { count: claims }, { data: weights },
      { count: active }, { count: suspended_biz }, { count: suspended_cus }, { count: banned },
      { data: valueSavedData }, { data: totalValueData },
    ] = await Promise.all([
      supabase.from("businesses").select("*", { count: "exact", head: true }),
      supabase.from("businesses").select("*", { count: "exact", head: true }).eq("account_type", "ngo"),
      supabase.from("customer_profiles").select("*", { count: "exact", head: true }),
      supabase.from("listings").select("*", { count: "exact", head: true }),
      supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "PICKED_UP"),
      supabase.from("claims").select("*", { count: "exact", head: true }),
      supabase.from("listings").select("weight_kg").eq("status", "PICKED_UP"),
      supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "AVAILABLE"),
      supabase.from("businesses").select("*", { count: "exact", head: true }).not("suspended_until", "is", null),
      supabase.from("customer_profiles").select("*", { count: "exact", head: true }).not("suspended_until", "is", null),
      supabase.from("customer_profiles").select("*", { count: "exact", head: true }).eq("permanently_banned", true),
      supabase.from("listings").select("estimated_value").eq("status", "PICKED_UP"),
      supabase.from("listings").select("estimated_value").not("estimated_value", "is", null),
    ]);
    const lbs        = (weights || []).reduce((s: number, l: any) => s + (Number(l.weight_kg || 0) * 2.205), 0);
    const valueSaved = (valueSavedData || []).reduce((s: number, l: any) => s + Number(l.estimated_value || 0), 0);
    const totalValue = (totalValueData || []).reduce((s: number, l: any) => s + Number(l.estimated_value || 0), 0);
    setStats({ bizTotal, ngoTotal, cusTotal, listTotal, pickups, claims, lbs, active, suspended_biz, suspended_cus, banned, valueSaved, totalValue });
  }

  function flash(text: string) { setMsg(text); setTimeout(() => setMsg(""), 4000); }

  async function suspendBusiness(biz: Business, weeks: number | "permanent") {
    const reason = prompt(`Reason for ${weeks === "permanent" ? "permanently banning" : `suspending ${weeks} week(s)`} — ${biz.name}:`);
    if (!reason) return;
    const until = weeks === "permanent" ? "9999-12-31T00:00:00Z"
      : new Date(Date.now() + (weeks as number) * 7 * 24 * 3600000).toISOString();
    await supabase.from("businesses").update({ suspended_until: until, suspension_reason: reason, suspended_by: ADMIN_EMAIL, status: "suspended" }).eq("id", biz.id);
    flash(`✅ ${biz.name} ${weeks === "permanent" ? "permanently banned" : `suspended ${weeks}wk`}.`);
    await loadBusinesses();
  }

  async function reinstateBusiness(biz: Business) {
    await supabase.from("businesses").update({ suspended_until: null, suspension_reason: null, suspended_by: null, status: "approved" }).eq("id", biz.id);
    flash(`✅ ${biz.name} reinstated.`);
    await loadBusinesses();
  }

  async function setBusinessPassword(bizEmail: string, password: string) {
    const res  = await fetch("/api/admin/set-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: bizEmail, password }) });
    const data = await res.json();
    flash(data.success ? `✅ Password updated for ${bizEmail}` : `❌ ${data.error}`);
  }

  async function suspendCustomer(cus: Customer, weeks: number | "permanent") {
    const reason = prompt(`Reason for ${weeks === "permanent" ? "permanently banning" : `suspending ${weeks} week(s)`} — ${cus.first_name} ${cus.last_name}:`);
    if (!reason) return;
    const until = weeks === "permanent" ? "9999-12-31T00:00:00Z"
      : new Date(Date.now() + (weeks as number) * 7 * 24 * 3600000).toISOString();
    await supabase.from("customer_profiles").update({ suspended_until: until, suspension_reason: reason, permanently_banned: weeks === "permanent" }).eq("id", cus.id);
    flash(`✅ ${cus.first_name} ${weeks === "permanent" ? "permanently banned" : `suspended ${weeks}wk`}.`);
    await loadCustomers();
  }

  async function reinstateCustomer(cus: Customer) {
    await supabase.from("customer_profiles").update({ suspended_until: null, suspension_reason: null, permanently_banned: false }).eq("id", cus.id);
    flash(`✅ ${cus.first_name} reinstated.`);
    await loadCustomers();
  }

  const isBanned    = (until: string | null) => until === "9999-12-31T00:00:00+00:00" || until === "9999-12-31T00:00:00Z";
  const isSuspended = (until: string | null) => !!until && new Date(until) > new Date() && !isBanned(until);

  const filteredBiz = businesses.filter(b => {
    const matchSearch = !bizSearch || b.name?.toLowerCase().includes(bizSearch.toLowerCase()) || b.email?.toLowerCase().includes(bizSearch.toLowerCase());
    const matchType   = bizTypeFilter === "all" || b.account_type === bizTypeFilter;
    return matchSearch && matchType;
  });

  const filteredCus = customers.filter(c =>
    !cusSearch || c.first_name?.toLowerCase().includes(cusSearch.toLowerCase()) ||
    c.last_name?.toLowerCase().includes(cusSearch.toLowerCase()) || c.email?.toLowerCase().includes(cusSearch.toLowerCase())
  );

  const tabBtn = (t: string): React.CSSProperties => ({
    padding: "10px 20px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 700, borderRadius: "8px",
    background: tab === t ? "#0a2e1a" : "transparent", color: tab === t ? "#fff" : "#374151",
  });
  const Badge = ({ label, color }: { label: string; color: string }) => (
    <span style={{ background: color, color: "#fff", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", whiteSpace: "nowrap" }}>{label}</span>
  );
  const Btn = ({ label, color, onClick }: { label: string; color: string; onClick: () => void }) => (
    <button onClick={onClick} style={{ background: color, color: "#fff", border: "none", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap" }}>{label}</button>
  );
  const searchInp: React.CSSProperties = {
    padding: "10px 14px", borderRadius: "8px", border: "1.5px solid #9ca3af",
    fontSize: "14px", color: "#111827", background: "#fff", outline: "none", minWidth: "240px",
  };
  const pwdInp: React.CSSProperties = {
    padding: "8px 12px", borderRadius: "7px", border: "1.5px solid #9ca3af",
    fontSize: "13px", color: "#111827", flex: 1, outline: "none", background: "#fff",
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width: "48px", height: "48px", objectFit: "contain", marginBottom: "16px" }} />
        <p style={{ color: "#374151", fontSize: "15px", fontWeight: 600 }}>Loading admin panel...</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* HEADER */}
      <div style={{ background: "#0a2e1a", padding: "0 32px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
          <span style={{ color: "#fff", fontWeight: 800, fontSize: "16px" }}>GAWA Admin</span>
          <span style={{ background: "#4ade80", color: "#0a2e1a", fontSize: "11px", fontWeight: 800, padding: "3px 10px", borderRadius: "20px" }}>🔑 SUPER ADMIN</span>
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <a href="/business/dashboard" style={{ color: "#d1fae5", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>← Business Dashboard</a>
          <a href="/admin/survey-dashboard" style={{ color: "#d1fae5", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>Survey Dashboard</a>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/business/login"; }}
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "28px 24px" }}>

        {msg && (
          <div style={{ background: msg.startsWith("✅") ? "#f0fdf4" : "#fef2f2", border: `1px solid ${msg.startsWith("✅") ? "#bbf7d0" : "#fecaca"}`, borderRadius: "10px", padding: "12px 20px", marginBottom: "20px", color: msg.startsWith("✅") ? "#166534" : "#991b1b", fontWeight: 700, fontSize: "14px" }}>
            {msg}
          </div>
        )}

        {/* TABS */}
        <div style={{ display: "flex", gap: "4px", background: "#fff", borderRadius: "12px", padding: "4px", border: "1px solid #d1d5db", marginBottom: "24px", width: "fit-content", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          {[
            { key: "summary",    label: "📊 Platform Summary" },
            { key: "businesses", label: `🏪 Businesses (${businesses.length})` },
            { key: "customers",  label: `👥 Customers (${customers.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)} style={tabBtn(t.key)}>{t.label}</button>
          ))}
        </div>

        {/* ── SUMMARY TAB ── */}
        {tab === "summary" && stats && (
          <div>
            <h2 style={{ margin: "0 0 20px", fontSize: "20px", fontWeight: 800, color: "#0a2e1a" }}>Platform Overview</h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: "14px", marginBottom: "28px" }}>
              {[
                { label: "Total Businesses",    value: stats.bizTotal,                               icon: "🏪", color: "#0a2e1a" },
                { label: "NGO / Food Banks",     value: stats.ngoTotal,                               icon: "🏛",  color: "#2563eb" },
                { label: "Restaurants",          value: (stats.bizTotal||0)-(stats.ngoTotal||0),      icon: "🍽️", color: "#16a34a" },
                { label: "Total Customers",      value: stats.cusTotal,                               icon: "👥",  color: "#7c3aed" },
                { label: "Total Listings",       value: stats.listTotal,                              icon: "📋",  color: "#374151" },
                { label: "Total Pickups",        value: stats.pickups,                                icon: "✅",  color: "#16a34a" },
                { label: "Total Claims",         value: stats.claims,                                 icon: "🎯",  color: "#ea580c" },
                { label: "Active Listings Now",  value: stats.active,                                 icon: "🟢",  color: "#16a34a" },
                { label: "Food Donated (lbs)",   value: `${Number(stats.lbs).toFixed(1)} lbs`,        icon: "⚖️",  color: "#059669" },
                { label: "CO₂e Saved (lbs)",     value: `${Math.round(stats.lbs * 2.5)} lbs`,         icon: "🌍",  color: "#0369a1" },
                { label: "💰 Value Saved",       value: `$${Number(stats.valueSaved).toFixed(2)}`,    icon: "💰",  color: "#16a34a" },
                { label: "💰 Total Est. Value",  value: `$${Number(stats.totalValue).toFixed(2)}`,    icon: "💵",  color: "#059669" },
                { label: "Suspended Businesses", value: stats.suspended_biz,                          icon: "⚠️",  color: "#d97706" },
                { label: "Suspended Customers",  value: stats.suspended_cus,                          icon: "⚠️",  color: "#d97706" },
                { label: "Permanently Banned",   value: stats.banned,                                 icon: "🚫",  color: "#dc2626" },
              ].map((s, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: "14px", padding: "18px", border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <p style={{ margin: "0 0 4px", fontSize: "20px" }}>{s.icon}</p>
                  <p style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: 900, color: s.color }}>{s.value}</p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#374151", fontWeight: 700 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* MAP */}
            <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #e5e7eb", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <h3 style={{ margin: "0 0 2px", fontSize: "16px", fontWeight: 800, color: "#0a2e1a" }}>📍 Business Locations</h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>
                    {geocoding
                      ? `⏳ Geocoding... ${mapPins.length} of ${businesses.filter(b => b.address).length} loaded`
                      : `${mapPins.length} of ${businesses.length} businesses mapped — click a pin for details`}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: "#16a34a", border: "3px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}/>
                    <span style={{ fontSize: "12px", color: "#374151", fontWeight: 600 }}>Restaurant</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: "#2563eb", border: "3px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}/>
                    <span style={{ fontSize: "12px", color: "#374151", fontWeight: 600 }}>NGO</span>
                  </div>
                </div>
              </div>

              {/* Map container — always in DOM so Leaflet has a stable node */}
              <div
                ref={mapContainerRef}
                style={{ width: "100%", height: "480px", borderRadius: "12px", overflow: "hidden", border: "1px solid #e5e7eb", background: "#e8f5e9" }}
              />

              {geocoding && (
                <div style={{ marginTop: "10px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px 16px" }}>
                  <p style={{ margin: 0, fontSize: "12px", color: "#92400e", fontWeight: 600 }}>
                    Pins appear as each address resolves — 1 per second to stay within Nominatim's rate limit. Runs once per page visit.
                  </p>
                </div>
              )}
            </div>

            <button onClick={() => Promise.all([loadBusinesses(), loadCustomers(), loadStats()])}
              style={{ background: "#0a2e1a", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>
              🔄 Refresh Stats
            </button>
          </div>
        )}

        {/* ── BUSINESSES TAB ── */}
        {tab === "businesses" && (
          <div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", alignItems: "center", flexWrap: "wrap" }}>
              <input placeholder="Search by name or email..." value={bizSearch} onChange={e => setBizSearch(e.target.value)} style={searchInp}/>
              <div style={{ display: "flex", gap: "6px" }}>
                {[
                  { key: "all",        label: `All (${businesses.length})`,                                               active: "#0a2e1a" },
                  { key: "restaurant", label: `🍽️ Restaurants (${businesses.filter(b => b.account_type !== "ngo").length})`, active: "#16a34a" },
                  { key: "ngo",        label: `🏛 NGOs (${businesses.filter(b => b.account_type === "ngo").length})`,       active: "#2563eb" },
                ].map(f => (
                  <button key={f.key} onClick={() => setBizTypeFilter(f.key as any)}
                    style={{ padding: "8px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700,
                      background: bizTypeFilter === f.key ? f.active : "#e5e7eb",
                      color: bizTypeFilter === f.key ? "#fff" : "#374151" }}>
                    {f.label}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>{filteredBiz.length} shown</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {filteredBiz.map(biz => {
                const banned    = isBanned(biz.suspended_until);
                const suspended = isSuspended(biz.suspended_until);
                const isNgo     = biz.account_type === "ngo";
                return (
                  <div key={biz.id} style={{
                    background: "#fff", borderRadius: "14px", padding: "20px 24px",
                    border: `1.5px solid ${banned ? "#fca5a5" : suspended ? "#fde68a" : isNgo ? "#bfdbfe" : "#e5e7eb"}`,
                    borderLeft: `6px solid ${isNgo ? "#2563eb" : "#16a34a"}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
                          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0a2e1a" }}>{biz.name}</h3>
                          {isNgo
                            ? <span style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", fontSize: "12px", fontWeight: 800, padding: "3px 12px", borderRadius: "20px" }}>🏛 NGO / Food Bank</span>
                            : <span style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", fontSize: "12px", fontWeight: 800, padding: "3px 12px", borderRadius: "20px" }}>🍽️ Restaurant</span>
                          }
                          {banned    && <Badge label="PERMANENTLY BANNED" color="#dc2626" />}
                          {suspended && !banned && <Badge label={`SUSPENDED until ${new Date(biz.suspended_until!).toLocaleDateString()}`} color="#d97706" />}
                          {!banned   && !suspended && <Badge label="ACTIVE" color="#16a34a" />}
                        </div>
                        <p style={{ margin: "3px 0", fontSize: "13px", color: "#111827", fontWeight: 500 }}>📧 {biz.email}</p>
                        {biz.phone   && <p style={{ margin: "3px 0", fontSize: "13px", color: "#111827", fontWeight: 500 }}>📞 {biz.phone}</p>}
                        {biz.address && <p style={{ margin: "3px 0", fontSize: "13px", color: "#111827", fontWeight: 500 }}>📍 {biz.address}</p>}
                        {biz.suspension_reason && <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#b91c1c", fontWeight: 600, fontStyle: "italic" }}>Reason: {biz.suspension_reason}</p>}
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-start" }}>
                        {(banned || suspended)
                          ? <Btn label="✅ Reinstate" color="#16a34a" onClick={() => reinstateBusiness(biz)} />
                          : <>
                              <Btn label="Suspend 1wk"      color="#d97706" onClick={() => suspendBusiness(biz, 1)} />
                              <Btn label="Suspend 1mo"      color="#ea580c" onClick={() => suspendBusiness(biz, 4)} />
                              <Btn label="🚫 Permanent Ban" color="#dc2626" onClick={() => suspendBusiness(biz, "permanent")} />
                            </>
                        }
                      </div>
                    </div>
                    <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #f3f4f6" }}>
                      <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.4px" }}>Set New Password</p>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input placeholder="New password (min 6 chars)" value={bizPwds[biz.id] || ""} onChange={e => setBizPwds(p => ({ ...p, [biz.id]: e.target.value }))} style={pwdInp}/>
                        <button onClick={() => setBusinessPassword(biz.email, bizPwds[biz.id] || "")}
                          style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "7px", cursor: "pointer", fontSize: "13px", fontWeight: 700, whiteSpace: "nowrap" }}>
                          Set Password
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CUSTOMERS TAB ── */}
        {tab === "customers" && (
          <div>
            <div style={{ display: "flex", gap: "12px", marginBottom: "20px", alignItems: "center", flexWrap: "wrap" }}>
              <input placeholder="Search by name or email..." value={cusSearch} onChange={e => setCusSearch(e.target.value)} style={searchInp}/>
              <span style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>{filteredCus.length} result{filteredCus.length !== 1 ? "s" : ""}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {filteredCus.map(cus => {
                const banned    = cus.permanently_banned || isBanned(cus.suspended_until);
                const suspended = isSuspended(cus.suspended_until);
                const name      = [cus.first_name, cus.last_name].filter(Boolean).join(" ") || "Unknown";
                return (
                  <div key={cus.id} style={{ background: "#fff", borderRadius: "14px", padding: "20px 24px", border: `1.5px solid ${banned ? "#fca5a5" : suspended ? "#fde68a" : "#e5e7eb"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
                          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0a2e1a" }}>{name}</h3>
                          {banned    && <Badge label="PERMANENTLY BANNED" color="#dc2626" />}
                          {suspended && !banned && <Badge label={`SUSPENDED until ${new Date(cus.suspended_until!).toLocaleDateString()}`} color="#d97706" />}
                          {!banned   && !suspended && <Badge label="ACTIVE" color="#16a34a" />}
                        </div>
                        <p style={{ margin: "3px 0", fontSize: "13px", color: "#111827", fontWeight: 500 }}>📧 {cus.email}</p>
                        {cus.phone && <p style={{ margin: "3px 0", fontSize: "13px", color: "#111827", fontWeight: 500 }}>📞 {cus.phone}</p>}
                        {cus.city  && <p style={{ margin: "3px 0", fontSize: "13px", color: "#111827", fontWeight: 500 }}>📍 {cus.city}</p>}
                        <div style={{ display: "flex", gap: "16px", marginTop: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "12px", color: "#b91c1c", fontWeight: 700, background: "#fef2f2", padding: "2px 8px", borderRadius: "6px" }}>No-shows: {cus.noshow_count || 0}</span>
                          <span style={{ fontSize: "12px", color: "#92400e", fontWeight: 700, background: "#fffbeb", padding: "2px 8px", borderRadius: "6px" }}>Suspensions: {cus.suspension_count || 0}</span>
                          <span style={{ fontSize: "12px", color: "#374151", fontWeight: 600 }}>Joined: {new Date(cus.created_at).toLocaleDateString()}</span>
                        </div>
                        {cus.suspension_reason && <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#b91c1c", fontWeight: 600, fontStyle: "italic" }}>Reason: {cus.suspension_reason}</p>}
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-start" }}>
                        {(banned || suspended)
                          ? <Btn label="✅ Reinstate" color="#16a34a" onClick={() => reinstateCustomer(cus)} />
                          : <>
                              <Btn label="Suspend 1wk"      color="#d97706" onClick={() => suspendCustomer(cus, 1)} />
                              <Btn label="Suspend 1mo"      color="#ea580c" onClick={() => suspendCustomer(cus, 4)} />
                              <Btn label="🚫 Permanent Ban" color="#dc2626" onClick={() => suspendCustomer(cus, "permanent")} />
                            </>
                        }
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredCus.length === 0 && (
                <div style={{ background: "#fff", borderRadius: "14px", padding: "40px", textAlign: "center", color: "#374151", fontWeight: 600 }}>No customers found.</div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
