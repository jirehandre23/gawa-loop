"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Business = {
  id?: string;
  name: string;
  email?: string | null;
  address?: string | null;
  phone?: string | null;
};

type Claim = {
  id: string;
  listing_id: string;
  first_name?: string | null;
  email?: string | null;
  phone?: string | null;
  eta_minutes?: number | null;
  confirmation_code?: string | null;
  created_at?: string | null;
};

type Listing = {
  id: string;
  business_name?: string | null;
  food_name?: string | null;
  address?: string | null;
  category?: string | null;
  quantity?: string | null;
  allergy_note?: string | null;
  estimated_value?: number | null;
  note?: string | null;
  status?: string | null;
  expires_at?: string | null;
  reserved_until?: string | null;
  claim_hold_minutes?: number | null;
  claim_code?: string | null;
  created_at?: string | null;
  claim?: Claim | null;
};

type FormState = {
  food_name: string;
  address: string;
  category: string;
  quantity: string;
  allergy_note: string;
  estimated_value: string;
  note: string;
  active_duration: string;
  claim_hold_minutes: string;
};

const EMPTY_FORM: FormState = {
  food_name: "",
  address: "",
  category: "Food",
  quantity: "",
  allergy_note: "",
  estimated_value: "",
  note: "",
  active_duration: "30m",
  claim_hold_minutes: "10",
};

const ACTIVE_OPTIONS = [
  { label: "30 minutes", value: "30m" },
  { label: "1 hour", value: "1h" },
  { label: "2 hours", value: "2h" },
  { label: "4 hours", value: "4h" },
  { label: "8 hours", value: "8h" },
  { label: "12 hours", value: "12h" },
  { label: "1 day", value: "1d" },
  { label: "2 days", value: "2d" },
  { label: "3 days", value: "3d" },
  { label: "1 week", value: "7d" },
];

const HOLD_OPTIONS = [
  { label: "10 minutes", value: "10" },
  { label: "15 minutes", value: "15" },
  { label: "20 minutes", value: "20" },
  { label: "30 minutes", value: "30" },
  { label: "45 minutes", value: "45" },
  { label: "60 minutes", value: "60" },
];

function formatDateTime(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function getExpiresAtFromDuration(duration: string) {
  const now = new Date();

  switch (duration) {
    case "30m":
      now.setMinutes(now.getMinutes() + 30);
      break;
    case "1h":
      now.setHours(now.getHours() + 1);
      break;
    case "2h":
      now.setHours(now.getHours() + 2);
      break;
    case "4h":
      now.setHours(now.getHours() + 4);
      break;
    case "8h":
      now.setHours(now.getHours() + 8);
      break;
    case "12h":
      now.setHours(now.getHours() + 12);
      break;
    case "1d":
      now.setDate(now.getDate() + 1);
      break;
    case "2d":
      now.setDate(now.getDate() + 2);
      break;
    case "3d":
      now.setDate(now.getDate() + 3);
      break;
    case "7d":
      now.setDate(now.getDate() + 7);
      break;
    default:
      now.setMinutes(now.getMinutes() + 30);
  }

  return now.toISOString();
}

function deriveDuration(expiresAt?: string | null, createdAt?: string | null) {
  if (!expiresAt || !createdAt) return "30m";

  const start = new Date(createdAt).getTime();
  const end = new Date(expiresAt).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return "30m";

  const diffMinutes = Math.round((end - start) / (1000 * 60));

  if (diffMinutes === 30) return "30m";
  if (diffMinutes === 60) return "1h";
  if (diffMinutes === 120) return "2h";
  if (diffMinutes === 240) return "4h";
  if (diffMinutes === 480) return "8h";
  if (diffMinutes === 720) return "12h";
  if (diffMinutes === 1440) return "1d";
  if (diffMinutes === 2880) return "2d";
  if (diffMinutes === 4320) return "3d";
  if (diffMinutes === 10080) return "7d";

  return "30m";
}

export default function BusinessDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [business, setBusiness] = useState<Business | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        router.push("/business/login");
        return;
      }

      const { data: businessRow, error: businessError } = await supabase
        .from("businesses")
        .select("*")
        .eq("email", user.email)
        .single();

      if (businessError || !businessRow) {
        setError("Could not find your business account.");
        setLoading(false);
        return;
      }

      setBusiness(businessRow);

      const { data: listingRows, error: listingsError } = await supabase
        .from("listings")
        .select("*")
        .eq("business_name", businessRow.name)
        .order("created_at", { ascending: false });

      if (listingsError) throw listingsError;

      const safeListings: Listing[] = listingRows || [];
      const listingIds = safeListings.map((item) => item.id);

      let claimsMap = new Map<string, Claim>();

      if (listingIds.length > 0) {
        const { data: claimRows, error: claimsError } = await supabase
          .from("claims")
          .select("*")
          .in("listing_id", listingIds)
          .order("created_at", { ascending: false });

        if (!claimsError && claimRows) {
          claimRows.forEach((claim: Claim) => {
            if (!claimsMap.has(claim.listing_id)) {
              claimsMap.set(claim.listing_id, claim);
            }
          });
        }
      }

      const merged = safeListings.map((listing) => ({
        ...listing,
        claim: claimsMap.get(listing.id) || null,
      }));

      setListings(merged);
    } catch (err: any) {
      setError(err?.message || "Something went wrong loading the dashboard.");
    } finally {
      setLoading(false);
    }
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function startEdit(listing: Listing) {
    setEditingId(listing.id);
    setError("");
    setSuccess("");

    setForm({
      food_name: listing.food_name || "",
      address: listing.address || business?.address || "",
      category: listing.category || "Food",
      quantity: listing.quantity || "",
      allergy_note: listing.allergy_note || "",
      estimated_value:
        listing.estimated_value !== null && listing.estimated_value !== undefined
          ? String(listing.estimated_value)
          : "",
      note: listing.note || "",
      active_duration: deriveDuration(listing.expires_at, listing.created_at),
      claim_hold_minutes: listing.claim_hold_minutes
        ? String(listing.claim_hold_minutes)
        : "10",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!business) {
      setError("Business account not loaded.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        business_name: business.name,
        address: form.address.trim() || business.address || "",
        food_name: form.food_name.trim(),
        category: form.category.trim(),
        quantity: form.quantity.trim(),
        allergy_note: form.allergy_note.trim() || null,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
        note: form.note.trim() || null,
        claim_hold_minutes: Number(form.claim_hold_minutes),
        expires_at: getExpiresAtFromDuration(form.active_duration),
        status: "AVAILABLE",
        reserved_until: null,
        claim_code: null,
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from("listings")
          .update(payload)
          .eq("id", editingId);

        if (updateError) throw updateError;

        setSuccess("Listing updated successfully.");
      } else {
        const { error: insertError } = await supabase
          .from("listings")
          .insert(payload);

        if (insertError) throw insertError;

        setSuccess("Listing posted successfully.");
      }

      resetForm();
      await loadDashboard();
    } catch (err: any) {
      setError(err?.message || "Could not save listing.");
    } finally {
      setSaving(false);
    }
  }

  async function cancelReservation(listingId: string) {
    setActionLoadingId(listingId);
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase
        .from("listings")
        .update({
          status: "AVAILABLE",
          reserved_until: null,
          claim_code: null,
        })
        .eq("id", listingId);

      if (error) throw error;

      setSuccess("Reservation cancelled. Listing is available again.");
      await loadDashboard();
    } catch (err: any) {
      setError(err?.message || "Could not cancel reservation.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function cancelListing(listingId: string) {
    setActionLoadingId(listingId);
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase
        .from("listings")
        .update({ status: "CANCELLED" })
        .eq("id", listingId);

      if (error) throw error;

      setSuccess("Listing cancelled.");
      await loadDashboard();
    } catch (err: any) {
      setError(err?.message || "Could not cancel listing.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function markPickedUp(listingId: string) {
    setActionLoadingId(listingId);
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase
        .from("listings")
        .update({ status: "PICKED_UP" })
        .eq("id", listingId);

      if (error) throw error;

      setSuccess("Listing marked as picked up.");
      await loadDashboard();
    } catch (err: any) {
      setError(err?.message || "Could not mark as picked up.");
    } finally {
      setActionLoadingId(null);
    }
  }

  const monthlySummary = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthListings = listings.filter((item) => {
      if (!item.created_at) return false;
      const d = new Date(item.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalValue = thisMonthListings.reduce(
      (sum, item) => sum + Number(item.estimated_value || 0),
      0
    );

    return {
      count: thisMonthListings.length,
      totalValue,
    };
  }, [listings]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/business/login");
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={topBarStyle}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: 24, color: "#111827" }}>Business Dashboard</h1>
          <button
            type="button"
            onClick={() => router.push("/business/summary")}
            style={secondaryButtonStyle}
          >
            Monthly Summary
          </button>
        </div>

        <button type="button" onClick={handleLogout} style={darkButtonStyle}>
          Log Out
        </button>
      </div>

      {error ? <div style={errorStyle}>{error}</div> : null}
      {success ? <div style={successStyle}>{success}</div> : null}

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>
          {editingId ? "Edit Listing" : "Post Available Food"}
        </h2>

        <form onSubmit={handleSubmit}>
          <Label>Business name</Label>
          <Input value={business?.name || ""} disabled />

          <Label>Pickup address</Label>
          <Input
            value={form.address}
            onChange={(e) => updateForm("address", e.target.value)}
            placeholder="400 Empire Blvd"
            required
          />

          <Label>Food item name</Label>
          <Input
            value={form.food_name}
            onChange={(e) => updateForm("food_name", e.target.value)}
            placeholder="Example: Chicken sandwich, vegetarian pasta"
            required
          />

          <Label>Category</Label>
          <Select
            value={form.category}
            onChange={(e) => updateForm("category", e.target.value)}
          >
            <option value="Food">Food</option>
            <option value="Produce">Produce</option>
            <option value="Bakery">Bakery</option>
            <option value="Prepared Meals">Prepared Meals</option>
            <option value="Drinks">Drinks</option>
            <option value="Other">Other</option>
          </Select>

          <Label>Quantity</Label>
          <Input
            value={form.quantity}
            onChange={(e) => updateForm("quantity", e.target.value)}
            placeholder="Example: 10 meals"
            required
          />

          <Label>Allergy / dietary note</Label>
          <Input
            value={form.allergy_note}
            onChange={(e) => updateForm("allergy_note", e.target.value)}
            placeholder="Example: contains dairy, nuts, halal, vegetarian"
          />

          <Label>Estimated value</Label>
          <Input
            value={form.estimated_value}
            onChange={(e) => updateForm("estimated_value", e.target.value)}
            placeholder="Example: 50"
            type="number"
            min="0"
            step="0.01"
          />

          <div style={helperTextStyle}>Visible only to your business and admin.</div>

          <Label>Short note</Label>
          <TextArea
            value={form.note}
            onChange={(e) => updateForm("note", e.target.value)}
            placeholder="Example: Pickup before closing"
          />

          <Label>Keep listing active for</Label>
          <Select
            value={form.active_duration}
            onChange={(e) => updateForm("active_duration", e.target.value)}
          >
            {ACTIVE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Label>Hold reservation / claim for</Label>
          <Select
            value={form.claim_hold_minutes}
            onChange={(e) => updateForm("claim_hold_minutes", e.target.value)}
          >
            {HOLD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            <button type="submit" disabled={saving} style={primaryButtonStyle}>
              {saving ? "Saving..." : editingId ? "Update Listing" : "Post Food"}
            </button>

            {editingId ? (
              <button type="button" onClick={resetForm} style={secondaryButtonStyle}>
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>Monthly Summary</h2>
        <p style={summaryLineStyle}>Donations posted this month: {monthlySummary.count}</p>
        <p style={summaryLineStyle}>
          Estimated value this month: ${monthlySummary.totalValue.toFixed(2)}
        </p>
        <p style={smallMutedStyle}>
          This summary is for recordkeeping and operational reporting.
        </p>
      </div>

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>Your Listings</h2>

        {listings.length === 0 ? (
          <p style={{ color: "#374151" }}>No listings yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {listings.map((listing) => {
              const isReserved = listing.status === "RESERVED";
              const busy = actionLoadingId === listing.id;
              const canEdit = listing.status === "AVAILABLE" || listing.status === "CANCELLED";

              return (
                <div key={listing.id} style={listingCardStyle}>
                  <h3 style={{ margin: "0 0 8px 0", color: "#111827" }}>
                    {listing.food_name || "Untitled listing"}
                  </h3>

                  <p style={listingTextStyle}>
                    <strong>Status:</strong> {listing.status || "UNKNOWN"}
                  </p>
                  <p style={listingTextStyle}>
                    <strong>Category:</strong> {listing.category || "N/A"}
                  </p>
                  <p style={listingTextStyle}>
                    <strong>Quantity:</strong> {listing.quantity || "N/A"}
                  </p>
                  <p style={listingTextStyle}>
                    <strong>Address:</strong> {listing.address || "N/A"}
                  </p>
                  <p style={listingTextStyle}>
                    <strong>Estimated value:</strong> $
                    {Number(listing.estimated_value || 0).toFixed(2)}
                  </p>
                  <p style={listingTextStyle}>
                    <strong>Expires:</strong> {formatDateTime(listing.expires_at)}
                  </p>
                  <p style={listingTextStyle}>
                    <strong>Posted:</strong> {formatDateTime(listing.created_at)}
                  </p>

                  {isReserved ? (
                    <div style={claimBoxStyle}>
                      <p style={claimTitleStyle}>Reserved Customer Details</p>
                      <p style={listingTextStyle}>
                        <strong>Name:</strong> {listing.claim?.first_name || "N/A"}
                      </p>
                      <p style={listingTextStyle}>
                        <strong>Email:</strong> {listing.claim?.email || "N/A"}
                      </p>
                      <p style={listingTextStyle}>
                        <strong>Phone:</strong> {listing.claim?.phone || "Not provided"}
                      </p>
                      <p style={listingTextStyle}>
                        <strong>ETA:</strong>{" "}
                        {listing.claim?.eta_minutes
                          ? `${listing.claim.eta_minutes} minutes`
                          : "N/A"}
                      </p>
                      <p style={listingTextStyle}>
                        <strong>Client code:</strong>{" "}
                        {listing.claim?.confirmation_code || listing.claim_code || "N/A"}
                      </p>
                    </div>
                  ) : null}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => startEdit(listing)}
                        style={secondaryButtonStyle}
                        disabled={busy}
                      >
                        Edit
                      </button>
                    ) : null}

                    {isReserved ? (
                      <>
                        <button
                          type="button"
                          onClick={() => markPickedUp(listing.id)}
                          style={primaryButtonStyle}
                          disabled={busy}
                        >
                          {busy ? "Working..." : "Mark Picked Up"}
                        </button>

                        <button
                          type="button"
                          onClick={() => cancelReservation(listing.id)}
                          style={warningButtonStyle}
                          disabled={busy}
                        >
                          {busy ? "Working..." : "Cancel Reservation"}
                        </button>
                      </>
                    ) : null}

                    {listing.status !== "CANCELLED" ? (
                      <button
                        type="button"
                        onClick={() => cancelListing(listing.id)}
                        style={dangerButtonStyle}
                        disabled={busy}
                      >
                        {busy ? "Working..." : "Cancel Listing"}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={labelStyle}>{children}</label>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={inputStyle} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={inputStyle} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} />;
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#e9edf3",
  padding: "28px 16px 60px",
};

const topBarStyle: React.CSSProperties = {
  maxWidth: 860,
  margin: "0 auto 16px auto",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const cardStyle: React.CSSProperties = {
  maxWidth: 860,
  margin: "0 auto 12px auto",
  background: "#ffffff",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: 18,
};

const listingCardStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: 14,
  background: "#f8fafc",
};

const claimBoxStyle: React.CSSProperties = {
  marginTop: 12,
  background: "#eef6ff",
  border: "1px solid #bfdbfe",
  borderRadius: 8,
  padding: 12,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 12px 0",
  color: "#111827",
  fontSize: 20,
};

const claimTitleStyle: React.CSSProperties = {
  margin: "0 0 8px 0",
  color: "#1d4ed8",
  fontWeight: 700,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#111827",
  fontSize: 13,
  marginTop: 12,
  marginBottom: 6,
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 6,
  border: "1px solid #94a3b8",
  color: "#111827",
  background: "#ffffff",
  fontSize: 14,
  boxSizing: "border-box",
};

const primaryButtonStyle: React.CSSProperties = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  borderRadius: 6,
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 600,
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: 6,
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 600,
};

const warningButtonStyle: React.CSSProperties = {
  background: "#d97706",
  color: "#ffffff",
  border: "none",
  borderRadius: 6,
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 600,
};

const dangerButtonStyle: React.CSSProperties = {
  background: "#dc2626",
  color: "#ffffff",
  border: "none",
  borderRadius: 6,
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 600,
};

const darkButtonStyle: React.CSSProperties = {
  background: "#1f2937",
  color: "#ffffff",
  border: "none",
  borderRadius: 6,
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 600,
};

const helperTextStyle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  color: "#6b7280",
};

const listingTextStyle: React.CSSProperties = {
  margin: "4px 0",
  color: "#111827",
  fontSize: 14,
};

const summaryLineStyle: React.CSSProperties = {
  margin: "4px 0",
  color: "#111827",
};

const smallMutedStyle: React.CSSProperties = {
  margin: "8px 0 0 0",
  color: "#6b7280",
  fontSize: 12,
};

const errorStyle: React.CSSProperties = {
  maxWidth: 860,
  margin: "0 auto 12px auto",
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: 8,
  padding: 12,
};

const successStyle: React.CSSProperties = {
  maxWidth: 860,
  margin: "0 auto 12px auto",
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #bbf7d0",
  borderRadius: 8,
  padding: 12,
};
