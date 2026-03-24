"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type BizResult = {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
};

export default function AdminBusinessLookup() {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<BizResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [working, setWorking]   = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== "admin@gawaloop.com") {
        window.location.href = "/business/login";
      }
    }
    checkAdmin();
  }, []);

  async function handleSearch() {
    setLoading(true);
    setError("");
    setResults([]);

    const q = query.trim().toLowerCase();
    let queryBuilder = supabase
      .from("businesses")
      .select("id, name, email, phone, address")
      .order("name");

    if (q) {
      queryBuilder = queryBuilder.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
    }

    const { data, error: err } = await queryBuilder.limit(20);

    if (err) {
      setError("Search error: " + err.message);
    } else {
      setResults(data || []);
      if ((data || []).length === 0) setError("No businesses found.");
    }
    setLoading(false);
  }

  async function handleSetPassword(email: string) {
    const pwd = tempPasswords[email];
    if (!pwd || pwd.length < 6) {
      setMessages(m => ({ ...m, [email]: "❌ Password must be at least 6 characters." }));
      return;
    }
    setWorking(w => ({ ...w, [email]: true }));
    setMessages(m => ({ ...m, [email]: "" }));

    const res = await fetch("/api/admin/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pwd }),
    });
    const data = await res.json();
    setMessages(m => ({
      ...m,
      [email]: data.success ? `✅ Password updated for ${email}` : `❌ ${data.error}`,
    }));
    setWorking(w => ({ ...w, [email]: false }));
  }

  async function handleResetEmail(email: string) {
    setWorking(w => ({ ...w, [email + "_reset"]: true }));
    setMessages(m => ({ ...m, [email + "_reset"]: "" }));

    const res = await fetch("/api/admin/reset-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setMessages(m => ({
      ...m,
      [email + "_reset"]: data.success
        ? `✅ Reset email sent to ${email}`
        : `❌ ${data.error}`,
    }));
    setWorking(w => ({ ...w, [email + "_reset"]: false }));
  }

  const inp: React.CSSProperties = {
    padding: "10px 14px", borderRadius: "8px",
    border: "1px solid #d1d5db", fontSize: "14px",
    color: "#111827", background: "#fff", outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", padding: "32px 16px" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "8px" }}>
          <img src="/gawa-logo-green.png" alt="GAWA" style={{ width: "40px", height: "40px", objectFit: "contain" }} />
          <div>
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "#0a2e1a" }}>Admin Business Lookup</h1>
            <p style={{ margin: 0, fontSize: "13px", color: "#4b5563" }}>
              Search businesses · view details · set passwords · send reset emails
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <span style={{ background: "#0a2e1a", color: "#4ade80", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px" }}>
            🔑 ADMIN ACCESS
          </span>
          <a href="/business/dashboard" style={{ fontSize: "13px", color: "#2563eb", textDecoration: "none" }}>
            ← Back to dashboard
          </a>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px" }}>
            <p style={{ margin: 0, color: "#991b1b", fontSize: "14px", fontWeight: 500 }}>{error}</p>
          </div>
        )}

        {/* Search */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "20px 24px", marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>
            Search by business name or email
          </label>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              style={{ ...inp, flex: 1 }}
              placeholder="e.g. january or jirehandre121@gmail.com"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 22px", borderRadius: "8px", cursor: loading ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 700 }}
            >
              {loading ? "Searching..." : "Search"}
            </button>
            <button
              onClick={() => { setQuery(""); handleSearch(); }}
              style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}
            >
              All
            </button>
          </div>
        </div>

        {/* Results */}
        {results.map(biz => (
          <div key={biz.email} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "22px 24px", marginBottom: "14px" }}>

            {/* Business info */}
            <h2 style={{ margin: "0 0 12px", fontSize: "20px", fontWeight: 800, color: "#0a2e1a" }}>{biz.name}</h2>
            <div style={{ fontSize: "14px", color: "#1f2937", lineHeight: "1.9", marginBottom: "18px" }}>
              <p style={{ margin: "2px 0" }}><b>Email:</b> {biz.email}</p>
              <p style={{ margin: "2px 0" }}><b>Phone:</b> {biz.phone || "Not provided"}</p>
              <p style={{ margin: "2px 0" }}><b>Address:</b> {biz.address || "Not provided"}</p>
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: "16px" }}>
              <p style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                Account Actions
              </p>

              {/* Set temp password */}
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                  Set new password for this account
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <input
                    style={{ ...inp, flex: 1, minWidth: "200px" }}
                    type="text"
                    placeholder="New password (min 6 chars)"
                    value={tempPasswords[biz.email] || ""}
                    onChange={e => setTempPasswords(p => ({ ...p, [biz.email]: e.target.value }))}
                  />
                  <button
                    onClick={() => handleSetPassword(biz.email)}
                    disabled={working[biz.email]}
                    style={{ background: "#f59e0b", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", cursor: working[biz.email] ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 700, whiteSpace: "nowrap" }}
                  >
                    {working[biz.email] ? "Saving..." : "Set Password"}
                  </button>
                </div>
                {messages[biz.email] && (
                  <p style={{ margin: "6px 0 0", fontSize: "13px", fontWeight: 600, color: messages[biz.email].startsWith("✅") ? "#16a34a" : "#dc2626" }}>
                    {messages[biz.email]}
                  </p>
                )}
              </div>

              {/* Send reset email */}
              <div>
                <button
                  onClick={() => handleResetEmail(biz.email)}
                  disabled={working[biz.email + "_reset"]}
                  style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: working[biz.email + "_reset"] ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 700 }}
                >
                  {working[biz.email + "_reset"] ? "Sending..." : "📧 Send Password Reset Email"}
                </button>
                {messages[biz.email + "_reset"] && (
                  <p style={{ margin: "6px 0 0", fontSize: "13px", fontWeight: 600, color: messages[biz.email + "_reset"].startsWith("✅") ? "#16a34a" : "#dc2626" }}>
                    {messages[biz.email + "_reset"]}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
