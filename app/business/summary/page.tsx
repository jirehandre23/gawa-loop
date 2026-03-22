'use client'

import { useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function ClaimPage() {
  const params = useParams();
  const id = params.id as string;

  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [etaMinutes, setEtaMinutes] = useState(10);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const { data: listing } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .single();

    if (!listing || listing.status !== "AVAILABLE") {
      alert("This food is no longer available.");
      setSaving(false);
      return;
    }

    if (listing.listing_expires_at && new Date(listing.listing_expires_at).getTime() <= Date.now()) {
      alert("This listing has expired.");
      setSaving(false);
      return;
    }

    const holdMinutes = listing.claim_hold_minutes || 10;
    const reservedUntil = new Date(Date.now() + holdMinutes * 60 * 1000).toISOString();

    const { error: claimError } = await supabase.from("claims").insert({
      listing_id: id,
      first_name: firstName,
      phone,
      email,
      eta_minutes: Number(etaMinutes),
      confirmation_code: code
    });

    if (claimError) {
      alert("Could not create claim.");
      setSaving(false);
      return;
    }

    const { error: listingError } = await supabase
      .from("listings")
      .update({
        status: "RESERVED",
        reserved_until: reservedUntil,
        claim_code: code
      })
      .eq("id", id)
      .eq("status", "AVAILABLE");

    if (listingError) {
      alert("Could not reserve this item.");
      setSaving(false);
      return;
    }

    setConfirmationCode(code);
    setDone(true);
    setSaving(false);
  }

  if (done) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-xl mx-auto px-6 py-16">
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Reserved successfully</h1>
            <p className="text-gray-600 mb-4">
              Show this confirmation code at pickup.
            </p>
            <p className="text-4xl font-bold tracking-widest mb-4">
              {confirmationCode}
            </p>
            <p className="text-sm text-gray-500">
              Your reservation is held briefly based on the business setting.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-6">Claim Food</h1>

        <form onSubmit={handleClaim} className="bg-white rounded-2xl shadow p-6 space-y-4">
          <div>
            <label className="block font-medium mb-2">First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-2">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
            />
          </div>

          <div>
            <label className="block font-medium mb-2">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
            />
          </div>

          <div>
            <label className="block font-medium mb-2">ETA</label>
            <select
              value={etaMinutes}
              onChange={(e) => setEtaMinutes(Number(e.target.value))}
              className="w-full rounded-xl border px-4 py-3"
            >
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={20}>20 minutes</option>
              <option value={30}>30 minutes</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? "Reserving..." : "Reserve Now"}
          </button>
        </form>
      </div>
    </main>
  );
}