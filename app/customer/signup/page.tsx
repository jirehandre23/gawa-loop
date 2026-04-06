"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CustomerSignup() {
  const [step, setStep]   = useState<"terms" | "form">("terms");
  const [form, setForm]   = useState({
    firstName: "", lastName: "", email: "",
    phone: "", city: "", state: "",
    password: "", confirm: "",
  });
  const [accepted, setAccepted] = useState({
    terms: false, privacy: false, conduct: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState("");

  const allAccepted = Object.values(accepted).every(Boolean);

  const inp: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: "8px",
    border: "1px solid #d1d5db", fontSize: "14px", color: "#111827",
    outline: "none", boxSizing: "border-box", background: "#fff",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px",
  };
  const checkRow = (checked: boolean): React.CSSProperties => ({
    display: "flex", gap: "12px", alignItems: "flex-start",
    padding: "14px 16px", borderRadius: "10px",
    background: checked ? "#f0fdf4" : "#f9fafb",
    border: `1px solid ${checked ? "#bbf7d0" : "#e5e7eb"}`,
    cursor: "pointer", marginBottom: "10px", transition: "all 0.15s",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!form.firstName.trim()) { setError("Please enter your first name."); return; }
    setSubmitting(true);

    // 1. Create auth user
    const { data, error: authErr } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
      options:  { emailRedirectTo: "https://gawaloop.com/browse" },
    });

    if (authErr) {
      setError(authErr.message);
      setSubmitting(false);
      return;
    }

    // 2. Create customer profile immediately
    if (data.user) {
      const { error: profileErr } = await supabase.from("customer_profiles").insert({
        user_id:    data.user.id,
        first_name: form.firstName.trim(),
        last_name:  form.lastName.trim() || null,
        email:      form.email,
        phone:      form.phone || null,
        city:       form.city  || null,
        state:      form.state || null,
        avatar_url: null,
      });

      if (profileErr) {
        console.error("Profile creation error:", profileErr.message);
        // Don't block — user is created, profile can be set up later
      }
    }

    setDone(true);
    setSubmitting(false);
  }

  if (done) return (
    <div style={{ minHeight: "100vh", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: "20px", padding: "48px 40px", maxWidth: "480px", width: "100%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize: "64px", marginBottom: "16px" }}>✅</div>
        <h1 style={{ margin: "0 0 12px", fontSize: "24px", fontWeight: 800, color: "#0a2e1a" }}>Account Created!</h1>
        <p style={{ margin: "0 0 24px", fontSize: "15px", color: "#6b7280", lineHeight: 1.6 }}>
          Check your email to confirm your account, then start claiming free food from local businesses near you!
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/browse" style={{ display: "inline-block", background: "#16a34a", color: "#fff", fontWeight: 700, padding: "13px 28px", borderRadius: "10px", textDecoration: "none", fontSize: "15px" }}>
            Browse Free Food
          </a>
          <a href="/customer/profile" style={{ display: "inline-block", background: "#f3f4f6", color: "#374151", fontWeight: 700, padding: "13px 28px", borderRadius: "10px", textDecoration: "none", fontSize: "15px", border: "1px solid #e5e7eb" }}>
            Set Up Profile & Photo
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: "32px 16px", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <a href="/"><img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width: "52px", height: "52px", objectFit: "contain", marginBottom: "8px" }}/></a>
          <h1 style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: 800, color: "#0a2e1a" }}>
            {step === "terms" ? "Terms & Authorization" : "Create Your Account"}
          </h1>
          <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>
            {step === "terms" ? "Please read and accept before joining" : "Free to join. Start claiming food today."}
          </p>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "24px" }}>
          {["Terms", "Your Info"].map((label, i) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", background: (step === "form" && i === 0) || (i === 0 && step === "terms") || (i === 1 && step === "form") ? "#16a34a" : "#e5e7eb", color: (step === "form" && i === 0) || (i === 0 && step === "terms") || (i === 1 && step === "form") ? "#fff" : "#9ca3af" }}>
                {step === "form" && i === 0 ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#6b7280" }}>{label}</span>
              {i === 0 && <div style={{ width: "28px", height: "2px", background: step === "form" ? "#16a34a" : "#e5e7eb", borderRadius: "2px" }}/>}
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>

          {/* TERMS */}
          {step === "terms" && (
            <div>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "14px 18px", marginBottom: "24px" }}>
                <p style={{ margin: 0, fontSize: "14px", color: "#166534", lineHeight: 1.6 }}>
                  <b>GAWA Loop</b> connects you with free surplus food from local restaurants, bakeries, and stores in your community. Please read and accept the terms below to join.
                </p>
              </div>

              {[
                { key: "terms",   title: "I agree to the Terms of Use *",    body: "I understand that GAWA Loop is a free community food-sharing platform. All food is provided by local businesses as a donation. I will use this platform respectfully and only for its intended purpose of accessing surplus food." },
                { key: "privacy", title: "I consent to data use *",           body: "I understand that when I claim food, my first name and contact information will be shared with the business providing the food so they can coordinate pickup. After pickup is confirmed, my full contact details will no longer be visible to the business. GAWA Loop will never sell my personal data." },
                { key: "conduct", title: "I agree to community conduct *",    body: "I will only claim food I genuinely intend to pick up. If I cannot pick up a reservation, I will cancel it so the food can go to someone else. I understand that repeated no-shows without cancellation may result in account suspension." },
              ].map(item => (
                <label key={item.key} style={checkRow((accepted as any)[item.key])}
                  onClick={() => setAccepted(a => ({ ...a, [item.key]: !(a as any)[item.key] }))}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "5px", border: `2px solid ${(accepted as any)[item.key] ? "#16a34a" : "#d1d5db"}`, background: (accepted as any)[item.key] ? "#16a34a" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                    {(accepted as any)[item.key] && <span style={{ color: "#fff", fontSize: "13px", fontWeight: 700 }}>✓</span>}
                  </div>
                  <div>
                    <p style={{ margin: "0 0 3px", fontSize: "13px", fontWeight: 700, color: "#0a2e1a" }}>{item.title}</p>
                    <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", lineHeight: 1.5 }}>{item.body}</p>
                  </div>
                </label>
              ))}

              {!allAccepted && (
                <p style={{ margin: "8px 0 12px", fontSize: "12px", color: "#9ca3af", textAlign: "center" }}>
                  Please accept all terms above to continue
                </p>
              )}

              <button onClick={() => { if (allAccepted) setStep("form"); }} disabled={!allAccepted}
                style={{ width: "100%", background: allAccepted ? "#16a34a" : "#d1d5db", color: "#fff", border: "none", padding: "13px", borderRadius: "10px", cursor: allAccepted ? "pointer" : "not-allowed", fontSize: "15px", fontWeight: 700, marginTop: "8px" }}>
                Continue to Sign Up →
              </button>

              <p style={{ textAlign: "center", marginTop: "16px", fontSize: "13px", color: "#6b7280" }}>
                Already have an account?{" "}
                <a href="/customer/login" style={{ color: "#16a34a", fontWeight: 600, textDecoration: "none" }}>Log in</a>
              </p>
              <p style={{ textAlign: "center", marginTop: "8px", fontSize: "13px", color: "#6b7280" }}>
                Registering a business?{" "}
                <a href="/business/signup" style={{ color: "#16a34a", fontWeight: 600, textDecoration: "none" }}>Business signup</a>
              </p>
            </div>
          )}

          {/* FORM */}
          {step === "form" && (
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", color: "#991b1b", fontSize: "13px" }}>
                  {error}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={lbl}>First Name *</label>
                  <input style={inp} required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Your first name"/>
                </div>
                <div>
                  <label style={lbl}>Last Name</label>
                  <input style={inp} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}/>
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Email *</label>
                  <input style={inp} type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/>
                </div>
                <div>
                  <label style={lbl}>Phone</label>
                  <input style={inp} type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Optional"/>
                </div>
                <div>
                  <label style={lbl}>City</label>
                  <input style={inp} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Brooklyn"/>
                </div>
                <div>
                  <label style={lbl}>State</label>
                  <input style={inp} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="e.g. NY"/>
                </div>
                <div>
                  <label style={lbl}>Password *</label>
                  <input style={inp} type="password" required minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 8 characters"/>
                </div>
                <div>
                  <label style={lbl}>Confirm Password *</label>
                  <input style={inp} type="password" required value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}/>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button type="button" onClick={() => setStep("terms")}
                  style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "13px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>
                  ← Back
                </button>
                <button type="submit" disabled={submitting}
                  style={{ flex: 1, background: submitting ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", padding: "13px", borderRadius: "10px", cursor: submitting ? "not-allowed" : "pointer", fontSize: "15px", fontWeight: 700 }}>
                  {submitting ? "Creating account..." : "Create Free Account"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 2 — app/customer/profile/page.tsx (REPLACE)
GitHub → app → customer → profile → page.tsx → pencil → select all → paste → Commit

FIX: Photo upload works with both camera and file picker.
Profile page loads correctly after account creation.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CustomerProfile() {
  const [profile, setProfile]     = useState<Record<string, string> | null>(null);
  const [userId, setUserId]       = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState("");
  const [uploading, setUploading] = useState(false);
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
        // Create profile if it doesn't exist yet
        const newProfile = {
          user_id:    user.id,
          first_name: "",
          last_name:  "",
          email:      user.email || "",
          phone:      "",
          city:       "",
          state:      "",
          avatar_url: "",
        };
        await supabase.from("customer_profiles").insert(newProfile);
        setProfile(newProfile);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleImageUpload(file: File) {
    if (!file || !userId) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file",   file);
    fd.append("bucket", "customer-avatars");
    fd.append("folder", userId);
    const res  = await fetch("/api/upload-image", { method: "POST", body: fd });
    const data = await res.json();
    if (data.url) {
      // Update both local state and database immediately
      setProfile(p => p ? { ...p, avatar_url: data.url } : p);
      await supabase
        .from("customer_profiles")
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
    const { error } = await supabase
      .from("customer_profiles")
      .update({
        first_name: profile.first_name || "",
        last_name:  profile.last_name  || "",
        phone:      profile.phone      || null,
        city:       profile.city       || null,
        state:      profile.state      || null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
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

          {/* AVATAR SECTION */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "28px" }}>

            {/* Avatar display */}
            <div style={{ position: "relative", marginBottom: "16px" }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Your profile photo"
                  style={{ width: "100px", height: "100px", borderRadius: "50%", objectFit: "cover", border: "3px solid #16a34a", display: "block" }}/>
              ) : (
                <div style={{ width: "100px", height: "100px", borderRadius: "50%", background: "#f0fdf4", border: "3px dashed #16a34a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "42px" }}>
                  🙋
                </div>
              )}
              {uploading && (
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontSize: "12px", fontWeight: 700 }}>Uploading...</span>
                </div>
              )}
            </div>

            <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#6b7280", textAlign: "center" }}>
              Add or update your profile photo
            </p>

            {/* Two upload buttons */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="button" disabled={uploading}
                onClick={() => cameraRef.current?.click()}
                style={{ background: "#f0fdf4", color: "#16a34a", border: "2px solid #16a34a", padding: "9px 18px", borderRadius: "8px", cursor: uploading ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 700 }}>
                📷 Take Photo
              </button>
              <button type="button" disabled={uploading}
                onClick={() => fileRef.current?.click()}
                style={{ background: "#f9fafb", color: "#374151", border: "1px solid #e5e7eb", padding: "9px 18px", borderRadius: "8px", cursor: uploading ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 600 }}>
                🖼️ Choose File
              </button>
            </div>

            {/* Hidden file inputs */}
            <input ref={cameraRef} type="file" accept="image/*" capture="user" style={{ display: "none" }}
              onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); e.target.value = ""; }}/>
            <input ref={fileRef}   type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); e.target.value = ""; }}/>
          </div>

          {/* PROFILE FORM */}
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
