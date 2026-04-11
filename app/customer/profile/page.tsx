"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Order = {
  id: string;
  status: string;
  created_at: string;
  confirmation_code: string;
  quantity_claimed: number;
  eta_minutes: number;
  noshow: boolean;
  listings: {
    food_name: string;
    category: string;
    business_name: string;
    address: string;
    image_url?: string;
    expires_at?: string;
    quantity_total?: number;
    quantity_remaining?: number;
  } | null;
  business_phone?: string | null;
};

const ETA_OPTIONS = [
  { value: 10,  label: "10 minutes" },
  { value: 15,  label: "15 minutes" },
  { value: 20,  label: "20 minutes" },
  { value: 30,  label: "30 minutes" },
  { value: 45,  label: "45 minutes" },
  { value: 60,  label: "1 hour" },
  { value: 90,  label: "1h 30m" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
  { value: 300, label: "5 hours" },
  { value: 360, label: "6 hours" },
  { value: 600, label: "10 hours" },
];

export default function CustomerProfile() {
  const [profile, setProfile]       = useState<Record<string, any> | null>(null);
  const [userId, setUserId]         = useState<string | null>(null);
  const [userEmail, setUserEmail]   = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState("");
  const [uploading, setUploading]   = useState(false);
  const [orders, setOrders]         = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeTab, setActiveTab]   = useState<"profile" | "orders">("profile");
  const [now, setNow]               = useState(Date.now());

  // Cancel + ETA state
  const [etaEditId, setEtaEditId]         = useState<string | null>(null);
  const [etaEditValue, setEtaEditValue]   = useState<number>(30);
  const [etaLoading, setEtaLoading]       = useState(false);
  const [etaMsg, setEtaMsg]               = useState<Record<string, string>>({});
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  // Tick every 30s so ETA countdowns update live
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // ETA time left — based on claim created_at + eta_minutes
  function etaLeft(created_at: string, eta_minutes: number) {
    const deadline = new Date(created_at).getTime() + eta_minutes * 60000;
    const diff = deadline - Date.now();
    if (diff <= 0) return null;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  // Listing expiry time left
  function expiryLeft(expires_at: string) {
    const diff = new Date(expires_at).getTime() - Date.now();
    if (diff <= 0) return null;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m left`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m left`;
  }

  // No-show warning — mirrors suspension logic in claim-submit DELETE
  // noshow 2 → 3-day ban, noshow 4 → 7-day ban, noshow 5+ → permanent
  function noshowWarning(count: number, permanently_banned: boolean, suspended_until: string | null): { text: string; color: string; bg: string; border: string } | null {
    if (permanently_banned) return {
      text: "Your account is permanently banned due to repeated no-shows. Contact admin@gawaloop.com.",
      color: "#7f1d1d", bg: "#fef2f2", border: "#fecaca",
    };
    if (suspended_until && new Date(suspended_until) > new Date()) return {
      text: `Account suspended until ${new Date(suspended_until).toLocaleDateString("en-US", { month: "long", day: "numeric" })} due to no-shows.`,
      color: "#7f1d1d", bg: "#fef2f2", border: "#fecaca",
    };
    if (count === 0) return null;
    // Next suspension threshold
    const nextThreshold = count % 2 === 0 ? count + 2 : count + 1;
    const remaining = nextThreshold - count;
    if (count === 4) return {
      text: `⚠️ Warning: You have ${count} no-shows. One more will result in a permanent ban.`,
      color: "#7f1d1d", bg: "#fef2f2", border: "#fecaca",
    };
    if (count >= 3) return {
      text: `⚠️ Warning: ${count} no-shows recorded. ${remaining} more will result in a longer suspension.`,
      color: "#92400e", bg: "#fffbeb", border: "#fde68a",
    };
    return {
      text: `Note: ${count} no-show${count > 1 ? "s" : ""} recorded. ${remaining} more will trigger a temporary suspension.`,
      color: "#374151", bg: "#f9fafb", border: "#e5e7eb",
    };
  }

  async function handleCancelClaim(claimId: string) {
    setCancelLoading(claimId);
    const res = await fetch("/api/cancel-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimId, userId }),
    });
    const data = await res.json();
    if (data.success) {
      setOrders(prev => prev.filter(o => o.id !== claimId));
    } else {
      setEtaMsg(prev => ({ ...prev, [claimId]: data.error || "Failed to cancel." }));
    }
    setCancelLoading(null);
    setCancelConfirm(null);
  }

  async function handleUpdateEta(claimId: string, listingExpiresAt: string) {
    setEtaLoading(true);
    const res = await fetch("/api/update-eta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimId, userId, eta_minutes: etaEditValue }),
    });
    const data = await res.json();
    if (data.success) {
      setOrders(prev => prev.map(o => o.id === claimId ? { ...o, eta_minutes: etaEditValue } : o));
      setEtaEditId(null);
      setEtaMsg(prev => ({ ...prev, [claimId]: "Arrival time updated!" }));
      setTimeout(() => setEtaMsg(prev => { const n = { ...prev }; delete n[claimId]; return n; }), 3000);
    } else {
      setEtaMsg(prev => ({ ...prev, [claimId]: data.error || "Failed to update." }));
    }
    setEtaLoading(false);
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/customer/login"; return; }
      setUserId(user.id);
      setUserEmail(user.email || null);

      const { data: existing } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        setProfile(existing);
      } else {
        const newProfile = {
          user_id: user.id, first_name: "", last_name: "",
          email: user.email || "", phone: "", city: "", state: "", avatar_url: "",
        };
        await supabase.from("customer_profiles").insert(newProfile);
        setProfile(newProfile);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function loadOrders(uid: string, email: string | null) {
    setOrdersLoading(true);

    const { data: byId } = await supabase
      .from("claims")
      .select(`
        id, status, created_at, confirmation_code, quantity_claimed, eta_minutes, noshow,
        listings (
          food_name, category, business_name, address, image_url,
          expires_at, quantity_total, quantity_remaining
        )
      `)
      .eq("customer_user_id", uid)
      .order("created_at", { ascending: false })
      .limit(50);

    let byEmail: any[] = [];
    if (email) {
      const { data: emailData } = await supabase
        .from("claims")
        .select(`
          id, status, created_at, confirmation_code, quantity_claimed, eta_minutes, noshow,
          listings (
            food_name, category, business_name, address, image_url,
            expires_at, quantity_total, quantity_remaining
          )
        `)
        .eq("email", email)
        .is("customer_user_id", null)
        .order("created_at", { ascending: false })
        .limit(50);
      byEmail = emailData || [];
    }

    const all = [...(byId || []), ...byEmail];
    const seen = new Set<string>();
    const merged = all
      .filter(o => { if (seen.has(o.id)) return false; seen.add(o.id); return true; })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Fetch business phones for active orders
    const activeOnes = merged.filter(o => o.status === "active");
    const bizNames = [...new Set(activeOnes.map((o: any) => o.listings?.business_name).filter(Boolean))];
    let phoneMap: Record<string, string> = {};
    if (bizNames.length > 0) {
      const { data: bizData } = await supabase
        .from("businesses").select("name, phone").in("name", bizNames);
      if (bizData) for (const b of bizData) if (b.phone) phoneMap[b.name] = b.phone;
    }

    const withPhones = merged.map((o: any) => ({
      ...o,
      business_phone: o.listings?.business_name ? (phoneMap[o.listings.business_name] || null) : null,
    }));

    setOrders(withPhones as Order[]);
    setOrdersLoading(false);
  }

  useEffect(() => {
    if (activeTab === "orders" && userId) loadOrders(userId, userEmail);
  }, [activeTab, userId, userEmail]);

  async function handleImageUpload(file: File) {
    if (!file || !userId) return;
    setUploading(true); setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("bucket", "customer-avatars");
    fd.append("folder", userId);
    const res  = await fetch("/api/upload-image", { method: "POST", body: fd });
    const data = await res.json();
    if (data.url) {
      const newUrl = data.url + "?t=" + Date.now();
      setProfile(p => p ? { ...p, avatar_url: newUrl } : p);
      await supabase.from("customer_profiles")
        .update({ avatar_url: data.url, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      setMsg("✅ Photo updated!");
    } else {
      setMsg("Error uploading photo. Please try again.");
    }
    setUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !userId) return;
    setSaving(true); setMsg("");
    const { error } = await supabase.from("customer_profiles").update({
      first_name: profile.first_name || "",
      last_name:  profile.last_name  || "",
      phone:      profile.phone      || null,
      city:       profile.city       || null,
      state:      profile.state      || null,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
    setMsg(error ? "Error saving. Please try again." : "✅ Profile saved!");
    setSaving(false);
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: "8px",
    border: "1px solid #d1d5db", fontSize: "14px", color: "#111827",
    outline: "none", boxSizing: "border-box", background: "#fff",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px",
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <p style={{ color: "#6b7280" }}>Loading your profile...</p>
    </div>
  );

  // Order buckets — sorted: Active → No-show → Cancelled → Expired → Picked Up
  const activeOrders    = orders.filter(o => o.status === "active");
  const noshowOrders    = orders.filter(o => o.noshow || o.status === "noshow");
  const cancelledOrders = orders.filter(o => o.status === "cancelled" && !o.noshow);
  const pickedUpOrders  = orders.filter(o => o.status === "picked_up");

  const noshowCount      = profile?.noshow_count ?? 0;
  const permBanned       = profile?.permanently_banned ?? false;
  const suspendedUntil   = profile?.suspended_until ?? null;
  const warning          = noshowWarning(noshowCount, permBanned, suspendedUntil);

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", padding: "24px 16px", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <a href="/browse"><img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width: "36px", height: "36px", objectFit: "contain" }}/></a>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#0a2e1a" }}>My Account</h1>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/browse"; }}
            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>
            Sign Out
          </button>
        </div>

        {/* Avatar */}
        <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", marginBottom: "16px", border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ position: "relative" }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile"
                  style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: "3px solid #16a34a" }}/>
              ) : (
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#f0fdf4", border: "3px dashed #16a34a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px" }}>
                  🙋
                </div>
              )}
              {uploading && (
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontSize: "10px", fontWeight: 700 }}>...</span>
                </div>
              )}
            </div>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 800, color: "#0a2e1a" }}>
                {profile?.first_name || "Your"} {profile?.last_name || "Profile"}
              </p>
              <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#6b7280" }}>{profile?.email}</p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" disabled={uploading} onClick={() => cameraRef.current?.click()}
                  style={{ background: "#f0fdf4", color: "#16a34a", border: "2px solid #16a34a", padding: "6px 14px", borderRadius: "8px", cursor: uploading ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: 700 }}>
                  📷 Camera
                </button>
                <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}
                  style={{ background: "#f9fafb", color: "#374151", border: "1px solid #e5e7eb", padding: "6px 14px", borderRadius: "8px", cursor: uploading ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: 600 }}>
                  🖼️ Gallery
                </button>
              </div>
            </div>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="user" style={{ display: "none" }}
            onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); e.target.value = ""; }}/>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); e.target.value = ""; }}/>
          {msg && <p style={{ margin: "12px 0 0", fontSize: "13px", color: msg.includes("✅") ? "#16a34a" : "#ef4444", fontWeight: 600 }}>{msg}</p>}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", background: "#fff", borderRadius: "12px", padding: "4px", border: "1px solid #e5e7eb", marginBottom: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          {[
            { key: "profile", label: "👤 Profile" },
            { key: "orders",  label: `📦 Orders${activeOrders.length > 0 ? ` (${activeOrders.length} active)` : ""}` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as "profile" | "orders")}
              style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 700,
                background: activeTab === tab.key ? "#0a2e1a" : "transparent",
                color: activeTab === tab.key ? "#fff" : "#374151" }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "28px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <form onSubmit={handleSave}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={lbl}>First Name</label>
                  <input style={inp} value={profile?.first_name || ""} onChange={e => setProfile(p => p ? { ...p, first_name: e.target.value } : p)}/>
                </div>
                <div>
                  <label style={lbl}>Last Name</label>
                  <input style={inp} value={profile?.last_name || ""} onChange={e => setProfile(p => p ? { ...p, last_name: e.target.value } : p)}/>
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Email</label>
                  <input style={{ ...inp, background: "#f9fafb", color: "#9ca3af" }} value={profile?.email || ""} disabled/>
                  <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#9ca3af" }}>Email cannot be changed here</p>
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Phone</label>
                  <input style={inp} type="tel" value={profile?.phone || ""} onChange={e => setProfile(p => p ? { ...p, phone: e.target.value } : p)} placeholder="e.g. 718 555 0123"/>
                </div>
                <div>
                  <label style={lbl}>City</label>
                  <input style={inp} value={profile?.city || ""} onChange={e => setProfile(p => p ? { ...p, city: e.target.value } : p)} placeholder="e.g. Brooklyn"/>
                </div>
                <div>
                  <label style={lbl}>State</label>
                  <input style={inp} value={profile?.state || ""} onChange={e => setProfile(p => p ? { ...p, state: e.target.value } : p)} placeholder="e.g. NY"/>
                </div>
              </div>
              <button type="submit" disabled={saving || uploading}
                style={{ marginTop: "20px", width: "100%", background: (saving || uploading) ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", padding: "13px", borderRadius: "10px", cursor: (saving || uploading) ? "not-allowed" : "pointer", fontSize: "15px", fontWeight: 700 }}>
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </form>
            <div style={{ marginTop: "16px", textAlign: "center" }}>
              <a href="/browse" style={{ fontSize: "14px", color: "#16a34a", fontWeight: 600, textDecoration: "none" }}>Browse Food →</a>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div>
            {ordersLoading && <p style={{ textAlign: "center", color: "#6b7280", padding: "40px 0" }}>Loading your orders...</p>}

            {/* No-show warning banner */}
            {!ordersLoading && warning && (
              <div style={{ background: warning.bg, border: `1px solid ${warning.border}`, borderRadius: "12px", padding: "14px 18px", marginBottom: "16px" }}>
                <p style={{ margin: 0, fontSize: "13px", color: warning.color, lineHeight: 1.5 }}>{warning.text}</p>
              </div>
            )}

            {!ordersLoading && orders.length === 0 && (
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "48px 24px", textAlign: "center" }}>
                <p style={{ fontSize: "48px", margin: "0 0 12px" }}>🍽️</p>
                <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800, color: "#0a2e1a" }}>No orders yet</h3>
                <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: "14px" }}>Start browsing free food near you!</p>
                <a href="/browse" style={{ display: "inline-block", background: "#16a34a", color: "#fff", fontWeight: 700, padding: "12px 28px", borderRadius: "10px", textDecoration: "none", fontSize: "14px" }}>Browse Food</a>
              </div>
            )}

            {/* ── 1. ACTIVE ─────────────────────────────────────────────── */}
            {!ordersLoading && activeOrders.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 800, color: "#2563eb" }}>🔵 Active Reservations</h3>
                {activeOrders.map(order => {
                  const listing   = order.listings;
                  const qty       = order.quantity_claimed || 1;
                  const eta       = etaLeft(order.created_at, order.eta_minutes || 30);
                  const etaIsLow  = !!eta && parseInt(eta) <= 10 && eta.includes("m");
                  const expiry    = listing?.expires_at ? expiryLeft(listing.expires_at) : null;
                  const bizPhone  = order.business_phone || null;
                  const maxEta    = listing?.expires_at
                    ? Math.min(Math.floor((new Date(listing.expires_at).getTime() - Date.now()) / 60000), 600)
                    : 600;
                  const etaOpts   = ETA_OPTIONS.filter(o => o.value <= maxEta);

                  return (
                    <div key={order.id} style={{ background: "#eff6ff", border: "2px solid #bfdbfe", borderRadius: "14px", padding: "18px 20px", marginBottom: "12px" }}>
                      <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                        {listing?.image_url ? (
                          <img src={listing.image_url} alt={listing.food_name} style={{ width: "56px", height: "56px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }}/>
                        ) : (
                          <div style={{ width: "56px", height: "56px", borderRadius: "10px", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0 }}>🍽️</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 800, color: "#1d4ed8" }}>{listing?.food_name || "Food"}</h3>
                          <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 600, color: "#1e3a5f" }}>🏪 {listing?.business_name}</p>
                          <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#3b82f6" }}>📍 {listing?.address}</p>
                          {qty > 1 && <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#1d4ed8", fontWeight: 700 }}>{qty} portions reserved</p>}

                          {/* ETA countdown + listing expiry */}
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                            {eta ? (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: etaIsLow ? "#fef3c7" : "#dbeafe", border: `1px solid ${etaIsLow ? "#fde68a" : "#93c5fd"}`, borderRadius: "20px", padding: "4px 10px" }}>
                                <span style={{ fontSize: "12px" }}>⏱️</span>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: etaIsLow ? "#92400e" : "#1d4ed8" }}>ETA: {eta}</span>
                              </div>
                            ) : (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "20px", padding: "4px 10px" }}>
                                <span style={{ fontSize: "12px", color: "#dc2626", fontWeight: 700 }}>⏱️ ETA passed</span>
                              </div>
                            )}
                            {expiry && (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "20px", padding: "4px 10px" }}>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "#166534" }}>🕐 {expiry}</span>
                              </div>
                            )}
                          </div>

                          <div style={{ background: "#fff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "8px 12px", display: "inline-block" }}>
                            <p style={{ margin: "0 0 2px", fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>PICKUP CODE</p>
                            <p style={{ margin: 0, fontSize: "24px", fontWeight: 900, color: "#1d4ed8", letterSpacing: "4px", fontFamily: "monospace" }}>{order.confirmation_code}</p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ marginTop: "14px" }}>

                        {/* Urgent — running late */}
                        {etaIsLow && bizPhone && (
                          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "10px 14px", marginBottom: "12px" }}>
                            <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 700, color: "#92400e" }}>Running late?</p>
                            <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#78350f", lineHeight: 1.5 }}>
                              Call the restaurant to let them know — they may hold your order so you are not marked as a no-show.
                            </p>
                            <a href={`tel:${bizPhone}`} style={{ display: "inline-block", background: "#f59e0b", color: "#fff", padding: "7px 16px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 700 }}>
                              📞 Call {listing?.business_name}
                            </a>
                          </div>
                        )}

                        {/* ETA editor */}
                        <div style={{ marginBottom: "10px" }}>
                          {etaEditId === order.id ? (
                            <div style={{ background: "#f0f9ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "12px 14px" }}>
                              <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 600, color: "#1d4ed8" }}>Update your arrival time:</p>
                              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                <select value={etaEditValue} onChange={e => setEtaEditValue(Number(e.target.value))}
                                  style={{ flex: 1, padding: "8px 10px", borderRadius: "8px", border: "1px solid #bfdbfe", fontSize: "14px", color: "#111827", background: "#fff" }}>
                                  {etaOpts.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                                <button onClick={() => handleUpdateEta(order.id, listing?.expires_at || "")} disabled={etaLoading}
                                  style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: etaLoading ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 700, whiteSpace: "nowrap" }}>
                                  {etaLoading ? "..." : "Save"}
                                </button>
                                <button onClick={() => setEtaEditId(null)}
                                  style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>
                                  ✕
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "13px", color: "#374151" }}>
                                ETA set: <b>{(order.eta_minutes || 0) < 60 ? `${order.eta_minutes} min` : `${Math.floor((order.eta_minutes||0)/60)}h${(order.eta_minutes||0)%60>0?" "+(order.eta_minutes||0)%60+"m":""}`}</b>
                              </span>
                              <button onClick={() => { setEtaEditId(order.id); setEtaEditValue(order.eta_minutes || 30); }}
                                style={{ background: "none", border: "1px solid #bfdbfe", color: "#2563eb", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
                                ✏️ Update ETA
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Feedback message */}
                        {etaMsg[order.id] && (
                          <p style={{ margin: "0 0 10px", fontSize: "12px", color: etaMsg[order.id].includes("updated") ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                            {etaMsg[order.id]}
                          </p>
                        )}

                        {/* Soft call nudge */}
                        {!etaIsLow && bizPhone && (
                          <div style={{ background: "#f0f9ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "10px 14px", marginBottom: "10px" }}>
                            <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#1d4ed8", lineHeight: 1.5 }}>
                              Need more time? Call the restaurant — they can hold your order so you are not penalized.
                            </p>
                            <a href={`tel:${bizPhone}`} style={{ display: "inline-block", color: "#2563eb", fontSize: "12px", fontWeight: 700, textDecoration: "none" }}>
                              📞 {bizPhone}
                            </a>
                          </div>
                        )}

                        {/* Cancel */}
                        {cancelConfirm === order.id ? (
                          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 14px" }}>
                            <p style={{ margin: "0 0 6px", fontSize: "13px", fontWeight: 700, color: "#991b1b" }}>Cancel this reservation?</p>
                            <p style={{ margin: "0 0 12px", fontSize: "12px", color: "#7f1d1d", lineHeight: 1.5 }}>
                              The food will go back to the community. Please only cancel if you genuinely cannot make it.
                            </p>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button onClick={() => handleCancelClaim(order.id)} disabled={cancelLoading === order.id}
                                style={{ flex: 1, background: "#dc2626", color: "#fff", border: "none", padding: "9px", borderRadius: "8px", cursor: cancelLoading === order.id ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 700 }}>
                                {cancelLoading === order.id ? "Cancelling..." : "Yes, cancel"}
                              </button>
                              <button onClick={() => setCancelConfirm(null)}
                                style={{ flex: 1, background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "9px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
                                Keep it
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setCancelConfirm(order.id)}
                            style={{ width: "100%", background: "none", border: "1px solid #fca5a5", color: "#dc2626", padding: "7px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600, marginTop: "4px" }}>
                            Cancel Reservation
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── 2. NO-SHOWS ───────────────────────────────────────────── */}
            {!ordersLoading && noshowOrders.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 800, color: "#dc2626" }}>
                  🔴 No-shows ({noshowOrders.length})
                  {noshowCount > 0 && (
                    <span style={{ marginLeft: "8px", fontSize: "12px", fontWeight: 600, color: "#9ca3af" }}>
                      — {noshowCount} total on record
                    </span>
                  )}
                </h3>
                {noshowOrders.map(order => {
                  const listing = order.listings;
                  const qty = order.quantity_claimed || 1;
                  return (
                    <div key={order.id} style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "14px", padding: "16px 18px", marginBottom: "10px" }}>
                      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                        {listing?.image_url ? (
                          <img src={listing.image_url} alt={listing.food_name} style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}/>
                        ) : (
                          <div style={{ width: "48px", height: "48px", borderRadius: "8px", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>🍽️</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "2px" }}>
                            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#991b1b" }}>{listing?.food_name || "Food"}</h3>
                            <span style={{ background: "#fef2f2", color: "#ef4444", fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", border: "1px solid #fecaca", flexShrink: 0 }}>No-show</span>
                          </div>
                          <p style={{ margin: "0 0 2px", fontSize: "12px", fontWeight: 600, color: "#374151" }}>🏪 {listing?.business_name}</p>
                          <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#9ca3af" }}>
                            {new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {qty > 1 ? ` · ${qty} portions` : ""}
                          </p>
                          <p style={{ margin: 0, fontSize: "12px", color: "#dc2626", lineHeight: 1.5 }}>
                            You did not arrive within your ETA. The food was released back to the community.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── 3. CANCELLED ──────────────────────────────────────────── */}
            {!ordersLoading && cancelledOrders.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 800, color: "#6b7280" }}>⚫ Cancelled</h3>
                {cancelledOrders.map(order => {
                  const listing = order.listings;
                  const qty = order.quantity_claimed || 1;
                  return (
                    <div key={order.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "16px 18px", marginBottom: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                        {listing?.image_url ? (
                          <img src={listing.image_url} alt={listing.food_name} style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}/>
                        ) : (
                          <div style={{ width: "48px", height: "48px", borderRadius: "8px", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>🍽️</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "2px" }}>
                            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#374151" }}>{listing?.food_name || "Food"}</h3>
                            <span style={{ background: "#f9fafb", color: "#9ca3af", fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", border: "1px solid #e5e7eb", flexShrink: 0 }}>Cancelled</span>
                          </div>
                          <p style={{ margin: "0 0 2px", fontSize: "12px", fontWeight: 600, color: "#374151" }}>🏪 {listing?.business_name}</p>
                          <p style={{ margin: 0, fontSize: "11px", color: "#9ca3af" }}>
                            {new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {qty > 1 ? ` · ${qty} portions` : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── 4. PICKED UP ──────────────────────────────────────────── */}
            {!ordersLoading && pickedUpOrders.length > 0 && (
              <div>
                <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 800, color: "#16a34a" }}>✅ Picked Up</h3>
                {pickedUpOrders.map(order => {
                  const listing = order.listings;
                  const qty = order.quantity_claimed || 1;
                  return (
                    <div key={order.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "16px 18px", marginBottom: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                        {listing?.image_url ? (
                          <img src={listing.image_url} alt={listing.food_name} style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}/>
                        ) : (
                          <div style={{ width: "48px", height: "48px", borderRadius: "8px", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>🍽️</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "2px" }}>
                            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#0a2e1a" }}>{listing?.food_name || "Food"}</h3>
                            <span style={{ background: "#f0fdf4", color: "#16a34a", fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", border: "1px solid #bbf7d0", flexShrink: 0 }}>Picked Up</span>
                          </div>
                          <p style={{ margin: "0 0 2px", fontSize: "12px", fontWeight: 600, color: "#374151" }}>🏪 {listing?.business_name}</p>
                          <p style={{ margin: 0, fontSize: "11px", color: "#9ca3af" }}>
                            {new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {qty > 1 ? ` · ${qty} portions` : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
