"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Order = {
  id: string;
  food_name: string;
  business_name: string;
  address: string;
  listing_status: string;
  image_url?: string;
  claim_id: string;
  claim_status: string;
  confirmation_code: string;
  first_name: string;
  email: string;
  created_at: string;
  expires_at: string;
  reserved_until: string;
  noshow: boolean;
};

function copyToClipboard(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  });
}

export default function CustomerProfile() {
  const [user, setUser]       = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<"active" | "history">("active");
  const [copied, setCopied]   = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/"; return; }

      // If this email belongs to a business, redirect to business dashboard
      const { data: biz } = await supabase
        .from("businesses")
        .select("id")
        .eq("email", user.email || "")
        .single();
      if (biz) { window.location.href = "/business/dashboard"; return; }

      setUser(user);

      const { data: prof } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setProfile(prof);

      // Load orders: join claims with listings, filter by this user's email
      const { data: claims } = await supabase
        .from("claims")
        .select(`
          id, status, confirmation_code, first_name, email,
          created_at, noshow,
          listings (
            id, food_name, business_name, address, status,
            image_url, expires_at, reserved_until
          )
        `)
        .eq("email", user.email || "")
        .order("created_at", { ascending: false });

      // Map and filter: only show claims with valid listing data
      const mapped: Order[] = (claims || [])
        .filter((c: any) => c.listings)
        .map((c: any) => ({
          id: c.listings.id,
          food_name: c.listings.food_name,
          business_name: c.listings.business_name,
          address: c.listings.address,
          listing_status: c.listings.status,
          image_url: c.listings.image_url,
          expires_at: c.listings.expires_at,
          reserved_until: c.listings.reserved_until,
          claim_id: c.id,
          claim_status: c.status,
          confirmation_code: c.confirmation_code,
          first_name: c.first_name,
          email: c.email,
          created_at: c.created_at,
          noshow: c.noshow,
        }));

      setOrders(mapped);
      setLoading(false);
    })();
  }, []);

  function handleCopy(code: string) {
    copyToClipboard(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  // Active: claim status is "active" AND listing is RESERVED
  const activeOrders = orders.filter(
    o => o.claim_status === "active" && o.listing_status === "RESERVED"
  );

  // History: everything else that has a terminal state
  const historyOrders = orders.filter(
    o => !(o.claim_status === "active" && o.listing_status === "RESERVED")
  );

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#6b7280" }}>Loading profile...</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", padding: "24px 16px" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#0a2e1a" }}>My Account</h1>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#6b7280" }}>{user?.email}</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <a href="/browse" style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "8px 14px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 600 }}>🍽️ Browse</a>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
              style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
              Sign Out
            </button>
          </div>
        </div>

        {/* ACTIVE RESERVATIONS */}
        {activeOrders.length > 0 && (
          <div style={{ marginBottom: "28px" }}>
            <h2 style={{ margin: "0 0 14px", fontSize: "17px", fontWeight: 800, color: "#0a2e1a" }}>
              🟢 Active Reservations ({activeOrders.length})
            </h2>
            {activeOrders.map(order => {
              const maps  = encodeURIComponent(order.address);
              const expiry = order.reserved_until ? new Date(order.reserved_until) : null;
              const minutesLeft = expiry ? Math.max(0, Math.round((expiry.getTime() - Date.now()) / 60000)) : null;
              return (
                <div key={order.claim_id} style={{ background: "#fff", border: "2px solid #16a34a", borderRadius: "16px", padding: "24px", marginBottom: "16px", boxShadow: "0 2px 12px rgba(22,163,74,0.08)" }}>
                  <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", marginBottom: "16px" }}>
                    {order.image_url && <img src={order.image_url} alt={order.food_name} style={{ width: "64px", height: "64px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }}/>}
                    <div>
                      <h3 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 800, color: "#0a2e1a" }}>{order.food_name}</h3>
                      <p style={{ margin: 0, fontSize: "14px", color: "#374151", fontWeight: 600 }}>{order.business_name}</p>
                      <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#6b7280" }}>{order.address}</p>
                    </div>
                  </div>

                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "16px 20px", marginBottom: "16px" }}>
                    <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.6px" }}>Your Pickup Code</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "52px", fontWeight: 900, color: "#0a2e1a", letterSpacing: "6px", lineHeight: 1 }}>
                        {order.confirmation_code}
                      </span>
                      <button onClick={() => handleCopy(order.confirmation_code)}
                        style={{ background: copied === order.confirmation_code ? "#16a34a" : "#0a2e1a", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "14px", flexShrink: 0 }}>
                        {copied === order.confirmation_code ? "✅ Copied!" : "Copy Code"}
                      </button>
                    </div>
                    <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#374151" }}>Show this code to the restaurant when you arrive.</p>
                  </div>

                  {minutesLeft !== null && (
                    <p style={{ margin: "0 0 14px", fontSize: "13px", color: minutesLeft < 10 ? "#ef4444" : "#6b7280", fontWeight: minutesLeft < 10 ? 700 : 400 }}>
                      ⏰ {minutesLeft > 0 ? `${minutesLeft} min left to pick up` : "Reservation window has passed"}
                    </p>
                  )}

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <a href={`https://maps.google.com/?q=${maps}`} target="_blank" rel="noreferrer"
                      style={{ background: "#4285f4", color: "#fff", padding: "8px 14px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 600 }}>🗺️ Google Maps</a>
                    <a href={`https://maps.apple.com/?q=${maps}`} target="_blank" rel="noreferrer"
                      style={{ background: "#111", color: "#fff", padding: "8px 14px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 600 }}>🍎 Apple Maps</a>
                    <a href={`https://waze.com/ul?q=${maps}`} target="_blank" rel="noreferrer"
                      style={{ background: "#33ccff", color: "#000", padding: "8px 14px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 600 }}>🚗 Waze</a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TABS */}
        <div style={{ display: "flex", gap: "4px", background: "#fff", borderRadius: "12px", padding: "4px", border: "1px solid #e5e7eb", marginBottom: "20px" }}>
          {[
            { key: "active",  label: `🟢 Active (${activeOrders.length})` },
            { key: "history", label: `📁 Order History (${historyOrders.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as "active" | "history")}
              style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 700, background: tab === t.key ? "#0a2e1a" : "transparent", color: tab === t.key ? "#fff" : "#374151" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ACTIVE TAB — no active orders */}
        {tab === "active" && activeOrders.length === 0 && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "40px", textAlign: "center" }}>
            <p style={{ color: "#6b7280", marginBottom: "16px" }}>No active reservations right now.</p>
            <a href="/browse" style={{ background: "#16a34a", color: "#fff", padding: "12px 24px", borderRadius: "8px", textDecoration: "none", fontWeight: 600 }}>Browse Food</a>
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === "history" && (
          <>
            {historyOrders.length === 0 ? (
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "40px", textAlign: "center" }}>
                <p style={{ color: "#6b7280" }}>No past orders yet.</p>
              </div>
            ) : historyOrders.map(order => {
              const isPickedUp  = order.listing_status === "PICKED_UP";
              const isCancelled = order.claim_status === "cancelled" || order.listing_status === "CANCELLED";
              const isNoshow    = order.noshow;
              const isExpired   = order.listing_status === "EXPIRED";

              const badge = isPickedUp  ? { bg: "#7c3aed", text: "#fff", label: "Picked Up" }
                          : isNoshow    ? { bg: "#f59e0b", text: "#fff", label: "No-Show" }
                          : isCancelled ? { bg: "#ef4444", text: "#fff", label: "Cancelled" }
                          : isExpired   ? { bg: "#9ca3af", text: "#fff", label: "Expired" }
                          : { bg: "#6b7280", text: "#fff", label: order.listing_status };
              return (
                <div key={order.claim_id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "20px", marginBottom: "12px", opacity: 0.85 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                      {order.image_url && <img src={order.image_url} alt={order.food_name} style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}/>}
                      <div>
                        <p style={{ margin: "0 0 2px", fontSize: "16px", fontWeight: 700, color: "#0a2e1a" }}>{order.food_name}</p>
                        <p style={{ margin: "0 0 2px", fontSize: "13px", color: "#374151" }}>{order.business_name}</p>
                        <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span style={{ background: badge.bg, color: badge.text, fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "16px", flexShrink: 0 }}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </>
        )}

      </div>
    </div>
  );
}
