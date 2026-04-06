"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { detectLocale, t, Locale } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_EMAIL = "admin@gawaloop.com";
const TERMINAL    = ["PICKED_UP", "EXPIRED", "CANCELLED"];

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  AVAILABLE: { bg: "#16a34a", text: "#fff" },
  RESERVED:  { bg: "#2563eb", text: "#fff" },
  PICKED_UP: { bg: "#7c3aed", text: "#fff" },
  EXPIRED:   { bg: "#9ca3af", text: "#fff" },
  CANCELLED: { bg: "#ef4444", text: "#fff" },
};

type ClaimRow = {
  id: string; first_name: string; email: string; phone: string;
  eta_minutes: number; confirmation_code: string; reserved_until: string;
  status: string; customer_user_id?: string;
};
type CustomerProfile = {
  first_name: string; last_name: string; email: string;
  phone: string; city: string; state: string; avatar_url: string;
};
type ListingRow = {
  id: string; food_name: string; category: string; quantity: string;
  address: string; allergy_note: string; estimated_value: number; note: string;
  status: string; expires_at: string; created_at: string; reserved_until: string;
  claim_code: string; image_url?: string; weight_kg?: number;
  claims?: ClaimRow[];
};

const EMPTY_FORM = {
  food_name: "", category: "Food", quantity: "", allergy_note: "",
  estimated_value: "", weight_lbs: "", note: "",
  active_hours: "1", claim_hold: "10",
};

const LBS_TO_KG = 0.453592;

// Tree metric in lbs (1 kg ≈ 2.205 lbs)
function treeMetric(lbs: number): { emoji: string; label: string } {
  if (lbs <= 0)    return { emoji: "🌱", label: "Plant a seed — start donating!" };
  if (lbs < 11)    return { emoji: "🌱", label: "Seedling saved" };
  if (lbs < 33)    return { emoji: "🪴", label: "Small plant" };
  if (lbs < 88)    return { emoji: "🌿", label: "Young tree" };
  if (lbs < 220)   return { emoji: "🌳", label: "Full tree" };
  if (lbs < 551)   return { emoji: "🌳🌳", label: "2 trees" };
  if (lbs < 1102)  return { emoji: "🌲🌲🌲", label: "Small forest" };
  return { emoji: "🌲🌲🌲🌲🌲", label: "Forest preserved!" };
}

export default function BusinessDashboard() {
  const [locale, setLocale]                 = useState<Locale>("en");
  const [listings, setListings]             = useState<ListingRow[]>([]);
  const [businessName, setBusiness]         = useState<string | null>(null);
  const [businessId, setBusinessId]         = useState<string | null>(null);
  const [businessAddress, setAddress]       = useState("");
  const [businessLogoUrl, setLogoUrl]       = useState<string | null>(null);
  const [loading, setLoading]               = useState(true);
  const [isAdmin, setIsAdmin]               = useState(false);
  const [adminView, setAdminView]           = useState<string | null>(null);
  const [allBizNames, setAllBizNames]       = useState<string[]>([]);
  const [showForm, setShowForm]             = useState(false);
  const [form, setForm]                     = useState(EMPTY_FORM);
  const [posting, setPosting]               = useState(false);
  const [postMsg, setPostMsg]               = useState("");
  const [uploadingImg, setUploadingImg]     = useState(false);
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [editForm, setEditForm]             = useState<Partial<typeof EMPTY_FORM>>({});
  const [claimerProfile, setClaimerProfile] = useState<CustomerProfile | null>(null);
  const [showClaimerModal, setShowClaimerModal] = useState(false);
  const listingFileRef = useRef<HTMLInputElement>(null);
  const logoRef        = useRef<HTMLInputElement>(null);

  useEffect(() => { setLocale(detectLocale()); }, []);

  async function uploadImage(file: File, bucket: string, folder: string): Promise<string | null> {
    setUploadingImg(true);
    const fd = new FormData();
    fd.append("file",   file);
    fd.append("bucket", bucket);
    fd.append("folder", folder);
    const res  = await fetch("/api/upload-image", { method: "POST", body: fd });
    const data = await res.json();
    setUploadingImg(false);
    return data.url || null;
  }

  async function loadDashboard(adminTarget?: string | null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/business/login"; return; }

    const email = user.email || "";
    const admin = email === ADMIN_EMAIL;
    setIsAdmin(admin);

    if (admin) {
      const { data } = await supabase.from("listings").select("business_name").order("business_name");
      const unique = [...new Set((data || []).map((b: { business_name: string }) => b.business_name).filter(Boolean))];
      setAllBizNames(unique as string[]);
    }

    const { data: biz } = await supabase
      .from("businesses")
      .select("id, name, address, logo_url, status")
      .eq("email", email)
      .single();

    if (biz && biz.status === "pending" && !admin) {
      window.location.href = "/business/pending";
      return;
    }
    if (biz && biz.status === "rejected" && !admin) {
      await supabase.auth.signOut();
      window.location.href = "/business/login";
      return;
    }

    const bName = admin ? (adminTarget ?? null) : (biz?.name ?? null);
    setBusiness(bName);
    setAddress(biz?.address || "");
    setLogoUrl(biz?.logo_url || null);
    setBusinessId(biz?.id || null);

    if (bName) {
      const { data } = await supabase
        .from("listings")
        .select("*, claims(*)")
        .eq("business_name", bName)
        .order("created_at", { ascending: false });
      setListings(data || []);
    }
    setLoading(false);
  }

  useEffect(() => { loadDashboard(adminView); }, [adminView]);

  const now           = new Date();
  const thisMonth     = now.getMonth();
  const thisYear      = now.getFullYear();
  const monthlyL      = listings.filter(l => { const d = new Date(l.created_at); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; });
  const yearlyL       = listings.filter(l => new Date(l.created_at).getFullYear() === thisYear);
  const mPickups      = monthlyL.filter(l => l.status === "PICKED_UP").length;
  const yPickups      = yearlyL.filter(l => l.status === "PICKED_UP").length;

  // Total weight in lbs (DB stores kg, display in lbs)
  const totalWeightLbs = listings
    .filter(l => l.status === "PICKED_UP")
    .reduce((s, l) => s + Number(l.weight_kg || 0) * 2.205, 0);
  const tree = treeMetric(totalWeightLbs);
  const T    = t[locale];

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;
    const url = await uploadImage(file, "business-logos", businessId);
    if (url) {
      await supabase.from("businesses").update({ logo_url: url }).eq("id", businessId);
      setLogoUrl(url);
    }
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!businessName) return;
    setPosting(true); setPostMsg("");

    let imageUrl: string | null = null;
    if (listingFileRef.current?.files?.[0]) {
      imageUrl = await uploadImage(
        listingFileRef.current.files[0],
        "listing-images",
        businessName.replace(/\s/g, "_")
      );
    }

    const expiresAt = new Date(Date.now() + Number(form.active_hours) * 3600000).toISOString();

    // Convert lbs to kg for storage
    const weightKg = form.weight_lbs ? Number(form.weight_lbs) * LBS_TO_KG : null;

    const { error } = await supabase.from("listings").insert({
      business_name:      businessName,
      address:            businessAddress,
      food_name:          form.food_name,
      category:           form.category,
      quantity:           form.quantity,
      allergy_note:       form.allergy_note || null,
      estimated_value:    form.estimated_value ? Number(form.estimated_value) : null,
      weight_kg:          weightKg,
      note:               form.note || null,
      status:             "AVAILABLE",
      expires_at:         expiresAt,
      claim_hold_minutes: Number(form.claim_hold),
      image_url:          imageUrl,
    });

    if (error) { setPostMsg("Error posting. Please try again."); }
    else {
      setPostMsg("✅ Food posted successfully!");
      setForm(EMPTY_FORM);
      setShowForm(false);
      if (listingFileRef.current) listingFileRef.current.value = "";
      loadDashboard(adminView);
    }
    setPosting(false);
  }

  async function handlePickedUp(id: string) {
    const res  = await fetch("/api/mark-picked-up", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId: id }) });
    const data = await res.json();
    if (data.success) setListings(prev => prev.map(l => l.id === id ? { ...l, status: "PICKED_UP" } : l));
  }

  async function handleCancelReservation(id: string) {
    await supabase.from("listings")
      .update({ status: "AVAILABLE", reserved_until: null, claim_code: null })
      .eq("id", id);
    setListings(prev => prev.map(l =>
      l.id === id ? { ...l, status: "AVAILABLE", reserved_until: null as unknown as string, claim_code: null as unknown as string } : l
    ));
  }

  async function handleCancelListing(id: string) {
    if (!confirm("Cancel this listing? Any customers will be notified by email.")) return;
    const res  = await fetch("/api/cancel-listing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId: id }) });
    const data = await res.json();
    if (data.success) {
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: "CANCELLED" } : l));
      if (data.notified > 0) alert(`${data.notified} customer(s) notified by email.`);
    }
  }

  function startEdit(listing: ListingRow) {
    setEditingId(listing.id);
    // Convert stored kg back to lbs for display in edit form
    const lbs = listing.weight_kg ? (listing.weight_kg * 2.205).toFixed(1) : "";
    setEditForm({
      food_name:       listing.food_name,
      category:        listing.category,
      quantity:        listing.quantity,
      allergy_note:    listing.allergy_note || "",
      note:            listing.note || "",
      estimated_value: String(listing.estimated_value || ""),
      weight_lbs:      lbs,
    });
  }

  async function handleSaveEdit(id: string) {
    // Convert lbs back to kg for storage
    const weightKg = editForm.weight_lbs ? Number(editForm.weight_lbs) * LBS_TO_KG : null;
    await supabase.from("listings").update({
      food_name:      editForm.food_name,
      category:       editForm.category,
      quantity:       editForm.quantity,
      allergy_note:   editForm.allergy_note || null,
      note:           editForm.note || null,
      estimated_value: editForm.estimated_value ? Number(editForm.estimated_value) : null,
      weight_kg:       weightKg,
    }).eq("id", id);
    setListings(prev => prev.map(l =>
      l.id === id
        ? { ...l, ...editForm, estimated_value: Number(editForm.estimated_value || 0), weight_kg: weightKg || 0 }
        : l
    ));
    setEditingId(null);
  }

  async function viewClaimerProfile(userId: string) {
    const { data } = await supabase
      .from("customer_profiles")
      .select("first_name, last_name, email, phone, city, state, avatar_url")
      .eq("user_id", userId)
      .single();
    if (data) { setClaimerProfile(data as CustomerProfile); setShowClaimerModal(true); }
    else { alert("No profile found for this customer."); }
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: "8px",
    border: "1px solid #d1d5db", fontSize: "14px", color: "#111827",
    boxSizing: "border-box", outline: "none", background: "#fff",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px",
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <p style={{ color: "#6b7280" }}>Loading dashboard...</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", padding: "24px 16px" }}>
      <div style={{ maxWidth: "780px", margin: "0 auto" }}>

        {/* Claimer profile modal */}
        {showClaimerModal && claimerProfile && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <div style={{ background: "#fff", borderRadius: "20px", padding: "32px", maxWidth: "400px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0a2e1a" }}>Customer Details</h2>
                <button onClick={() => setShowClaimerModal(false)}
                  style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#9ca3af" }}>✕</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
                {claimerProfile.avatar_url
                  ? <img src={claimerProfile.avatar_url} alt="Avatar" style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", border: "2px solid #e5e7eb" }}/>
                  : <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>🙋</div>
                }
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: "18px", fontWeight: 800, color: "#0a2e1a" }}>
                    {claimerProfile.first_name} {claimerProfile.last_name}
                  </p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                    {[claimerProfile.city, claimerProfile.state].filter(Boolean).join(", ")}
                  </p>
                </div>
              </div>
              <div style={{ background: "#f9fafb", borderRadius: "12px", padding: "16px", fontSize: "14px", color: "#374151", lineHeight: 2.2 }}>
                <p style={{ margin: 0 }}>📧 <b>Email:</b> <a href={`mailto:${claimerProfile.email}`} style={{ color: "#2563eb" }}>{claimerProfile.email}</a></p>
                <p style={{ margin: 0 }}>📱 <b>Phone:</b> {claimerProfile.phone ? <a href={`tel:${claimerProfile.phone}`} style={{ color: "#2563eb" }}>{claimerProfile.phone}</a> : "Not provided"}</p>
              </div>
              <p style={{ margin: "12px 0 0", fontSize: "12px", color: "#9ca3af", textAlign: "center", fontStyle: "italic" }}>
                Contact details are hidden automatically after pickup to protect customer privacy.
              </p>
            </div>
          </div>
        )}

        {/* ─── HEADER ─── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ position: "relative" }}>
              {businessLogoUrl
                ? <img src={businessLogoUrl} alt="Business logo"
                    style={{ width: "48px", height: "48px", borderRadius: "12px", objectFit: "cover", border: "2px solid #e5e7eb", cursor: "pointer" }}
                    onClick={() => logoRef.current?.click()}/>
                : <div onClick={() => logoRef.current?.click()}
                    style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#f0fdf4", border: "2px dashed #16a34a", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "20px" }}>📷</div>
              }
              <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload}/>
              <div onClick={() => logoRef.current?.click()}
                style={{ position: "absolute", bottom: "-3px", right: "-3px", background: "#16a34a", borderRadius: "50%", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: "#fff", cursor: "pointer" }}>
                ✏️
              </div>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0a2e1a" }}>{T.dash_title}</h1>
              <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                {isAdmin ? (adminView || "Select a business") : (businessName || "No business linked")}
                {isAdmin && <span style={{ marginLeft: "8px", background: "#0a2e1a", color: "#4ade80", fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px" }}>🔑 ADMIN</span>}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <LanguageSwitcher/>
            {isAdmin && allBizNames.length > 0 && (
              <select value={adminView || ""} onChange={e => setAdminView(e.target.value || null)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "2px solid #0a2e1a", fontSize: "14px", background: "#f0fdf4", cursor: "pointer", fontWeight: 600, color: "#0a2e1a" }}>
                <option value="">— Select Business —</option>
                {allBizNames.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )}
            <button onClick={() => { setShowForm(true); setPostMsg(""); }}
              style={{ background: "#16a34a", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 700 }}>
              {T.dash_new}
            </button>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/business/login"; }}
              style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>
              {T.dash_signout}
            </button>
          </div>
        </div>

        {/* ─── TREE / IMPACT BANNER ─── */}
        <div style={{ background: "linear-gradient(135deg,#0a2e1a,#166534)", borderRadius: "16px", padding: "20px 24px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ fontSize: "48px", lineHeight: 1 }}>{tree.emoji}</div>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: "12px", fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.6px" }}>🌍 Environmental Impact</p>
            <p style={{ margin: "0 0 2px", fontSize: "20px", fontWeight: 800, color: "#fff" }}>{tree.label}</p>
            <p style={{ margin: 0, fontSize: "13px", color: "#a3c9b0" }}>
              {totalWeightLbs > 0
                ? `${totalWeightLbs.toFixed(1)} lbs food donated · ~${(totalWeightLbs * 0.513).toFixed(1)} kg CO₂ saved`
                : "Start posting food to grow your impact"}
            </p>
          </div>
        </div>

        {/* ─── NEW LISTING FORM ─── */}
        {showForm && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "28px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0a2e1a" }}>{T.dash_post_title}</h2>
              <button onClick={() => setShowForm(false)}
                style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#9ca3af" }}>✕</button>
            </div>
            <form onSubmit={handlePost}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Business Name</label>
                  <input style={{ ...inp, background: "#f9fafb", color: "#6b7280" }} value={businessName || ""} disabled/>
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Pickup Address</label>
                  <input style={{ ...inp, background: "#f9fafb", color: "#6b7280" }} value={businessAddress || ""} disabled/>
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>{T.dash_food_name} *</label>
                  <input style={inp} required value={form.food_name}
                    onChange={e => setForm(f => ({ ...f, food_name: e.target.value }))}
                    placeholder="e.g. Chicken sandwiches, rice and beans, croissants"/>
                </div>
                <div>
                  <label style={lbl}>{T.dash_category} *</label>
                  <select style={{ ...inp, cursor: "pointer" }} value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option>Food</option>
                    <option>Bakery</option>
                    <option>Beverages</option>
                    <option>Prepared Meals</option>
                    <option>Produce</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>{T.dash_quantity} *</label>
                  <input style={inp} required value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    placeholder="e.g. 10 portions"/>
                </div>

                {/* Weight in lbs + Estimated Value side by side */}
                <div>
                  <label style={lbl}>⚖️ Estimated Weight (lbs)</label>
                  <input style={inp} type="number" min="0" step="0.1" value={form.weight_lbs}
                    onChange={e => setForm(f => ({ ...f, weight_lbs: e.target.value }))}
                    placeholder="e.g. 8"/>
                </div>
                <div>
                  <label style={lbl}>💰 Estimated Value ($)</label>
                  <input style={inp} type="number" min="0" step="0.01" value={form.estimated_value}
                    onChange={e => setForm(f => ({ ...f, estimated_value: e.target.value }))}
                    placeholder="e.g. 25"/>
                </div>

                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Allergy / Dietary Info (optional)</label>
                  <input style={inp} value={form.allergy_note}
                    onChange={e => setForm(f => ({ ...f, allergy_note: e.target.value }))}
                    placeholder="e.g. Contains nuts, halal, vegetarian, gluten-free"/>
                </div>

                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>📷 Food Photo (optional)</label>
                  <input
                    ref={listingFileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ fontSize: "13px", color: "#374151", width: "100%" }}
                  />
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#9ca3af" }}>
                    Take a photo or choose from your files. Listings with photos get more claims!
                  </p>
                  {uploadingImg && <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#16a34a", fontWeight: 600 }}>Uploading photo...</p>}
                </div>

                <div>
                  <label style={lbl}>{T.dash_active_for}</label>
                  <select style={{ ...inp, cursor: "pointer" }} value={form.active_hours}
                    onChange={e => setForm(f => ({ ...f, active_hours: e.target.value }))}>
                    <option value="0.5">30 minutes</option>
                    <option value="1">1 hour</option>
                    <option value="2">2 hours</option>
                    <option value="4">4 hours</option>
                    <option value="8">8 hours</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>{T.dash_hold}</label>
                  <select style={{ ...inp, cursor: "pointer" }} value={form.claim_hold}
                    onChange={e => setForm(f => ({ ...f, claim_hold: e.target.value }))}>
                    <option value="10">10 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="20">20 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                  </select>
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>{T.dash_note}</label>
                  <textarea style={{ ...inp, height: "70px", resize: "vertical" }}
                    value={form.note}
                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                    placeholder="e.g. Pickup before closing. Ask for Maria at the front."/>
                </div>
              </div>

              {postMsg && (
                <p style={{ margin: "12px 0 0", fontSize: "14px", color: postMsg.includes("✅") ? "#16a34a" : "#ef4444", fontWeight: 600 }}>
                  {postMsg}
                </p>
              )}
              <button type="submit" disabled={posting || uploadingImg}
                style={{ marginTop: "20px", background: (posting || uploadingImg) ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", padding: "12px 28px", borderRadius: "10px", cursor: (posting || uploadingImg) ? "not-allowed" : "pointer", fontSize: "15px", fontWeight: 700 }}>
                {posting ? "Posting..." : uploadingImg ? "Uploading photo..." : T.dash_post_btn}
              </button>
            </form>
          </div>
        )}

        {/* ─── IMPACT SUMMARY ─── */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "24px 28px", marginBottom: "24px" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "17px", fontWeight: 800, color: "#0a2e1a" }}>{T.dash_impact}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {[
              {
                label: `${T.dash_monthly} (${now.toLocaleString("default", { month: "long" })})`,
                items: [
                  { k: T.dash_posted,  v: monthlyL.length },
                  { k: T.dash_pickups, v: mPickups },
                  { k: "CO₂ saved", v: `~${(monthlyL.filter(l => l.status === "PICKED_UP").reduce((s, l) => s + Number(l.weight_kg || 0), 0) * 2.5).toFixed(1)} kg` },
                ],
              },
              {
                label: `${T.dash_yearly} (${thisYear})`,
                items: [
                  { k: T.dash_posted,  v: yearlyL.length },
                  { k: T.dash_pickups, v: yPickups },
                  { k: "Total weight", v: `${totalWeightLbs.toFixed(1)} lbs` },
                ],
              },
            ].map(section => (
              <div key={section.label} style={{ background: "#f9fafb", borderRadius: "12px", padding: "16px 20px", border: "1px solid #e5e7eb" }}>
                <p style={{ margin: "0 0 12px", fontSize: "12px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.8px" }}>{section.label}</p>
                {section.items.map(item => (
                  <div key={String(item.k)} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f0f0f0" }}>
                    <span style={{ fontSize: "13px", color: "#374151" }}>{item.k}</span>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#0a2e1a" }}>{item.v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ─── LISTINGS ─── */}
        <h2 style={{ fontSize: "17px", fontWeight: 800, color: "#0a2e1a", marginBottom: "14px" }}>{T.dash_listings}</h2>

        {listings.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "40px", textAlign: "center" }}>
            <p style={{ color: "#6b7280", marginBottom: "16px" }}>
              {isAdmin && !adminView ? "Select a business above to view listings." : "No listings yet."}
            </p>
            {(!isAdmin || adminView) && (
              <button onClick={() => setShowForm(true)}
                style={{ background: "#16a34a", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}>
                {T.dash_new}
              </button>
            )}
          </div>
        ) : listings.map(listing => {
          const isTerminal  = TERMINAL.includes(listing.status);
          const isReserved  = listing.status === "RESERVED";
          const isAvailable = listing.status === "AVAILABLE";
          const sc          = STATUS_COLOR[listing.status] || { bg: "#6b7280", text: "#fff" };
          const activeClaim = listing.claims?.find(c => c.status === "active");
          const isEditing   = editingId === listing.id;
          // Convert kg to lbs for display
          const weightLbs   = listing.weight_kg ? (listing.weight_kg * 2.205) : null;

          return (
            <div key={listing.id}
              style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "24px", marginBottom: "16px", opacity: isTerminal ? 0.82 : 1 }}>

              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "14px", gap: "12px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flex: 1 }}>
                  {listing.image_url && (
                    <img src={listing.image_url} alt={listing.food_name}
                      style={{ width: "64px", height: "64px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }}/>
                  )}
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0a2e1a", lineHeight: 1.3 }}>
                    {listing.food_name || "Unnamed food"}
                  </h3>
                </div>
                <span style={{ background: sc.bg, color: sc.text, fontSize: "12px", fontWeight: 700, padding: "5px 14px", borderRadius: "20px", flexShrink: 0 }}>
                  {listing.status}
                </span>
              </div>

              {/* Edit form */}
              {isEditing ? (
                <div style={{ background: "#f9fafb", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
                  <p style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 700, color: "#0a2e1a" }}>✏️ Editing listing</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div style={{ gridColumn: "1/-1" }}>
                      <label style={lbl}>Food name</label>
                      <input style={inp} value={editForm.food_name || ""} onChange={e => setEditForm(f => ({ ...f, food_name: e.target.value }))}/>
                    </div>
                    <div>
                      <label style={lbl}>Category</label>
                      <input style={inp} value={editForm.category || ""} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}/>
                    </div>
                    <div>
                      <label style={lbl}>Quantity</label>
                      <input style={inp} value={editForm.quantity || ""} onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))}/>
                    </div>
                    <div>
                      <label style={lbl}>⚖️ Weight (lbs)</label>
                      <input style={inp} type="number" step="0.1" value={editForm.weight_lbs || ""} onChange={e => setEditForm(f => ({ ...f, weight_lbs: e.target.value }))}/>
                    </div>
                    <div>
                      <label style={lbl}>💰 Est. Value ($)</label>
                      <input style={inp} type="number" step="0.01" value={editForm.estimated_value || ""} onChange={e => setEditForm(f => ({ ...f, estimated_value: e.target.value }))}/>
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                      <label style={lbl}>Allergy info</label>
                      <input style={inp} value={editForm.allergy_note || ""} onChange={e => setEditForm(f => ({ ...f, allergy_note: e.target.value }))}/>
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                      <label style={lbl}>Note</label>
                      <input style={inp} value={editForm.note || ""} onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))}/>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                    <button onClick={() => handleSaveEdit(listing.id)}
                      style={{ background: "#16a34a", color: "#fff", border: "none", padding: "9px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "14px" }}>
                      Save Changes
                    </button>
                    <button onClick={() => setEditingId(null)}
                      style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "9px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "14px", color: "#1f2937", lineHeight: 1.9 }}>
                  <p style={{ margin: "2px 0" }}><b>{T.category}:</b> {listing.category || "N/A"}</p>
                  <p style={{ margin: "2px 0" }}><b>{T.quantity}:</b> {listing.quantity || "N/A"}</p>
                  <p style={{ margin: "2px 0" }}><b>{T.address}:</b> {listing.address || "N/A"}</p>
                  {weightLbs && weightLbs > 0 && (
                    <p style={{ margin: "2px 0" }}><b>⚖️ Weight:</b> {weightLbs.toFixed(1)} lbs</p>
                  )}
                  {listing.estimated_value && listing.estimated_value > 0 && (
                    <p style={{ margin: "2px 0" }}><b>💰 Est. Value:</b> ${Number(listing.estimated_value).toFixed(2)}</p>
                  )}
                  {listing.allergy_note && (
                    <p style={{ margin: "2px 0" }}><b>⚠️ Allergy:</b> {listing.allergy_note}</p>
                  )}
                  {listing.note && (
                    <p style={{ margin: "2px 0" }}><b>📝 Note:</b> {listing.note}</p>
                  )}
                  <p style={{ margin: "2px 0" }}><b>{T.expires}:</b> {listing.expires_at ? new Date(listing.expires_at).toLocaleString() : "N/A"}</p>
                  <p style={{ margin: "2px 0" }}><b>{T.posted}:</b> {new Date(listing.created_at).toLocaleString()}</p>
                </div>
              )}

              {/* RESERVED — full claimer details */}
              {isReserved && activeClaim && (
                <div style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: "12px", padding: "16px 20px", marginTop: "16px" }}>
                  <p style={{ margin: "0 0 10px", fontWeight: 700, color: "#1d4ed8", fontSize: "14px" }}>{T.reserved_customer}</p>
                  <div style={{ fontSize: "14px", color: "#1e3a5f", lineHeight: 2 }}>
                    <p style={{ margin: "2px 0" }}><b>Name:</b> {activeClaim.first_name}</p>
                    <p style={{ margin: "2px 0" }}><b>Email:</b> {activeClaim.email}</p>
                    <p style={{ margin: "2px 0" }}><b>Phone:</b> {activeClaim.phone || "Not provided"}</p>
                    <p style={{ margin: "2px 0" }}><b>ETA:</b> {activeClaim.eta_minutes} minutes</p>
                    <p style={{ margin: "2px 0" }}><b>Code:</b> <span style={{ fontWeight: 900, fontSize: "17px", color: "#2563eb", letterSpacing: "2px" }}>{activeClaim.confirmation_code}</span></p>
                  </div>
                  {activeClaim.customer_user_id && (
                    <button onClick={() => viewClaimerProfile(activeClaim.customer_user_id!)}
                      style={{ marginTop: "10px", background: "#2563eb", color: "#fff", border: "none", padding: "9px 18px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>
                      👤 View Full Profile
                    </button>
                  )}
                </div>
              )}

              {/* PICKED_UP — name + code only */}
              {listing.status === "PICKED_UP" && activeClaim && (
                <div style={{ background: "#f5f3ff", border: "1.5px solid #ddd6fe", borderRadius: "12px", padding: "16px 20px", marginTop: "16px" }}>
                  <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#6d28d9", fontSize: "14px" }}>{T.picked_up_by}</p>
                  <p style={{ margin: "0 0 4px", fontSize: "15px", color: "#2e1065", fontWeight: 600 }}>
                    {activeClaim.first_name} · Code: {activeClaim.confirmation_code}
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af", fontStyle: "italic" }}>
                    🔒 Contact details hidden after pickup to protect customer privacy.
                  </p>
                </div>
              )}

              {/* Action buttons */}
              {!isTerminal && !isEditing && (
                <div style={{ display: "flex", gap: "10px", marginTop: "20px", flexWrap: "wrap" }}>
                  {isReserved && (
                    <button onClick={() => handlePickedUp(listing.id)}
                      style={{ background: "#16a34a", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "14px" }}>
                      {T.dash_mark_picked}
                    </button>
                  )}
                  {isReserved && (
                    <button onClick={() => handleCancelReservation(listing.id)}
                      style={{ background: "#f59e0b", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "14px" }}>
                      {T.dash_cancel_res}
                    </button>
                  )}
                  {isAvailable && (
                    <button onClick={() => startEdit(listing)}
                      style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "14px" }}>
                      ✏️ Edit
                    </button>
                  )}
                  {(isAvailable || isReserved) && (
                    <button onClick={() => handleCancelListing(listing.id)}
                      style={{ background: "#ef4444", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "14px" }}>
                      {T.dash_cancel_listing}
                    </button>
                  )}
                </div>
              )}

              {isTerminal && (
                <p style={{ marginTop: "14px", fontSize: "13px", color: "#6b7280", fontStyle: "italic" }}>
                  {listing.status === "PICKED_UP"  && "✅ Successfully picked up."}
                  {listing.status === "EXPIRED"    && "⏰ This listing has expired."}
                  {listing.status === "CANCELLED"  && "❌ This listing was cancelled."}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
