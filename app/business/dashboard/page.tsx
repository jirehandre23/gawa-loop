"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Admin emails that can view any business dashboard
const ADMIN_EMAILS = ["jirehandre121@gmail.com", "liamlunkamba12@gmail.com"];

// Statuses where no action buttons should show
const TERMINAL_STATUSES = ["PICKED_UP", "EXPIRED", "CANCELLED"];

type Listing = {
  id: string;
  food_name: string;
  category: string;
  quantity: string;
  address: string;
  allergy_note: string;
  estimated_value: number;
  note: string;
  status: string;
  expires_at: string;
  created_at: string;
  reserved_until: string;
  claim_code: string;
  claims?: Claim[];
};

type Claim = {
  id: string;
  first_name: string;
  email: string;
  phone: string;
  eta_minutes: number;
  confirmation_code: string;
  reserved_until: string;
  status: string;
};

export default function BusinessDashboard() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminView, setAdminView] = useState<string | null>(null);
  const [allBusinesses, setAllBusinesses] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/business/login"; return; }

      const email = user.email || "";
      setUserEmail(email);

      const admin = ADMIN_EMAILS.includes(email);
      setIsAdmin(admin);

      if (admin) {
        // Load list of all businesses for admin switcher
        const { data: allBiz } = await supabase
          .from("listings")
          .select("business_name")
          .order("business_name");
        const unique = [...new Set((allBiz || []).map((b: any) => b.business_name).filter(Boolean))];
        setAllBusinesses(unique);
      }

      // Find the business for this user (or admin-selected business)
      const { data: bizData } = await supabase
        .from("businesses")
        .select("name")
        .eq("email", email)
        .single();

      const bName = adminView || bizData?.name || null;
      setBusinessName(bName);

      if (!bName && !admin) {
        setLoading(false);
        return;
      }

      if (bName) {
        const { data: listingData } = await supabase
          .from("listings")
          .select("*, claims(*)")
          .eq("business_name", bName)
          .order("created_at", { ascending: false });
        setListings(listingData || []);
      }

      setLoading(false);
    }
    load();
  }, [adminView]);

  async function handleMarkPickedUp(listingId: string) {
    await supabase.from("listings").update({ status: "PICKED_UP" }).eq("id", listingId);
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, status: "PICKED_UP" } : l));
  }

  async function handleCancelReservation(listingId: string) {
    await supabase.from("listings").update({ status: "AVAILABLE", reserved_until: null, claim_code: null }).eq("id", listingId);
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, status: "AVAILABLE", reserved_until: null as any, claim_code: null as any } : l));
  }

  async function handleCancelListing(listingId: string) {
    if (!confirm("Cancel this listing? It will be removed from the browse page.")) return;
    await supabase.from("listings").update({ status: "CANCELLED" }).eq("id", listingId);
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, status: "CANCELLED" } : l));
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding: "32px 16px" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width: "40px", height: "40px", objectFit: "contain" }} />
            <div>
              <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#0a2e1a" }}>Business Dashboard</h1>
              <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                {businessName || "No business found"}
                {isAdmin && <span style={{ marginLeft: "8px", background: "#dcfce7", color: "#166534", fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px" }}>ADMIN</span>}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {/* Admin business switcher */}
            {isAdmin && allBusinesses.length > 0 && (
              <select
                value={adminView || ""}
                onChange={e => setAdminView(e.target.value || null)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "14px", background: "#fff", cursor: "pointer" }}
              >
                <option value="">My account</option>
                {allBusinesses.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            )}
            <a href="/business/new-listing" style={{ background: "#16a34a", color: "#fff", padding: "10px 18px", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: 600 }}>
              + New Listing
            </a>
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/business/login"; }}
              style={{ background: "#f3f4f6", color: "#374151", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* No business found */}
        {!businessName && !isAdmin && (
          <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: "12px", padding: "20px 24px" }}>
            <p style={{ margin: 0, color: "#856404" }}>No business found for this account. Please contact support at jireh@gawaloop.com</p>
          </div>
        )}

        {/* Listings */}
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0a2e1a", marginBottom: "16px" }}>Your Listings</h2>

        {listings.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "40px", textAlign: "center" }}>
            <p style={{ color: "#6b7280", marginBottom: "16px" }}>No listings yet.</p>
            <a href="/business/new-listing" style={{ background: "#16a34a", color: "#fff", padding: "12px 24px", borderRadius: "8px", textDecoration: "none", fontWeight: 600 }}>
              Post Your First Listing
            </a>
          </div>
        ) : (
          listings.map(listing => {
            const isTerminal = TERMINAL_STATUSES.includes(listing.status);
            const isReserved = listing.status === "RESERVED";
            const isAvailable = listing.status === "AVAILABLE";

            // Active claim for reserved listings
            const activeClaim = listing.claims?.find(c => c.status === "active");

            const statusColor: Record<string, string> = {
              AVAILABLE: "#16a34a",
              RESERVED: "#2563eb",
              PICKED_UP: "#7c3aed",
              EXPIRED: "#9ca3af",
              CANCELLED: "#ef4444",
            };

            return (
              <div key={listing.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "24px", marginBottom: "16px", opacity: isTerminal ? 0.75 : 1 }}>

                {/* Food name + status badge */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0a2e1a" }}>{listing.food_name || "Unnamed"}</h3>
                  <span style={{ background: statusColor[listing.status] || "#6b7280", color: "#fff", fontSize: "12px", fontWeight: 700, padding: "4px 12px", borderRadius: "20px" }}>
                    {listing.status}
                  </span>
                </div>

                {/* Details */}
                <div style={{ fontSize: "14px", color: "#374151", lineHeight: "1.8" }}>
                  <p style={{ margin: "2px 0" }}><b>Category:</b> {listing.category || "N/A"}</p>
                  <p style={{ margin: "2px 0" }}><b>Quantity:</b> {listing.quantity || "N/A"}</p>
                  <p style={{ margin: "2px 0" }}><b>Address:</b> {listing.address || "N/A"}</p>
                  <p style={{ margin: "2px 0" }}><b>Allergy note:</b> {listing.allergy_note || "None"}</p>
                  <p style={{ margin: "2px 0" }}><b>Estimated value:</b> ${Number(listing.estimated_value || 0).toFixed(2)}</p>
                  <p style={{ margin: "2px 0" }}><b>Note:</b> {listing.note || "None"}</p>
                  <p style={{ margin: "2px 0" }}><b>Expires:</b> {listing.expires_at ? new Date(listing.expires_at).toLocaleString() : "N/A"}</p>
                  <p style={{ margin: "2px 0" }}><b>Posted:</b> {new Date(listing.created_at).toLocaleString()}</p>
                </div>

                {/* Reserved customer details */}
                {isReserved && activeClaim && (
                  <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "16px 20px", marginTop: "16px" }}>
                    <p style={{ margin: "0 0 10px", fontWeight: 700, color: "#1d4ed8", fontSize: "14px" }}>Reserved Customer Details</p>
                    <p style={{ margin: "2px 0", fontSize: "14px" }}><b>Name:</b> {activeClaim.first_name}</p>
                    <p style={{ margin: "2px 0", fontSize: "14px" }}><b>Email:</b> {activeClaim.email}</p>
                    <p style={{ margin: "2px 0", fontSize: "14px" }}><b>Phone:</b> {activeClaim.phone || "Not provided"}</p>
                    <p style={{ margin: "2px 0", fontSize: "14px" }}><b>ETA:</b> {activeClaim.eta_minutes} minutes</p>
                    <p style={{ margin: "2px 0", fontSize: "14px" }}><b>Client code:</b> {activeClaim.confirmation_code}</p>
                    <p style={{ margin: "2px 0", fontSize: "14px" }}><b>Reserved until:</b> {activeClaim.reserved_until ? new Date(activeClaim.reserved_until).toLocaleString() : "N/A"}</p>
                  </div>
                )}

                {/* Action buttons — ONLY shown when NOT terminal status */}
                {!isTerminal && (
                  <div style={{ display: "flex", gap: "10px", marginTop: "20px", flexWrap: "wrap" }}>
                    {isReserved && (
                      <button
                        onClick={() => handleMarkPickedUp(listing.id)}
                        style={{ background: "#16a34a", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "14px" }}
                      >
                        Mark Picked Up
                      </button>
                    )}
                    {isReserved && (
                      <button
                        onClick={() => handleCancelReservation(listing.id)}
                        style={{ background: "#f59e0b", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "14px" }}
                      >
                        Cancel Reservation
                      </button>
                    )}
                    {(isAvailable || isReserved) && (
                      <button
                        onClick={() => handleCancelListing(listing.id)}
                        style={{ background: "#ef4444", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "14px" }}
                      >
                        Cancel Listing
                      </button>
                    )}
                  </div>
                )}

                {/* Show a label for terminal statuses instead of buttons */}
                {isTerminal && (
                  <p style={{ marginTop: "16px", fontSize: "13px", color: "#9ca3af", fontStyle: "italic" }}>
                    {listing.status === "PICKED_UP" && "✅ This food was picked up successfully."}
                    {listing.status === "EXPIRED" && "⏰ This listing has expired."}
                    {listing.status === "CANCELLED" && "❌ This listing was cancelled."}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
