"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CustomerProfile() {
  const [profile, setProfile]   = useState<Record<string, string> | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState("");
  const [uploading, setUploading] = useState(false);
  const avatarRef               = useRef<HTMLInputElement>(null);
  const cameraRef               = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/customer/login"; return; }
      const { data } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setProfile(
        data || {
          user_id: user.id,
          first_name: "", last_name: "",
          email: user.email || "",
          phone: "", city: "", state: "", avatar_url: "",
        }
      );
      setLoading(false);
    }
    load();
  }, []);

  async function handleImageUpload(file: File) {
    if (!file || !profile?.user_id) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file",   file);
    fd.append("bucket", "customer-avatars");
    fd.append("folder", profile.user_id);
    const res  = await fetch("/api/upload-image", { method: "POST", body: fd });
    const data = await res.json();
    if (data.url) {
      setProfile(p => p ? { ...p, avatar_url: data.url } : p);
    }
    setUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true); setMsg("");
    const { error } = await supabase
      .from("customer_profiles")
      .upsert({ ...profile, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setMsg(error ? "Error saving. Please try again." : "✅ Profile saved successfully!");
    setSaving(false);
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: "8px",
    border: "1px solid #d1d5db", fontSize: "14px", color: "#111827",
    outline: "none", boxSizing: "border-box", background: "#fff",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: "13px", fontWeight: 600,
    color: "#374151", marginBottom: "6px",
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <p style={{ color: "#6b7280" }}>Loading your profile...</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", padding: "32px 16px", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <a href="/browse">
            <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width: "36px", height: "36px", objectFit: "contain" }}/>
          </a>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#0a2e1a" }}>My Profile</h1>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>

          {/* Avatar section */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "28px" }}>
            <div style={{ position: "relative", marginBottom: "12px" }}>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Your profile photo"
                  style={{ width: "96px", height: "96px", borderRadius: "50%", objectFit: "cover", border: "3px solid #16a34a" }}
                />
              ) : (
                <div style={{ width: "96px", height: "96px", borderRadius: "50%", background: "#f0fdf4", border: "3px dashed #16a34a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px" }}>
                  🙋
                </div>
              )}
              {uploading && (
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontSize: "12px", fontWeight: 700 }}>...</span>
                </div>
              )}
            </div>

            <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#6b7280", textAlign: "center" }}>
              Add or change your profile photo
            </p>

            {/* Two upload buttons — camera and file */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                style={{ background: "#f0fdf4", color: "#16a34a", border: "2px solid #16a34a", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>
                📷 Take Photo
              </button>
              <button
                type="button"
                onClick={() => avatarRef.current?.click()}
                style={{ background: "#f9fafb", color: "#374151", border: "1px solid #e5e7eb", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
                🖼️ Choose File
              </button>
            </div>

            {/* Hidden inputs */}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="user"
              style={{ display: "none" }}
              onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }}
            />
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }}
            />
          </div>

          {/* Profile form */}
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

            {msg && (
              <p style={{ margin: "12px 0 0", fontSize: "14px", color: msg.includes("✅") ? "#16a34a" : "#ef4444", fontWeight: 600 }}>
                {msg}
              </p>
            )}

            <button type="submit" disabled={saving || uploading}
              style={{ marginTop: "20px", width: "100%", background: (saving || uploading) ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", padding: "13px", borderRadius: "10px", cursor: (saving || uploading) ? "not-allowed" : "pointer", fontSize: "15px", fontWeight: 700 }}>
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </form>

          <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <a href="/browse" style={{ fontSize: "14px", color: "#16a34a", fontWeight: 600, textDecoration: "none" }}>← Browse Food</a>
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/browse"; }}
              style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
