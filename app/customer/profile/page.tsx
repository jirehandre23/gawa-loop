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
};

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:    { bg: "#eff6ff", color: "#2563eb", label: "Reserved" },
  picked_up: { bg: "#f0fdf4", color: "#16a34a", label: "Picked Up" },
  cancelled: { bg: "#f9fafb", color: "#9ca3af", label: "Cancelled" },
  noshow:    { bg: "#fef2f2", color: "#ef4444",  label: "No-show" },
};

export default function CustomerProfile() {
  const [profile, setProfile]       = useState<Record<string, string> | null>(null);
  const [userId, setUserId]         = useState<string | null>(null);
  const [userEmail, setUserEmail]   = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState("");
  const [uploading, setUploading]   = useState(false);
  const [orders, setOrders]         = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeTab, setActiveTab]   = useState<"profile" | "orders">("profile");
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

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

    // Query by user_id first
    const { data: byId } = await supabase
      .from("claims")
      .select(`
        id, status, created_at, confirmation_code, quantity_claimed, noshow,
        listings (
          food_name, category, business_name, address, image_url,
          expires_at, quantity_total, quantity_remaining
        )
      `)
      .eq("customer_user_id", uid)
      .order("created_at", { ascending: false })
      .limit(50);

    // Also query by email to catch old claims before user_id was tracked
    let byEmail: any[] = [];
    if (email) {
      const { data: emailData } = await supabase
        .from("claims")
        .select(`
          id, status, created_at, confirmation_code, quantity_claimed, noshow,
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

    // Merge, deduplicate by id, sort by date
    const all = [...(byId || []), ...byEmail];
    const seen = new Set<string>();
    const merged = all
      .filter(o => { if (seen.has(o.id)) return false; seen.add(o.id); return true; })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setOrders(merged as Order[]);
    setOrdersLoading(false);
  }

  useEffect(() => {
    if (activeTab === "orders" && userId) loadOrders(userId, userEmail);
  }, [activeTab, userId, userEmail]);

  async function handleImageUpload(file: File) {
    if (!file || !userId) return;
    setUploading(true); setMsg("");
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

  const activeOrders    = orders.filter(o => o.status === "active");
  const completedOrders = orders.filter(o => o.status === "picked_up");
  const pastOrders      = orders.filter(o => o.status !== "active" && o.status !== "picked_up");

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
            { key: "profile", label: `👤 Profile` },
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

            {!ordersLoading && orders.length === 0 && (
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "48px 24px", textAlign: "center" }}>
                <p style={{ fontSize: "48px", margin: "0 0 12px" }}>🍽️</p>
                <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800, color: "#0a2e1a" }}>No orders yet</h3>
                <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: "14px" }}>Start browsing free food near you!</p>
                <a href="/browse" style={{ display: "inline-block", background: "#16a34a", color: "#fff", fontWeight: 700, padding: "12px 28px", borderRadius: "10px", textDecoration: "none", fontSize: "14px" }}>Browse Food</a>
              </div>
            )}

            {/* Active reservations first */}
            {!ordersLoading && activeOrders.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 800, color: "#2563eb" }}>🔵 Active Reservations</h3>
                {activeOrders.map(order => {
                  const listing = order.listings;
                  const qty = order.quantity_claimed || 1;
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
                          <div style={{ background: "#fff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "8px 12px", display: "inline-block" }}>
                            <p style={{ margin: "0 0 2px", fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>PICKUP CODE</p>
                            <p style={{ margin: 0, fontSize: "24px", fontWeight: 900, color: "#1d4ed8", letterSpacing: "4px", fontFamily: "monospace" }}>{order.confirmation_code}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completed and past orders */}
            {!ordersLoading && (completedOrders.length > 0 || pastOrders.length > 0) && (
              <div>
                {completedOrders.length > 0 && (
                  <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 800, color: "#16a34a" }}>✅ Picked Up</h3>
                )}
                {[...completedOrders, ...pastOrders].map(order => {
                  const listing = order.listings;
                  const st = STATUS_STYLE[order.noshow ? "noshow" : order.status] || STATUS_STYLE.active;
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
                            <span style={{ background: st.bg, color: st.color, fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", flexShrink: 0 }}>{st.label}</span>
                          </div>
                          <p style={{ margin: "0 0 2px", fontSize: "12px", fontWeight: 600, color: "#374151" }}>🏪 {listing?.business_name}</p>
                          <p style={{ margin: "0 0 2px", fontSize: "11px", color: "#9ca3af" }}>📍 {listing?.address}</p>
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
