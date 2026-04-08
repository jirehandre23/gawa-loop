"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_EMAIL = "admin@gawaloop.com";

type Business = {
  id: string; name: string; email: string; phone: string; address: string;
  status: string; suspended_until: string | null; suspension_reason: string | null;
  created_at: string;
};
type Customer = {
  id: string; user_id: string; first_name: string; last_name: string;
  email: string; phone: string; city: string; noshow_count: number;
  suspension_count: number; suspended_until: string | null;
  suspension_reason: string | null; permanently_banned: boolean; created_at: string;
};

const BADGE = (label: string, color: string) => (
  <span style={{ background: color, color: "#fff", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px" }}>{label}</span>
);

const BTN = (label: string, color: string, onClick: () => void, small = false) => (
  <button onClick={onClick} style={{ background: color, color: "#fff", border: "none", padding: small ? "5px 10px" : "7px 14px", borderRadius: "7px", cursor: "pointer", fontSize: small ? "11px" : "12px", fontWeight: 700 }}>{label}</button>
);

export default function AdminPanel() {
  const [tab, setTab]               = useState<"summary" | "businesses" | "customers">("summary");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [customers, setCustomers]   = useState<Customer[]>([]);
  const [bizSearch, setBizSearch]   = useState("");
  const [cusSearch, setCusSearch]   = useState("");
  const [msg, setMsg]               = useState("");
  const [loading, setLoading]       = useState(true);
  const [stats, setStats]           = useState<any>(null);
  const [bizPwds, setBizPwds]       = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== ADMIN_EMAIL) { window.location.href = "/business/login"; return; }
      await Promise.all([loadBusinesses(), loadCustomers(), loadStats()]);
      setLoading(false);
    })();
  }, []);

  async function loadBusinesses() {
    const { data } = await supabase.from("businesses").select("*").order("name");
    setBusinesses(data || []);
  }

  async function loadCustomers() {
    const { data } = await supabase.from("customer_profiles").select("*").order("created_at", { ascending: false });
    setCustomers(data || []);
  }

  async function loadStats() {
    const [
      { count: bizTotal }, { count: cusTotal }, { count: listTotal },
      { count: pickups }, { count: claims }, { data: weights },
      { count: active }, { count: suspended_biz }, { count: suspended_cus },
      { count: banned },
    ] = await Promise.all([
      supabase.from("businesses").select("*", { count: "exact", head: true }),
      supabase.from("customer_profiles").select("*", { count: "exact", head: true }),
      supabase.from("listings").select("*", { count: "exact", head: true }),
      supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "PICKED_UP"),
      supabase.from("claims").select("*", { count: "exact", head: true }),
      supabase.from("listings").select("weight_kg").eq("status", "PICKED_UP"),
      supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "AVAILABLE"),
      supabase.from("businesses").select("*", { count: "exact", head: true }).not("suspended_until", "is", null),
      supabase.from("customer_profiles").select("*", { count: "exact", head: true }).not("suspended_until", "is", null),
      supabase.from("customer_profiles").select("*", { count: "exact", head: true }).eq("permanently_banned", true),
    ]);
    const lbs = (weights || []).reduce((s: number, l: any) => s + (Number(l.weight_kg || 0) * 2.205), 0);
    setStats({ bizTotal, cusTotal, listTotal, pickups, claims, lbs, active, suspended_biz, suspended_cus, banned });
  }

  function flash(text: string) { setMsg(text); setTimeout(() => setMsg(""), 4000); }

  async function suspendBusiness(biz: Business, weeks: number | "permanent") {
    const reason = prompt(`Reason for ${weeks === "permanent" ? "permanently banning" : `suspending ${weeks} week(s)`} — ${biz.name}:`);
    if (!reason) return;
    const until = weeks === "permanent" ? "9999-12-31T00:00:00Z"
      : new Date(Date.now() + (weeks as number) * 7 * 24 * 3600000).toISOString();
    await supabase.from("businesses").update({
      suspended_until: until, suspension_reason: reason,
      suspended_by: ADMIN_EMAIL, status: "suspended",
    }).eq("id", biz.id);
    flash(`✅ ${biz.name} ${weeks === "permanent" ? "permanently banned" : `suspended ${weeks}wk`}.`);
    await loadBusinesses();
  }

  async function reinstateBusiness(biz: Business) {
    await supabase.from("businesses").update({
      suspended_until: null, suspension_reason: null, suspended_by: null, status: "approved",
    }).eq("id", biz.id);
    flash(`✅ ${biz.name} reinstated.`);
    await loadBusinesses();
  }

  async function setBusinessPassword(bizEmail: string, password: string) {
    const res = await fetch("/api/admin/set-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: bizEmail, password }),
    });
    const data = await res.json();
    flash(data.success ? `✅ Password updated for ${bizEmail}` : `❌ ${data.error}`);
  }

  async function suspendCustomer(cus: Customer, weeks: number | "permanent") {
    const reason = prompt(`Reason for ${weeks === "permanent" ? "permanently banning" : `suspending ${weeks} week(s)`} — ${cus.first_name} ${cus.last_name} (${cus.email}):`);
    if (!reason) return;
    const until = weeks === "permanent" ? "9999-12-31T00:00:00Z"
      : new Date(Date.now() + (weeks as number) * 7 * 24 * 3600000).toISOString();
    await supabase.from("customer_profiles").update({
      suspended_until: until,
      suspension_reason: reason,
      permanently_banned: weeks === "permanent",
    }).eq("id", cus.id);
    flash(`✅ ${cus.first_name} ${weeks === "permanent" ? "permanently banned" : `suspended ${weeks}wk`}.`);
    await loadCustomers();
  }

  async function reinstateCustomer(cus: Customer) {
    await supabase.from("customer_profiles").update({
      suspended_until: null, suspension_reason: null, permanently_banned: false,
    }).eq("id", cus.id);
    flash(`✅ ${cus.first_name} reinstated.`);
    await loadCustomers();
  }

  const isBanned = (until: string | null) => until === "9999-12-31T00:00:00+00:00" || until === "9999-12-31T00:00:00Z";
  const isSuspended = (until: string | null) => !!until && new Date(until) > new Date() && !isBanned(until);

  const filteredBiz = businesses.filter(b =>
    !bizSearch || b.name?.toLowerCase().includes(bizSearch.toLowerCase()) || b.email?.toLowerCase().includes(bizSearch.toLowerCase())
  );
  const filteredCus = customers.filter(c =>
    !cusSearch || c.first_name?.toLowerCase().includes(cusSearch.toLowerCase()) ||
    c.last_name?.toLowerCase().includes(cusSearch.toLowerCase()) || c.email?.toLowerCase().includes(cusSearch.toLowerCase())
  );

  const tabStyle = (t: string): React.CSSProperties => ({
    padding: "10px 20px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 700,
    borderRadius: "8px", background: tab === t ? "#0a2e1a" : "transparent", color: tab === t ? "#fff" : "#374151",
  });

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width: "48px", height: "48px", objectFit: "contain", marginBottom: "16px" }} />
        <p style={{ color: "#6b7280", fontSize: "15px" }}>Loading admin panel...</p>
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
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <a href="/business/dashboard" style={{ color: "#a3c9b0", fontSize: "13px", textDecoration: "none" }}>← Business Dashboard</a>
          <a href="/admin/survey-dashboard" style={{ color: "#a3c9b0", fontSize: "13px", textDecoration: "none" }}>Survey Dashboard</a>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/business/login"; }}
            style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "28px 24px" }}>

        {/* FLASH MSG */}
        {msg && (
          <div style={{ background: msg.startsWith("✅") ? "#f0fdf4" : "#fef2f2", border: `1px solid ${msg.startsWith("✅") ? "#bbf7d0" : "#fecaca"}`, borderRadius: "10px", padding: "12px 20px", marginBottom: "20px", color: msg.startsWith("✅") ? "#166534" : "#991b1b", fontWeight: 600, fontSize: "14px" }}>
            {msg}
          </div>
        )}

        {/* TABS */}
        <div style={{ display: "flex", gap: "4px", background: "#fff", borderRadius: "12px", padding: "4px", border: "1px solid #e5e7eb", marginBottom: "24px", width: "fit-content" }}>
          {[
            { key: "summary",    label: "📊 Platform Summary" },
            { key: "businesses", label: `🏪 Businesses (${businesses.length})` },
            { key: "customers",  label: `👥 Customers (${customers.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)} style={tabStyle(t.key)}>{t.label}</button>
          ))}
        </div>

        {/* ── SUMMARY TAB ── */}
        {tab === "summary" && stats && (
          <div>
            <h2 style={{ margin: "0 0 20px", fontSize: "20px", fontWeight: 800, color: "#0a2e1a" }}>Platform Overview</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
              {[
                { label: "Total Businesses",      value: stats.bizTotal,      icon: "🏪", color: "#0a2e1a" },
                { label: "Total Customers",        value: stats.cusTotal,      icon: "👥", color: "#2563eb" },
                { label: "Total Listings",         value: stats.listTotal,     icon: "📋", color: "#7c3aed" },
                { label: "Total Pickups",          value: stats.pickups,       icon: "✅", color: "#16a34a" },
                { label: "Total Claims",           value: stats.claims,        icon: "🎯", color: "#ea580c" },
                { label: "Active Listings Now",    value: stats.active,        icon: "🟢", color: "#16a34a" },
                { label: "Food Donated (lbs)",     value: `${Number(stats.lbs).toFixed(1)} lbs`, icon: "⚖️", color: "#059669" },
                { label: "CO₂e Saved (lbs)",       value: `${Math.round(stats.lbs * 2.5)} lbs`, icon: "🌍", color: "#0369a1" },
                { label: "Suspended Businesses",   value: stats.suspended_biz, icon: "⚠️", color: "#f59e0b" },
                { label: "Suspended Customers",    value: stats.suspended_cus, icon: "⚠️", color: "#f59e0b" },
                { label: "Permanently Banned",     value: stats.banned,        icon: "🚫", color: "#ef4444" },
              ].map((s, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: "14px", padding: "20px", border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <p style={{ margin: "0 0 6px", fontSize: "22px" }}>{s.icon}</p>
                  <p style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: 900, color: s.color }}>{s.value}</p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>{s.label}</p>
                </div>
              ))}
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
            <div style={{ display: "flex", gap: "12px", marginBottom: "20px", alignItems: "center", flexWrap: "wrap" }}>
              <input placeholder="Search by name or email..." value={bizSearch} onChange={e => setBizSearch(e.target.value)}
                style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", minWidth: "280px", outline: "none" }} />
              <span style={{ fontSize: "13px", color: "#6b7280" }}>{filteredBiz.length} results</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {filteredBiz.map(biz => {
                const banned = isBanned(biz.suspended_until);
                const suspended = isSuspended(biz.suspended_until);
                return (
                  <div key={biz.id} style={{ background: "#fff", borderRadius: "14px", padding: "20px 24px", border: `1px solid ${banned ? "#fecaca" : suspended ? "#fde68a" : "#e5e7eb"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0a2e1a" }}>{biz.name}</h3>
                          {banned && BADGE("PERMANENTLY BANNED", "#ef4444")}
                          {suspended && BADGE(`SUSPENDED until ${new Date(biz.suspended_until!).toLocaleDateString()}`, "#f59e0b")}
                          {!banned && !suspended && BADGE("ACTIVE", "#16a34a")}
                        </div>
                        <p style={{ margin: "2px 0", fontSize: "13px", color: "#374151" }}>📧 {biz.email}</p>
                        {biz.phone && <p style={{ margin: "2px 0", fontSize: "13px", color: "#374151" }}>📞 {biz.phone}</p>}
                        {biz.address && <p style={{ margin: "2px 0", fontSize: "13px", color: "#374151" }}>📍 {biz.address}</p>}
                        {biz.suspension_reason && <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#ef4444", fontStyle: "italic" }}>Reason: {biz.suspension_reason}</p>}
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-start" }}>
                        {(banned || suspended)
                          ? BTN("✅ Reinstate", "#16a34a", () => reinstateBusiness(biz))
                          : <>
                              {BTN("Suspend 1wk", "#f59e0b", () => suspendBusiness(biz, 1))}
                              {BTN("Suspend 1mo", "#ea580c", () => suspendBusiness(biz, 4))}
                              {BTN("🚫 Permanent Ban", "#ef4444", () => suspendBusiness(biz, "permanent"))}
                            </>
                        }
                      </div>
                    </div>
                    <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #f3f4f6" }}>
                      <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Set New Password</p>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input placeholder="New password (min 6 chars)" value={bizPwds[biz.id] || ""}
                          onChange={e => setBizPwds(p => ({ ...p, [biz.id]: e.target.value }))}
                          style={{ padding: "8px 12px", borderRadius: "7px", border: "1px solid #d1d5db", fontSize: "13px", flex: 1, outline: "none" }} />
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
              <input placeholder="Search by name or email..." value={cusSearch} onChange={e => setCusSearch(e.target.value)}
                style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", minWidth: "280px", outline: "none" }} />
              <span style={{ fontSize: "13px", color: "#6b7280" }}>{filteredCus.length} results</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {filteredCus.map(cus => {
                const banned = cus.permanently_banned || isBanned(cus.suspended_until);
                const suspended = isSuspended(cus.suspended_until);
                const name = [cus.first_name, cus.last_name].filter(Boolean).join(" ") || "Unknown";
                return (
                  <div key={cus.id} style={{ background: "#fff", borderRadius: "14px", padding: "20px 24px", border: `1px solid ${banned ? "#fecaca" : suspended ? "#fde68a" : "#e5e7eb"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0a2e1a" }}>{name}</h3>
                          {banned && BADGE("PERMANENTLY BANNED", "#ef4444")}
                          {suspended && !banned && BADGE(`SUSPENDED until ${new Date(cus.suspended_until!).toLocaleDateString()}`, "#f59e0b")}
                          {!banned && !suspended && BADGE("ACTIVE", "#16a34a")}
                        </div>
                        <p style={{ margin: "2px 0", fontSize: "13px", color: "#374151" }}>📧 {cus.email}</p>
                        {cus.phone && <p style={{ margin: "2px 0", fontSize: "13px", color: "#374151" }}>📞 {cus.phone}</p>}
                        {cus.city && <p style={{ margin: "2px 0", fontSize: "13px", color: "#374151" }}>📍 {cus.city}</p>}
                        <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                          <span style={{ fontSize: "12px", color: "#ef4444", fontWeight: 700 }}>No-shows: {cus.noshow_count || 0}</span>
                          <span style={{ fontSize: "12px", color: "#f59e0b", fontWeight: 700 }}>Suspensions: {cus.suspension_count || 0}</span>
                          <span style={{ fontSize: "12px", color: "#6b7280" }}>Joined: {new Date(cus.created_at).toLocaleDateString()}</span>
                        </div>
                        {cus.suspension_reason && <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#ef4444", fontStyle: "italic" }}>Reason: {cus.suspension_reason}</p>}
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-start" }}>
                        {(banned || suspended)
                          ? BTN("✅ Reinstate", "#16a34a", () => reinstateCustomer(cus))
                          : <>
                              {BTN("Suspend 1wk", "#f59e0b", () => suspendCustomer(cus, 1))}
                              {BTN("Suspend 1mo", "#ea580c", () => suspendCustomer(cus, 4))}
                              {BTN("🚫 Permanent Ban", "#ef4444", () => suspendCustomer(cus, "permanent"))}
                            </>
                        }
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredCus.length === 0 && (
                <div style={{ background: "#fff", borderRadius: "14px", padding: "40px", textAlign: "center", color: "#6b7280" }}>
                  No customers found.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
