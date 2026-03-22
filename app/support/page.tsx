'use client'
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function SupportPage() {
  const searchParams = useSearchParams();
  const defaultCode = useMemo(() => searchParams.get("code") || "", [searchParams]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmationCode, setConfirmationCode] = useState(defaultCode);
  const [issueType, setIssueType] = useState("Order issue");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/support-issue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        phone,
        confirmationCode,
        issueType,
        message,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data?.error || "Could not submit issue.");
      setSaving(false);
      return;
    }

    setDone(true);
    setSaving(false);
  }

  if (done) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <div className="max-w-xl mx-auto px-6 py-16">
          <div className="bg-white rounded-2xl shadow p-8 border border-slate-200">
            <h1 className="text-2xl font-bold mb-4">Issue submitted</h1>
            <p className="text-slate-700">
              Your message was sent to admin@gawaloop.com. You should also receive a no-reply confirmation email.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="max-w-xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-6">Report an Issue</h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow p-6 space-y-4 border border-slate-200"
        >
          <div>
            <label className="block font-medium mb-2 text-slate-800">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-2 text-slate-800">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-2 text-slate-800">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
            />
          </div>

          <div>
            <label className="block font-medium mb-2 text-slate-800">Confirmation code</label>
            <input
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
            />
          </div>

          <div>
            <label className="block font-medium mb-2 text-slate-800">Issue type *</label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
            >
              <option>Order issue</option>
              <option>Pickup problem</option>
              <option>Business unavailable</option>
              <option>Wrong item</option>
              <option>Need help</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block font-medium mb-2 text-slate-800">Message *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
              rows={5}
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-red-600 px-5 py-3 text-white font-medium hover:bg-red-700 disabled:bg-slate-400"
          >
            {saving ? "Sending..." : "Send issue"}
          </button>
        </form>
      </div>
    </main>
  );
}
