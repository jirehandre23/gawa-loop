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
  id: string; food_name: string; category: string; quantity: string;
  address: string; allergy_note: string; estimated_value: number;
  note: string; status: string; expires_at: string; business_name: string;
  maps_url: string; claim_hold_minutes: number; image_url?: string; weight_kg?: number;
};

export default function BrowsePage() {
  const [locale, setLocale]       = useState<Locale>("en");
  const [listings, setListings]   = useState<Listing[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [custUser, setCustUser]   = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [claimingId, setClaimingId]   = useState<string | null>(null);
  const [claimForm, setClaimForm] = useState({
    first_name: "", email: "", phone: "", eta_minutes: "15",
  });
  const [submitting, setSubmitting] = useState(false);
  const [claimResult, setClaimResult] = useState<{ code: string; food: string } | null>(null);
  const [claimError, setClaimError]   = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setLocale(detectLocale()); }, []);

  // Check if customer is signed in
  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data: { user } }) => { setCustUser(user); setAuthLoading(false); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCustUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadListings() {
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("status", "AVAILABLE")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    setListings(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadListings();
    intervalRef.current = setInterval(loadListings, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  async function handleClaim(listing: Listing) {
    if (!custUser) {
      window.location.href = "/customer/signup";
      return;
    }
    setClaimingId(listing.id);
    setClaimError("");

    // Pre-fill email from auth user
    const { data: profile } = await supabase
      .from("customer_profiles")
      .select("first_name, email, phone")
      .eq("user_id", custUser.id)
      .single();

    if (profile) {
      setClaimForm(f => ({
        ...f,
        first_name: profile.first_name || "",
        email: profile.email || custUser.email || "",
        phone: profile.phone || "",
      }));
    } else {
      setClaimForm(f => ({ ...f, email: custUser.email || "" }));
    }
  }

  async function submitClaim(listing: Listing) {
    setSubmitting(true);
    setClaimError("");
    const res = await fetch("/api/claim-submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listing_id:   listing.id,
        first_name:   claimForm.first_name,
        email:        claimForm.email,
        phone:        claimForm.phone || null,
        eta_minutes:  Number(claimForm.eta_minutes),
        customer_user_id: custUser?.id || null,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setClaimResult({ code: data.code, food: listing.food_name });
      setClaimingId(null);
      loadListings();
    } else {
      setClaimError(data.error || "Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  const T = t[locale];
  const isRTL = locale === "ar";

  const filtered = listings.filter(l =>
    !search ||
    l.food_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.category?.toLowerCase().includes(search.toLowerCase())
  );

  const enc = (addr: string) => encodeURIComponent(addr || "");

  return (
    <div dir={isRTL ? "rtl" : "ltr"}
      style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* Claim success modal */}
      {claimResult && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ background: "#fff", borderRadius: "20px", padding: "40px 32px", maxWidth: "420px", width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: "56px", marginBottom: "12px" }}>🎉</div>
            <h2 style={{ margin: "0 0 8px", fontSize: "22px", fontWeight: 800, color: "#0a2e1a" }}>Reserved!</h2>
            <p style={{ margin: "0 0 20px", fontSize: "15px", color: "#6b7280" }}>
              {claimResult.food} has been reserved for you.
            </p>
            <div style={{ background: "#f0fdf4", border: "2px solid #16a34a", borderRadius: "14px", padding: "20px", marginBottom: "20px" }}>
              <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#6b7280", fontWeight: 600 }}>YOUR PICKUP CODE</p>
              <p style={{ margin: 0, fontSize: "52px", fontWeight: 900, color: "#16a34a", letterSpacing: "8px", lineHeight: 1 }}>
                {claimResult.code}
              </p>
              <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#9ca3af" }}>Check your email for full details</p>
            </div>
            <button onClick={() => setClaimResult(null)}
              style={{ width: "100%", background: "#16a34a", color: "#fff", border: "none", padding: "13px", borderRadius: "10px", cursor: "pointer", fontSize: "15px", fontWeight: 700 }}>
              Browse More Food
            </button>
          </div>
        </div>
      )}

      {/* Claim form modal */}
      {claimingId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ background: "#fff", borderRadius: "20px", padding: "32px", maxWidth: "440px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0a2e1a" }}>{T.claim_title}</h2>
              <button onClick={() => { setClaimingId(null); setClaimError(""); }} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#9ca3af" }}>✕</button>
            </div>
            {claimError && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", color: "#991b1b", fontSize: "13px" }}>
                {claimError}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                  {T.claim_name} *
                </label>
                <input
                  style={{ width: "100%", padding: "11px 14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", outline: "none", boxSizing: "border-box", background: "#fff", color: "#111827" }}
                  required value={claimForm.first_name}
                  onChange={e => setClaimForm(f => ({ ...f, first_name: e.target.value }))}
                  placeholder="Your first name"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                  {T.claim_email} *
                </label>
                <input
                  style={{ width: "100%", padding: "11px 14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", outline: "none", boxSizing: "border-box", background: "#fff", color: "#111827" }}
                  type="email" required value={claimForm.email}
                  onChange={e => setClaimForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                  {T.claim_phone}
                </label>
                <input
                  style={{ width: "100%", padding: "11px 14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", outline: "none", boxSizing: "border-box", background: "#fff", color: "#111827" }}
                  type="tel" value={claimForm.phone}
                  onChange={e => setClaimForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                  {T.claim_eta}
                </label>
                <select
                  style={{ width: "100%", padding: "11px 14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", outline: "none", boxSizing: "border-box", background: "#fff", color: "#111827", cursor: "pointer" }}
                  value={claimForm.eta_minutes}
                  onChange={e => setClaimForm(f => ({ ...f, eta_minutes: e.target.value }))}>
                  <option value="5">5 minutes</option>
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="20">20 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                </select>
              </div>
            </div>
            <button
              onClick={() => {
                const listing = listings.find(l => l.id === claimingId);
                if (listing && claimForm.first_name && claimForm.email) {
                  submitClaim(listing);
                } else {
                  setClaimError("Please fill in your name and email.");
                }
              }}
              disabled={submitting}
              style={{ marginTop: "20px", width: "100%", background: submitting ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", padding: "13px", borderRadius: "10px", cursor: submitting ? "not-allowed" : "pointer", fontSize: "15px", fontWeight: 700 }}>
              {submitting ? "Reserving..." : T.claim_btn}
            </button>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav style={{ background: "#0a2e1a", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", position: "sticky", top: 0, zIndex: 50 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width: "32px", height: "32px", objectFit: "contain" }}/>
          <span style={{ fontWeight: 800, fontSize: "16px", color: "#fff" }}>GAWA Loop</span>
        </a>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <LanguageSwitcher/>
          {!authLoading && (
            custUser ? (
              <a href="/customer/profile"
                style={{ color: "#fff", fontSize: "13px", fontWeight: 700, textDecoration: "none", background: "rgba(255,255,255,0.15)", padding: "7px 14px", borderRadius: "8px" }}>
                👤 My Profile
              </a>
            ) : (
              <a href="/customer/signup"
                style={{ color: "#fff", fontSize: "13px", fontWeight: 700, textDecoration: "none", background: "rgba(255,255,255,0.15)", padding: "7px 14px", borderRadius: "8px" }}>
                Sign In / Join Free
              </a>
            )
          )}
          <a href="/business/login"
            style={{ color: "#4ade80", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
            {T.login}
          </a>
        </div>
      </nav>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "28px 16px" }}>

        {/* Page title */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ margin: "0 0 6px", fontSize: "26px", fontWeight: 800, color: "#0a2e1a" }}>{T.browse}</h1>
          <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>
            {filtered.length} {filtered.length === 1 ? "item" : "items"} available now · refreshes every 30s
          </p>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: "24px" }}>
          <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "16px" }}>🔍</span>
          <input
            style={{ width: "100%", padding: "12px 14px 12px 42px", borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "14px", outline: "none", background: "#fff", color: "#111827", boxSizing: "border-box", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
            placeholder={T.search_placeholder || "Search food, restaurant, category..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Not signed in banner */}
        {!authLoading && !custUser && (
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "14px 18px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: "14px", color: "#1d4ed8", fontWeight: 600 }}>
              🔒 Sign in to see addresses and claim food for free
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <a href="/customer/signup"
                style={{ background: "#2563eb", color: "#fff", fontWeight: 700, fontSize: "13px", padding: "8px 16px", borderRadius: "8px", textDecoration: "none" }}>
                Join Free
              </a>
              <a href="/customer/login"
                style={{ background: "#fff", color: "#2563eb", fontWeight: 700, fontSize: "13px", padding: "8px 16px", borderRadius: "8px", textDecoration: "none", border: "1px solid #bfdbfe" }}>
                Sign In
              </a>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ color: "#6b7280", fontSize: "15px" }}>Loading available food...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 24px", background: "#fff", borderRadius: "16px", border: "1px solid #e5e7eb" }}>
            <p style={{ fontSize: "48px", margin: "0 0 12px" }}>🍽️</p>
            <h3 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: 800, color: "#0a2e1a" }}>
              {search ? "No results found" : T.no_listings}
            </h3>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
              {search ? "Try a different search term" : T.no_listings_sub}
            </p>
          </div>
        )}

        {/* Listings */}
        {!loading && filtered.map(listing => {
          const addr    = listing.address || "";
          const googleM = listing.maps_url || `https://www.google.com/maps/search/?api=1&query=${enc(addr)}`;
          const appleM  = `https://maps.apple.com/?q=${enc(addr)}`;
          const waze    = `https://waze.com/ul?q=${enc(addr)}`;

          return (
            <div key={listing.id}
              style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "24px", marginBottom: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", transition: "box-shadow 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)")}>

              <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                {/* Food image or emoji */}
                <div style={{ width: "72px", height: "72px", borderRadius: "12px", overflow: "hidden", flexShrink: 0, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px" }}>
                  {listing.image_url
                    ? <img src={listing.image_url} alt={listing.food_name} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                    : "🍽️"
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
                    <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0a2e1a", lineHeight: 1.3 }}>
                      {listing.food_name || "Food Available"}
                    </h2>
                    <span style={{ background: "#f0fdf4", color: "#16a34a", fontSize: "12px", fontWeight: 700, padding: "4px 10px", borderRadius: "20px", flexShrink: 0, border: "1px solid #bbf7d0" }}>
                      FREE
                    </span>
                  </div>

                  {/* Business name — always visible */}
                  <p style={{ margin: "0 0 4px", fontSize: "14px", color: "#374151", fontWeight: 600 }}>
                    🏪 {listing.business_name || "Local Business"}
                  </p>

                  {/* Category + quantity */}
                  <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#6b7280" }}>
                    {listing.category} · {listing.quantity}
                    {listing.weight_kg && listing.weight_kg > 0 ? ` · ${listing.weight_kg}kg` : ""}
                  </p>

                  {listing.allergy_note && (
                    <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#92400e", background: "#fffbeb", padding: "5px 10px", borderRadius: "6px", display: "inline-block" }}>
                      ⚠️ {listing.allergy_note}
                    </p>
                  )}
                  {listing.note && (
                    <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#6b7280" }}>📝 {listing.note}</p>
                  )}

                  <p style={{ margin: "0 0 12px", fontSize: "12px", color: "#9ca3af" }}>
                    ⏰ Expires: {listing.expires_at ? new Date(listing.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </p>

                  {/* ADDRESS — only for signed in users */}
                  {custUser ? (
                    <div style={{ marginBottom: "12px" }}>
                      <p style={{ margin: "0 0 6px", fontSize: "14px", color: "#374151" }}>
                        <b>📍 {T.address}:</b> {listing.address || "Address not provided"}
                      </p>
                      {listing.address && (
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <a href={googleM} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: "12px", fontWeight: 600, color: "#374151", background: "#f3f4f6", border: "1px solid #e5e7eb", padding: "5px 10px", borderRadius: "6px", textDecoration: "none" }}>
                            🗺️ Google Maps
                          </a>
                          <a href={appleM} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: "12px", fontWeight: 600, color: "#374151", background: "#f3f4f6", border: "1px solid #e5e7eb", padding: "5px 10px", borderRadius: "6px", textDecoration: "none" }}>
                            🍎 Apple Maps
                          </a>
                          <a href={waze} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: "12px", fontWeight: 600, color: "#374151", background: "#f3f4f6", border: "1px solid #e5e7eb", padding: "5px 10px", borderRadius: "6px", textDecoration: "none" }}>
                            🔵 Waze
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ marginBottom: "12px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px 14px" }}>
                      <p style={{ margin: 0, fontSize: "13px", color: "#9ca3af" }}>
                        🔒 Sign in to see the address and directions
                      </p>
                    </div>
                  )}

                  {/* CLAIM BUTTON — only for signed in users */}
                  {custUser ? (
                    <button onClick={() => handleClaim(listing)}
                      style={{ width: "100%", background: "#16a34a", color: "#fff", border: "none", padding: "13px 24px", borderRadius: "10px", cursor: "pointer", fontSize: "15px", fontWeight: 700, boxShadow: "0 4px 12px rgba(22,163,74,0.3)" }}>
                      {T.claim_btn}
                    </button>
                  ) : (
                    <a href="/customer/signup"
                      style={{ display: "block", textAlign: "center", background: "#f0fdf4", color: "#16a34a", border: "2px solid #16a34a", padding: "13px 24px", borderRadius: "10px", fontSize: "15px", fontWeight: 700, textDecoration: "none" }}>
                      🔒 Sign in to claim this food
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Footer note */}
        <div style={{ textAlign: "center", paddingTop: "32px", paddingBottom: "16px" }}>
          <p style={{ fontSize: "13px", color: "#9ca3af" }}>
            {T.browse_footer || "Listings refresh every 30 seconds · All food is free"}
          </p>
          <a href="/" style={{ fontSize: "13px", color: "#16a34a", textDecoration: "none", fontWeight: 600 }}>
            ← {T.back_home || "Back to Home"}
          </a>
        </div>
      </div>
    </div>
  );
}

