"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_EMAIL = "admin@gawaloop.com";

type BizResult = {
  name: string;
  email: string;
  phone?: string;
  address?: string;
};

export default function AdminBusinessLookup() {
  const [ready, setReady]           = useState(false);  // wait for auth check
  const [authed, setAuthed]         = useState(false);
  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState<BizResult[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [tempPwds, setTempPwds]     = useState<Record<string, string>>({});
  const [messages, setMessages]     = useState<Record<string, string>>({});
  const [working, setWorking]       = useState<Record<string, boolean>>({});

  // Wait for Supabase to restore session before checking
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || session.user.email !== ADMIN_EMAIL) {
        window.location.href = "/business/login";
      } else {
        setAuthed(true);
        setReady(true);
      }
    });
  }, []);

  async function handleSearch(searchQuery?: string) {
    setLoading(true);
    setError("");
    setResults([]);
    const q = (searchQuery ?? query).trim();

    let builder = supabase
      .from("businesses")
      .select("name, email, phone, address")
      .order("name");

    if (q) {
      builder = builder.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
    }

    const { data, error: err } = await builder.limit(30);
    if (err) {
      setError("Search error: " + err.message);
    } else {
      const filtered = (data || []).filter(b => b.email !== ADMIN_EMAIL);
      setResults(filtered);
      if (filtered.length === 0) setError("No businesses found.");
    }
    setLoading(false);
  }

  async function handleSetPassword(email: string) {
    const pwd = tempPwds[email];
    if (!pwd || pwd.length < 6) {
      setMessages(m => ({ ...m, [email]: "❌ Password must be at least 6 characters." }));
      return;
    }
    setWorking(w => ({ ...w, [email]: true }));
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
    const key = email + "_reset";
    setWorking(w => ({ ...w, [key]: true }));
    const res = await fetch("/api/admin/reset-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setMessages(m => ({
      ...m,
      [key]: data.success ? `✅ Reset email sent to ${email}` : `❌ ${data.error}`,
    }));
    setWorking(w => ({ ...w, [key]: false }));
  }

  async function viewDashboard(businessName: string) {
    // Store the business to view in sessionStorage, then go to dashboard
    sessionStorage.setItem("adminViewBusiness", businessName);
    window.location.href = "/business/dashboard";
  }

  const inp: React.CSSProperties = {
    padding: "10px 14px", borderRadius: "8px",
    border: "1px solid #d1d5db", fontSize: "14px",
    color: "#111827", background: "#fff", outline: "none",
  };

  // Show nothing until auth check completes
  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", color: "#6b7280" }}>
        Verifying admin access...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", padding: "32px 16px" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "6px" }}>
          <img src="/gawa-logo-green.png" alt="GAWA" style={{ width: "40px", height: "40px", objectFit: "contain" }} />
          <div>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#0a2e1a" }}>Admin Business Lookup</h1>
            <p style={{ margin: 0, fontSize: "13px", color: "#4b5563" }}>Search · view details · set passwords · send reset emails</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px" }}>
          <span style={{ background: "#0a2e1a", color: "#4ade80", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px" }}>🔑 ADMIN</span>
          <a href="/business/dashboard" style={{ fontSize: "13px", color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>← Back to dashboard</a>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/business/login"; }}
            style={{ marginLeft: "auto", background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
          >
            Sign Out
          </button>
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
              placeholder="e.g. Meee or jirehandre@yahoo.fr"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 22px", borderRadius: "8px", cursor: loading ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 700 }}
            >
              {loading ? "..." : "Search"}
            </button>
            <button
              onClick={() => { setQuery(""); handleSearch(""); }}
              style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}
            >
              All
            </button>
          </div>
        </div>

        {/* Results */}
        {results.map(biz => (
          <div key={biz.email} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "22px 24px", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0a2e1a" }}>{biz.name}</h2>
              <button
                onClick={() => viewDashboard(biz.name)}
                style={{ background: "#16a34a", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}
              >
                👁 View Dashboard
              </button>
            </div>

            <div style={{ fontSize: "14px", color: "#1f2937", lineHeight: "1.9", marginBottom: "18px" }}>
              <p style={{ margin: "2px 0" }}><b>Email:</b> {biz.email}</p>
              <p style={{ margin: "2px 0" }}><b>Phone:</b> {biz.phone || "Not provided"}</p>
              <p style={{ margin: "2px 0" }}><b>Address:</b> {biz.address || "Not provided"}</p>
            </div>

            <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: "16px" }}>
              <p style={{ margin: "0 0 12px", fontSize: "12px", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                Account Actions
              </p>

              {/* Set password */}
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                  Set new password
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <input
                    style={{ ...inp, flex: 1, minWidth: "180px" }}
                    type="text"
                    placeholder="New password (min 6 chars)"
                    value={tempPwds[biz.email] || ""}
                    onChange={e => setTempPwds(p => ({ ...p, [biz.email]: e.target.value }))}
                  />
                  <button
                    onClick={() => handleSetPassword(biz.email)}
                    disabled={working[biz.email]}
                    style={{ background: "#f59e0b", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", cursor: working[biz.email] ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 700 }}
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

              {/* Reset email */}
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
