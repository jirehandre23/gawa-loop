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
  status?: string | null;
  estimated_value?: number | null;
  created_at?: string | null;
};

type Claim = {
  id?: string;
  listing_id?: string | null;
  first_name?: string | null;
  email?: string | null;
  phone?: string | null;
  confirmation_code?: string | null;
};

export default function BusinessSummaryPage() {
  const [businessName, setBusinessName] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
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
      router.push("/business/login");
      return;
    }

    setBusinessName(business.name || "");

    const { data: rows } = await supabase
      .from("listings")
      .select("*")
      .eq("business_name", business.name)
      .order("created_at", { ascending: false });

    const loadedListings = rows || [];
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

  const metrics = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const thisMonth = listings.filter((item) => {
      if (!item.created_at) return false;
      const d = new Date(item.created_at);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    return {
      totalPosted: thisMonth.length,
      totalValue: thisMonth.reduce((sum, item) => sum + (item.estimated_value || 0), 0),
      totalReserved: thisMonth.filter((item) => item.status === "RESERVED").length,
      totalPickedUp: thisMonth.filter((item) => item.status === "PICKED_UP").length,
      totalAvailable: thisMonth.filter((item) => item.status === "AVAILABLE").length,
    };
  }, [listings]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
        <p>Loading summary...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Monthly Summary</h1>
            <p className="text-slate-700 mt-1">{businessName}</p>
          </div>

          <Link
            href="/business/dashboard"
            className="rounded-xl bg-slate-700 px-4 py-2 text-white hover:bg-slate-800"
          >
            Back to dashboard
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-5 mb-8">
          <div className="rounded-2xl bg-white border border-slate-200 shadow p-5">
            <p className="text-sm text-slate-700">Posted this month</p>
            <p className="text-3xl font-bold text-slate-900">{metrics.totalPosted}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 shadow p-5">
            <p className="text-sm text-slate-700">Estimated value</p>
            <p className="text-3xl font-bold text-slate-900">${metrics.totalValue}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 shadow p-5">
            <p className="text-sm text-slate-700">Available</p>
            <p className="text-3xl font-bold text-slate-900">{metrics.totalAvailable}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 shadow p-5">
            <p className="text-sm text-slate-700">Reserved</p>
            <p className="text-3xl font-bold text-slate-900">{metrics.totalReserved}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 shadow p-5">
            <p className="text-sm text-slate-700">Picked up</p>
            <p className="text-3xl font-bold text-slate-900">{metrics.totalPickedUp}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white border border-slate-200 shadow p-6">
            <h2 className="text-2xl font-semibold mb-4 text-slate-900">Recent Listings</h2>
            <div className="space-y-4">
              {listings.length === 0 && <p className="text-slate-700">No listings yet.</p>}
              {listings.slice(0, 10).map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{item.food_name || item.category}</p>
                  <p className="text-slate-800">{item.quantity}</p>
                  <p className="text-slate-700">Status: {item.status}</p>
                  {item.created_at && (
                    <p className="text-sm text-slate-600">
                      Posted: {new Date(item.created_at).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 shadow p-6">
            <h2 className="text-2xl font-semibold mb-4 text-slate-900">Recent Claims</h2>
            <div className="space-y-4">
              {claims.length === 0 && <p className="text-slate-700">No claims yet.</p>}
              {claims.slice(0, 10).map((claim) => (
                <div
                  key={`${claim.listing_id}-${claim.confirmation_code}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-slate-800"><strong>Name:</strong> {claim.first_name || "Not provided"}</p>
                  <p className="text-slate-800"><strong>Email:</strong> {claim.email || "Not provided"}</p>
                  <p className="text-slate-800"><strong>Phone:</strong> {claim.phone || "Not provided"}</p>
                  <p className="text-slate-800"><strong>Code:</strong> {claim.confirmation_code || "Not provided"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
