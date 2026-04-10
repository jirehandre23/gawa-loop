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
const TERMINAL    = ["PICKED_UP", "EXPIRED", "CANCELLED", "NOSHOW", "CLAIMED"];

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  AVAILABLE: { bg: "#16a34a", text: "#fff" },
  RESERVED:  { bg: "#2563eb", text: "#fff" },
  CLAIMED:   { bg: "#7c3aed", text: "#fff" },
  PICKED_UP: { bg: "#7c3aed", text: "#fff" },
  EXPIRED:   { bg: "#9ca3af", text: "#fff" },
  CANCELLED: { bg: "#ef4444", text: "#fff" },
  NOSHOW:    { bg: "#f59e0b", text: "#fff" },
};

type ClaimRow = {
  id: string; first_name: string; email: string; phone: string;
  eta_minutes: number; confirmation_code: string; reserved_until: string;
  status: string; noshow: boolean; customer_user_id?: string;
  quantity_claimed: number;
};
type ListingRow = {
  id: string; food_name: string; category: string; quantity: string;
  quantity_total: number; quantity_remaining: number;
  address: string; allergy_note: string; estimated_value: number; note: string;
  status: string; expires_at: string; created_at: string; reserved_until: string;
  claim_code: string; image_url?: string; weight_kg?: number;
  business_logo_url?: string;
  claims?: ClaimRow[];
};
type ReceivedClaim = {
  id: string; first_name: string; confirmation_code: string;
  eta_minutes: number; status: string; created_at: string;
  listing_id: string; food_name: string; business_name: string;
  image_url: string | null; address: string;
};

const EMPTY_FORM = {
  food_name: "", category: "Food", quantity: "", allergy_note: "",
  estimated_value: "", weight_lbs: "", note: "", claim_hold: "10",
};
const LBS_TO_KG = 0.453592;
type ExpiryMode = "hours" | "days" | "datetime";

function treeMetric(lbs: number) {
  if (lbs <= 0)   return { emoji: "🌱", label: "Plant a seed — start donating!" };
  if (lbs < 11)   return { emoji: "🌱", label: "Seedling saved" };
  if (lbs < 33)   return { emoji: "🪴", label: "Small plant" };
  if (lbs < 88)   return { emoji: "🌿", label: "Young tree" };
  if (lbs < 220)  return { emoji: "🌳", label: "Full tree" };
  if (lbs < 551)  return { emoji: "🌳🌳", label: "2 trees" };
  if (lbs < 1102) return { emoji: "🌲🌲🌲", label: "Small forest" };
  return { emoji: "🌲🌲🌲🌲🌲", label: "Forest preserved!" };
}
function groupByYearMonth(listings: ListingRow[]) {
  const groups: Record<string, Record<string, ListingRow[]>> = {};
  for (const l of listings) {
    const d = new Date(l.created_at);
    const year = String(d.getFullYear());
    const month = d.toLocaleString("default", { month: "long" });
    if (!groups[year]) groups[year] = {};
    if (!groups[year][month]) groups[year][month] = [];
    groups[year][month].push(l);
  }
  return groups;
}
const CLAIM_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  active:    { bg: "#2563eb", text: "#fff" },
  picked_up: { bg: "#7c3aed", text: "#fff" },
  cancelled: { bg: "#ef4444", text: "#fff" },
  noshow:    { bg: "#f59e0b", text: "#fff" },
};

export default function BusinessDashboard() {
  const [locale, setLocale]                 = useState<Locale>("en");
  const [listings, setListings]             = useState<ListingRow[]>([]);
  const [businessName, setBusiness]         = useState<string | null>(null);
  const [businessId, setBusinessId]         = useState<string | null>(null);
  const [authUserId, setAuthUserId]         = useState<string | null>(null);
  const [businessAddress, setAddress]       = useState("");
  const [businessLogoUrl, setLogoUrl]       = useState<string | null>(null);
  const [accountType, setAccountType]       = useState<string>("restaurant");
  const [loading, setLoading]               = useState(true);
  const [isAdmin, setIsAdmin]               = useState(false);
  const [adminView, setAdminView]           = useState<string | null>(null);
  const [allBizNames, setAllBizNames]       = useState<string[]>([]);
  const [showForm, setShowForm]             = useState(false);
  const [form, setForm]                     = useState(EMPTY_FORM);
  const [posting, setPosting]               = useState(false);
  const [postMsg, setPostMsg]               = useState("");
  const [uploadingImg, setUploadingImg]     = useState(false);
  const [logoMsg, setLogoMsg]               = useState("");
  const [activeTab, setActiveTab]           = useState<"active" | "history" | "received">("active");
  const [claimerAvatars, setClaimerAvatars] = useState<Record<string, string | null>>({});
  const [expiryMode, setExpiryMode]         = useState<ExpiryMode>("hours");
  const [expiryHours, setExpiryHours]       = useState<string>("1");
  const [expiryDays, setExpiryDays]         = useState<string>("1");
  const [expiryDatetime, setExpiryDatetime] = useState<string>("");
  const [imageSelected, setImageSelected]   = useState(false);
  const [receivedClaims, setReceivedClaims] = useState<ReceivedClaim[]>([]);

  // Edit state
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [editMode, setEditMode]             = useState<"details" | "quantity" | "expiry" | "claims" | null>(null);
  const [editForm, setEditForm]             = useState<Record<string, string>>({});
  const [editMsg, setEditMsg]               = useState("");
  const [editSaving, setEditSaving]         = useState(false);
  const [claimEditQtys, setClaimEditQtys]   = useState<Record<string, number>>({});
  const [relistId, setRelistId]             = useState<string | null>(null);
  const [relistExpiry, setRelistExpiry]     = useState("");

  const listingFileRef = useRef<HTMLInputElement>(null);
  const logoRef        = useRef<HTMLInputElement>(null);

  useEffect(() => { setLocale(detectLocale()); }, []);

  async function callEditAPI(body: Record<string, any>) {
    setEditSaving(true); setEditMsg("");
    const res = await fetch("/api/edit-listing", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setEditSaving(false);
    if (data.success) {
      setEditMsg("✅ Saved!");
      setTimeout(() => { setEditingId(null); setEditMode(null); setEditMsg(""); loadDashboard(adminView); }, 1200);
    } else {
      setEditMsg(data.error || "Error saving.");
    }
  }

  async function uploadImage(file: File, bucket: string, folder: string): Promise<string | null> {
    setUploadingImg(true);
    const fd = new FormData();
    fd.append("file", file); fd.append("bucket", bucket); fd.append("folder", folder);
    const res = await fetch("/api/upload-image", { method: "POST", body: fd });
    const data = await res.json();
    setUploadingImg(false);
    return data.url || null;
  }

  async function loadReceivedClaims(userId: string) {
    const { data, error } = await supabase
      .from("claims")
      .select("id, first_name, confirmation_code, eta_minutes, status, created_at, listing_id, listings(food_name, business_name, image_url, address)")
      .eq("customer_user_id", userId)
      .order("created_at", { ascending: false });
    if (error || !data) return;
    setReceivedClaims((data as any[]).map(c => ({
      id: c.id, first_name: c.first_name, confirmation_code: c.confirmation_code,
      eta_minutes: c.eta_minutes, status: c.status, created_at: c.created_at,
      listing_id: c.listing_id, food_name: c.listings?.food_name || "Unknown",
      business_name: c.listings?.business_name || "Unknown",
      image_url: c.listings?.image_url || null, address: c.listings?.address || "",
    })));
  }

  async function loadDashboard(adminTarget?: string | null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/business/login"; return; }
    const email = user.email || "";
    const admin = email === ADMIN_EMAIL;
    setIsAdmin(admin); setAuthUserId(user.id);
    if (admin) {
      const { data } = await supabase.from("listings").select("business_name").order("business_name");
      setAllBizNames([...new Set((data || []).map((b: any) => b.business_name).filter(Boolean))] as string[]);
    }
    const { data: biz } = await supabase.from("businesses")
      .select("id, name, address, logo_url, status, account_type").eq("email", email).single();
    if (biz && biz.status === "pending" && !admin) { window.location.href = "/business/pending"; return; }
    if (biz && biz.status === "rejected" && !admin) { await supabase.auth.signOut(); window.location.href = "/business/login"; return; }
    const bName = admin ? (adminTarget ?? null) : (biz?.name ?? null);
    setBusiness(bName); setAddress(biz?.address || ""); setLogoUrl(biz?.logo_url || null);
    setBusinessId(biz?.id || null); setAccountType(biz?.account_type || "restaurant");
    if (bName) {
      const { data } = await supabase.from("listings").select("*, claims(*)")
        .eq("business_name", bName).order("created_at", { ascending: false });
      setListings(data || []);
      const reservedClaims = (data || []).filter((l: ListingRow) => l.status === "RESERVED")
        .flatMap((l: ListingRow) => l.claims?.filter(c => c.status === "active") || []);
      for (const claim of reservedClaims) {
        if (claim.email) fetchClaimerAvatar(claim.id, claim.email);
      }
    }
    if (!admin && biz?.account_type === "ngo") await loadReceivedClaims(user.id);
    setLoading(false);
  }

  async function fetchClaimerAvatar(claimId: string, email: string) {
    if (claimerAvatars[claimId] !== undefined) return;
    const res = await fetch("/api/claim-avatar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await res.json();
    setClaimerAvatars(prev => ({ ...prev, [claimId]: data.avatar_url || null }));
  }

  useEffect(() => { loadDashboard(adminView); }, [adminView]);

  const now = new Date(); const thisMonth = now.getMonth(); const thisYear = now.getFullYear();
  const monthlyL = listings.filter(l => { const d = new Date(l.created_at); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; });
  const yearlyL  = listings.filter(l => new Date(l.created_at).getFullYear() === thisYear);
  const mPickups = monthlyL.filter(l => l.status === "PICKED_UP").length;
  const yPickups = yearlyL.filter(l => l.status === "PICKED_UP").length;
  const mCancelled = monthlyL.filter(l => l.status === "CANCELLED").length;
  const yCancelled = yearlyL.filter(l => l.status === "CANCELLED").length;
  const mExpired = monthlyL.filter(l => l.status === "EXPIRED").length;
  const yExpired = yearlyL.filter(l => l.status === "EXPIRED").length;
  const mNoshow  = monthlyL.filter(l => l.claims?.some(c => c.noshow)).length;
  const yNoshow  = yearlyL.filter(l => l.claims?.some(c => c.noshow)).length;
  const mMoneySaved = monthlyL.filter(l => l.status === "PICKED_UP").reduce((s, l) => s + Number(l.estimated_value || 0), 0);
  const yMoneySaved = yearlyL.filter(l => l.status === "PICKED_UP").reduce((s, l) => s + Number(l.estimated_value || 0), 0);
  const totalWeightLbs = listings.filter(l => l.status === "PICKED_UP").reduce((s, l) => s + Number(l.weight_kg || 0) * 2.205, 0);
  const tree = treeMetric(totalWeightLbs);
  const T = t[locale];
  const activeListings  = listings.filter(l => !TERMINAL.includes(l.status));
  const historyListings = listings.filter(l => TERMINAL.includes(l.status));
  const historyGroups   = groupByYearMonth(historyListings);
  const historyYears    = Object.keys(historyGroups).sort((a, b) => Number(b) - Number(a));
  const isNgo = accountType === "ngo";
  const receivedActive    = receivedClaims.filter(c => c.status === "active");
  const receivedPickedUp  = receivedClaims.filter(c => c.status === "picked_up");
  const receivedCancelled = receivedClaims.filter(c => c.status === "cancelled");

  function computeExpiresAt(): string {
    if (expiryMode === "hours") return new Date(Date.now() + Number(expiryHours) * 3600000).toISOString();
    if (expiryMode === "days")  return new Date(Date.now() + Number(expiryDays) * 86400000).toISOString();
    return new Date(expiryDatetime).toISOString();
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !businessId) { setLogoMsg("Error: business not loaded."); return; }
    setLogoMsg("Uploading...");
    const url = await uploadImage(file, "business-logos", businessId);
    if (url) {
      const { error } = await supabase.from("businesses").update({ logo_url: url }).eq("id", businessId);
      if (error) setLogoMsg("Upload ok but save failed: " + error.message);
      else { setLogoUrl(url + "?t=" + Date.now()); setLogoMsg("✅ Logo saved!"); }
    } else { setLogoMsg("Upload failed."); }
    setTimeout(() => setLogoMsg(""), 5000);
    if (e.target) e.target.value = "";
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!businessName || !businessId) return;
    if (!listingFileRef.current?.files?.[0]) { setPostMsg("Please add a photo."); return; }
    setPosting(true); setPostMsg("");
    const { data: bizData } = await supabase.from("businesses").select("logo_url").eq("id", businessId).single();
    const imageUrl = await uploadImage(listingFileRef.current.files[0], "listing-images", businessName.replace(/\s/g, "_"));
    const expiresAt = computeExpiresAt();
    const weightKg = form.weight_lbs ? Number(form.weight_lbs) * LBS_TO_KG : null;
    const { error } = await supabase.from("listings").insert({
      business_name: businessName, address: businessAddress,
      food_name: form.food_name, category: form.category,
      quantity: form.quantity, quantity_total: Number(form.quantity) || 1, quantity_remaining: Number(form.quantity) || 1,
      allergy_note: form.allergy_note || null, estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
      weight_kg: weightKg, note: form.note || null, status: "AVAILABLE",
      expires_at: expiresAt, claim_hold_minutes: Number(form.claim_hold),
      image_url: imageUrl, business_logo_url: bizData?.logo_url || null,
    });
    if (error) setPostMsg("Error posting. Please try again.");
    else {
      setPostMsg("✅ Food posted successfully!");
      setForm(EMPTY_FORM); setImageSelected(false);
      setExpiryMode("hours"); setExpiryHours("1"); setExpiryDays("1"); setExpiryDatetime("");
      setShowForm(false);
      if (listingFileRef.current) listingFileRef.current.value = "";
      loadDashboard(adminView);
    }
    setPosting(false);
  }

  async function handlePickedUp(id: string) {
    const res = await fetch("/api/mark-picked-up", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId: id }) });
    const data = await res.json();
    if (data.success) setListings(prev => prev.map(l => l.id === id ? { ...l, status: "PICKED_UP" } : l));
  }

  async function handleCancelReservation(id: string) {
    const listing = listings.find(l => l.id === id);
    const activeClaim = listing?.claims?.find(c => c.status === "active");
    if (activeClaim) {
      await fetch("/api/claim-submit", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ claimId: activeClaim.id, isNoshow: false }) });
    } else {
      await supabase.from("listings").update({ status: "AVAILABLE", reserved_until: null, claim_code: null }).eq("id", id);
    }
    setListings(prev => prev.map(l => l.id === id ? { ...l, status: "AVAILABLE", reserved_until: null as any, claim_code: null as any } : l));
  }

  async function handleCancelListing(id: string) {
    if (!confirm("Cancel this listing? All claimers will be notified.")) return;
    const res = await fetch("/api/cancel-listing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId: id }) });
    const data = await res.json();
    if (data.success) {
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: "CANCELLED" } : l));
      if (data.notified > 0) alert(`${data.notified} customer(s) notified.`);
    }
  }

  async function handleRelist(id: string) {
    if (!relistExpiry) return;
    const res = await fetch("/api/edit-listing", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "relist", listingId: id, new_expires_at: new Date(relistExpiry).toISOString() }) });
    const data = await res.json();
    if (data.success) { setRelistId(null); setRelistExpiry(""); loadDashboard(adminView); }
  }

  const inp: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", color: "#111827", boxSizing: "border-box", outline: "none", background: "#fff" };
  const lbl: React.CSSProperties = { display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" };
  const dashboardTitle = isAdmin ? "Business Dashboard" : isNgo ? "NGO Dashboard" : "Business Dashboard";

  function renderEditPanel(listing: ListingRow) {
    const activeClaims = (listing.claims || []).filter(c => c.status === "active");
    const totalClaimed = activeClaims.reduce((s, c) => s + (c.quantity_claimed || 1), 0);

    return (
      <div style={{ background: "#f8fafc", border: "1.5px solid #0a2e1a", borderRadius: "12px", padding: "20px", marginTop: "16px" }}>
        {/* Edit mode tabs */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
          {[
            { key: "details",  label: "✏️ Details" },
            { key: "quantity", label: "🔢 Quantity" },
            { key: "expiry",   label: "⏰ Expiry" },
            ...(activeClaims.length > 0 ? [{ key: "claims", label: `👥 Claimers (${activeClaims.length})` }] : []),
          ].map(tab => (
            <button key={tab.key} type="button" onClick={() => { setEditMode(tab.key as any); setEditMsg(""); }}
              style={{ padding: "6px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 700,
                background: editMode === tab.key ? "#0a2e1a" : "#e5e7eb",
                color: editMode === tab.key ? "#4ade80" : "#374151" }}>
              {tab.label}
            </button>
          ))}
          <button type="button" onClick={() => { setEditingId(null); setEditMode(null); setEditMsg(""); }}
            style={{ marginLeft: "auto", background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "20px" }}>✕</button>
        </div>

        {editMsg && (
          <p style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 700, color: editMsg.includes("✅") ? "#16a34a" : "#ef4444" }}>{editMsg}</p>
        )}

        {/* DETAILS */}
        {editMode === "details" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Food Name</label>
                <input style={inp} value={editForm.food_name ?? listing.food_name} onChange={e => setEditForm(f => ({ ...f, food_name: e.target.value }))}/>
              </div>
              <div>
                <label style={lbl}>Category</label>
                <select style={{ ...inp, cursor: "pointer" }} value={editForm.category ?? listing.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                  <option>Food</option><option>Bakery</option><option>Beverages</option><option>Prepared Meals</option><option>Produce</option><option>Other</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Weight (lbs)</label>
                <input style={inp} type="number" step="0.1" value={editForm.weight_lbs ?? (listing.weight_kg ? (listing.weight_kg * 2.205).toFixed(1) : "")} onChange={e => setEditForm(f => ({ ...f, weight_lbs: e.target.value }))}/>
              </div>
              <div>
                <label style={lbl}>Est. Value ($)</label>
                <input style={inp} type="number" step="0.01" value={editForm.estimated_value ?? String(listing.estimated_value || "")} onChange={e => setEditForm(f => ({ ...f, estimated_value: e.target.value }))}/>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Allergy / Dietary Info</label>
                <input style={inp} value={editForm.allergy_note ?? (listing.allergy_note || "")} onChange={e => setEditForm(f => ({ ...f, allergy_note: e.target.value }))} placeholder="e.g. Contains nuts"/>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Note</label>
                <textarea style={{ ...inp, height: "60px", resize: "vertical" }} value={editForm.note ?? (listing.note || "")} onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))}/>
              </div>
            </div>
            {activeClaims.length > 0 && (
              <p style={{ margin: "0 0 12px", fontSize: "12px", color: "#f59e0b", fontWeight: 600 }}>
                ⚠️ {activeClaims.length} active claimer(s) will be notified if the food name changes.
              </p>
            )}
            <button disabled={editSaving} onClick={() => callEditAPI({ action: "edit_details", listingId: listing.id, ...editForm })}
              style={{ background: editSaving ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "8px", cursor: editSaving ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "14px" }}>
              {editSaving ? "Saving..." : "Save Details"}
            </button>
          </div>
        )}

        {/* QUANTITY */}
        {editMode === "quantity" && (
          <div>
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "12px 16px", marginBottom: "14px" }}>
              <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 700, color: "#1d4ed8" }}>Current Quantity</p>
              <p style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
                Total: <b>{listing.quantity_total}</b> · Remaining: <b>{listing.quantity_remaining}</b> · Claimed: <b>{totalClaimed}</b>
              </p>
            </div>
            {activeClaims.length > 0 && (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "12px 16px", marginBottom: "14px" }}>
                <p style={{ margin: 0, fontSize: "13px", color: "#92400e" }}>
                  ⚠️ <b>{activeClaims.length} active claimer(s)</b> have reserved {totalClaimed} portion(s). If you reduce below {totalClaimed}, their claims will be automatically reduced or cancelled and they will be notified by email.
                </p>
              </div>
            )}
            <div style={{ marginBottom: "14px" }}>
              <label style={lbl}>New Total Quantity</label>
              <input style={inp} type="number" min="1" max="500"
                value={editForm.new_total ?? String(listing.quantity_total)}
                onChange={e => setEditForm(f => ({ ...f, new_total: e.target.value }))}
                placeholder="e.g. 30"/>
            </div>
            <button disabled={editSaving} onClick={() => callEditAPI({ action: "edit_quantity", listingId: listing.id, new_total: Number(editForm.new_total || listing.quantity_total) })}
              style={{ background: editSaving ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "8px", cursor: editSaving ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "14px" }}>
              {editSaving ? "Saving..." : "Update Quantity"}
            </button>
          </div>
        )}

        {/* EXPIRY */}
        {editMode === "expiry" && (
          <div>
            <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#374151" }}>
              Current expiry: <b>{new Date(listing.expires_at).toLocaleString()}</b>
            </p>
            <div style={{ marginBottom: "14px" }}>
              <label style={lbl}>New Expiry Date & Time</label>
              <input style={inp} type="datetime-local"
                min={new Date().toISOString().slice(0, 16)}
                value={editForm.new_expires_at ?? ""}
                onChange={e => setEditForm(f => ({ ...f, new_expires_at: e.target.value }))}/>
              <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#9ca3af" }}>
                Active claimers will be notified of the change by email.
              </p>
            </div>
            <button disabled={editSaving || !editForm.new_expires_at}
              onClick={() => callEditAPI({ action: "edit_expiry", listingId: listing.id, new_expires_at: new Date(editForm.new_expires_at!).toISOString() })}
              style={{ background: (editSaving || !editForm.new_expires_at) ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "8px", cursor: (editSaving || !editForm.new_expires_at) ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "14px" }}>
              {editSaving ? "Saving..." : "Update Expiry"}
            </button>
          </div>
        )}

        {/* CLAIMERS */}
        {editMode === "claims" && (
          <div>
            <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#374151" }}>
              Adjust or cancel individual reservations. Customers are notified by email.
            </p>
            {activeClaims.map(claim => {
              const currentQty = claimEditQtys[claim.id] ?? (claim.quantity_claimed || 1);
              return (
                <div key={claim.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "14px 16px", marginBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <p style={{ margin: "0 0 2px", fontSize: "14px", fontWeight: 700, color: "#0a2e1a" }}>{claim.first_name}</p>
                      <p style={{ margin: "0 0 2px", fontSize: "12px", color: "#6b7280" }}>{claim.email}</p>
                      <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>Code: <b>{claim.confirmation_code}</b> · Originally claimed: <b>{claim.quantity_claimed || 1}</b></p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <label style={{ ...lbl, margin: 0, whiteSpace: "nowrap" }}>New qty:</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                      <button type="button" onClick={() => setClaimEditQtys(q => ({ ...q, [claim.id]: Math.max(0, currentQty - 1) }))}
                        style={{ width: "32px", height: "32px", borderRadius: "6px", border: "1px solid #d1d5db", background: "#f9fafb", fontSize: "18px", cursor: "pointer", fontWeight: 700 }}>−</button>
                      <span style={{ fontSize: "20px", fontWeight: 900, color: currentQty === 0 ? "#ef4444" : "#0a2e1a", minWidth: "32px", textAlign: "center" }}>{currentQty}</span>
                      <button type="button" onClick={() => setClaimEditQtys(q => ({ ...q, [claim.id]: Math.min(claim.quantity_claimed || 1, currentQty + 1) }))}
                        style={{ width: "32px", height: "32px", borderRadius: "6px", border: "1px solid #d1d5db", background: "#f9fafb", fontSize: "18px", cursor: "pointer", fontWeight: 700 }}>+</button>
                      {currentQty === 0 && <span style={{ fontSize: "12px", color: "#ef4444", fontWeight: 700 }}>Will cancel reservation</span>}
                    </div>
                    <button disabled={editSaving || currentQty === (claim.quantity_claimed || 1)}
                      onClick={() => callEditAPI({ action: "reduce_claim_portions", listingId: listing.id, claimId: claim.id, new_quantity: currentQty })}
                      style={{ background: editSaving || currentQty === (claim.quantity_claimed || 1) ? "#e5e7eb" : currentQty === 0 ? "#ef4444" : "#f59e0b", color: currentQty === 0 ? "#fff" : "#fff", border: "none", padding: "8px 14px", borderRadius: "8px", cursor: editSaving || currentQty === (claim.quantity_claimed || 1) ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap" }}>
                      {currentQty === 0 ? "Cancel" : "Update"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderListingCard(listing: ListingRow) {
    const isTerminal  = TERMINAL.includes(listing.status);
    const isReserved  = listing.status === "RESERVED";
    const isAvailable = listing.status === "AVAILABLE";
    const isPickedUp  = listing.status === "PICKED_UP";
    const isCancelled = listing.status === "CANCELLED";
    const sc          = STATUS_COLOR[listing.status] || { bg: "#6b7280", text: "#fff" };
    const activeClaim = listing.claims?.find(c => c.status === "active");
    const noshowClaim = listing.claims?.find(c => c.noshow === true);
    const weightLbs   = listing.weight_kg ? listing.weight_kg * 2.205 : null;
    const claimerAvatar = activeClaim ? claimerAvatars[activeClaim.id] : undefined;
    const isMultiPortion = listing.quantity_total != null && listing.quantity_total > 1;
    const remaining = listing.quantity_remaining ?? listing.quantity_total ?? null;
    const activeClaims = (listing.claims || []).filter(c => c.status === "active");
    const isEditing = editingId === listing.id;

    return (
      <div key={listing.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "24px", marginBottom: "16px", opacity: isTerminal ? 0.88 : 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "14px", gap: "12px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flex: 1 }}>
            {listing.image_url && <img src={listing.image_url} alt={listing.food_name} style={{ width: "64px", height: "64px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }}/>}
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0a2e1a", lineHeight: 1.3 }}>{listing.food_name || "Unnamed food"}</h3>
          </div>
          <span style={{ background: sc.bg, color: sc.text, fontSize: "12px", fontWeight: 700, padding: "5px 14px", borderRadius: "20px", flexShrink: 0 }}>
            {listing.status === "NOSHOW" ? "NO-SHOW" : listing.status}
          </span>
        </div>

        <div style={{ fontSize: "14px", color: "#1f2937", lineHeight: 1.9 }}>
          <p style={{ margin: "2px 0" }}><b>Category:</b> {listing.category || "N/A"}</p>
          <p style={{ margin: "2px 0" }}>
            <b>Quantity:</b>{" "}
            {isMultiPortion && remaining != null
              ? <span style={{ color: remaining <= 3 ? "#ef4444" : "#16a34a", fontWeight: 700 }}>{remaining} of {listing.quantity_total} portions remaining</span>
              : listing.quantity || "N/A"}
            {weightLbs && weightLbs > 0 && <span style={{ color: "#9ca3af", fontWeight: 400 }}> · {weightLbs.toFixed(1)} lbs</span>}
          </p>
          {activeClaims.length > 0 && (
            <p style={{ margin: "2px 0" }}>
              <b>Active claimers:</b>{" "}
              <span style={{ color: "#2563eb", fontWeight: 700 }}>
                {activeClaims.map(c => `${c.first_name} (${c.quantity_claimed || 1})`).join(", ")}
              </span>
            </p>
          )}
          <p style={{ margin: "2px 0" }}><b>Address:</b> {listing.address || "N/A"}</p>
          {listing.estimated_value && listing.estimated_value > 0 && <p style={{ margin: "2px 0" }}><b>Est. Value:</b> ${Number(listing.estimated_value).toFixed(2)}</p>}
          {listing.allergy_note && <p style={{ margin: "2px 0" }}><b>Allergy:</b> {listing.allergy_note}</p>}
          {listing.note && <p style={{ margin: "2px 0" }}><b>Note:</b> {listing.note}</p>}
          <p style={{ margin: "2px 0" }}><b>Expires:</b> {listing.expires_at ? new Date(listing.expires_at).toLocaleString() : "N/A"}</p>
          <p style={{ margin: "2px 0" }}><b>Posted:</b> {new Date(listing.created_at).toLocaleString()}</p>
        </div>

        {isReserved && activeClaim && (
          <div style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: "12px", padding: "16px 20px", marginTop: "16px" }}>
            <p style={{ margin: "0 0 12px", fontWeight: 700, color: "#1d4ed8", fontSize: "14px" }}>Reserved by Customer</p>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              {claimerAvatar ? <img src={claimerAvatar} alt="Customer" style={{ width: "52px", height: "52px", borderRadius: "50%", objectFit: "cover", border: "2px solid #bfdbfe", flexShrink: 0 }}/> : <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0 }}>🙋</div>}
              <div style={{ fontSize: "14px", color: "#1e3a5f", lineHeight: 2 }}>
                <p style={{ margin: "2px 0" }}><b>Name:</b> {activeClaim.first_name}</p>
                <p style={{ margin: "2px 0" }}><b>Email:</b> {activeClaim.email}</p>
                <p style={{ margin: "2px 0" }}><b>Phone:</b> {activeClaim.phone || "Not provided"}</p>
                <p style={{ margin: "2px 0" }}><b>ETA:</b> {activeClaim.eta_minutes} min · <b>Code:</b> <span style={{ fontWeight: 900, fontSize: "17px", color: "#2563eb", letterSpacing: "2px" }}>{activeClaim.confirmation_code}</span></p>
                {(activeClaim.quantity_claimed || 1) > 1 && <p style={{ margin: "2px 0" }}><b>Portions claimed:</b> <span style={{ color: "#2563eb", fontWeight: 800 }}>{activeClaim.quantity_claimed}</span></p>}
              </div>
            </div>
          </div>
        )}

        {isPickedUp && activeClaim && (
          <div style={{ background: "#f5f3ff", border: "1.5px solid #ddd6fe", borderRadius: "12px", padding: "16px 20px", marginTop: "16px" }}>
            <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#6d28d9", fontSize: "14px" }}>✅ Picked Up By</p>
            <p style={{ margin: "0 0 4px", fontSize: "16px", color: "#2e1065", fontWeight: 700 }}>{activeClaim.first_name}</p>
            <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af", fontStyle: "italic" }}>Contact details hidden after pickup to protect customer privacy.</p>
          </div>
        )}

        {(listing.status === "NOSHOW" || noshowClaim) && (
          <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: "12px", padding: "14px 20px", marginTop: "16px" }}>
            <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#92400e", fontSize: "14px" }}>No-Show</p>
            <p style={{ margin: 0, fontSize: "13px", color: "#78350f" }}>{noshowClaim ? `${noshowClaim.first_name} did not arrive.` : "Customer did not arrive."}</p>
          </div>
        )}

        {/* Edit panel */}
        {isEditing && editMode && renderEditPanel(listing)}

        {/* Re-list panel */}
        {relistId === listing.id && (
          <div style={{ background: "#f0fdf4", border: "1.5px solid #16a34a", borderRadius: "12px", padding: "16px", marginTop: "14px" }}>
            <p style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 700, color: "#0a2e1a" }}>Re-list this food</p>
            <label style={lbl}>New expiry date & time *</label>
            <input style={{ ...inp, marginBottom: "12px" }} type="datetime-local"
              min={new Date().toISOString().slice(0, 16)}
              value={relistExpiry} onChange={e => setRelistExpiry(e.target.value)}/>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => handleRelist(listing.id)} disabled={!relistExpiry}
                style={{ background: !relistExpiry ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", padding: "9px 20px", borderRadius: "8px", cursor: !relistExpiry ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "14px" }}>
                Re-list Now
              </button>
              <button onClick={() => { setRelistId(null); setRelistExpiry(""); }}
                style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "9px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "8px", marginTop: "20px", flexWrap: "wrap" }}>
          {isReserved && <button onClick={() => handlePickedUp(listing.id)} style={{ background: "#16a34a", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>✅ Mark Picked Up</button>}
          {isReserved && <button onClick={() => handleCancelReservation(listing.id)} style={{ background: "#f59e0b", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>Cancel Reservation</button>}
          {(isAvailable || isReserved) && (
            <button onClick={() => { setEditingId(isEditing ? null : listing.id); setEditMode("details"); setEditForm({}); setEditMsg(""); setClaimEditQtys({}); }}
              style={{ background: isEditing ? "#0a2e1a" : "#f3f4f6", color: isEditing ? "#4ade80" : "#374151", border: "1px solid #e5e7eb", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>
              {isEditing ? "Close Edit" : "✏️ Edit"}
            </button>
          )}
          {(isAvailable || isReserved) && <button onClick={() => handleCancelListing(listing.id)} style={{ background: "#ef4444", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>Cancel Listing</button>}
          {isCancelled && (
            <button onClick={() => { setRelistId(listing.id); setRelistExpiry(""); }}
              style={{ background: "#16a34a", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>
              🔄 Re-list Food
            </button>
          )}
        </div>

        {isTerminal && !isCancelled && (
          <p style={{ marginTop: "14px", fontSize: "13px", color: "#6b7280", fontStyle: "italic" }}>
            {listing.status === "PICKED_UP" && "Successfully picked up."}
            {listing.status === "EXPIRED"   && "This listing expired without being claimed."}
            {(listing.status === "NOSHOW" || noshowClaim) && "Customer did not show up."}
            {listing.status === "CLAIMED"   && "All portions have been claimed."}
          </p>
        )}
      </div>
    );
  }

  function renderReceivedCard(claim: ReceivedClaim) {
    const sc = CLAIM_STATUS_COLOR[claim.status] || { bg: "#6b7280", text: "#fff" };
    const isActive = claim.status === "active"; const isPickedUp = claim.status === "picked_up"; const isCancelled = claim.status === "cancelled";
    return (
      <div key={claim.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "20px 24px", marginBottom: "14px", display: "flex", gap: "16px", alignItems: "flex-start", opacity: isCancelled ? 0.75 : 1 }}>
        {claim.image_url ? <img src={claim.image_url} alt={claim.food_name} style={{ width: "72px", height: "72px", borderRadius: "12px", objectFit: "cover", flexShrink: 0 }}/> : <div style={{ width: "72px", height: "72px", borderRadius: "12px", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", flexShrink: 0 }}>🍽️</div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: "16px", fontWeight: 800, color: "#0a2e1a" }}>{claim.food_name}</p>
              <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>🏪 {claim.business_name}</p>
              {claim.address && <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#9ca3af" }}>📍 {claim.address}</p>}
            </div>
            <span style={{ background: sc.bg, color: sc.text, fontSize: "12px", fontWeight: 700, padding: "4px 12px", borderRadius: "20px", flexShrink: 0, textTransform: "uppercase" }}>
              {claim.status === "picked_up" ? "Picked Up" : claim.status === "active" ? "Active" : claim.status === "cancelled" ? "Cancelled" : claim.status}
            </span>
          </div>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px", color: "#374151" }}>
            <span>📅 {new Date(claim.created_at).toLocaleDateString()}</span>
            <span>⏱ ETA: {claim.eta_minutes} min</span>
            {isActive && <span style={{ background: "#f0fdf4", color: "#16a34a", fontWeight: 700, padding: "2px 10px", borderRadius: "8px", border: "1px solid #bbf7d0", fontFamily: "monospace", letterSpacing: "1px" }}>Code: {claim.confirmation_code}</span>}
            {isPickedUp && <span style={{ color: "#7c3aed", fontWeight: 700 }}>✅ Successfully received</span>}
            {isCancelled && <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Cancelled</span>}
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}><p style={{ color: "#6b7280" }}>Loading dashboard...</p></div>;

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", padding: "24px 16px" }}>
      <div style={{ maxWidth: "780px", margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ position: "relative" }}>
              {businessLogoUrl ? <img src={businessLogoUrl} alt="logo" style={{ width: "48px", height: "48px", borderRadius: "12px", objectFit: "cover", border: "2px solid #e5e7eb", cursor: "pointer" }} onClick={() => logoRef.current?.click()}/> : <div onClick={() => logoRef.current?.click()} style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#f0fdf4", border: "2px dashed #16a34a", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "20px" }}>📷</div>}
              <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload}/>
              <div onClick={() => logoRef.current?.click()} style={{ position: "absolute", bottom: "-3px", right: "-3px", background: "#16a34a", borderRadius: "50%", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: "#fff", cursor: "pointer" }}>✏️</div>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0a2e1a" }}>{dashboardTitle}</h1>
              <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                {isAdmin ? (adminView || "Select a business") : (businessName || "No business linked")}
                {isAdmin && <span style={{ marginLeft: "8px", background: "#0a2e1a", color: "#4ade80", fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px" }}>🔑 ADMIN</span>}
                {isNgo && !isAdmin && <span style={{ marginLeft: "8px", background: "#eff6ff", color: "#2563eb", fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px" }}>🏛 NGO</span>}
              </p>
              {logoMsg && <p style={{ margin: "2px 0 0", fontSize: "12px", color: logoMsg.includes("✅") ? "#16a34a" : "#ef4444", fontWeight: 600 }}>{logoMsg}</p>}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <LanguageSwitcher/>
            <a href="/" style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "8px 14px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 600 }}>🏠 Home</a>
            <a href="/browse" style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "8px 14px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 600 }}>🍽️ Browse</a>
            {isAdmin && <a href="/admin/business-lookup" style={{ background: "#0a2e1a", color: "#4ade80", border: "1px solid #166534", padding: "8px 14px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 700 }}>🔑 Admin Panel</a>}
            {isAdmin && allBizNames.length > 0 && (
              <select value={adminView || ""} onChange={e => setAdminView(e.target.value || null)} style={{ padding: "8px 12px", borderRadius: "8px", border: "2px solid #0a2e1a", fontSize: "14px", background: "#f0fdf4", cursor: "pointer", fontWeight: 600, color: "#0a2e1a" }}>
                <option value="">— Select Business —</option>
                {allBizNames.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )}
            <button onClick={() => { setShowForm(true); setPostMsg(""); }} style={{ background: "#16a34a", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 700 }}>+ New Listing</button>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/business/login"; }} style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>Sign Out</button>
          </div>
        </div>

        <div style={{ background: "linear-gradient(135deg,#0a2e1a,#166534)", borderRadius: "16px", padding: "20px 24px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ fontSize: "48px", lineHeight: 1 }}>{tree.emoji}</div>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: "12px", fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.6px" }}>🌍 Environmental Impact</p>
            <p style={{ margin: "0 0 2px", fontSize: "20px", fontWeight: 800, color: "#fff" }}>{tree.label}</p>
            <p style={{ margin: 0, fontSize: "13px", color: "#a3c9b0" }}>
              {totalWeightLbs > 0 ? `${totalWeightLbs.toFixed(1)} lbs donated · ~${(totalWeightLbs * 2.5).toFixed(1)} lbs CO₂e saved` : "Start posting food to grow your impact"}
            </p>
          </div>
        </div>

        {showForm && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "28px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0a2e1a" }}>Post New Food</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#9ca3af" }}>✕</button>
            </div>
            <form onSubmit={handlePost}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Business Name</label><input style={{ ...inp, background: "#f9fafb", color: "#6b7280" }} value={businessName || ""} disabled/></div>
                <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Pickup Address</label><input style={{ ...inp, background: "#f9fafb", color: "#6b7280" }} value={businessAddress || ""} disabled/></div>
                <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Food Name *</label><input style={inp} required value={form.food_name} onChange={e => setForm(f => ({ ...f, food_name: e.target.value }))} placeholder="e.g. Chicken sandwiches"/></div>
                <div>
                  <label style={lbl}>Category *</label>
                  <select style={{ ...inp, cursor: "pointer" }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option>Food</option><option>Bakery</option><option>Beverages</option><option>Prepared Meals</option><option>Produce</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Number of Portions *</label>
                  <input style={inp} type="number" min="1" max="500" required value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="e.g. 50"/>
                  <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#9ca3af" }}>Individual portions, meals, or items</p>
                </div>
                <div><label style={lbl}>Weight (lbs)</label><input style={inp} type="number" min="0" step="0.1" value={form.weight_lbs} onChange={e => setForm(f => ({ ...f, weight_lbs: e.target.value }))} placeholder="e.g. 8"/></div>
                <div><label style={lbl}>Est. Value ($)</label><input style={inp} type="number" min="0" step="0.01" value={form.estimated_value} onChange={e => setForm(f => ({ ...f, estimated_value: e.target.value }))} placeholder="e.g. 25"/></div>
                <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Allergy / Dietary Info</label><input style={inp} value={form.allergy_note} onChange={e => setForm(f => ({ ...f, allergy_note: e.target.value }))} placeholder="e.g. Contains nuts, halal"/></div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Food Photo <span style={{ color: "#ef4444" }}>*</span>{!imageSelected && <span style={{ marginLeft: "8px", fontSize: "12px", color: "#ef4444", fontWeight: 600 }}>Required</span>}{imageSelected && <span style={{ marginLeft: "8px", fontSize: "12px", color: "#16a34a", fontWeight: 600 }}>✓ Photo selected</span>}</label>
                  <input ref={listingFileRef} type="file" accept="image/*" capture="environment" style={{ fontSize: "13px", color: "#374151", width: "100%" }} onChange={e => setImageSelected(!!(e.target.files?.[0]))}/>
                  {uploadingImg && <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#16a34a", fontWeight: 600 }}>Uploading photo...</p>}
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Active For *</label>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
                    {(["hours", "days", "datetime"] as ExpiryMode[]).map(mode => (
                      <button key={mode} type="button" onClick={() => setExpiryMode(mode)} style={{ padding: "6px 16px", borderRadius: "20px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 700, background: expiryMode === mode ? "#0a2e1a" : "#f3f4f6", color: expiryMode === mode ? "#4ade80" : "#374151" }}>
                        {mode === "hours" ? "Hours" : mode === "days" ? "Days" : "Pick date & time"}
                      </button>
                    ))}
                  </div>
                  {expiryMode === "hours" && <select style={{ ...inp, cursor: "pointer" }} value={expiryHours} onChange={e => setExpiryHours(e.target.value)}>{[1,2,3,4,5,6,7,8,9,10].map(h => <option key={h} value={String(h)}>{h} hour{h > 1 ? "s" : ""}</option>)}</select>}
                  {expiryMode === "days"  && <select style={{ ...inp, cursor: "pointer" }} value={expiryDays}  onChange={e => setExpiryDays(e.target.value)}>{[1,2,3,4,5,6,7,8,9,10].map(d => <option key={d} value={String(d)}>{d} day{d > 1 ? "s" : ""}</option>)}</select>}
                  {expiryMode === "datetime" && <input style={inp} type="datetime-local" value={expiryDatetime} min={new Date().toISOString().slice(0,16)} onChange={e => setExpiryDatetime(e.target.value)} required={expiryMode === "datetime"}/>}
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Claim Hold Time</label>
                  <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#6b7280" }}>How long the food stays reserved. If the customer does not arrive, the portions return to the listing.</p>
                  <select style={{ ...inp, cursor: "pointer" }} value={form.claim_hold} onChange={e => setForm(f => ({ ...f, claim_hold: e.target.value }))}>
                    <option value="10">10 minutes</option><option value="15">15 minutes</option><option value="20">20 minutes</option>
                    <option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">1 hour</option>
                    <option value="120">2 hours</option><option value="240">4 hours</option><option value="480">8 hours</option><option value="1440">24 hours</option>
                  </select>
                </div>
                <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Note</label><textarea style={{ ...inp, height: "70px", resize: "vertical" }} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Ask for Maria at the front."/></div>
              </div>
              {postMsg && <p style={{ margin: "12px 0 0", fontSize: "14px", color: postMsg.includes("✅") ? "#16a34a" : "#ef4444", fontWeight: 600 }}>{postMsg}</p>}
              <button type="submit" disabled={posting || uploadingImg} style={{ marginTop: "20px", background: (posting || uploadingImg) ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", padding: "12px 28px", borderRadius: "10px", cursor: (posting || uploadingImg) ? "not-allowed" : "pointer", fontSize: "15px", fontWeight: 700 }}>
                {posting ? "Posting..." : uploadingImg ? "Uploading..." : "Post Food"}
              </button>
            </form>
          </div>
        )}

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "24px 28px", marginBottom: "24px" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "17px", fontWeight: 800, color: "#0a2e1a" }}>Your Impact</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {[
              { label: `This Month (${now.toLocaleString("default", { month: "long" })})`, items: [
                { k: "Listings Posted", v: monthlyL.length }, { k: "✅ Picked Up", v: mPickups },
                { k: "❌ Cancelled", v: mCancelled }, { k: "⏰ Expired", v: mExpired }, { k: "👻 No-Shows", v: mNoshow },
                { k: "Food Saved", v: `${monthlyL.filter(l => l.status === "PICKED_UP").reduce((s, l) => s + Number(l.weight_kg || 0) * 2.205, 0).toFixed(1)} lbs` },
                { k: "💰 Value Saved", v: `$${mMoneySaved.toFixed(2)}` },
                ...(isNgo ? [{ k: "📥 Food Received", v: receivedClaims.filter(c => { const d = new Date(c.created_at); return d.getMonth() === thisMonth && d.getFullYear() === thisYear && c.status === "picked_up"; }).length }] : []),
              ]},
              { label: `This Year (${thisYear})`, items: [
                { k: "Listings Posted", v: yearlyL.length }, { k: "✅ Picked Up", v: yPickups },
                { k: "❌ Cancelled", v: yCancelled }, { k: "⏰ Expired", v: yExpired }, { k: "👻 No-Shows", v: yNoshow },
                { k: "Total Donated", v: `${totalWeightLbs.toFixed(1)} lbs` },
                { k: "💰 Total Value", v: `$${yMoneySaved.toFixed(2)}` },
                ...(isNgo ? [{ k: "📥 Total Received", v: receivedPickedUp.length }] : []),
              ]},
            ].map(section => (
              <div key={section.label} style={{ background: "#f9fafb", borderRadius: "12px", padding: "16px 20px", border: "1px solid #e5e7eb" }}>
                <p style={{ margin: "0 0 12px", fontSize: "12px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.8px" }}>{section.label}</p>
                {section.items.map(item => (
                  <div key={item.k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f0f0f0" }}>
                    <span style={{ fontSize: "13px", color: "#374151" }}>{item.k}</span>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: item.k.includes("💰") ? "#16a34a" : item.k.includes("📥") ? "#2563eb" : "#0a2e1a" }}>{item.v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "4px", background: "#fff", borderRadius: "12px", padding: "4px", border: "1px solid #e5e7eb", marginBottom: "20px" }}>
          {[
            { key: "active",   label: `📋 Active (${activeListings.length})` },
            { key: "history",  label: `📁 History (${historyListings.length})` },
            ...(isNgo ? [{ key: "received", label: `📥 Received (${receivedClaims.length})` }] : []),
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 700, background: activeTab === tab.key ? "#0a2e1a" : "transparent", color: activeTab === tab.key ? "#fff" : "#374151" }}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "active" && (
          <>
            {activeListings.length === 0 ? (
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "40px", textAlign: "center" }}>
                <p style={{ color: "#6b7280", marginBottom: "16px" }}>{isAdmin && !adminView ? "Select a business above." : "No active listings right now."}</p>
                {(!isAdmin || adminView) && <button onClick={() => setShowForm(true)} style={{ background: "#16a34a", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}>+ New Listing</button>}
              </div>
            ) : activeListings.map(l => renderListingCard(l))}
          </>
        )}

        {activeTab === "history" && (
          <>
            {historyListings.length === 0 ? (
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "40px", textAlign: "center" }}><p style={{ color: "#6b7280" }}>No history yet.</p></div>
            ) : historyYears.map(year => (
              <div key={year} style={{ marginBottom: "28px" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "20px", fontWeight: 900, color: "#0a2e1a", borderBottom: "2px solid #e5e7eb", paddingBottom: "8px" }}>📅 {year}</h3>
                {Object.keys(historyGroups[year]).sort((a, b) => new Date(`${b} 1, ${year}`).getMonth() - new Date(`${a} 1, ${year}`).getMonth()).map(month => (
                  <div key={month} style={{ marginBottom: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                      <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#374151" }}>{month}</h4>
                      <span style={{ background: "#f0fdf4", color: "#16a34a", fontSize: "12px", fontWeight: 700, padding: "2px 10px", borderRadius: "12px", border: "1px solid #bbf7d0" }}>{historyGroups[year][month].length} orders</span>
                    </div>
                    {historyGroups[year][month].map(l => renderListingCard(l))}
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {activeTab === "received" && isNgo && (
          <>
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
              {[{ label: "Active", count: receivedActive.length, bg: "#eff6ff", color: "#2563eb" }, { label: "Received", count: receivedPickedUp.length, bg: "#f5f3ff", color: "#7c3aed" }, { label: "Cancelled", count: receivedCancelled.length, bg: "#f9fafb", color: "#9ca3af" }].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: "12px", padding: "12px 18px", flex: 1, minWidth: "100px", textAlign: "center" }}>
                  <p style={{ margin: "0 0 2px", fontSize: "24px", fontWeight: 900, color: s.color }}>{s.count}</p>
                  <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, color: "#6b7280" }}>{s.label}</p>
                </div>
              ))}
            </div>
            {receivedClaims.length === 0 ? (
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "48px", textAlign: "center" }}>
                <p style={{ fontSize: "40px", margin: "0 0 12px" }}>📥</p>
                <p style={{ fontSize: "16px", fontWeight: 700, color: "#0a2e1a", margin: "0 0 6px" }}>No food received yet</p>
                <a href="/browse" style={{ background: "#16a34a", color: "#fff", padding: "10px 24px", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: 700 }}>Browse Available Food →</a>
              </div>
            ) : (
              <>
                {receivedActive.length > 0 && <div style={{ marginBottom: "24px" }}><h3 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 800, color: "#2563eb" }}>🔵 Active</h3>{receivedActive.map(c => renderReceivedCard(c))}</div>}
                {receivedPickedUp.length > 0 && <div style={{ marginBottom: "24px" }}><h3 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 800, color: "#7c3aed" }}>✅ Received</h3>{receivedPickedUp.map(c => renderReceivedCard(c))}</div>}
                {receivedCancelled.length > 0 && <div style={{ marginBottom: "24px" }}><h3 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 800, color: "#9ca3af" }}>❌ Cancelled</h3>{receivedCancelled.map(c => renderReceivedCard(c))}</div>}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
