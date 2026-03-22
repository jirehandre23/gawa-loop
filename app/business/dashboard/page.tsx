'use client'

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Listing = {
  id: string;
  food_name?: string | null;
  category: string;
  quantity: string;
  allergy_note?: string | null;
  address?: string | null;
  maps_url?: string | null;
  note?: string | null;
  status: string;
  estimated_value?: number | null;
  listing_expires_at?: string | null;
  claim_hold_minutes?: number | null;
  created_at?: string;
};

export default function BusinessDashboardPage() {
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [foodName, setFoodName] = useState("");
  const [category, setCategory] = useState("Food");
  const [quantity, setQuantity] = useState("");
  const [allergyNote, setAllergyNote] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [note, setNote] = useState("");
  const [listingHours, setListingHours] = useState("1");
  const [claimHoldMinutes, setClaimHoldMinutes] = useState("10");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

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

    setBusinessName(business.name);
    setBusinessAddress(business.address || "");

    const { data: businessListings } = await supabase
      .from("listings")
      .select("*")
      .eq("business_name", business.name)
      .order("created_at", { ascending: false });

    setListings(businessListings || []);
    setLoading(false);
  }

  function buildMapsUrl(address: string) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPosting(true);

    const expiresAt = new Date(Date.now() + Number(listingHours) * 60 * 60 * 1000).toISOString();
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
      claim_hold_minutes: Number(claimHoldMinutes)
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

  function getMonthlySummary() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthListings = listings.filter((item) => {
      if (!item.created_at) return false;
      const date = new Date(item.created_at);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const totalItems = thisMonthListings.length;
    const totalValue = thisMonthListings.reduce((sum, item) => sum + (item.estimated_value || 0), 0);

    return { totalItems, totalValue };
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <p>Loading dashboard...</p>
      </main>
    );
  }

  const summary = getMonthlySummary();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-6 gap-4">
          <div className="flex gap-3 items-center">
            <h1 className="text-3xl font-bold">Business Dashboard</h1>
            <Link
              href="/business/summary"
              className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Monthly Summary
            </Link>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl bg-gray-700 px-4 py-2 text-white hover:bg-gray-800"
          >
            Log Out
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Post Available Food</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-medium mb-2">Business name</label>
              <input
                value={businessName}
                disabled
                className="w-full rounded-xl border px-4 py-3 bg-gray-100"
              />
            </div>

            <div>
              <label className="block font-medium mb-2">Pickup address</label>
              <input
                value={businessAddress}
                disabled
                className="w-full rounded-xl border px-4 py-3 bg-gray-100"
              />
            </div>

            <div>
              <label className="block font-medium mb-2">Exact food name (optional)</label>
              <input
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
                placeholder="Example: Chicken sandwich, vegetarian pasta"
              />
            </div>

            <div>
              <label className="block font-medium mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              >
                <option>Food</option>
                <option>Prepared Meals</option>
                <option>Baked Goods</option>
                <option>Groceries</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="block font-medium mb-2">Quantity</label>
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
                placeholder="Example: 10 meals"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-2">Allergy / dietary note (optional)</label>
              <input
                value={allergyNote}
                onChange={(e) => setAllergyNote(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
                placeholder="Example: contains dairy, nuts, halal, vegetarian"
              />
            </div>

            <div>
              <label className="block font-medium mb-2">Estimated value (optional)</label>
              <input
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
                placeholder="Example: 50"
              />
              <p className="text-sm text-gray-500 mt-1">
                Visible only to your business and admin.
              </p>
            </div>

            <div>
              <label className="block font-medium mb-2">Short note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
                rows={3}
                placeholder="Example: Pickup before closing"
              />
            </div>

            <div>
              <label className="block font-medium mb-2">Keep listing active for</label>
              <select
                value={listingHours}
                onChange={(e) => setListingHours(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              >
                <option value="1">1 hour</option>
                <option value="2">2 hours</option>
                <option value="3">3 hours</option>
              </select>
            </div>

            <div>
              <label className="block font-medium mb-2">Hold item after claim for</label>
              <select
                value={claimHoldMinutes}
                onChange={(e) => setClaimHoldMinutes(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
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
              className="rounded-xl bg-green-600 px-5 py-3 text-white font-medium hover:bg-green-700 disabled:bg-gray-400"
            >
              {posting ? "Posting..." : "Post Food"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Monthly Summary</h2>

          <p className="text-lg">
            Donations posted this month: <span className="font-bold">{summary.totalItems}</span>
          </p>

          <p className="text-lg mt-2">
            Estimated value this month: <span className="font-bold">${summary.totalValue}</span>
          </p>

          <p className="text-sm text-gray-500 mt-2">
            This summary is for recordkeeping and operational reporting.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Your Listings</h2>

          <div className="space-y-4">
            {listings.length === 0 && <p>No listings yet.</p>}

            {listings.map((item) => (
              <div key={item.id} className="border rounded-xl p-4">
                <p className="font-semibold">{item.food_name || item.category}</p>
                <p>{item.quantity}</p>
                <p>Status: {item.status}</p>

                {item.allergy_note && (
                  <p className="text-sm text-gray-500 mt-1">
                    Note: {item.allergy_note}
                  </p>
                )}

                {item.note && (
                  <p className="text-sm text-gray-500 mt-1">
                    Extra: {item.note}
                  </p>
                )}

                {item.estimated_value !== null && item.estimated_value !== undefined && (
                  <p className="text-sm text-gray-500 mt-1">
                    Estimated value: ${item.estimated_value}
                  </p>
                )}

                {item.listing_expires_at && (
                  <p className="text-sm text-gray-400 mt-1">
                    Expires: {new Date(item.listing_expires_at).toLocaleString()}
                  </p>
                )}

                {item.created_at && (
                  <p className="text-sm text-gray-400 mt-1">
                    Posted: {new Date(item.created_at).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}