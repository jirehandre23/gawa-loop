"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Listing = {
  id: string;
  business_name?: string | null;
  food_name?: string | null;
  category?: string | null;
  quantity?: string | null;
  status?: string | null;
  estimated_value?: number | null;
  created_at?: string | null;
  claim_code?: string | null;
  address?: string | null;
};

type Claim = {
  id?: string;
  listing_id?: string | null;
  first_name?: string | null;
  email?: string | null;
  phone?: string | null;
  confirmation_code?: string | null;
  eta_minutes?: number | null;
  created_at?: string | null;
};

export default function BusinessSummaryPage() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.email) {
        router.push("/business/login");
        return;
      }

      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("*")
        .eq("email", user.email)
        .single();

      if (businessError || !business) {
        router.push("/business/login");
        return;
      }

      setBusinessName(business.name || "");

      const { data: listingRows, error: listingsError } = await supabase
        .from("listings")
        .select("*")
        .eq("business_name", business.name)
        .order("created_at", { ascending: false });

      if (listingsError) {
        throw listingsError;
      }

      const loadedListings = listingRows || [];
      setListings(loadedListings);

      const listingIds = loadedListings.map((item) => item.id).filter(Boolean);

      if (listingIds.length > 0) {
        const { data: claimRows, error: claimsError } = await supabase
          .from("claims")
          .select("*")
          .in("listing_id", listingIds)
          .order("created_at", { ascending: false });

        if (claimsError) {
          throw claimsError;
        }

        setClaims(claimRows || []);
      } else {
        setClaims([]);
      }
    } catch (err: any) {
      setError(err?.message || "Could not load summary.");
    } finally {
      setLoading(false);
    }
  }

  const metrics = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const thisMonthListings = listings.filter((item) => {
      if (!item.created_at) return false;
      const d = new Date(item.created_at);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    return {
      totalPosted: thisMonthListings.length,
      totalValue: thisMonthListings.reduce(
        (sum, item) => sum + Number(item.estimated_value || 0),
        0
      ),
      totalAvailable: thisMonthListings.filter((item) => item.status === "AVAILABLE").length,
      totalReserved: thisMonthListings.filter((item) => item.status === "RESERVED").length,
      totalPickedUp: thisMonthListings.filter((item) => item.status === "PICKED_UP").length,
      totalCancelled: thisMonthListings.filter((item) => item.status === "CANCELLED").length,
    };
  }, [listings]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <p>Loading summary...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Business Summary</h1>
            <p className="mt-1 text-slate-700">{businessName}</p>
          </div>

          <Link
            href="/business/dashboard"
            className="rounded-xl bg-slate-700 px-4 py-2 text-white hover:bg-slate-800"
          >
            Back to dashboard
          </Link>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mb-8 grid gap-4 md:grid-cols-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow">
            <p className="text-sm text-slate-700">Posted this month</p>
            <p className="text-3xl font-bold text-slate-900">{metrics.totalPosted}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow">
            <p className="text-sm text-slate-700">Estimated value</p>
            <p className="text-3xl font-bold text-slate-900">
              ${metrics.totalValue.toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow">
            <p className="text-sm text-slate-700">Available</p>
            <p className="text-3xl font-bold text-slate-900">{metrics.totalAvailable}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow">
            <p className="text-sm text-slate-700">Reserved</p>
            <p className="text-3xl font-bold text-slate-900">{metrics.totalReserved}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow">
            <p className="text-sm text-slate-700">Picked up</p>
            <p className="text-3xl font-bold text-slate-900">{metrics.totalPickedUp}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow">
            <p className="text-sm text-slate-700">Cancelled</p>
            <p className="text-3xl font-bold text-slate-900">{metrics.totalCancelled}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900">
              Recent Listings
            </h2>

            <div className="space-y-4">
              {listings.length === 0 ? (
                <p className="text-slate-700">No listings yet.</p>
              ) : (
                listings.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="font-semibold text-slate-900">
                      {item.food_name || item.category || "Untitled listing"}
                    </p>
                    <p className="text-slate-800">
                      <strong>Quantity:</strong> {item.quantity || "Not provided"}
                    </p>
                    <p className="text-slate-800">
                      <strong>Status:</strong> {item.status || "UNKNOWN"}
                    </p>
                    <p className="text-slate-800">
                      <strong>Estimated value:</strong> $
                      {Number(item.estimated_value || 0).toFixed(2)}
                    </p>
                    {item.claim_code ? (
                      <p className="text-slate-800">
                        <strong>Code:</strong> {item.claim_code}
                      </p>
                    ) : null}
                    {item.created_at ? (
                      <p className="text-sm text-slate-600">
                        Posted: {new Date(item.created_at).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900">
              Recent Claims
            </h2>

            <div className="space-y-4">
              {claims.length === 0 ? (
                <p className="text-slate-700">No claims yet.</p>
              ) : (
                claims.slice(0, 10).map((claim) => (
                  <div
                    key={`${claim.listing_id || "listing"}-${claim.confirmation_code || claim.id || "claim"}`}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-slate-800">
                      <strong>Name:</strong> {claim.first_name || "Not provided"}
                    </p>
                    <p className="text-slate-800">
                      <strong>Email:</strong> {claim.email || "Not provided"}
                    </p>
                    <p className="text-slate-800">
                      <strong>Phone:</strong> {claim.phone || "Not provided"}
                    </p>
                    <p className="text-slate-800">
                      <strong>ETA:</strong>{" "}
                      {claim.eta_minutes ? `${claim.eta_minutes} minutes` : "Not provided"}
                    </p>
                    <p className="text-slate-800">
                      <strong>Code:</strong> {claim.confirmation_code || "Not provided"}
                    </p>
                    {claim.created_at ? (
                      <p className="text-sm text-slate-600">
                        Claimed: {new Date(claim.created_at).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
