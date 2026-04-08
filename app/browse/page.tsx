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
  id: string; business_name: string; food_name: string; category: string;
  quantity: string; allergy_note: string; estimated_value: number; note: string;
  status: string; expires_at: string; claim_hold_minutes: number; address: string;
  maps_url: string; image_url: string; weight_kg: number; business_logo_url: string;
};
type BizInfo = { address: string; phone: string | null; email: string };

export default function BrowsePage() {
  const [locale, setLocale]             = useState<Locale>("en");
  const [listings, setListings]         = useState<Listing[]>([]);
  const [filtered, setFiltered]         = useState<Listing[]>([]);
  const [search, setSearch]             = useState("");
  const [loading, setLoading]           = useState(true);
  const [user, setUser]                 = useState<any>(null);
  const [isBusiness, setIsBusiness]     = useState(false);
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
  const intervalRef                     = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setLocale(detectLocale()); }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u?.email) {
        setClaimForm(f => ({ ...f, email: u.email! }));
        const { data: biz } = await supabase
          .from("businesses").select("id").eq("email", u.email).single();
        setIsBusiness(!!biz);
        if (biz) setSigninModal(false);
        setSigninModal(false);
        setSigninDone(false);
      } else {
        setIsBusiness(false);
        setClaimForm(f => ({ ...f, email: "" }));
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function fetchListings() {
    const { data } = await supabase
      .from("listings").select("*")
      .eq("status", "AVAILABLE")
      .order("created_at", { ascending: false });
    const all = data || [];
    setListings(all);
    applySearch(all, search);
    setLoading(false);
  }

  async function fetchBizInfo(all: Listing[]) {
    if (!all.length) return;
    const names = [...new Set(all.map((l: Listing) => l.business_name).filter(Boolean))];
    const { data: bizData } = await supabase
      .from("businesses").select("name, address, phone, email").in("name", names);
    if (bizData) {
      const map: Record<string, BizInfo> = {};
      for (const b of bizData) map[b.name] = { address: b.address, phone: b.phone, email: b.email };
      setBizInfoMap(map);
    }
  }

  useEffect(() => {
    (async () => { await fetchListings(); })();
    intervalRef.current = setInterval(fetchListings, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    if (user && !isBusiness && listings.length > 0) fetchBizInfo(listings);
  }, [user, isBusiness, listings]);

  function applySearch(all: Listing[], q: string) {
    if (!q.trim()) { setFiltered(all); return; }
    const lower = q.toLowerCase();
    setFiltered(all.filter(l =>
      l.food_name?.toLowerCase().includes(lower) ||
      l.business_name?.toLowerCase().includes(lower) ||
      l.category?.toLowerCase().includes(lower)
    ));
  }

  function handleSearch(q: string) { setSearch(q); applySearch(listings, q); }
  function openClaim(id: string) { setSelectedId(id); setClaimMsg(""); setClaimSuccess(false); }

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    setSigninLoading(true); setSigninError("");

    if (signinMode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email: signinEmail.trim().toLowerCase(),
        password: signinPassword,
      });
      if (error) {
        setSigninError("Invalid email or password.");
        setSigninLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email: signinEmail.trim().toLowerCase(),
        password: signinPassword,
        options: { emailRedirectTo: "https://gawaloop.com/browse" },
      });
      if (error) {
        setSigninError(error.message);
        setSigninLoading(false);
        return;
      }
      setSigninDone(true);
    }
    setSigninLoading(false);
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || isBusiness) return;
    setClaimLoading(true); setClaimMsg("");
    const res = await fetch("/api/claim-submit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId:        selectedId,
        first_name:       claimForm.first_name.trim(),
        email:            claimForm.email.trim().toLowerCase(),
        phone:            claimForm.phone.trim(),
        eta_minutes:      claimForm.eta_minutes,
        customer_user_id: user?.id || null,
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
  const isRTL = locale === "ar";
  const isSignedIn = !!user && !isBusiness;

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
            <button onClick={() => { setSigninModal(true); setSigninError(""); setSigninDone(false); }}
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
        <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 24px" }}>
          {filtered.length} {filtered.length === 1 ? "item" : "items"} available now · refreshes every 30s
        </p>

        <div style={{ position: "relative", marginBottom: "24px" }}>
          <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "16px" }}>🔍</span>
          <input style={{ ...inp, paddingLeft: "40px", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            placeholder="Search food, category..."
            value={search} onChange={e => handleSearch(e.target.value)}/>
        </div>

        {/* CHANGED: spinner while loading, friendly empty state when done */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ display: "inline-block", width: "36px", height: "36px", border: "3px solid #e5e7eb", borderTopColor: "#16a34a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ marginTop: "16px", color: "#9ca3af", fontSize: "14px" }}>Finding available food near you...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid #e5e7eb", padding: "60px 24px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <p style={{ fontSize: "48px", margin: "0 0 16px" }}>🍽️</p>
            <p style={{ fontSize: "18px", fontWeight: 800, color: "#0a2e1a", margin: "0 0 8px" }}>No food available right now</p>
            <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 20px", lineHeight: 1.6 }}>
              Listings refresh automatically every 30 seconds.<br/>Check back soon — new food gets posted daily!
            </p>
            <a href="/" style={{ background: "#16a34a", color: "#fff", padding: "10px 24px", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: 700 }}>← Back to Home</a>
          </div>
        ) : filtered.map(listing => {
          const bizInfo = bizInfoMap[listing.business_name];

          return (
            <div key={listing.id} style={{ background: "#fff", borderRadius: "20px", border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>

              {listing.image_url ? (
                <div style={{ width: "100%", height: "220px", overflow: "hidden" }}>
                  <img src={listing.image_url} alt={listing.food_name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}/>
                </div>
              ) : (
                <div style={{ width: "100%", height: "100px", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px" }}>🍽️</div>
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
                {listing.note && <p style={{ margin: "6px 0", fontSize: "13px", color: "#374151" }}>📝 {listing.note}</p>}
                <p style={{ margin: "6px 0 14px", fontSize: "13px", color: "#6b7280" }}>
                  ⏰ Expires: {new Date(listing.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>

                {isSignedIn ? (
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
                ) : (
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px", textAlign: "center" }}>
                    <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#374151", fontWeight: 600 }}>
                      🔒 Sign in to see the restaurant details & claim this food
                    </p>
                    <button onClick={() => { setSigninModal(true); setSigninError(""); setSigninDone(false); }}
                      style={{ background: "#16a34a", color: "#fff", padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>
                      Sign In — It's Free
                    </button>
                  </div>
                )}

                {isSignedIn && (
                  <button onClick={() => openClaim(listing.id)}
                    style={{ width: "100%", background: "#16a34a", color: "#fff", border: "none", padding: "14px", borderRadius: "10px", cursor: "pointer", fontSize: "15px", fontWeight: 800 }}>
                    Reserve Now — It is Free
                  </button>
                )}

                {isBusiness && (
                  <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px 16px", textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>Business accounts cannot claim food. Use a customer account to reserve.</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {!loading && filtered.length > 0 && (
          <>
            <p style={{ textAlign: "center", fontSize: "13px", color: "#9ca3af", marginTop: "24px" }}>
              Listings refresh every 30 seconds — All food is free
            </p>
            <p style={{ textAlign: "center", marginTop: "8px" }}>
              <a href="/" style={{ color: "#16a34a", fontWeight: 600, textDecoration: "none", fontSize: "14px" }}>← Back to Home</a>
            </p>
          </>
        )}
      </div>

      {/* SIGN-IN MODAL */}
      {signinModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px" }}>
          <div style={{ background: "#fff", borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "420px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
            {signinDone ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "52px", marginBottom: "16px" }}>📬</div>
                <h2 style={{ margin: "0 0 10px", fontSize: "20px", fontWeight: 800, color: "#0a2e1a" }}>Check your email!</h2>
                <p style={{ margin: "0 0 16px", fontSize: "15px", color: "#374151", lineHeight: 1.6 }}>
                  We sent a confirmation link to <b>{signinEmail}</b>
                </p>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "16px", marginBottom: "20px", textAlign: "left" }}>
                  <p style={{ margin: "0 0 8px", fontSize: "14px", color: "#166534", fontWeight: 700 }}>What to do next:</p>
                  <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#374151" }}>1. Open your email inbox</p>
                  <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#374151" }}>2. Click the confirmation link in the email from GAWA Loop</p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#374151" }}>3. You'll be brought back here and signed in automatically</p>
                </div>
                <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#9ca3af" }}>
                  Don't see it? Check your spam folder.
                </p>
                <button onClick={() => { setSigninModal(false); setSigninDone(false); }}
                  style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "10px 24px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>
                  OK, got it
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0a2e1a" }}>
                    {signinMode === "signin" ? "Sign In" : "Create Account"}
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
                    <label style={lbl}>Email *</label>
                    <input style={inp} type="email" required value={signinEmail}
                      onChange={e => setSigninEmail(e.target.value)} placeholder="you@email.com"/>
                  </div>
                  <div style={{ marginBottom: "20px" }}>
                    <label style={lbl}>Password *</label>
                    <input style={inp} type="password" required value={signinPassword}
                      onChange={e => setSigninPassword(e.target.value)} placeholder="••••••••" minLength={6}/>
                  </div>
                  <button type="submit" disabled={signinLoading}
                    style={{ width: "100%", background: signinLoading ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", padding: "13px", borderRadius: "10px", cursor: signinLoading ? "not-allowed" : "pointer", fontSize: "15px", fontWeight: 700, marginBottom: "14px" }}>
                    {signinLoading ? "..." : signinMode === "signin" ? "Sign In" : "Create Account"}
                  </button>
                  <p style={{ textAlign: "center", fontSize: "13px", color: "#6b7280", margin: 0 }}>
                    {signinMode === "signin" ? "No account?" : "Already have one?"}{" "}
                    <button type="button" onClick={() => { setSigninMode(signinMode === "signin" ? "signup" : "signin"); setSigninError(""); }}
                      style={{ background: "none", border: "none", color: "#16a34a", fontWeight: 700, cursor: "pointer", fontSize: "13px", padding: 0 }}>
                      {signinMode === "signin" ? "Create one free" : "Sign in"}
                    </button>
                  </p>
                </form>
                <p style={{ textAlign: "center", marginTop: "14px", fontSize: "12px", color: "#9ca3af" }}>
                  Business? <a href="/business/login" style={{ color: "#16a34a", fontWeight: 600, textDecoration: "none" }}>Business login →</a>
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
                <h2 style={{ margin: "0 0 8px", fontSize: "22px", fontWeight: 800, color: "#0a2e1a" }}>Reservation Confirmed!</h2>
                <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: "14px" }}>Your pickup code:</p>
                <div style={{ background: "#f0fdf4", border: "2px solid #16a34a", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
                  <p style={{ margin: 0, fontSize: "48px", fontWeight: 900, letterSpacing: "8px", color: "#0a2e1a", fontFamily: "monospace" }}>{lastCode}</p>
                </div>
                <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: "20px" }}>Check your email for details. Show this code when you arrive.</p>
                <button onClick={() => { setSelectedId(null); setClaimSuccess(false); }}
                  style={{ background: "#16a34a", color: "#fff", border: "none", padding: "12px 28px", borderRadius: "10px", cursor: "pointer", fontWeight: 700, fontSize: "15px" }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0a2e1a" }}>Reserve This Food</h2>
                  <button onClick={() => setSelectedId(null)} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#9ca3af" }}>✕</button>
                </div>
                <form onSubmit={handleClaim}>
                  {claimMsg && (
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" }}>
                      <p style={{ margin: 0, color: "#991b1b", fontSize: "13px" }}>{claimMsg}</p>
                    </div>
                  )}
                  <div style={{ marginBottom: "14px" }}>
                    <label style={lbl}>Your First Name *</label>
                    <input style={inp} required value={claimForm.first_name}
                      onChange={e => setClaimForm(f => ({ ...f, first_name: e.target.value }))}
                      placeholder="Your first name"/>
                  </div>
                  <div style={{ marginBottom: "14px" }}>
                    <label style={lbl}>Email *</label>
                    <input style={inp} type="email" required value={claimForm.email}
                      onChange={e => setClaimForm(f => ({ ...f, email: e.target.value }))}/>
                  </div>
                  <div style={{ marginBottom: "14px" }}>
                    <label style={lbl}>Phone Number *</label>
                    <input style={inp} type="tel" required value={claimForm.phone}
                      onChange={e => setClaimForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="e.g. 3478015325"/>
                    <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#9ca3af" }}>So the business can contact you if needed</p>
                  </div>
                  <div style={{ marginBottom: "20px" }}>
                    <label style={lbl}>Your Arrival Time</label>
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
                    {claimLoading ? "..." : "Reserve Now — It is Free"}
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
