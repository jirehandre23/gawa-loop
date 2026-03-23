'use client'
import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";

export default function ClaimPage() {
  const params = useParams();
  const id = params.id as string;

  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [etaMinutes, setEtaMinutes] = useState(15);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [foodName, setFoodName] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [appleMapsUrl, setAppleMapsUrl] = useState("");
  const [claimId, setClaimId] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/claim-submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: id, firstName, phone, email, etaMinutes }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data?.error || "Could not complete reservation.");
      setSaving(false);
      return;
    }

    setConfirmationCode(data.code || "");
    setClaimId(data.claimId || "");
    setBusinessName(data.businessName || "");
    setBusinessAddress(data.businessAddress || "");
    setBusinessPhone(data.businessPhone || "");
    setBusinessEmail(data.businessEmail || "");
    setFoodName(data.foodName || "");
    setGoogleMapsUrl(data.googleMapsUrl || "");
    setAppleMapsUrl(data.appleMapsUrl || "");
    setDone(true);
    setSaving(false);
  }

  if (done) {
    const cancelUrl = `/cancel-claim?id=${claimId}&code=${confirmationCode}`;
    return (
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="bg-white rounded-2xl shadow p-8 border border-slate-200">
            <h1 className="text-2xl font-bold mb-2 text-slate-900">✅ Reservation confirmed!</h1>
            <p className="text-slate-600 mb-6">A confirmation email has been sent to <strong>{email}</strong> with your details and a cancel option.</p>

            <div className="rounded-xl border border-green-200 bg-green-50 p-4 mb-6">
              <p className="text-sm text-green-700 mb-1">Confirmation code</p>
              <p className="text-4xl font-bold tracking-widest text-slate-900">{confirmationCode}</p>
            </div>

            <div className="space-y-2 text-slate-800 mb-6">
              <p><strong>🍽️ Food:</strong> {foodName || "Food listing"}</p>
              <p><strong>🏪 Business:</strong> {businessName || "Not available"}</p>
              <p><strong>📍 Address:</strong> {businessAddress || "Not available"}</p>
              <p><strong>📞 Phone:</strong> {businessPhone || "Not available"}</p>
              <p><strong>✉️ Email:</strong> {businessEmail || "Not available"}</p>
            </div>

            {businessAddress && businessAddress !== "Not provided" && (
              <div className="mb-6">
                <p className="font-semibold text-slate-800 mb-3">📍 Get directions:</p>
                <div className="flex flex-wrap gap-3">
                  {googleMapsUrl && (
                    <a href={googleMapsUrl} target="_blank" rel="noreferrer"
                      className="rounded-xl bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-700">
                      Google Maps
                    </a>
                  )}
                  {appleMapsUrl && (
                    <a href={appleMapsUrl} target="_blank" rel="noreferrer"
                      className="rounded-xl bg-slate-800 px-5 py-3 text-white font-medium hover:bg-slate-900">
                      Apple Maps
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 pt-6 flex flex-wrap gap-3">
              <Link href={`/support?code=${encodeURIComponent(confirmationCode)}`}
                className="rounded-xl bg-amber-600 px-4 py-2 text-white hover:bg-amber-700">
                Report an issue
              </Link>
              <a href={cancelUrl}
                className="rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-700">
                Cancel reservation
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="max-w-xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-6 text-slate-900">Claim Food</h1>
        <form onSubmit={handleClaim}
          className="bg-white rounded-2xl shadow p-6 space-y-4 border border-slate-200">
          <div>
            <label className="block font-medium mb-2 text-slate-800">First name *</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900" required />
          </div>
          <div>
            <label className="block font-medium mb-2 text-slate-800">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900" />
          </div>
          <div>
            <label className="block font-medium mb-2 text-slate-800">Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900" required />
          </div>
          <div>
            <label className="block font-medium mb-2 text-slate-800">ETA *</label>
            <select value={etaMinutes} onChange={(e) => setEtaMinutes(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900">
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={20}>20 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
            <p className="text-sm text-slate-600 mt-1">Your estimated arrival time.</p>
          </div>
          <button type="submit" disabled={saving}
            className="rounded-xl bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-700 disabled:bg-slate-400">
            {saving ? "Reserving..." : "Reserve Now"}
          </button>
        </form>
      </div>
    </main>
  );
}
