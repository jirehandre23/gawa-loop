'use client'

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Listing = {
  id: string;
  business_name: string;
  food_name?: string | null;
  category: string;
  quantity: string;
  allergy_note?: string | null;
  address?: string | null;
  maps_url?: string | null;
  status: string;
  reserved_until?: string | null;
  listing_expires_at?: string | null;
};

function MapPickerModal({
  address,
  onClose,
}: {
  address: string;
  onClose: () => void;
}) {
  const encoded = encodeURIComponent(address);
  const googleUrl = `https://maps.google.com/?q=${encoded}`;
  const appleMapsUrl = `https://maps.apple.com/?q=${encoded}`;
  const wazeUrl = `https://waze.com/ul?q=${encoded}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-slate-900 mb-1">Open in Maps</h2>
        <p className="text-sm text-slate-500 mb-5 break-words">{address}</p>

        <div className="flex flex-col gap-3">
          
            href={googleUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50 transition"
          >
            <span className="text-2xl">🗺️</span>
            <div>
              <p className="font-semibold text-slate-900">Google Maps</p>
              <p className="text-xs text-slate-500">maps.google.com</p>
            </div>
          </a>

          
            href={appleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50 transition"
          >
            <span className="text-2xl">🍎</span>
            <div>
              <p className="font-semibold text-slate-900">Apple Maps</p>
              <p className="text-xs text-slate-500">maps.apple.com</p>
            </div>
          </a>

          
            href={wazeUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50 transition"
          >
            <span className="text-2xl">🚗</span>
            <div>
              <p className="font-semibold text-slate-900">Waze</p>
              <p className="text-xs text-slate-500">waze.com</p>
            </div>
          </a>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function Browse() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();

    const interval = setInterval(async () => {
      await releaseExpiredItems();
      await expireOldListings();
      await fetchItems();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  async function fetchItems() {
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("status", "AVAILABLE")
      .order("created_at", { ascending: false });

    setItems(data || []);
    setLoading(false);
  }

  async function releaseExpiredItems() {
    const now = new Date().toISOString();
    const { data: expiredReserved } = await supabase
      .from("listings")
      .select("*")
      .lt("reserved_until", now)
      .eq("status", "RESERVED");

    if (!expiredReserved) return;

    for (const item of expiredReserved) {
      const listingStillValid =
        item.listing_expires_at &&
        new Date(item.listing_expires_at).getTime() > Date.now();

      if (listingStillValid) {
        await supabase
          .from("listings")
          .update({ status: "AVAILABLE", reserved_until: null, claim_code: null })
          .eq("id", item.id);
      } else {
        await supabase
          .from("listings")
          .update({ status: "EXPIRED", reserved_until: null, claim_code: null })
          .eq("id", item.id);
      }
    }
  }

  async function expireOldListings() {
    const now = new Date().toISOString();
    await supabase
      .from("listings")
      .update({ status: "EXPIRED" })
      .lt("listing_expires_at", now)
      .eq("status", "AVAILABLE");
  }

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.business_name?.toLowerCase().includes(q) ||
        item.food_name?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.address?.toLowerCase().includes(q) ||
        item.allergy_note?.toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Map picker modal */}
      {selectedAddress && (
        <MapPickerModal
          address={selectedAddress}
          onClose={() => setSelectedAddress(null)}
        />
      )}

      <section className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 text-sm font-medium uppercase tracking-wide text-blue-600">
                Live listings
              </div>
              <h1 className="text-4xl font-bold text-slate-900">
                Available Food Near You
              </h1>
              <p className="mt-3 max-w-2xl text-slate-600">
                Browse live food donations from local restaurants, stores, and
                other businesses. Claim items before they expire.
              </p>
            </div>

            <div className="w-full md:max-w-md">
              <input
                type="text"
                placeholder="Search by food, restaurant, address, or note"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none ring-0 focus:border-blue-400"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {loading && <p>Loading...</p>}

        {!loading && filteredItems.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">
              No food available right now
            </h2>
            <p className="mt-2 text-slate-600">
              Check back soon as new listings are added in real time.
            </p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    Available
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {item.food_name || item.category}
                  </h2>
                </div>
              </div>

              <div className="space-y-2 text-slate-700">
                <p>
                  <span className="font-semibold">Quantity:</span> {item.quantity}
                </p>
                <p>
                  <span className="font-semibold">From:</span> {item.business_name}
                </p>

                {item.address && (
                  <button
                    onClick={() => setSelectedAddress(item.address!)}
                    className="flex items-start gap-1 text-left group w-full"
                  >
                    <span className="font-semibold text-slate-700 shrink-0">
                      Pickup:
                    </span>
                    <span className="text-blue-600 underline underline-offset-2 group-hover:text-blue-800 transition break-words">
                      {item.address}
                    </span>
                    <span className="text-slate-400 shrink-0 mt-0.5">📍</span>
                  </button>
                )}

                {item.allergy_note && (
                  <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-800">
                    <span className="font-semibold">Food note:</span>{" "}
                    {item.allergy_note}
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/claim/${item.id}`}
                  className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                  Claim Food
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
