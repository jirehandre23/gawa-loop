"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_EMAIL = "admin@gawaloop.com";

const TERMINAL = ["PICKED_UP", "EXPIRED", "CANCELLED"];

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  AVAILABLE: { bg: "#16a34a", text: "#fff" },
  RESERVED: { bg: "#2563eb", text: "#fff" },
  PICKED_UP: { bg: "#7c3aed", text: "#fff" },
  EXPIRED: { bg: "#9ca3af", text: "#fff" },
  CANCELLED: { bg: "#ef4444", text: "#fff" },
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

const EMPTY_FORM = {
  food_name: "",
  category: "Food",
  quantity: "",
  allergy_note: "",
  estimated_value: "",
  note: "",
  active_hours: "1",
  claim_hold: "10",
};

export default function BusinessDashboard() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [businessName, setBusiness] = useState<string | null>(null);
  const [businessAddress, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminView, setAdminView] = useState<string | null>(null);
  const [allBizNames, setAllBizNames] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [posting, setPosting] = useState(false);
  const [postMsg, setPostMsg] = useState("");

  async function loadDashboard(adminTarget?: string | null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/business/login";
      return;
    }

    const email = user.email || "";
    const admin = email === ADMIN_EMAIL;
    setIsAdmin(admin);

    if (admin) {
      const { data } = await supabase
        .from("listings")
        .select("business_name")
        .order("business_name");

      const unique = [...new Set(
        (data || []).map((b: any) => b.business_name).filter(Boolean)
      )] as string[];

      setAllBizNames(unique);
    }

    const { data: biz } = await supabase
      .from("businesses")
      .select("name, address")
      .eq("email", email)
      .single();

    const bName = admin
      ? (adminTarget ?? (allBizNames.length ? allBizNames[0] : null))
      : (biz?.name ?? null);

    setBusiness(bName);
    setAddress(biz?.address || "");

    if (bName) {
      const { data } = await supabase
        .from("listings")
        .select("*, claims(*)")
        .eq("business_name", bName)
        .order("created_at", { ascending: false });

      setListings(data || []);
    } else if (!admin) {
      setListings([]);
    }

    setLoading(false);
  }

  useEffect(() => { loadDashboard(adminView); }, [adminView]);

  async function handlePickedUp(id: string) {
    await supabase.from("listings").update({ status: "PICKED_UP" }).eq("id", id);
    setListings(prev => prev.map(l => l.id === id ? { ...l, status: "PICKED_UP" } : l));
  }

  async function handleCancelReservation(id: string) {
    await supabase.from("listings")
      .update({ status: "AVAILABLE", reserved_until: null, claim_code: null })
      .eq("id", id);

    setListings(prev =>
      prev.map(l =>
        l.id === id
          ? { ...l, status: "AVAILABLE", reserved_until: null as any, claim_code: null as any }
          : l
      )
    );
  }

  // ✅ UPDATED FUNCTION
  async function handleCancelListing(id: string) {
    if (!confirm("Cancel this listing? Customers will be notified by email.")) return;

    const res = await fetch("/api/cancel-listing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId: id }),
    });

    const data = await res.json();

    if (data.success) {
      setListings(prev =>
        prev.map(l =>
          l.id === id ? { ...l, status: "CANCELLED" } : l
        )
      );

      if (data.notified > 0) {
        alert(`Listing cancelled. ${data.notified} customer(s) notified by email.`);
      }
    }
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!businessName) return;

    setPosting(true);
    setPostMsg("");

    const expiresAt = new Date(
      Date.now() + Number(form.active_hours) * 60 * 60 * 1000
    ).toISOString();

    const { error } = await supabase.from("listings").insert({
      business_name: businessName,
      address: businessAddress,
      food_name: form.food_name,
      category: form.category,
      quantity: form.quantity,
      allergy_note: form.allergy_note || null,
      estimated_value: form.estimated_value
        ? Number(form.estimated_value)
        : null,
      note: form.note || null,
      status: "AVAILABLE",
      expires_at: expiresAt,
      claim_hold_minutes: Number(form.claim_hold),
    });

    if (error) {
      setPostMsg("Error posting. Please try again.");
    } else {
      setPostMsg("Food posted successfully! ✅");
      setForm(EMPTY_FORM);
      setShowForm(false);
      loadDashboard(adminView);
    }

    setPosting(false);
  }

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Business Dashboard</h1>

      <button onClick={() => setShowForm(true)}>+ New Listing</button>

      {listings.map(listing => (
        <div key={listing.id} style={{ marginTop: 20, border: "1px solid #ddd", padding: 12 }}>
          <h3>{listing.food_name}</h3>
          <p>Status: {listing.status}</p>

          {listing.status !== "CANCELLED" && (
            <button onClick={() => handleCancelListing(listing.id)}>
              Cancel Listing
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
