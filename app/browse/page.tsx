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
const SORT_OPTIONS = ["Newest", "Expiring Soon"];

const FILTER_T: Record<string, Record<string, string>> = {
  en: { all: "All", newest: "Newest", expiring: "Expiring Soon", sort_label: "Sort" },
  fr: { all: "Tout", newest: "Plus récent", expiring: "Expire bientôt", sort_label: "Trier" },
  es: { all: "Todo", newest: "Más reciente", expiring: "Por vencer", sort_label: "Ordenar" },
  pt: { all: "Tudo", newest: "Mais recente", expiring: "A vencer", sort_label: "Ordenar" },
  ar: { all: "الكل", newest: "الأحدث", expiring: "ينتهي قريباً", sort_label: "ترتيب" },
};

type Listing = {
  id: string; business_name: string; food_name: string; category: string;
  quantity: string; allergy_note: string; estimated_value: number; note: string;
  status: string; expires_at: string; created_at: string; claim_hold_minutes: number;
  address: string; maps_url: string; image_url: string; weight_kg: number;
  business_logo_url: string;
};
type BizInfo = { address: string; phone: string | null; email: string };

export default function BrowsePage() {
  const [locale, setLocale]             = useState<Locale>("en");
  const [listings, setListings]         = useState<Listing[]>([]);
  const [filtered, setFiltered]         = useState<Listing[]>([]);
  const [search, setSearch]             = useState("");
  const [activeCategory, setCategory]   = useState("All");
  const [sortBy, setSortBy]             = useState("Newest");
  const [loading, setLoading]           = useState(true);
  const [user, setUser]                 = useState<any>(null);
  const [isBusiness, setIsBusiness]     = useState(false);
  const [isNgo, setIsNgo]               = useState(false);
  const [ngoName, setNgoName]           = useState<string | null>(null);
  const [isAdmin, setIsAdmin]           = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const [bizInfoMap, setBizInfoMap]     = useState<Record<string, BizInfo>>({});
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [claimForm, setClaimForm]       = useState({ first_name: "", email: "", phone: "", eta_minutes: 15 });
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimMsg, setClaimMsg]         = useState("");
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [lastCode, setLastCode]         = useState("");
  const [signinModal, setSigninModal]   = useState(false);
  const [signinEmail, setSigninEmail]   = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signinLoading, setSigninLoading]   = useState(false);
  const [signinError, setSigninError]       = useState("");
  const [signinMode, setSigninMode]         = useState<"signin" | "signup">("signin");
  const [signinDone, setSigninDone]         = useState(false);
  const [termsAccepted, setTermsAccepted]   = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setLocale(detectLocale()); }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u?.email) {
        setClaimForm(f => ({ ...f, email: u.email! }));
        if (u.email === ADMIN_EMAIL) {
          setIsAdmin(true);
          setIsBusiness(false);
          setIsNgo(false);
          setNgoName(null);
        } else {
          const { data: biz } = await supabase
            .from("businesses").select("id, name, account_type").eq("email", u.email).single();
          if (biz) {
            const ngoAccount = biz.account_type === "ngo";
            // Set all business-related state atomically before resolving auth
            setIsBusiness(true);
            setIsNgo(ngoAccount);
            setNgoName(ngoAccount ? (biz.name as string) : null);
          } else {
            setIsBusiness(false);
            setIsNgo(false);
            setNgoName(null);
            // Auto-fill from last claim for regular customers
            if (u.id) {
              const { data: prevClaim } = await supabase
                .from("claims")
                .select("first_name, phone, email")
                .eq("customer_user_id", u.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();
              if (prevClaim) {
                setClaimForm(f => ({
                  ...f,
                  email: u.email!,
                  first_name: prevClaim.first_name || f.first_name,
                  phone: prevClaim.phone || f.phone,
                }));
              }
            }
          }
        }
        setSigninModal(false);
        setSigninDone(false);
      } else {
        setIsBusiness(false);
        setIsNgo(false);
        setIsAdmin(false);
        setNgoName(null);
        setClaimForm(f => ({ ...f, email: "" }));
      }
      // Auth is fully settled — safe to render now
      setAuthResolved(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function fetchListings() {
    try {
      const { data, error } = await supabase
        .from("listings").select("*")
        .eq("status", "AVAILABLE")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const all = (data || []) as Listing[];
      setListings(all);
      applyFilters(all, search, activeCategory, sortBy);
    } catch (e) {
      console.error("fetchListings error:", e);
      setListings([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBizInfo(all: Listing[]) {
    if (!all.length) return;
    const names = [...new Set(all.map((l) => l.business_name).filter(Boolean))];
    const { data: bizData } = await supabase
      .from("businesses").select("name, address, phone, email").in("name", names);
    if (bizData) {
      const map: Record<string, BizInfo> = {};
      for (const b of bizData) map[b.name] = { address: b.address, phone: b.phone, email: b.email };
      setBizInfoMap(map);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 5000);
    (async () => { await fetchListings(); clearTimeout(timeout); })();
    intervalRef.current = setInterval(fetchListings, 30000);
    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (user && (!isBusiness || isNgo || isAdmin) && listings.length > 0) fetchBizInfo(listings);
  }, [user, isBusiness, isNgo, isAdmin, listings]);

  function applyFilters(all: Listing[], q: string, cat: string, sort: string) {
    let result = [...all];
    if (q.trim()) {
      const lower = q.toLowerCase();
      result = result.filter(l =>
        l.food_name?.toLowerCase().includes(lower) ||
        l.business_name?.toLowerCase().includes(lower) ||
        l.category?.toLowerCase().includes(lower)
      );
    }
    if (cat !== "All") result = result.filter(l => l.category === cat);
    if (sort === "Expiring Soon") {
      result.sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    setFiltered(result);
  }

  function handleSearch(q: string) { setSearch(q); applyFilters(listings, q, activeCategory, sortBy); }
  function handleCategory(cat: string) { setCategory(cat); applyFilters(listings, search, cat, sortBy); }
  function handleSort(sort: string) { setSortBy(sort); applyFilters(listings, search, activeCategory, sort); }

  function openClaim(id: string) {
    setSelectedId(id);
    setClaimMsg("");
    setClaimSuccess(false);
    const listing = listings.find(l => l.id === id);
    if (listing) {
      const minsUntilExpiry = Math.floor((new Date(listing.expires_at).getTime() - Date.now()) / 60000);
      const maxEta = Math.min(minsUntilExpiry, 600);
      const currentEta = claimForm.eta_minutes;
      if (currentEta > maxEta) {
        const validOptions = [10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 360, 420, 480, 540, 600];
        const firstValid = validOptions.find(o => o <= maxEta) || Math.min(maxEta, 10);
        setClaimForm(f => ({ ...f, eta_minutes: firstValid }));
      }
    }
  }

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    setSigninLoading(true); setSigninError("");
    if (signinMode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email: signinEmail.trim().toLowerCase(), password: signinPassword,
      });
      if (error) { setSigninError("Invalid email or password."); setSigninLoading(false); return; }
    } else {
      const { error } = await supabase.auth.signUp({
        email: signinEmail.trim().toLowerCase(), password: signinPassword,
        options: { emailRedirectTo: "https://gawaloop.com/browse" },
      });
      if (error) { setSigninError(error.message); setSigninLoading(false); return; }
      setSigninDone(true);
    }
    setSigninLoading(false);
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || (isBusiness && !isNgo)) return;
    setClaimLoading(true); setClaimMsg("");
    const res = await fetch("/api/claim-submit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId: selectedId, first_name: claimForm.first_name.trim(),
        email: claimForm.email.trim().toLowerCase(), phone: claimForm.phone.trim(),
        eta_minutes: claimForm.eta_minutes, customer_user_id: user?.id || null,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setClaimSuccess(true);
      setLastCode(data.confirmation_code || data.code || data.claim?.confirmation_code || "");
      setListings(prev => prev.filter(l => l.id !== selectedId));
      setFiltered(prev => prev.filter(l => l.id !== selectedId));
    } else {
      setClaimMsg(data.error || "Failed to reserve. Please try again.");
    }
    setClaimLoading(false);
  }

  const T     = t[locale];
  const FT    = FILTER_T[locale] || FILTER_T.en;
  const isRTL = locale === "ar";

  // Wait for auth to fully settle before computing permissions
  // This prevents the race condition where isBusiness=true but isNgo=false momentarily
  const canClaim   = authResolved && !!user && (!isBusiness || isNgo || isAdmin);
  const isSignedIn = authResolved && !!user;

  // NGOs see all listings EXCEPT their own business's food
  const displayedListings = isNgo && ngoName
    ? filtered.filter(l => l.business_name !== ngoName)
    : filtered;

  const liveCats = ["All", ...Array.from(new Set(listings.map(l => l.category).filter(Boolean)))];

  function minsLeft(expires_at: string) {
    const diff = new Date(expires_at).getTime() - Date.now();
    if (diff <= 0) return null;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m left`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m left`;
  }

  function getEtaOptions(listingId: string | null) {
    const ALL_OPTIONS = [
      { value: 10,  label: (l: string) => `10 ${l === "ar" ? "دقائق" : "minutes"}` },
      { value: 15,  label: (l: string) => `15 ${l === "ar" ? "دقائق" : "minutes"}` },
      { value: 20,  label: (l: string) => `20 ${l === "ar" ? "دقائق" : "minutes"}` },
      { value: 30,  label: (l: string) => `30 ${l === "ar" ? "دقائق" : "minutes"}` },
      { value: 45,  label: (l: string) => `45 ${l === "ar" ? "دقائق" : "minutes"}` },
      { value: 60,  label: (l: string) => `1 ${l === "fr" ? "heure" : l === "es" ? "hora" : l === "pt" ? "hora" : l === "ar" ? "ساعة" : "hour"}` },
      { value: 90,  label: (l: string) => `1.5 ${l === "fr" ? "heures" : l === "es" ? "horas" : l === "pt" ? "horas" : l === "ar" ? "ساعات" : "hours"}` },
      { value: 120, label: (l: string) => `2 ${l === "fr" ? "heures" : l === "es" ? "horas" : l === "pt" ? "horas" : l === "ar" ? "ساعات" : "hours"}` },
      { value: 180, label: (l: string) => `3 ${l === "fr" ? "heures" : l === "es" ? "horas" : l === "pt" ? "horas" : l === "ar" ? "ساعات" : "hours"}` },
      { value: 240, label: (l: string) => `4 ${l === "fr" ? "heures" : l === "es" ? "horas" : l === "pt" ? "horas" : l === "ar" ? "ساعات" : "hours"}` },
      { value: 300, label: (l: string) => `5 ${l === "fr" ? "heures" : l === "es" ? "horas" : l === "pt" ? "horas" : l === "ar" ? "ساعات" : "hours"}` },
      { value: 360, label: (l: string) => `6 ${l === "fr" ? "heures" : l === "es" ? "horas" : l === "pt" ? "horas" : l === "ar" ? "ساعات" : "hours"}` },
      { value: 420, label: (l: string) => `7 ${l === "fr" ? "heures" : l === "es" ? "horas" : l === "pt" ? "horas" : l === "ar" ? "ساعات" : "hours"}` },
      { value: 480, label: (l: string) => `8 ${l === "fr" ? "heures" : l === "es" ? "horas" : l === "pt" ? "horas" : l === "ar" ? "ساعات" : "hours"}` },
      { value: 540, label: (l: string) => `9 ${l === "fr" ? "heures" : l === "es" ? "horas" : l === "pt" ? "horas" : l === "ar" ? "ساعات" : "hours"}` },
      { value: 600, label: (l: string) => `10 ${l === "fr" ? "heures" : l === "es" ? "horas" : l === "pt" ? "horas" : l === "ar" ? "ساعات" : "hours"}` },
    ];
    if (!listingId) return ALL_OPTIONS;
    const listing = listings.find(l => l.id === listingId);
    if (!listing) return ALL_OPTIONS;
    const minsUntilExpiry = Math.floor((new Date(listing.expires_at).getTime() - Date.now()) / 60000);
    const maxEta = Math.min(minsUntilExpiry, 600);
    return ALL_OPTIONS.filter(o => o.value <= maxEta);
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

      <nav style={{ background: "#0a2e1a", padding: "0 24px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
          <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width: "28px", height: "28px", objectFit: "contain" }}/>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: "16px" }}>GAWA Loop</span>
        </a>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <LanguageSwitcher />
          {user ? (
            <a href={isAdmin ? "/admin/business-lookup" : isBusiness ? "/business/dashboard" : "/customer/profile"}
              style={{ background: "#16a34a", color: "#fff", padding: "7px 14px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 700 }}>
              {isAdmin ? "🔑 Admin" : isBusiness ? "Dashboard" : "My Profile"}
            </a>
          ) : (
            <button onClick={() => { setSigninModal(true); setSigninError(""); setSigninDone(false); setTermsAccepted(false); }}
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff", padding: "7px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
              Sign In
            </button>
          )}
        </div>
      </nav>

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "32px 16px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 900, color: "#0a2e1a", margin: "0 0 4px" }}>
          {T.browse || "Browse Free Food"}
        </h1>
        <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 20px" }}>
          {displayedListings.length} {displayedListings.length === 1 ? "item" : "items"} available now · refreshes every 30s
        </p>

        {/* NGO info banner */}
        {isNgo && ngoName && (
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "12px 18px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🏛</span>
            <p style={{ margin: 0, fontSize: "13px", color: "#1d4ed8", fontWeight: 600 }}>
              Browsing as <b>{ngoName}</b> — claim food from other businesses for your community. Your own listings are hidden here.
            </p>
          </div>
        )}

        {/* SEARCH */}
        <div style={{ position: "relative", marginBottom: "14px" }}>
          <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "16px" }}>🔍</span>
          <input style={{ ...inp, paddingLeft: "40px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            placeholder={locale === "fr" ? "Rechercher..." : locale === "es" ? "Buscar..." : locale === "pt" ? "Pesquisar..." : locale === "ar" ? "بحث..." : "Search food, category..."}
            value={search} onChange={e => handleSearch(e.target.value)}/>
        </div>

        {/* CATEGORY TABS */}
        {!loading && listings.length > 0 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
            {liveCats.map(cat => (
              <button key={cat} onClick={() => handleCategory(cat)}
                style={{ padding: "7px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "13px", fontWeight: 700, transition: "all 0.15s",
                  background: activeCategory === cat ? "#0a2e1a" : "#fff",
                  color: activeCategory === cat ? "#4ade80" : "#374151",
                  border: activeCategory === cat ? "none" : "1px solid #e5e7eb",
                  boxShadow: activeCategory === cat ? "none" : "0 1px 3px rgba(0,0,0,0.06)",
                }}>
                {cat === "All" ? FT.all : cat}
              </button>
            ))}
          </div>
        )}

        {/* SORT */}
        {!loading && listings.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: 600 }}>{FT.sort_label}:</span>
            {SORT_OPTIONS.map(opt => (
              <button key={opt} onClick={() => handleSort(opt)}
                style={{ padding: "5px 14px", borderRadius: "20px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700,
                  background: sortBy === opt ? "#16a34a" : "#f3f4f6",
                  color: sortBy === opt ? "#fff" : "#374151",
                }}>
                {opt === "Newest" ? FT.newest : FT.expiring}
              </button>
            ))}
          </div>
        )}

        {/* LISTINGS */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ display: "inline-block", width: "36px", height: "36px", border: "3px solid #e5e7eb", borderTopColor: "#16a34a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ marginTop: "16px", color: "#9ca3af", fontSize: "14px" }}>
              {locale === "fr" ? "Recherche de nourriture..." : locale === "es" ? "Buscando comida..." : locale === "pt" ? "Procurando comida..." : locale === "ar" ? "جارٍ البحث..." : "Finding available food near you..."}
            </p>
          </div>
        ) : displayedListings.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid #e5e7eb", padding: "60px 24px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <p style={{ fontSize: "48px", margin: "0 0 16px" }}>🍽️</p>
            <p style={{ fontSize: "18px", fontWeight: 800, color: "#0a2e1a", margin: "0 0 8px" }}>
              {activeCategory !== "All"
                ? `${locale === "fr" ? "Aucun résultat dans" : locale === "es" ? "Sin resultados en" : locale === "pt" ? "Sem resultados em" : locale === "ar" ? "لا نتائج في" : "No results in"} "${activeCategory}"`
                : isNgo
                  ? "No food from other businesses available right now"
                  : (locale === "fr" ? "Aucune nourriture disponible" : locale === "es" ? "Sin comida disponible" : locale === "pt" ? "Sem comida disponível" : locale === "ar" ? "لا طعام متاح الآن" : "No food available right now")}
            </p>
            <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 20px", lineHeight: 1.6 }}>
              {activeCategory !== "All" ? (
                <button onClick={() => handleCategory("All")} style={{ background: "none", border: "none", color: "#16a34a", fontWeight: 700, cursor: "pointer", fontSize: "14px", padding: 0 }}>
                  {locale === "fr" ? "Voir toutes les catégories →" : locale === "es" ? "Ver todas →" : locale === "pt" ? "Ver todas →" : locale === "ar" ? "← عرض الكل" : "View all categories →"}
                </button>
              ) : (locale === "fr" ? "Les annonces se rafraîchissent toutes les 30 secondes." : locale === "es" ? "Los anuncios se actualizan cada 30 segundos." : locale === "pt" ? "Anúncios atualizam a cada 30 segundos." : locale === "ar" ? "تتجدد الإعلانات كل 30 ثانية." : "Listings refresh automatically every 30 seconds.")}
            </p>
            {activeCategory === "All" && (
              <a href="/" style={{ background: "#16a34a", color: "#fff", padding: "10px 24px", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: 700 }}>← Back to Home</a>
            )}
          </div>
        ) : displayedListings.map(listing => {
          const bizInfo  = bizInfoMap[listing.business_name];
          const timeLeft = minsLeft(listing.expires_at);
          const isUrgent = timeLeft !== null && timeLeft.includes("m left") && parseInt(timeLeft) <= 30;
          return (
            <div key={listing.id} style={{ background: "#fff", borderRadius: "20px", border: `1px solid ${isUrgent ? "#fde68a" : "#e5e7eb"}`, overflow: "hidden", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>

              {listing.image_url ? (
                <div style={{ width: "100%", height: "220px", overflow: "hidden" }}>
                  <img src={listing.image_url} alt={listing.food_name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}/>
                </div>
              ) : (
                <div style={{ width: "100%", height: "80px", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px" }}>🍽️</div>
              )}

              <div style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", gap: "8px" }}>
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0a2e1a", flex: 1 }}>{listing.food_name}</h2>
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span style={{ background: "#f0fdf4", color: "#16a34a", fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "20px", border: "1px solid #bbf7d0" }}>FREE</span>
                    <span style={{ background: "#f1f5f9", color: "#475569", fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "20px" }}>{listing.category}</span>
                    {timeLeft && (
                      <span style={{ background: isUrgent ? "#fef3c7" : "#f0fdf4", color: isUrgent ? "#92400e" : "#166534", fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "20px" }}>
                        ⏰ {timeLeft}
                      </span>
                    )}
                  </div>
                </div>

                <p style={{ margin: "0 0 6px", fontSize: "14px", color: "#6b7280" }}>
                  {listing.quantity}
                  {listing.weight_kg && listing.weight_kg > 0 && ` · ${(listing.weight_kg * 2.205).toFixed(1)} lbs`}
                </p>
                {listing.allergy_note && (
                  <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", padding: "4px 10px", display: "inline-block" }}>
                    ⚠️ {listing.allergy_note}
                  </p>
                )}
                {listing.note && <p style={{ margin: "6px 0 10px", fontSize: "13px", color: "#374151" }}>📝 {listing.note}</p>}

                {/* Business info block — shown only when signed in AND can claim */}
                {isSignedIn && canClaim ? (
                  <div style={{ background: "#f9fafb", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: bizInfo ? "12px" : 0 }}>
                      {listing.business_logo_url ? (
                        <img src={listing.business_logo_url} alt={listing.business_name}
                          style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}/>
                      ) : (
                        <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>🏪</div>
                      )}
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700, color: "#0a2e1a" }}>{listing.business_name}</p>
                        <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#6b7280" }}>📍 {listing.address}</p>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <a href={`https://maps.google.com/?q=${encodeURIComponent(listing.address || "")}`} target="_blank" rel="noreferrer"
                            style={{ background: "#e8f0fe", color: "#1a73e8", padding: "4px 10px", borderRadius: "6px", textDecoration: "none", fontSize: "12px", fontWeight: 600 }}>🗺️ Google Maps</a>
                          <a href={`https://maps.apple.com/?q=${encodeURIComponent(listing.address || "")}`} target="_blank" rel="noreferrer"
                            style={{ background: "#f3f4f6", color: "#374151", padding: "4px 10px", borderRadius: "6px", textDecoration: "none", fontSize: "12px", fontWeight: 600 }}>🍎 Apple Maps</a>
                          <a href={`https://waze.com/ul?q=${encodeURIComponent(listing.address || "")}`} target="_blank" rel="noreferrer"
                            style={{ background: "#e8f8ff", color: "#0099cc", padding: "4px 10px", borderRadius: "6px", textDecoration: "none", fontSize: "12px", fontWeight: 600 }}>🚗 Waze</a>
                        </div>
                      </div>
                    </div>
                    {bizInfo && (
                      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "10px", display: "flex", flexDirection: "column", gap: "5px" }}>
                        {bizInfo.phone && (
                          <p style={{ margin: 0, fontSize: "13px", color: "#374151" }}>
                            📞 <a href={`tel:${bizInfo.phone}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>{bizInfo.phone}</a>
                          </p>
                        )}
                        <p style={{ margin: 0, fontSize: "13px", color: "#374151" }}>
                          ✉️ <a href={`mailto:${bizInfo.email}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>{bizInfo.email}</a>
                        </p>
                      </div>
                    )}
                  </div>
                ) : !isSignedIn ? (
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px", textAlign: "center" }}>
                    <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#374151", fontWeight: 600 }}>
                      🔒 {locale === "fr" ? "Connectez-vous pour voir les détails et réserver" : locale === "es" ? "Inicia sesión para ver detalles y reservar" : locale === "pt" ? "Entre para ver detalhes e reservar" : locale === "ar" ? "سجّل للدخول لرؤية التفاصيل والحجز" : "Sign in to see the restaurant details & claim this food"}
                    </p>
                    <button onClick={() => { setSigninModal(true); setSigninError(""); setSigninDone(false); setTermsAccepted(false); }}
                      style={{ background: "#16a34a", color: "#fff", padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>
                      {locale === "fr" ? "Se connecter — Gratuit" : locale === "es" ? "Iniciar sesión — Gratis" : locale === "pt" ? "Entrar — Grátis" : locale === "ar" ? "تسجيل الدخول — مجاني" : "Sign In — It's Free"}
                    </button>
                  </div>
                ) : null}

                {/* Reserve button — only for customers and NGOs, not plain restaurant businesses or admin */}
                {canClaim && !isAdmin && (
                  <button onClick={() => openClaim(listing.id)}
                    style={{ width: "100%", background: "#16a34a", color: "#fff", border: "none", padding: "14px", borderRadius: "10px", cursor: "pointer", fontSize: "15px", fontWeight: 800 }}>
                    {locale === "fr" ? "Réserver — Gratuit" : locale === "es" ? "Reservar — Gratis" : locale === "pt" ? "Reservar — Grátis" : locale === "ar" ? "احجز الآن — مجاناً" : "Reserve Now — It's Free"}
                  </button>
                )}

                {isAdmin && isSignedIn && (
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "12px 16px", textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: "13px", color: "#166534", fontWeight: 600 }}>👁️ Admin view — claims disabled for admin account</p>
                  </div>
                )}

                {/* Plain restaurant business — signed in but can't claim */}
                {isSignedIn && isBusiness && !isNgo && !isAdmin && (
                  <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px 16px", textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                      {locale === "fr" ? "Les comptes professionnels ne peuvent pas réserver." : locale === "es" ? "Las cuentas de negocios no pueden reservar." : locale === "pt" ? "Contas empresariais não podem reservar." : locale === "ar" ? "حسابات الأعمال لا يمكنها الحجز." : "Business accounts cannot claim food."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {!loading && displayedListings.length > 0 && (
          <p style={{ textAlign: "center", fontSize: "13px", color: "#9ca3af", marginTop: "8px", marginBottom: "24px" }}>
            {locale === "fr" ? "Actualisation toutes les 30s — Tout est gratuit" : locale === "es" ? "Actualización cada 30s — Todo gratis" : locale === "pt" ? "Atualiza a cada 30s — Tudo grátis" : locale === "ar" ? "تحديث كل 30 ثانية — كل الطعام مجاني" : "Listings refresh every 30 seconds — All food is free"}
          </p>
        )}
      </div>

      {/* SIGN-IN MODAL */}
      {signinModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px" }}>
          <div style={{ background: "#fff", borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "420px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
            {signinDone ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "52px", marginBottom: "16px" }}>📬</div>
                <h2 style={{ margin: "0 0 10px", fontSize: "20px", fontWeight: 800, color: "#0a2e1a" }}>
                  {locale === "fr" ? "Vérifiez votre email !" : locale === "es" ? "¡Revisa tu email!" : locale === "pt" ? "Verifique seu email!" : locale === "ar" ? "تحقق من بريدك!" : "Check your email!"}
                </h2>
                <p style={{ margin: "0 0 16px", fontSize: "15px", color: "#374151", lineHeight: 1.6 }}>
                  {locale === "fr" ? "Lien envoyé à" : locale === "es" ? "Enlace enviado a" : locale === "pt" ? "Link enviado para" : locale === "ar" ? "أرسلنا رابطاً إلى" : "We sent a confirmation link to"} <b>{signinEmail}</b>
                </p>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "16px", marginBottom: "20px", textAlign: "left" }}>
                  <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#374151" }}>1. {locale === "fr" ? "Ouvrez votre boîte mail" : locale === "es" ? "Abre tu bandeja" : locale === "pt" ? "Abra sua caixa" : locale === "ar" ? "افتح بريدك" : "Open your email inbox"}</p>
                  <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#374151" }}>2. {locale === "fr" ? "Cliquez sur le lien de confirmation" : locale === "es" ? "Haz clic en el enlace" : locale === "pt" ? "Clique no link" : locale === "ar" ? "انقر على الرابط" : "Click the confirmation link"}</p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#374151" }}>3. {locale === "fr" ? "Vous serez connecté automatiquement" : locale === "es" ? "Serás conectado automáticamente" : locale === "pt" ? "Você será conectado" : locale === "ar" ? "ستُوقّع دخولك تلقائياً" : "You'll be signed in automatically"}</p>
                </div>
                <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#9ca3af" }}>
                  {locale === "fr" ? "Vérifiez vos spams si absent." : locale === "es" ? "¿No lo ves? Revisa spam." : locale === "pt" ? "Não viu? Verifique spam." : locale === "ar" ? "تحقق من البريد المزعج." : "Don't see it? Check your spam folder."}
                </p>
                <button onClick={() => { setSigninModal(false); setSigninDone(false); }}
                  style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "10px 24px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>
                  {locale === "fr" ? "OK, compris" : locale === "es" ? "OK, entendido" : locale === "pt" ? "OK, entendi" : locale === "ar" ? "حسناً" : "OK, got it"}
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0a2e1a" }}>
                    {signinMode === "signin"
                      ? (locale === "fr" ? "Se connecter" : locale === "es" ? "Iniciar sesión" : locale === "pt" ? "Entrar" : locale === "ar" ? "تسجيل الدخول" : "Sign In")
                      : (locale === "fr" ? "Créer un compte" : locale === "es" ? "Crear cuenta" : locale === "pt" ? "Criar conta" : locale === "ar" ? "إنشاء حساب" : "Create Account")}
                  </h2>
                  <button onClick={() => setSigninModal(false)} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#9ca3af" }}>✕</button>
                </div>
                <form onSubmit={handleSignin}>
                  {signinError && (
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" }}>
                      <p style={{ margin: 0, color: "#991b1b", fontSize: "13px" }}>{signinError}</p>
                    </div>
                  )}
                  <div style={{ marginBottom: "14px" }}>
                    <label style={lbl}>{locale === "ar" ? "البريد الإلكتروني *" : "Email *"}</label>
                    <input style={inp} type="email" required value={signinEmail}
                      onChange={e => setSigninEmail(e.target.value)} placeholder="you@email.com"/>
                  </div>
                  <div style={{ marginBottom: signinMode === "signup" ? "16px" : "20px" }}>
                    <label style={lbl}>{locale === "fr" ? "Mot de passe *" : locale === "es" ? "Contraseña *" : locale === "pt" ? "Senha *" : locale === "ar" ? "كلمة المرور *" : "Password *"}</label>
                    <input style={inp} type="password" required value={signinPassword}
                      onChange={e => setSigninPassword(e.target.value)} placeholder="••••••••" minLength={6}/>
                  </div>

                  {signinMode === "signup" && (
                    <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "16px", cursor: "pointer" }}
                      onClick={() => setTermsAccepted(v => !v)}>
                      <div style={{ width: "20px", height: "20px", borderRadius: "5px", border: `2px solid ${termsAccepted ? "#16a34a" : "#d1d5db"}`, background: termsAccepted ? "#16a34a" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px", transition: "all 0.15s" }}>
                        {termsAccepted && <span style={{ color: "#fff", fontSize: "12px", fontWeight: 900 }}>✓</span>}
                      </div>
                      <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: 1.5 }}>
                        {locale === "fr" ? "J'accepte les " : locale === "es" ? "Acepto los " : locale === "pt" ? "Aceito os " : locale === "ar" ? "أوافق على " : "I agree to the "}
                        <a href="/terms" target="_blank" onClick={e => e.stopPropagation()} style={{ color: "#16a34a", fontWeight: 600, textDecoration: "none" }}>
                          {locale === "fr" ? "Conditions d'utilisation" : locale === "es" ? "Términos de uso" : locale === "pt" ? "Termos de uso" : locale === "ar" ? "شروط الاستخدام" : "Terms of Use"}
                        </a>
                        {" "}{locale === "fr" ? "et la " : locale === "es" ? "y la " : locale === "pt" ? "e a " : locale === "ar" ? "و" : "and "}
                        <a href="/privacy" target="_blank" onClick={e => e.stopPropagation()} style={{ color: "#16a34a", fontWeight: 600, textDecoration: "none" }}>
                          {locale === "fr" ? "Politique de confidentialité" : locale === "es" ? "Política de privacidad" : locale === "pt" ? "Política de privacidade" : locale === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}
                        </a>
                        {" *"}
                      </p>
                    </label>
                  )}

                  <button type="submit" disabled={signinLoading || (signinMode === "signup" && !termsAccepted)}
                    style={{ width: "100%", background: (signinLoading || (signinMode === "signup" && !termsAccepted)) ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", padding: "13px", borderRadius: "10px", cursor: (signinLoading || (signinMode === "signup" && !termsAccepted)) ? "not-allowed" : "pointer", fontSize: "15px", fontWeight: 700, marginBottom: "14px" }}>
                    {signinLoading ? "..." : signinMode === "signin"
                      ? (locale === "fr" ? "Se connecter" : locale === "es" ? "Iniciar sesión" : locale === "pt" ? "Entrar" : locale === "ar" ? "دخول" : "Sign In")
                      : (locale === "fr" ? "Créer le compte" : locale === "es" ? "Crear cuenta" : locale === "pt" ? "Criar conta" : locale === "ar" ? "إنشاء حساب" : "Create Account")}
                  </button>
                  <p style={{ textAlign: "center", fontSize: "13px", color: "#6b7280", margin: 0 }}>
                    {signinMode === "signin"
                      ? (locale === "fr" ? "Pas de compte ?" : locale === "es" ? "¿Sin cuenta?" : locale === "pt" ? "Sem conta?" : locale === "ar" ? "ليس لديك حساب؟" : "No account?")
                      : (locale === "fr" ? "Déjà un compte ?" : locale === "es" ? "¿Ya tienes cuenta?" : locale === "pt" ? "Já tem conta?" : locale === "ar" ? "لديك حساب؟" : "Already have one?")}{" "}
                    <button type="button" onClick={() => { setSigninMode(signinMode === "signin" ? "signup" : "signin"); setSigninError(""); setTermsAccepted(false); }}
                      style={{ background: "none", border: "none", color: "#16a34a", fontWeight: 700, cursor: "pointer", fontSize: "13px", padding: 0 }}>
                      {signinMode === "signin"
                        ? (locale === "fr" ? "Créer un compte" : locale === "es" ? "Crear cuenta" : locale === "pt" ? "Criar conta" : locale === "ar" ? "إنشاء حساب" : "Create one free")
                        : (locale === "fr" ? "Se connecter" : locale === "es" ? "Iniciar sesión" : locale === "pt" ? "Entrar" : locale === "ar" ? "تسجيل الدخول" : "Sign in")}
                    </button>
                  </p>
                </form>
                <p style={{ textAlign: "center", marginTop: "14px", fontSize: "12px", color: "#9ca3af" }}>
                  {locale === "fr" ? "Entreprise ?" : locale === "es" ? "¿Negocio?" : locale === "pt" ? "Empresa?" : locale === "ar" ? "شركة؟" : "Business?"}{" "}
                  <a href="/business/login" style={{ color: "#16a34a", fontWeight: 600, textDecoration: "none" }}>
                    {locale === "fr" ? "Connexion entreprise →" : locale === "es" ? "Login empresas →" : locale === "pt" ? "Login empresas →" : locale === "ar" ? "← دخول الأعمال" : "Business login →"}
                  </a>
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* CLAIM MODAL */}
      {selectedId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px" }}>
          <div style={{ background: "#fff", borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
            {claimSuccess ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "56px", marginBottom: "12px" }}>🎉</div>
                <h2 style={{ margin: "0 0 8px", fontSize: "22px", fontWeight: 800, color: "#0a2e1a" }}>
                  {locale === "fr" ? "Réservation confirmée !" : locale === "es" ? "¡Reserva confirmada!" : locale === "pt" ? "Reserva confirmada!" : locale === "ar" ? "تم تأكيد الحجز!" : "Reservation Confirmed!"}
                </h2>
                <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: "14px" }}>
                  {locale === "fr" ? "Votre code de retrait :" : locale === "es" ? "Tu código:" : locale === "pt" ? "Seu código:" : locale === "ar" ? "رمز الاستلام:" : "Your pickup code:"}
                </p>
                <div style={{ background: "#f0fdf4", border: "2px solid #16a34a", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
                  <p style={{ margin: 0, fontSize: "48px", fontWeight: 900, letterSpacing: "8px", color: "#0a2e1a", fontFamily: "monospace" }}>{lastCode}</p>
                </div>
                <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: "20px" }}>
                  {locale === "fr" ? "Vérifiez votre email. Montrez ce code à votre arrivée." : locale === "es" ? "Revisa tu email. Muestra este código al llegar." : locale === "pt" ? "Verifique seu email. Mostre este código ao chegar." : locale === "ar" ? "تحقق من بريدك. أظهر هذا الرمز عند الوصول." : "Check your email for details. Show this code when you arrive."}
                </p>
                <button onClick={() => { setSelectedId(null); setClaimSuccess(false); }}
                  style={{ background: "#16a34a", color: "#fff", border: "none", padding: "12px 28px", borderRadius: "10px", cursor: "pointer", fontWeight: 700, fontSize: "15px" }}>
                  {locale === "fr" ? "Terminé" : locale === "es" ? "Listo" : locale === "pt" ? "Pronto" : locale === "ar" ? "تم" : "Done"}
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0a2e1a" }}>
                    {locale === "fr" ? "Réserver cette nourriture" : locale === "es" ? "Reservar esta comida" : locale === "pt" ? "Reservar esta comida" : locale === "ar" ? "احجز هذا الطعام" : "Reserve This Food"}
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
                    <label style={lbl}>{locale === "fr" ? "Votre prénom *" : locale === "es" ? "Tu nombre *" : locale === "pt" ? "Seu nome *" : locale === "ar" ? "اسمك الأول *" : "Your First Name *"}</label>
                    <input style={inp} required value={claimForm.first_name}
                      onChange={e => setClaimForm(f => ({ ...f, first_name: e.target.value }))}
                      placeholder={locale === "fr" ? "Votre prénom" : locale === "es" ? "Tu nombre" : locale === "pt" ? "Seu nome" : locale === "ar" ? "اسمك" : "Your first name"}/>
                  </div>
                  <div style={{ marginBottom: "14px" }}>
                    <label style={lbl}>Email *</label>
                    <input style={inp} type="email" required value={claimForm.email}
                      onChange={e => setClaimForm(f => ({ ...f, email: e.target.value }))}/>
                  </div>
                  <div style={{ marginBottom: "14px" }}>
                    <label style={lbl}>{locale === "fr" ? "Téléphone *" : locale === "es" ? "Teléfono *" : locale === "pt" ? "Telefone *" : locale === "ar" ? "الهاتف *" : "Phone Number *"}</label>
                    <input style={inp} type="tel" required value={claimForm.phone}
                      onChange={e => setClaimForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g. 3478015325"/>
                  </div>
                  {(claimForm.first_name || claimForm.phone) && (
                    <p style={{ margin: "-8px 0 12px", fontSize: "12px", color: "#16a34a", fontWeight: 600 }}>
                      ✓ {locale === "fr" ? "Informations pré-remplies — modifiez si nécessaire" : locale === "es" ? "Información precargada — edita si es necesario" : locale === "pt" ? "Informações preenchidas — edite se necessário" : locale === "ar" ? "تم ملء البيانات تلقائياً — عدّل إن أردت" : "Pre-filled from your last claim — edit if needed"}
                    </p>
                  )}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={lbl}>{locale === "fr" ? "Heure d'arrivée" : locale === "es" ? "Hora de llegada" : locale === "pt" ? "Horário de chegada" : locale === "ar" ? "وقت الوصول" : "Your Arrival Time"}</label>
                    <select style={{ ...inp, cursor: "pointer" }} value={claimForm.eta_minutes}
                      onChange={e => setClaimForm(f => ({ ...f, eta_minutes: Number(e.target.value) }))}>
                      {getEtaOptions(selectedId).map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label(locale)}</option>
                      ))}
                    </select>
                    {(() => {
                      const listing = listings.find(l => l.id === selectedId);
                      if (!listing) return null;
                      const minsUntilExpiry = Math.floor((new Date(listing.expires_at).getTime() - Date.now()) / 60000);
                      if (minsUntilExpiry < 600) {
                        return (
                          <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#f59e0b", fontWeight: 600 }}>
                            ⏰ {locale === "fr" ? `Ce listing expire dans ${minsUntilExpiry} min` : locale === "es" ? `Este anuncio expira en ${minsUntilExpiry} min` : locale === "pt" ? `Este anúncio expira em ${minsUntilExpiry} min` : locale === "ar" ? `ينتهي هذا الإعلان خلال ${minsUntilExpiry} دقيقة` : `This listing expires in ${minsUntilExpiry} min — arrival time limited accordingly`}
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <button type="submit" disabled={claimLoading}
                    style={{ width: "100%", background: claimLoading ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", padding: "14px", borderRadius: "10px", cursor: claimLoading ? "not-allowed" : "pointer", fontSize: "15px", fontWeight: 800 }}>
                    {claimLoading ? "..." : (locale === "fr" ? "Réserver — Gratuit" : locale === "es" ? "Reservar — Gratis" : locale === "pt" ? "Reservar — Grátis" : locale === "ar" ? "احجز — مجاناً" : "Reserve Now — It's Free")}
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
