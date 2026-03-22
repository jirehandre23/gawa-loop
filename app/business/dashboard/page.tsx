'use client'
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Listing = {
  id: string;
  business_name?: string | null;
  food_name?: string | null;
  category?: string | null;
  quantity?: string | null;
  allergy_note?: string | null;
  address?: string | null;
  maps_url?: string | null;
  note?: string | null;
  status?: string | null;
  estimated_value?: number | null;
  listing_expires_at?: string | null;
  claim_hold_minutes?: number | null;
  claim_code?: string | null;
  reserved_until?: string | null;
  created_at?: string | null;
};

type Claim = {
  id?: string;
  listing_id?: string | null;
  first_name?: string | null;
  phone?: string | null;
  email?: string | null;
  eta_minutes?: number | null;
  confirmation_code?: string | null;
  created_at?: string | null;
};

export default function BusinessDashboardPage() {
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");

  const [foodName, setFoodName] = useState("");
  const [category, setCategory] = useState("Food");
  const [quantity, setQuantity] = useState("");
  const [allergyNote, setAllergyNote] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [note, setNote] = useState("");
  const [listingHours, setListingHours] = useState("1");
  const [claimHoldMinutes, setClaimHoldMinutes] = useState("10");

  const [listings, setListings] = useState<Listing[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    const { data: authData, error: userError } = await supabase.auth.getUser();
    const email = authData?.user?.email;

    if (userError || !email) {
      router.push("/business/login");
      return;
    }

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("*")
      .eq("email", email)
      .single();

    if (businessError || !business) {
      alert("Business account not found.");
      router.push("/business/login");
      return;
    }

    setBusinessName(business.name || "");
    setBusinessAddress(business.address || "");
    setBusinessPhone(business.phone || "");
    setBusinessEmail(business.email || "");

    const { data: businessListings } = await supabase
      .from("listings")
      .select("*")
      .eq("business_name", business.name)
      .order("created_at", { ascending: false });

    const loadedListings = businessListings || [];
    setListings(loadedListings);

    const listingIds = loadedListings.map((item) => item.id).filter(Boolean);

    if (listingIds.length > 0) {
      const { data: claimRows } = await supabase
        .from("claims")
        .select("*")
        .in("listing_id", listingIds);

      setClaims(claimRows || []);
    } else {
      setClaims([]);
    }

    setLoading(false);
  }

  const claimsByListingId = useMemo(() => {
    const map = new Map<string, Claim>();
    for (const claim of claims) {
      if (claim.listing_id && !map.has(claim.listing_id)) {
        map.set(claim.listing_id, claim);
      }
    }
    return map;
  }, [claims]);

  function buildMapsUrl(address: string) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPosting(true);

    const expiresAt = new Date(
      Date.now() + Number(listingHours) * 60 * 60 * 1000
    ).toISOString();

    const mapsUrl = businessAddress ? buildMapsUrl(businessAddress) : null;

    const { error } = await supabase.from("listings").insert({
      business_name: businessName,
      food_name: foodName || null,
      category,
      quantity,
      allergy_note: allergyNote || null,
      address: businessAddress || null,
      maps_url: mapsUrl,
      estimated_value: estimatedValue ? Number(estimatedValue) : null,
      note: note || null,
      status: "AVAILABLE",
      listing_expires_at: expiresAt,
      claim_hold_minutes: Number(claimHoldMinutes),
    });

    if (error) {
      alert("Could not post food.");
      setPosting(false);
      return;
    }

    alert("Food posted successfully.");
    setFoodName("");
    setCategory("Food");
    setQuantity("");
    setAllergyNote("");
    setEstimatedValue("");
    setNote("");
    setListingHours("1");
    setClaimHoldMinutes("10");
    setPosting(false);
    loadDashboard();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/business/login");
  }

  async function handleMarkPickedUp(listingId: string) {
    setActionLoadingId(listingId);

    const { error } = await supabase
      .from("listings")
      .update({
        status: "PICKED_UP",
      })
      .eq("id", listingId);

    if (error) {
      alert("Could not mark as picked up.");
      setActionLoadingId(null);
      return;
    }

    setActionLoadingId(null);
    loadDashboard();
  }

  async function handleCancelReservation(listingId: string) {
    setActionLoadingId(listingId);

    const { error } = await supabase
      .from("listings")
      .update({
        status: "AVAILABLE",
        reserved_until: null,
        claim_code: null,
      })
      .eq("id", listingId);

    if (error) {
      alert("Could not cancel reservation.");
      setActionLoadingId(null);
      return;
    }

    setActionLoadingId(null);
    loadDashboard();
  }

  function getMonthlySummary() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthListings = listings.filter((item) => {
      if (!item.created_at) return false;
      const date = new Date(item.created_at);
      return (
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear
      );
    });

    const totalItems = thisMonthListings.length;
    const totalValue = thisMonthListings.reduce(
      (sum, item) => sum + (item.estimated_value || 0),
      0
    );

    const reservedCount = thisMonthListings.filter(
      (item) => item.status === "RESERVED"
    ).length;

    const pickedUpCount = thisMonthListings.filter(
      (item) => item.status === "PICKED_UP"
    ).length;

    return { totalItems, totalValue, reservedCount, pickedUpCount };
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
        <p className="text-lg font-medium">Loading dashboard...</p>
      </main>
    );
  }

  const summary = getMonthlySummary();

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
          <div className="flex flex-wrap gap-3 items-center">
            <h1 className="text-3xl font-bold text-slate-900">Business Dashboard</h1>
            <Link
              href="/business/summary"
              className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Monthly Summary
            </Link>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl bg-slate-700 px-4 py-2 text-white hover:bg-slate-800"
          >
            Log Out
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-8 border border-slate-200">
          <h2 className="text-2xl font-semibold mb-4 text-slate-900">Post Available Food</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-medium mb-2 text-slate-800">Business name</label>
              <input
                value={businessName}
                disabled
                className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-slate-100 text-slate-800"
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-slate-800">Pickup address</label>
              <input
                value={businessAddress}
                disabled
                className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-slate-100 text-slate-800"
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-slate-800">Business phone</label>
              <input
                value={businessPhone}
                disabled
                className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-slate-100 text-slate-800"
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-slate-800">Business email</label>
              <input
                value={businessEmail}
                disabled
                className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-slate-100 text-slate-800"
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-slate-800">Exact food name</label>
              <input
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                placeholder="Example: Chicken sandwich, vegetarian pasta"
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-slate-800">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
              >
                <option>Food</option>
                <option>Prepared Meals</option>
                <option>Baked Goods</option>
                <option>Groceries</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="block font-medium mb-2 text-slate-800">Quantity *</label>
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                placeholder="Example: 10 meals"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-slate-800">Allergy / dietary note</label>
              <input
                value={allergyNote}
                onChange={(e) => setAllergyNote(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                placeholder="Example: contains dairy, nuts, halal, vegetarian"
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-slate-800">Estimated value</label>
              <input
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                placeholder="Example: 50"
              />
              <p className="text-sm text-slate-700 mt-1">
                Visible only to your business and admin.
              </p>
            </div>

            <div>
              <label className="block font-medium mb-2 text-slate-800">Short note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                rows={3}
                placeholder="Example: Pickup before closing"
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-slate-800">Keep listing active for</label>
              <select
                value={listingHours}
                onChange={(e) => setListingHours(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
              >
                <option value="1">1 hour</option>
                <option value="2">2 hours</option>
                <option value="3">3 hours</option>
              </select>
            </div>

            <div>
              <label className="block font-medium mb-2 text-slate-800">Hold item after claim for</label>
              <select
                value={claimHoldMinutes}
                onChange={(e) => setClaimHoldMinutes(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
              >
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="20">20 minutes</option>
                <option value="30">30 minutes</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={posting}
              className="rounded-xl bg-green-600 px-5 py-3 text-white font-medium hover:bg-green-700 disabled:bg-slate-400"
            >
              {posting ? "Posting..." : "Post Food"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-8 border border-slate-200">
          <h2 className="text-2xl font-semibold mb-4 text-slate-900">Monthly Snapshot</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm text-slate-700">Posted this month</p>
              <p className="text-2xl font-bold text-slate-900">{summary.totalItems}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm text-slate-700">Estimated value</p>
              <p className="text-2xl font-bold text-slate-900">${summary.totalValue}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm text-slate-700">Currently reserved</p>
              <p className="text-2xl font-bold text-slate-900">{summary.reservedCount}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm text-slate-700">Picked up</p>
              <p className="text-2xl font-bold text-slate-900">{summary.pickedUpCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 border border-slate-200">
          <h2 className="text-2xl font-semibold mb-4 text-slate-900">Your Listings and Claims</h2>

          <div className="space-y-4">
            {listings.length === 0 && (
              <p className="text-slate-700">No listings yet.</p>
            )}

            {listings.map((item) => {
              const claim = claimsByListingId.get(item.id);

              return (
                <div
                  key={item.id}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50"
                >
                  <p className="font-semibold text-slate-900">{item.food_name || item.category}</p>
                  <p className="text-slate-800">{item.quantity}</p>
                  <p className="text-slate-800"><strong>Status:</strong> {item.status || "UNKNOWN"}</p>

                  {item.allergy_note && (
                    <p className="text-sm text-slate-700 mt-1">
                      <strong>Note:</strong> {item.allergy_note}
                    </p>
                  )}

                  {item.note && (
                    <p className="text-sm text-slate-700 mt-1">
                      <strong>Extra:</strong> {item.note}
                    </p>
                  )}

                  {item.estimated_value !== null && item.estimated_value !== undefined && (
                    <p className="text-sm text-slate-700 mt-1">
                      <strong>Estimated value:</strong> ${item.estimated_value}
                    </p>
                  )}

                  {item.claim_code && (
                    <p className="text-sm text-slate-700 mt-1">
                      <strong>Code:</strong> {item.claim_code}
                    </p>
                  )}

                  {item.reserved_until && (
                    <p className="text-sm text-slate-700 mt-1">
                      <strong>Reserved until:</strong> {new Date(item.reserved_until).toLocaleString()}
                    </p>
                  )}

                  {item.listing_expires_at && (
                    <p className="text-sm text-slate-700 mt-1">
                      <strong>Expires:</strong> {new Date(item.listing_expires_at).toLocaleString()}
                    </p>
                  )}

                  {claim && (
                    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <p className="font-semibold text-slate-900">Client details</p>
                      <p className="text-slate-800"><strong>Name:</strong> {claim.first_name || "Not provided"}</p>
                      <p className="text-slate-800"><strong>Email:</strong> {claim.email || "Not provided"}</p>
                      <p className="text-slate-800"><strong>Phone:</strong> {claim.phone || "Not provided"}</p>
                      <p className="text-slate-800"><strong>ETA:</strong> {claim.eta_minutes || "Not provided"} minutes</p>
                      <p className="text-slate-800"><strong>Confirmation code:</strong> {claim.confirmation_code || item.claim_code || "Not provided"}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 mt-4">
                    {item.status === "RESERVED" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleMarkPickedUp(item.id)}
                          disabled={actionLoadingId === item.id}
                          className="rounded-xl bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:bg-slate-400"
                        >
                          Mark picked up
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCancelReservation(item.id)}
                          disabled={actionLoadingId === item.id}
                          className="rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:bg-slate-400"
                        >
                          Cancel reservation
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
