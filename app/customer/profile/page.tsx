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
  noshow: boolean;
  listings: {
    food_name: string;
    category: string;
    business_name: string;
    address: string;
    image_url?: string;
  } | null;
};

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:    { bg: "#eff6ff", color: "#2563eb", label: "Reserved" },
  picked_up: { bg: "#f0fdf4", color: "#16a34a", label: "Picked Up" },
  cancelled: { bg: "#f9fafb", color: "#9ca3af", label: "Cancelled" },
  noshow:    { bg: "#fef2f2", color: "#ef4444", label: "No-show" },
};

export default function CustomerProfile() {
  const [profile, setProfile]       = useState<Record<string, string> | null>(null);
  const [userId, setUserId]         = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState("");
  const [uploading, setUploading]   = useState(false);
  const [orders, setOrders]         = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeTab, setActiveTab]   = useState<"profile" | "orders">("profile");
  const [copiedId, setCopiedId]     = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/customer/login"; return; }
      setUserId(user.id);

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

  async function loadOrders(uid?: string) {
    const id = uid || userId;
    if (!id) return;
    setOrdersLoading(true);
    const res = await fetch("/api/customer-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id }),
    });
    const data = await res.json();
    setOrders(data.orders || []);
    setOrdersLoading(false);
  }

  // Load orders on mount too so we can show active reservations
  useEffect(() => {
    if (userId) loadOrders(userId);
  }, [userId]);

  useEffect(() => {
    if (activeTab === "orders" && userId) loadOrders();
  }, [activeTab, userId]);

  async function handleImageUpload(file: File) {
    if (!file || !userId) return;
    setUploading(true);
    setMsg("");
    const fd = new FormData();
    fd.append("file",   file);
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

  function copyCode(code: string, orderId: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(orderId);
      setTimeout(() => setCopiedId(null), 2000);
    });
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

  // Active reservations — show prominently at top
  const activeOrders = orders.filter(o => !o.noshow && o.status === "active");
  const pastOrders   = orders.filter(o => o.noshow || o.status !== "active");

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

        {/* ── ACTIVE RESERVATIONS — prominent top section ── */}
        {activeOrders.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{ fontSize: "18px" }}>🎟️</span>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0a2e1a" }}>Your Active Reservation{activeOrders.length > 1 ? "s" : ""}</h2>
              <span style={{ background: "#16a34a", color: "#fff", fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px" }}>{activeOrders.length}</span>
            </div>
            {activeOrders.map(order => {
              const listing = order.listings;
              const copied = copiedId === order.id;
              return (
                <div key={order.id} style={{ background: "#fff", border: "2px solid #16a34a", borderRadius: "16px", overflow: "hidden", marginBottom: "12px", boxShadow: "0 4px 16px rgba(22,163,74,0.15)" }}>
                  {/* Big green pickup code at top */}
                  <div style={{ background: "#f0fdf4", padding: "20px", textAlign: "center", borderBottom: "1px solid #bbf7d0" }}>
                    <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.1em" }}>🎟️ Your Pickup Code</p>
                    <p style={{ margin: "0 0 8px", fontSize: "48px", fontWeight: 900, color: "#16a34a", letterSpacing: "8px", lineHeight: 1, fontFamily: "monospace" }}>
                      {order.confirmation_code}
                    </p>
                    <button
                      onClick={() => copyCode(order.confirmation_code, order.id)}
                      style={{ background: copied ? "#16a34a" : "#fff", color: copied ? "#fff" : "#374151", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "7px 18px", cursor: "pointer", fontSize: "13px", fontWeight: 700, transition: "all 0.2s" }}>
                      {copied ? "✅ Copied!" : "Copy Code"}
                    </button>
                  </div>
                  {/* Restaurant details */}
                  <div style={{ padding: "16px 20px" }}>
                    {listing?.image_url && (
                      <img src={listing.image_url} alt={listing.food_name} style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "10px", marginBottom: "12px" }}/>
                    )}
                    <h3 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 800, color: "#0a2e1a" }}>{listing?.food_name || "Food"}</h3>
                    <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 600, color: "#374151" }}>🏪 {listing?.business_name}</p>
                    <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#6b7280" }}>📍 {listing?.address}</p>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing?.address || "")}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: "12px", fontWeight: 600, color: "#374151", background: "#f9fafb", border: "1px solid #e5e7eb", padding: "6px 12px", borderRadius: "8px", textDecoration: "none" }}>
                        🗺️ Google Maps
                      </a>
                      <a href={`https://maps.apple.com/?q=${encodeURIComponent(listing?.address || "")}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: "12px", fontWeight: 600, color: "#374151", background: "#f9fafb", border: "1px solid #e5e7eb", padding: "6px 12px", borderRadius: "8px", textDecoration: "none" }}>
                        🍎 Apple Maps
                      </a>
                      <a href={`https://waze.com/ul?q=${encodeURIComponent(listing?.address || "")}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: "12px", fontWeight: 600, color: "#374151", background: "#f9fafb", border: "1px solid #e5e7eb", padding: "6px 12px", borderRadius: "8px", textDecoration: "none" }}>
                        🔵 Waze
                      </a>
                    </div>
                    <p style={{ margin: "12px 0 0", fontSize: "12px", color: "#9ca3af" }}>
                      Reserved {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
          {[{ key: "profile", label: "👤 Profile" }, { key: "orders", label: "📦 Order History" }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as "profile" | "orders")}
              style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 700, background: activeTab === tab.key ? "#0a2e1a" : "transparent", color: activeTab === tab.key ? "#fff" : "#374151", transition: "all 0.2s" }}>
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
                <div>
                  <label style={lbl}>Phone</label>
                  <input style={inp} type="tel" value={profile?.phone || ""} onChange={e => setProfile(p => p ? { ...p, phone: e.target.value } : p)} placeholder="Optional"/>
                </div>
                <div>
                  <label style={lbl}>City</label>
                  <input style={inp} value={profile?.city || ""} onChange={e => setProfile(p => p ? { ...p, city: e.target.value } : p)} placeholder="e.g. Brooklyn"/>
                </div>
                <div style={{ gridColumn: "1/-1" }}>
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
              <a href="/browse" style={{ fontSize: "14px", color: "#16a34a", fontWeight: 600, textDecoration: "none" }}>← Browse Food</a>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div>
            {ordersLoading && <p style={{ textAlign: "center", color: "#6b7280", padding: "40px 0" }}>Loading your orders...</p>}
            {!ordersLoading && pastOrders.length === 0 && activeOrders.length === 0 && (
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "48px 24px", textAlign: "center" }}>
                <p style={{ fontSize: "48px", margin: "0 0 12px" }}>🍽️</p>
                <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800, color: "#0a2e1a" }}>No orders yet</h3>
                <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: "14px" }}>Start browsing free food near you!</p>
                <a href="/browse" style={{ display: "inline-block", background: "#16a34a", color: "#fff", fontWeight: 700, padding: "12px 28px", borderRadius: "10px", textDecoration: "none", fontSize: "14px" }}>Browse Food</a>
              </div>
            )}
            {!ordersLoading && pastOrders.map(order => {
              const listing = order.listings;
              const st = STATUS_STYLE[order.noshow ? "noshow" : order.status] || STATUS_STYLE.active;
              const copied = copiedId === order.id;
              return (
                <div key={order.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", marginBottom: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden" }}>
                  <div style={{ padding: "18px 20px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
                    {listing?.image_url ? (
                      <img src={listing.image_url} alt={listing.food_name} style={{ width: "60px", height: "60px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }}/>
                    ) : (
                      <div style={{ width: "60px", height: "60px", borderRadius: "10px", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", flexShrink: 0 }}>🍽️</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "4px" }}>
                        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#0a2e1a" }}>{listing?.food_name || "Food"}</h3>
                        <span style={{ background: st.bg, color: st.color, fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", flexShrink: 0 }}>{st.label}</span>
                      </div>
                      <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>🏪 {listing?.business_name || "Restaurant"}</p>
                      <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#6b7280" }}>📍 {listing?.address || "Address on file"}</p>
                      <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>
                        {new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  {order.confirmation_code && (
                    <div style={{ margin: "0 16px 16px", background: "#f9fafb", border: "1.5px dashed #d1d5db", borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                      <div>
                        <p style={{ margin: "0 0 2px", fontSize: "11px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>🎟️ Code</p>
                        <p style={{ margin: 0, fontSize: "20px", fontWeight: 900, letterSpacing: "0.1em", color: "#9ca3af", fontFamily: "monospace" }}>
                          {order.confirmation_code}
                        </p>
                      </div>
                      <button onClick={() => copyCode(order.confirmation_code, order.id)}
                        style={{ background: copied ? "#16a34a" : "#fff", color: copied ? "#fff" : "#374151", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}>
                        {copied ? "✅" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
