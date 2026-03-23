"use client";

import { useState } from "react";

type Business = {
  id?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

export default function AdminBusinessLookupPage() {
  const [query, setQuery] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({});

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    try {
      const res = await fetch("/api/admin/business-lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "search",
          query,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data?.error || "Could not search businesses.");
        setBusinesses([]);
        setLoading(false);
        return;
      }

      setBusinesses(data.businesses || []);
      if ((data.businesses || []).length === 0) {
        setMessage("No matching businesses found.");
      }
    } catch (error: any) {
      setErrorMessage(error?.message || "Could not search businesses.");
    } finally {
      setLoading(false);
    }
  }

  async function sendReset(email: string) {
    setMessage("");
    setErrorMessage("");

    try {
      const res = await fetch("/api/admin/business-lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "send_reset",
          email,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data?.error || "Could not send reset email.");
        return;
      }

      setMessage(`Password reset email sent to ${email}.`);
    } catch (error: any) {
      setErrorMessage(error?.message || "Could not send reset email.");
    }
  }

  async function setTemporaryPassword(email: string) {
    setMessage("");
    setErrorMessage("");

    const temporaryPassword = tempPasswords[email] || "";

    if (!temporaryPassword) {
      setErrorMessage("Please enter a temporary password first.");
      return;
    }

    try {
      const res = await fetch("/api/admin/business-lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "set_temp_password",
          email,
          temporaryPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data?.error || "Could not set temporary password.");
        return;
      }

      setMessage(`Temporary password updated for ${email}.`);
      setTempPasswords((prev) => ({
        ...prev,
        [email]: "",
      }));
    } catch (error: any) {
      setErrorMessage(error?.message || "Could not set temporary password.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="mb-2 text-3xl font-bold">Admin Business Lookup</h1>
        <p className="mb-6 text-slate-700">
          Search businesses by name or email, view address/contact details, send a reset email, or set a temporary password.
        </p>

        {errorMessage ? (
          <div className="mb-4 rounded-xl border border-red-400 bg-red-100 px-4 py-3 text-red-800">
            {errorMessage}
          </div>
        ) : null}

        {message ? (
          <div className="mb-4 rounded-xl border border-green-400 bg-green-100 px-4 py-3 text-green-800">
            {message}
          </div>
        ) : null}

        <form
          onSubmit={handleSearch}
          className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow"
        >
          <label className="mb-2 block font-medium">Search by name or email</label>
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
              placeholder="Example: january or january@email.com"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:bg-slate-400"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        <div className="grid gap-4">
          {businesses.map((business) => {
            const email = business.email || "";

            return (
              <div
                key={`${business.id || business.email || business.name}`}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow"
              >
                <h2 className="mb-3 text-2xl font-semibold">
                  {business.name || "Unnamed business"}
                </h2>

                <div className="space-y-2 text-slate-800">
                  <p><strong>Email:</strong> {business.email || "Not provided"}</p>
                  <p><strong>Phone:</strong> {business.phone || "Not provided"}</p>
                  <p><strong>Address:</strong> {business.address || "Not provided"}</p>
                </div>

                {email ? (
                  <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                    <input
                      type="text"
                      value={tempPasswords[email] || ""}
                      onChange={(e) =>
                        setTempPasswords((prev) => ({
                          ...prev,
                          [email]: e.target.value,
                        }))
                      }
                      className="rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                      placeholder="Temporary password"
                    />

                    <button
                      type="button"
                      onClick={() => setTemporaryPassword(email)}
                      className="rounded-xl bg-amber-600 px-5 py-3 font-medium text-white hover:bg-amber-700"
                    >
                      Set Temporary Password
                    </button>

                    <button
                      type="button"
                      onClick={() => sendReset(email)}
                      className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
                    >
                      Send Reset Email
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
