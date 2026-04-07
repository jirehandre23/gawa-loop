"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { detectLocale, t, Locale } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Listing = {
  id: string;
  business_name: string;
  food_name: string;
  category: string;
  quantity: string;
  allergy_note: string;
  estimated_value: number;
  note: string;
  status: string;
  expires_at: string;
  claim_hold_minutes: number;
  address: string;
  maps_url: string;
  image_url: string;
  weight_kg: number;
  business_logo_url: string;
};

export default function BrowsePage() {
  const [locale, setLocale]           = useState<Locale>("en");
  const [listings, setListings]       = useState<Listing[]>([]);
  const [filtered, setFiltered]       = useState<Listing[]>([]);
  const [search, setSearch]           = useState("");
  const [loading, setLoading]         = useState(true);
  const [user, setUser]               = useState<any>(null);
  const [userEmail, setUserEmail]     = useState<string | null>(null);
  const [isBusiness, setIsBusiness]   = useState(false); // is the logged-in user a business account?
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [claimForm, setClaimForm]     = useState({ first_name: "", email: "", phone: "", eta_minutes: 15 });
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimMsg, setClaimMsg]       = useState("");
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [lastCode, setLastCode]       = useState("");
  const intervalRef                   = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setLocale(detectLocale()); }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user?.email) {
        setUserEmail(user.email);
        setClaimForm(f => ({ ...f, email: user.email! }));
        // Check if this user is a business account
        const { data: biz } = await supabase
          .from("businesses")
          .select("id, account_type")
          .eq("email", user.email)
          .single();
        if (biz) setIsBusiness(true);
      }
    })();
  }, []);

  async function fetchListings() {
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("status", "AVAILABLE")
      .order("created_at", { ascending: false });
    const all = data || [];
    setListings(all);
    applySearch(all, search);
    setLoading(false);
  }

  useEffect(() => {
    fetchListings();
    intervalRef.current = setInterval(fetchListings, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  function applySearch(all: Listing[], q: string) {
    if (!q.trim()) { setFiltered(all); return; }
    const lower = q.toLowerCase();
    setFiltered(all.filter(l =>
      l.food_name?.toLowerCase().includes(lower) ||
      l.business_name?.toLowerCase().includes(lower) ||
      l.category?.toLowerCase().includes(lower)
    ));
  }

  function handleSearch(q: string) {
    setSearch(q);
    applySearch(listings, q);
  }

  function openClaim(id: string) {
    setSelectedId(id);
    setClaimMsg("");
    setClaimSuccess(false);
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setClaimLoading(true); setClaimMsg("");

    const listing = listings.find(l => l.id === selectedId);
    if (!listing) { setClaimMsg("Listing not found."); setClaimLoading(false); return; }

    // SECURITY: block any business account from claiming food
    if (isBusiness) {
      setClaimMsg("Business accounts cannot claim food. Please use a customer account.");
      setClaimLoading(false); return;
    }

    const res = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId: selectedId,
        first_name: claimForm.first_name.trim(),
        email: claimForm.email.trim().toLowerCase(),
        phone: claimForm.phone.trim() || null,
        eta_minutes: claimForm.eta_minutes,
        customer_user_id: user?.id || null,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setClaimSuccess(true);
      setLastCode(data.confirmation_code);
      setListings(prev => prev.filter(l => l.id !== selectedId));
      setFiltered(prev => prev.filter(l => l.id !== selectedId));
    } else {
      setClaimMsg(data.error || "Failed to reserve. Please try again.");
    }
    setClaimLoading(false);
  }

  const T = t[locale];
  const isRTL = locale === "ar";

  // Determine if a listing was posted by the currently logged-in business
  function isOwnListing(listing: Listing): boolean {
    if (!isBusiness || !userEmail) return false;
    // We cannot directly compare listing.business_name to user email easily,
    // but we can check via the businesses table. For now block all business accounts.
    return isBusiness;
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: "8px",
    border: "1px solid #d1d5db", fontSize: "14px", color: "#111827",
    background: "#fff", outline: "none", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "5px",
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* NAV */}
      <nav style={{ background: "#0a2e1a", padding: "0 24px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
          <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width: "28px", height: "28px", objectFit: "contain" }}/>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: "16px" }}>GAWA Loop</span>
        </a>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <LanguageSwitcher />
          {user ? (
            <a href={isBusiness ? "/business/dashboard" : "/customer/profile"}
              style={{ background: "#16a34a", color: "#fff", padding: "7px 14px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 700 }}>
              {isBusiness ? "Dashboard" : "My Profile"}
            </a>
          ) : (
            <a href="/" style={{ background: "rgba(255,255,255,0.1)", color: "#fff", padding: "7px 14px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 600 }}>
              Sign In
            </a>
          )}
        </div>
      </nav>

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "32px 16px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 900, color: "#0a2e1a", margin: "0 0 4px" }}>{T.browse || "Browse Free Food"}</h1>
        <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 24px" }}>
          {filtered.length} {filtered.length === 1 ? "item" : "items"} available now · refreshes every 30s
        </p>

        {/* SEARCH */}
        <div style={{ position: "relative", marginBottom: "24px" }}>
          <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "16px" }}>🔍</span>
          <input
            style={{ ...inp, paddingLeft: "40px", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            placeholder={locale==="fr"?"Chercher nourriture, restaurant...":locale==="es"?"Buscar comida, restaurante...":locale==="ar"?"ابحث عن طعام...":"Search food, restaurant, category..."}
            value={search} onChange={e => handleSearch(e.target.value)}
          />
        </div>

        {/* LISTINGS */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e5e7eb", padding: "60px 24px", textAlign: "center" }}>
            <p style={{ fontSize: "40px", marginBottom: "12px" }}>🌱</p>
            <p style={{ color: "#6b7280", fontSize: "15px" }}>
              {locale==="fr"?"Aucune nourriture disponible pour le moment. Revenez bientôt !":
               locale==="es"?"No hay comida disponible ahora. ¡Vuelve pronto!":
               locale==="ar"?"لا يوجد طعام متاح الآن. عد قريباً!":
               "No food available right now. Check back soon!"}
            </p>
          </div>
        ) : filtered.map(listing => {
          const mapsQ  = encodeURIComponent(listing.address || "");
          const isOwn  = isOwnListing(listing);
          const canClaim = !isBusiness; // only non-business users can claim
          return (
            <div key={listing.id} style={{ background: "#fff", borderRadius: "20px", border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>

              {/* FOOD IMAGE — always visible, no login required */}
              {listing.image_url ? (
                <div style={{ width: "100%", height: "200px", overflow: "hidden" }}>
                  <img
                    src={listing.image_url}
                    alt={listing.food_name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              ) : (
                <div style={{ width: "100%", height: "120px", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px" }}>
                  🍽️
                </div>
              )}

              <div style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0a2e1a" }}>{listing.food_name}</h2>
                  <span style={{ background: "#f0fdf4", color: "#16a34a", fontSize: "12px", fontWeight: 700, padding: "4px 12px", borderRadius: "20px", border: "1px solid #bbf7d0", flexShrink: 0 }}>FREE</span>
                </div>

                <p style={{ margin: "0 0 6px", fontSize: "14px", color: "#6b7280" }}>
                  {listing.category} · {listing.quantity}
                  {listing.weight_kg && listing.weight_kg > 0 && ` · ${(listing.weight_kg * 2.205).toFixed(1)} lbs`}
                </p>

                {listing.allergy_note && (
                  <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", padding: "4px 10px", display: "inline-block" }}>
                    ⚠️ {listing.allergy_note}
                  </p>
                )}

                {listing.note && (
                  <p style={{ margin: "6px 0", fontSize: "13px", color: "#374151" }}>📝 {listing.note}</p>
                )}

                <p style={{ margin: "6px 0", fontSize: "13px", color: "#6b7280" }}>
                  ⏰ {locale==="fr"?"Expire":locale==="es"?"Expira":locale==="ar"?"ينتهي":"Expires"}: {new Date(listing.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>

                {/* BUSINESS INFO */}
                <div style={{ background: "#f9fafb", borderRadius: "12px", padding: "12px 16px", marginTop: "12px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  {listing.business_logo_url ? (
                    <img src={listing.business_logo_url} alt={listing.business_name}
                      style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}/>
                  ) : (
                    <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>🏪</div>
                  )}
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700, color: "#0a2e1a" }}>{listing.business_name}</p>
                    <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#6b7280" }}>📍 {listing.address}</p>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <a href={`https://maps.google.com/?q=${mapsQ}`} target="_blank" rel="noreferrer"
                        style={{ background: "#e8f0fe", color: "#1a73e8", padding: "4px 10px", borderRadius: "6px", textDecoration: "none", fontSize: "12px", fontWeight: 600 }}>🗺️ Google Maps</a>
                      <a href={`https://maps.apple.com/?q=${mapsQ}`} target="_blank" rel="noreferrer"
                        style={{ background: "#f3f4f6", color: "#374151", padding: "4px 10px", borderRadius: "6px", textDecoration: "none", fontSize: "12px", fontWeight: 600 }}>🍎 Apple Maps</a>
                      <a href={`https://waze.com/ul?q=${mapsQ}`} target="_blank" rel="noreferrer"
                        style={{ background: "#e8f8ff", color: "#0099cc", padding: "4px 10px", borderRadius: "6px", textDecoration: "none", fontSize: "12px", fontWeight: 600 }}>🚗 Waze</a>
                    </div>
                  </div>
                </div>

                {/* RESERVE BUTTON */}
                {canClaim ? (
                  <button onClick={() => openClaim(listing.id)}
                    style={{ marginTop: "16px", width: "100%", background: "#16a34a", color: "#fff", border: "none", padding: "14px", borderRadius: "10px", cursor: "pointer", fontSize: "15px", fontWeight: 800, letterSpacing: "0.2px" }}>
                    {locale==="fr"?"Réserver maintenant — C'est gratuit":
                     locale==="es"?"Reservar ahora — Es gratis":
                     locale==="ar"?"احجز الآن — مجاني":
                     "Reserve Now — It is Free"}
                  </button>
                ) : (
                  <div style={{ marginTop: "16px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px 16px", textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                      {isOwn
                        ? "You cannot claim food you posted."
                        : "Business accounts cannot claim food. Use a customer account to reserve."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <p style={{ textAlign: "center", fontSize: "13px", color: "#9ca3af", marginTop: "24px" }}>
          {locale==="fr"?"Les annonces se renouvellent toutes les 30 secondes — Toute la nourriture est gratuite":
           locale==="es"?"Los listados se actualizan cada 30 segundos — Toda la comida es gratis":
           locale==="ar"?"تتحدث القوائم كل 30 ثانية — جميع الطعام مجاني":
           "Listings refresh every 30 seconds — All food is free"}
        </p>
        <p style={{ textAlign: "center", marginTop: "8px" }}>
          <a href="/" style={{ color: "#16a34a", fontWeight: 600, textDecoration: "none", fontSize: "14px" }}>← Back to Home</a>
        </p>
      </div>

      {/* CLAIM MODAL */}
      {selectedId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px" }}>
          <div style={{ background: "#fff", borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
            {claimSuccess ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "56px", marginBottom: "12px" }}>🎉</div>
                <h2 style={{ margin: "0 0 8px", fontSize: "22px", fontWeight: 800, color: "#0a2e1a" }}>
                  {locale==="fr"?"Réservation confirmée !":locale==="es"?"¡Reserva confirmada!":locale==="ar"?"تم تأكيد الحجز!":"Reservation Confirmed!"}
                </h2>
                <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: "14px" }}>
                  {locale==="fr"?"Votre code de retrait :":locale==="es"?"Tu código de recogida:":locale==="ar"?"رمز الاستلام:":"Your pickup code:"}
                </p>
                <div style={{ background: "#f0fdf4", border: "2px solid #16a34a", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
                  <p style={{ margin: 0, fontSize: "48px", fontWeight: 900, letterSpacing: "8px", color: "#0a2e1a", fontFamily: "monospace" }}>{lastCode}</p>
                </div>
                <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: "20px" }}>
                  {locale==="fr"?"Vérifiez votre email pour les détails. Montrez ce code au restaurant.":
                   locale==="es"?"Revisa tu email. Muestra este código en el restaurante.":
                   locale==="ar"?"تحقق من بريدك. أظهر هذا الرمز للمطعم.":
                   "Check your email for details. Show this code when you arrive."}
                </p>
                <button onClick={() => { setSelectedId(null); setClaimSuccess(false); }}
                  style={{ background: "#16a34a", color: "#fff", border: "none", padding: "12px 28px", borderRadius: "10px", cursor: "pointer", fontWeight: 700, fontSize: "15px" }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0a2e1a" }}>
                    {locale==="fr"?"Réserver ce repas":locale==="es"?"Reservar esta comida":locale==="ar"?"احجز هذا الطعام":"Reserve This Food"}
                  </h2>
                  <button onClick={() => setSelectedId(null)} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#9ca3af" }}>✕</button>
                </div>
                <form onSubmit={handleClaim}>
                  {claimMsg && (
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" }}>
                      <p style={{ margin: 0, color: "#991b1b", fontSize: "13px" }}>{claimMsg}</p>
                    </div>
                  )}
                  <div style={{ marginBottom: "14px" }}>
                    <label style={lbl}>
                      {locale==="fr"?"Votre prénom *":locale==="es"?"Tu nombre *":locale==="ar"?"اسمك الأول *":"Your First Name *"}
                    </label>
                    <input style={inp} required value={claimForm.first_name}
                      onChange={e => setClaimForm(f => ({ ...f, first_name: e.target.value }))}
                      placeholder={locale==="ar"?"اسمك":locale==="fr"?"Votre prénom":locale==="es"?"Tu nombre":"Your first name"}/>
                  </div>
                  <div style={{ marginBottom: "14px" }}>
                    <label style={lbl}>Email *</label>
                    <input style={inp} type="email" required value={claimForm.email}
                      onChange={e => setClaimForm(f => ({ ...f, email: e.target.value }))}/>
                  </div>
                  <div style={{ marginBottom: "14px" }}>
                    <label style={lbl}>
                      {locale==="fr"?"Téléphone (optionnel)":locale==="es"?"Teléfono (opcional)":locale==="ar"?"الهاتف (اختياري)":"Phone Number (with country code)"}
                    </label>
                    <input style={inp} type="tel" value={claimForm.phone}
                      onChange={e => setClaimForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder={locale==="ar"?"اختياري":"Optional"}/>
                  </div>
                  <div style={{ marginBottom: "20px" }}>
                    <label style={lbl}>
                      {locale==="fr"?"Heure d'arrivée":locale==="es"?"Hora de llegada":locale==="ar"?"وقت وصولك":"Your Arrival Time"}
                    </label>
                    <select style={{ ...inp, cursor: "pointer" }} value={claimForm.eta_minutes}
                      onChange={e => setClaimForm(f => ({ ...f, eta_minutes: Number(e.target.value) }))}>
                      <option value={10}>10 minutes</option>
                      <option value={15}>15 minutes</option>
                      <option value={20}>20 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>1 hour</option>
                    </select>
                  </div>
                  <button type="submit" disabled={claimLoading}
                    style={{ width: "100%", background: claimLoading ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", padding: "14px", borderRadius: "10px", cursor: claimLoading ? "not-allowed" : "pointer", fontSize: "15px", fontWeight: 800 }}>
                    {claimLoading ? "..." :
                     locale==="fr"?"Réserver maintenant — C'est gratuit":
                     locale==="es"?"Reservar ahora — Es gratis":
                     locale==="ar"?"احجز الآن — مجاني":
                     "Reserve Now — It is Free"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
