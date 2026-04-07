"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Order = {
  claim_id: string;
  food_name: string;
  business_name: string;
  address: string;
  listing_status: string;
  image_url?: string;
  expires_at: string;
  reserved_until: string;
  claim_status: string;
  confirmation_code: string;
  created_at: string;
  noshow: boolean;
};

export default function CustomerProfile() {
  const [user, setUser]           = useState<any>(null);
  const [profile, setProfile]     = useState<any>(null);
  const [orders, setOrders]       = useState<Order[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg]             = useState("");
  const [tab, setTab]             = useState<"active" | "history" | "profile">("active");
  const [copied, setCopied]       = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/"; return; }

      // Redirect business owners to their dashboard
      const { data: biz } = await supabase
        .from("businesses").select("id")
        .eq("email", user.email || "").single();
      if (biz) { window.location.href = "/business/dashboard"; return; }

      setUser(user);

      // Load or create profile
      const { data: prof } = await supabase
        .from("customer_profiles").select("*")
        .eq("user_id", user.id).single();
      if (prof) {
        setProfile(prof);
      } else {
        const newProf = {
          user_id: user.id, email: user.email || "",
          first_name: "", last_name: "", phone: "", city: "", state: "", avatar_url: "",
        };
        await supabase.from("customer_profiles").insert(newProf);
        setProfile(newProf);
      }

      // Load orders
      const { data: claims } = await supabase
        .from("claims")
        .select(`id, status, confirmation_code, created_at, noshow,
          listings ( id, food_name, business_name, address, status, image_url, expires_at, reserved_until )`)
        .eq("email", user.email || "")
        .order("created_at", { ascending: false });

      const mapped: Order[] = (claims || [])
        .filter((c: any) => c.listings)
        .map((c: any) => ({
          claim_id: c.id,
          food_name: c.listings.food_name,
          business_name: c.listings.business_name,
          address: c.listings.address,
          listing_status: c.listings.status,
          image_url: c.listings.image_url,
          expires_at: c.listings.expires_at,
          reserved_until: c.listings.reserved_until,
          claim_status: c.status,
          confirmation_code: c.confirmation_code,
          created_at: c.created_at,
          noshow: c.noshow,
        }));
      setOrders(mapped);
      setLoading(false);
    })();
  }, []);

  async function handleAvatarUpload(file: File) {
    if (!file || !user) return;
    setUploading(true); setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("bucket", "customer-avatars");
    fd.append("folder", user.id);
    const res  = await fetch("/api/upload-image", { method: "POST", body: fd });
    const data = await res.json();
    if (data.url) {
      const urlWithCacheBust = data.url + "?t=" + Date.now();
      // Save to customer_profiles
      const { error } = await supabase.from("customer_profiles")
        .update({ avatar_url: data.url, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (error) { setMsg("Upload ok but save failed: " + error.message); }
      else { setProfile((p: any) => ({ ...p, avatar_url: urlWithCacheBust })); setMsg("✅ Photo saved!"); }
    } else {
      setMsg("Upload failed. Please try again.");
    }
    setUploading(false);
    setTimeout(() => setMsg(""), 4000);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile) return;
    setSaving(true); setMsg("");
    const { error } = await supabase.from("customer_profiles").update({
      first_name: profile.first_name || "",
      last_name:  profile.last_name  || "",
      phone:      profile.phone      || null,
      city:       profile.city       || null,
      state:      profile.state      || null,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);
    setMsg(error ? "Error saving: " + error.message : "✅ Profile saved!");
    setSaving(false);
    setTimeout(() => setMsg(""), 4000);
  }

  function copyCode(code: string, id: string) {
    navigator.clipboard?.writeText(code).catch(() => {
      const el = document.createElement("textarea");
      el.value = code; document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
    });
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: "8px",
    border: "1px solid #d1d5db", fontSize: "14px", color: "#111827",
    outline: "none", boxSizing: "border-box", background: "#fff",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px",
  };

  const activeOrders  = orders.filter(o => o.claim_status === "active" && o.listing_status === "RESERVED");
  const historyOrders = orders.filter(o => !(o.claim_status === "active" && o.listing_status === "RESERVED"));

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"sans-serif" }}>
      <p style={{ color:"#6b7280" }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#f9fafb", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", padding:"24px 16px" }}>
      <div style={{ maxWidth:"600px", margin:"0 auto" }}>

        {/* HEADER */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"24px", flexWrap:"wrap", gap:"12px" }}>
          <div>
            <h1 style={{ margin:0, fontSize:"22px", fontWeight:800, color:"#0a2e1a" }}>My Account</h1>
            <p style={{ margin:"2px 0 0", fontSize:"13px", color:"#6b7280" }}>{user?.email}</p>
          </div>
          <div style={{ display:"flex", gap:"8px" }}>
            <a href="/browse" style={{ background:"#f3f4f6", color:"#374151", border:"1px solid #e5e7eb", padding:"8px 14px", borderRadius:"8px", textDecoration:"none", fontSize:"13px", fontWeight:600 }}>🍽️ Browse</a>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
              style={{ background:"#f3f4f6", color:"#374151", border:"1px solid #e5e7eb", padding:"8px 14px", borderRadius:"8px", cursor:"pointer", fontSize:"13px", fontWeight:600 }}>
              Sign Out
            </button>
          </div>
        </div>

        {/* AVATAR SECTION */}
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:"16px", padding:"24px", marginBottom:"16px", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"20px" }}>
            <div style={{ position:"relative", flexShrink:0 }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile"
                  style={{ width:"80px", height:"80px", borderRadius:"50%", objectFit:"cover", border:"3px solid #16a34a" }}/>
              ) : (
                <div style={{ width:"80px", height:"80px", borderRadius:"50%", background:"#f0fdf4", border:"3px dashed #16a34a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"36px" }}>
                  🙋
                </div>
              )}
              {uploading && (
                <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ color:"#fff", fontSize:"11px", fontWeight:700 }}>...</span>
                </div>
              )}
            </div>
            <div>
              <p style={{ margin:"0 0 4px", fontSize:"16px", fontWeight:800, color:"#0a2e1a" }}>
                {profile?.first_name || profile?.last_name
                  ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
                  : "Your Profile"}
              </p>
              <p style={{ margin:"0 0 12px", fontSize:"13px", color:"#6b7280" }}>{user?.email}</p>
              <div style={{ display:"flex", gap:"8px" }}>
                <button type="button" disabled={uploading}
                  onClick={() => cameraRef.current?.click()}
                  style={{ background:"#f0fdf4", color:"#16a34a", border:"2px solid #16a34a", padding:"6px 14px", borderRadius:"8px", cursor:uploading?"not-allowed":"pointer", fontSize:"12px", fontWeight:700 }}>
                  📷 Camera
                </button>
                <button type="button" disabled={uploading}
                  onClick={() => galleryRef.current?.click()}
                  style={{ background:"#f9fafb", color:"#374151", border:"1px solid #e5e7eb", padding:"6px 14px", borderRadius:"8px", cursor:uploading?"not-allowed":"pointer", fontSize:"12px", fontWeight:600 }}>
                  🖼️ Gallery
                </button>
              </div>
              {msg && <p style={{ margin:"8px 0 0", fontSize:"12px", color:msg.includes("✅")?"#16a34a":"#ef4444", fontWeight:600 }}>{msg}</p>}
            </div>
          </div>
          {/* Hidden file inputs */}
          <input ref={cameraRef} type="file" accept="image/*" capture="user" style={{ display:"none" }}
            onChange={e => { if (e.target.files?.[0]) handleAvatarUpload(e.target.files[0]); e.target.value = ""; }}/>
          <input ref={galleryRef} type="file" accept="image/*" style={{ display:"none" }}
            onChange={e => { if (e.target.files?.[0]) handleAvatarUpload(e.target.files[0]); e.target.value = ""; }}/>
        </div>

        {/* TABS */}
        <div style={{ display:"flex", gap:"4px", background:"#fff", borderRadius:"12px", padding:"4px", border:"1px solid #e5e7eb", marginBottom:"20px" }}>
          {[
            { key:"active",  label:`🟢 Active (${activeOrders.length})` },
            { key:"history", label:`📁 History (${historyOrders.length})` },
            { key:"profile", label:"👤 Profile" },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              style={{ flex:1, padding:"10px", borderRadius:"8px", border:"none", cursor:"pointer", fontSize:"13px", fontWeight:700, background:tab===t.key?"#0a2e1a":"transparent", color:tab===t.key?"#fff":"#374151" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ACTIVE TAB */}
        {tab === "active" && (
          <>
            {activeOrders.length === 0 ? (
              <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:"12px", padding:"40px", textAlign:"center" }}>
                <p style={{ color:"#6b7280", marginBottom:"16px" }}>No active reservations right now.</p>
                <a href="/browse" style={{ background:"#16a34a", color:"#fff", padding:"12px 24px", borderRadius:"8px", textDecoration:"none", fontWeight:600 }}>Browse Food</a>
              </div>
            ) : activeOrders.map(order => {
              const maps = encodeURIComponent(order.address);
              const expiry = order.reserved_until ? new Date(order.reserved_until) : null;
              const minsLeft = expiry ? Math.max(0, Math.round((expiry.getTime() - Date.now()) / 60000)) : null;
              return (
                <div key={order.claim_id} style={{ background:"#fff", border:"2px solid #16a34a", borderRadius:"16px", overflow:"hidden", marginBottom:"16px", boxShadow:"0 2px 12px rgba(22,163,74,0.1)" }}>
                  <div style={{ background:"#f0fdf4", padding:"20px", textAlign:"center", borderBottom:"1px solid #bbf7d0" }}>
                    <p style={{ margin:"0 0 4px", fontSize:"11px", fontWeight:700, color:"#15803d", textTransform:"uppercase", letterSpacing:"0.1em" }}>🎟️ Your Pickup Code</p>
                    <p style={{ margin:"0 0 10px", fontSize:"52px", fontWeight:900, color:"#0a2e1a", letterSpacing:"6px", lineHeight:1, fontFamily:"monospace" }}>
                      {order.confirmation_code}
                    </p>
                    <button onClick={() => copyCode(order.confirmation_code, order.claim_id)}
                      style={{ background:copied===order.claim_id?"#16a34a":"#fff", color:copied===order.claim_id?"#fff":"#374151", border:"1px solid #e5e7eb", borderRadius:"8px", padding:"7px 18px", cursor:"pointer", fontSize:"13px", fontWeight:700, transition:"all 0.2s" }}>
                      {copied === order.claim_id ? "✅ Copied!" : "Copy Code"}
                    </button>
                    {minsLeft !== null && (
                      <p style={{ margin:"8px 0 0", fontSize:"12px", color:minsLeft<10?"#ef4444":"#6b7280", fontWeight:minsLeft<10?700:400 }}>
                        ⏰ {minsLeft > 0 ? `${minsLeft} min left to pick up` : "Time window passed"}
                      </p>
                    )}
                  </div>
                  <div style={{ padding:"16px 20px" }}>
                    {order.image_url && <img src={order.image_url} alt={order.food_name} style={{ width:"100%", height:"120px", objectFit:"cover", borderRadius:"10px", marginBottom:"12px" }}/>}
                    <h3 style={{ margin:"0 0 4px", fontSize:"17px", fontWeight:800, color:"#0a2e1a" }}>{order.food_name}</h3>
                    <p style={{ margin:"0 0 4px", fontSize:"14px", fontWeight:600, color:"#374151" }}>🏪 {order.business_name}</p>
                    <p style={{ margin:"0 0 14px", fontSize:"13px", color:"#6b7280" }}>📍 {order.address}</p>
                    <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                      <a href={`https://maps.google.com/?q=${maps}`} target="_blank" rel="noreferrer"
                        style={{ background:"#4285f4", color:"#fff", padding:"7px 12px", borderRadius:"8px", textDecoration:"none", fontSize:"12px", fontWeight:600 }}>🗺️ Google Maps</a>
                      <a href={`https://maps.apple.com/?q=${maps}`} target="_blank" rel="noreferrer"
                        style={{ background:"#111", color:"#fff", padding:"7px 12px", borderRadius:"8px", textDecoration:"none", fontSize:"12px", fontWeight:600 }}>🍎 Apple Maps</a>
                      <a href={`https://waze.com/ul?q=${maps}`} target="_blank" rel="noreferrer"
                        style={{ background:"#33ccff", color:"#000", padding:"7px 12px", borderRadius:"8px", textDecoration:"none", fontSize:"12px", fontWeight:600 }}>🚗 Waze</a>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* HISTORY TAB */}
        {tab === "history" && (
          <>
            {historyOrders.length === 0 ? (
              <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:"12px", padding:"40px", textAlign:"center" }}>
                <p style={{ color:"#6b7280" }}>No past orders yet.</p>
              </div>
            ) : historyOrders.map(order => {
              const isPickedUp  = order.listing_status === "PICKED_UP";
              const isCancelled = order.claim_status === "cancelled" || order.listing_status === "CANCELLED";
              const isNoshow    = order.noshow;
              const isExpired   = order.listing_status === "EXPIRED";
              const badge = isPickedUp  ? { bg:"#7c3aed", text:"#fff", label:"Picked Up" }
                          : isNoshow    ? { bg:"#f59e0b", text:"#fff", label:"No-Show" }
                          : isCancelled ? { bg:"#ef4444", text:"#fff", label:"Cancelled" }
                          : isExpired   ? { bg:"#9ca3af", text:"#fff", label:"Expired" }
                          : { bg:"#6b7280", text:"#fff", label:order.listing_status };
              return (
                <div key={order.claim_id} style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:"14px", padding:"18px 20px", marginBottom:"10px", display:"flex", gap:"14px", alignItems:"flex-start" }}>
                  {order.image_url
                    ? <img src={order.image_url} alt={order.food_name} style={{ width:"52px", height:"52px", borderRadius:"8px", objectFit:"cover", flexShrink:0 }}/>
                    : <div style={{ width:"52px", height:"52px", borderRadius:"8px", background:"#f0fdf4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"24px", flexShrink:0 }}>🍽️</div>
                  }
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px", marginBottom:"4px" }}>
                      <p style={{ margin:0, fontSize:"15px", fontWeight:700, color:"#0a2e1a" }}>{order.food_name}</p>
                      <span style={{ background:badge.bg, color:badge.text, fontSize:"11px", fontWeight:700, padding:"3px 10px", borderRadius:"16px", flexShrink:0 }}>{badge.label}</span>
                    </div>
                    <p style={{ margin:"0 0 2px", fontSize:"13px", color:"#374151", fontWeight:600 }}>{order.business_name}</p>
                    <p style={{ margin:0, fontSize:"12px", color:"#9ca3af" }}>{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* PROFILE TAB */}
        {tab === "profile" && (
          <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:"16px", padding:"28px" }}>
            <form onSubmit={handleSaveProfile}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
                <div>
                  <label style={lbl}>First Name</label>
                  <input style={inp} value={profile?.first_name || ""} onChange={e => setProfile((p: any) => ({ ...p, first_name: e.target.value }))}/>
                </div>
                <div>
                  <label style={lbl}>Last Name</label>
                  <input style={inp} value={profile?.last_name || ""} onChange={e => setProfile((p: any) => ({ ...p, last_name: e.target.value }))}/>
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={lbl}>Email</label>
                  <input style={{ ...inp, background:"#f9fafb", color:"#9ca3af" }} value={profile?.email || ""} disabled/>
                  <p style={{ margin:"4px 0 0", fontSize:"11px", color:"#9ca3af" }}>Email cannot be changed here</p>
                </div>
                <div>
                  <label style={lbl}>Phone</label>
                  <input style={inp} type="tel" value={profile?.phone || ""} onChange={e => setProfile((p: any) => ({ ...p, phone: e.target.value }))} placeholder="Optional"/>
                </div>
                <div>
                  <label style={lbl}>City</label>
                  <input style={inp} value={profile?.city || ""} onChange={e => setProfile((p: any) => ({ ...p, city: e.target.value }))} placeholder="e.g. Brooklyn"/>
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={lbl}>State</label>
                  <input style={inp} value={profile?.state || ""} onChange={e => setProfile((p: any) => ({ ...p, state: e.target.value }))} placeholder="e.g. NY"/>
                </div>
              </div>
              {msg && <p style={{ margin:"14px 0 0", fontSize:"13px", color:msg.includes("✅")?"#16a34a":"#ef4444", fontWeight:600 }}>{msg}</p>}
              <button type="submit" disabled={saving}
                style={{ marginTop:"20px", width:"100%", background:saving?"#9ca3af":"#16a34a", color:"#fff", border:"none", padding:"13px", borderRadius:"10px", cursor:saving?"not-allowed":"pointer", fontSize:"15px", fontWeight:700 }}>
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </form>
            <div style={{ marginTop:"16px", textAlign:"center" }}>
              <a href="/browse" style={{ fontSize:"14px", color:"#16a34a", fontWeight:600, textDecoration:"none" }}>← Browse Food</a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
