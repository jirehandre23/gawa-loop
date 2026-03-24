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
  const [authState, setAuthState] = useState<"checking"|"admin"|"denied"|"loggedout">("checking");
  const [currentEmail, setCurrentEmail] = useState("");
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<BizResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [tempPwds, setTempPwds] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [working, setWorking]   = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Use onAuthStateChange which fires reliably once session is restored
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAuthState("loggedout");
      } else if (session.user.email === ADMIN_EMAIL) {
        setCurrentEmail(session.user.email);
        setAuthState("admin");
      } else {
        setCurrentEmail(session.user.email || "");
        setAuthState("denied");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSearch(sq?: string) {
    setLoading(true);
    setError("");
    setResults([]);
    const q = (sq ?? query).trim();
    let builder = supabase.from("businesses").select("name, email, phone, address").order("name");
    if (q) builder = builder.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
    const { data, error: err } = await builder.limit(30);
    if (err) {
      setError("Search error: " + err.message);
    } else {
      const filtered = (data || []).filter((b: any) => b.email !== ADMIN_EMAIL);
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
    setMessages(m => ({ ...m, [email]: data.success ? `✅ Password updated` : `❌ ${data.error}` }));
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
    setMessages(m => ({ ...m, [key]: data.success ? `✅ Reset email sent` : `❌ ${data.error}` }));
    setWorking(w => ({ ...w, [key]: false }));
  }

  const inp: React.CSSProperties = {
    padding: "10px 14px", borderRadius: "8px",
    border: "1px solid #d1d5db", fontSize: "14px",
    color: "#111827", background: "#fff", outline: "none",
  };

  // ── Auth States ──────────────────────────────────────
  if (authState === "checking") {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"sans-serif" }}>
        <div style={{ textAlign:"center" }}>
          <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width:"48px", height:"48px", objectFit:"contain", marginBottom:"16px" }} />
          <p style={{ color:"#6b7280", fontSize:"15px" }}>Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (authState === "loggedout") {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"sans-serif", padding:"24px" }}>
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:"16px", padding:"40px", maxWidth:"400px", width:"100%", textAlign:"center" }}>
          <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width:"48px", height:"48px", objectFit:"contain", marginBottom:"16px" }} />
          <h2 style={{ margin:"0 0 8px", color:"#0a2e1a", fontWeight:800 }}>Admin Login Required</h2>
          <p style={{ color:"#6b7280", fontSize:"14px", marginBottom:"24px" }}>You need to be logged in as admin to access this page.</p>
          <a href="/business/login" style={{ display:"inline-block", background:"#16a34a", color:"#fff", padding:"12px 28px", borderRadius:"10px", textDecoration:"none", fontWeight:700, fontSize:"15px" }}>
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (authState === "denied") {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"sans-serif", padding:"24px" }}>
        <div style={{ background:"#fff", border:"1px solid #fecaca", borderRadius:"16px", padding:"40px", maxWidth:"440px", width:"100%", textAlign:"center" }}>
          <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width:"48px", height:"48px", objectFit:"contain", marginBottom:"16px" }} />
          <h2 style={{ margin:"0 0 8px", color:"#991b1b", fontWeight:800 }}>Access Denied</h2>
          <p style={{ color:"#374151", fontSize:"14px", marginBottom:"8px" }}>
            You are logged in as <b>{currentEmail}</b>
          </p>
          <p style={{ color:"#6b7280", fontSize:"14px", marginBottom:"24px" }}>
            This page is only accessible with the admin account.<br/>
            Sign out and log in as <b>admin@gawaloop.com</b>.
          </p>
          <div style={{ display:"flex", gap:"10px", justifyContent:"center", flexWrap:"wrap" }}>
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/business/login"; }}
              style={{ background:"#16a34a", color:"#fff", border:"none", padding:"12px 24px", borderRadius:"10px", cursor:"pointer", fontWeight:700, fontSize:"15px" }}
            >
              Sign Out & Switch Account
            </button>
            <a href="/business/dashboard" style={{ display:"inline-block", background:"#f3f4f6", color:"#374151", border:"1px solid #e5e7eb", padding:"12px 20px", borderRadius:"10px", textDecoration:"none", fontWeight:600, fontSize:"14px" }}>
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Admin Panel ──────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:"#f3f4f6", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", padding:"32px 16px" }}>
      <div style={{ maxWidth:"720px", margin:"0 auto" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:"14px", marginBottom:"6px" }}>
          <img src="/gawa-logo-green.png" alt="GAWA" style={{ width:"40px", height:"40px", objectFit:"contain" }} />
          <div>
            <h1 style={{ margin:0, fontSize:"22px", fontWeight:800, color:"#0a2e1a" }}>Admin Business Lookup</h1>
            <p style={{ margin:0, fontSize:"13px", color:"#4b5563" }}>Search · view details · set passwords · send reset emails</p>
          </div>
        </div>
        <div style={{ display:"flex", gap:"12px", alignItems:"center", marginBottom:"20px" }}>
          <span style={{ background:"#0a2e1a", color:"#4ade80", fontSize:"11px", fontWeight:700, padding:"3px 10px", borderRadius:"6px" }}>🔑 ADMIN</span>
          <a href="/business/dashboard" style={{ fontSize:"13px", color:"#2563eb", textDecoration:"none", fontWeight:500 }}>← Business Dashboard</a>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/business/login"; }}
            style={{ marginLeft:"auto", background:"#f3f4f6", color:"#374151", border:"1px solid #e5e7eb", padding:"6px 14px", borderRadius:"6px", cursor:"pointer", fontSize:"13px" }}
          >
            Sign Out
          </button>
        </div>

        {error && (
          <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"10px", padding:"12px 16px", marginBottom:"16px" }}>
            <p style={{ margin:0, color:"#991b1b", fontSize:"14px", fontWeight:500 }}>{error}</p>
          </div>
        )}

        {/* Search */}
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:"14px", padding:"20px 24px", marginBottom:"20px" }}>
          <label style={{ display:"block", fontSize:"14px", fontWeight:700, color:"#111827", marginBottom:"8px" }}>
            Search by business name or email
          </label>
          <div style={{ display:"flex", gap:"10px" }}>
            <input style={{ ...inp, flex:1 }}
              placeholder="e.g. Meee or jirehandre@yahoo.fr"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
            <button onClick={() => handleSearch()} disabled={loading}
              style={{ background:"#2563eb", color:"#fff", border:"none", padding:"10px 22px", borderRadius:"8px", cursor:loading?"not-allowed":"pointer", fontSize:"14px", fontWeight:700 }}>
              {loading ? "..." : "Search"}
            </button>
            <button onClick={() => { setQuery(""); handleSearch(""); }}
              style={{ background:"#f3f4f6", color:"#374151", border:"1px solid #e5e7eb", padding:"10px 16px", borderRadius:"8px", cursor:"pointer", fontSize:"14px" }}>
              All
            </button>
          </div>
        </div>

        {/* Results */}
        {results.map(biz => (
          <div key={biz.email} style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:"14px", padding:"22px 24px", marginBottom:"14px" }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"12px", flexWrap:"wrap", gap:"10px" }}>
              <h2 style={{ margin:0, fontSize:"20px", fontWeight:800, color:"#0a2e1a" }}>{biz.name}</h2>
            </div>
            <div style={{ fontSize:"14px", color:"#1f2937", lineHeight:"1.9", marginBottom:"18px" }}>
              <p style={{ margin:"2px 0" }}><b>Email:</b> {biz.email}</p>
              <p style={{ margin:"2px 0" }}><b>Phone:</b> {biz.phone || "Not provided"}</p>
              <p style={{ margin:"2px 0" }}><b>Address:</b> {biz.address || "Not provided"}</p>
            </div>
            <div style={{ borderTop:"1px solid #f0f0f0", paddingTop:"16px" }}>
              <p style={{ margin:"0 0 12px", fontSize:"12px", fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:"0.6px" }}>Account Actions</p>
              <div style={{ marginBottom:"12px" }}>
                <label style={{ display:"block", fontSize:"13px", fontWeight:600, color:"#374151", marginBottom:"6px" }}>Set new password</label>
                <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                  <input style={{ ...inp, flex:1, minWidth:"180px" }} type="text"
                    placeholder="New password (min 6 chars)"
                    value={tempPwds[biz.email] || ""}
                    onChange={e => setTempPwds(p => ({ ...p, [biz.email]: e.target.value }))} />
                  <button onClick={() => handleSetPassword(biz.email)} disabled={working[biz.email]}
                    style={{ background:"#f59e0b", color:"#fff", border:"none", padding:"10px 18px", borderRadius:"8px", cursor:working[biz.email]?"not-allowed":"pointer", fontSize:"14px", fontWeight:700 }}>
                    {working[biz.email] ? "Saving..." : "Set Password"}
                  </button>
                </div>
                {messages[biz.email] && (
                  <p style={{ margin:"6px 0 0", fontSize:"13px", fontWeight:600, color:messages[biz.email].startsWith("✅")?"#16a34a":"#dc2626" }}>
                    {messages[biz.email]}
                  </p>
                )}
              </div>
              <div>
                <button onClick={() => handleResetEmail(biz.email)} disabled={working[biz.email+"_reset"]}
                  style={{ background:"#2563eb", color:"#fff", border:"none", padding:"10px 20px", borderRadius:"8px", cursor:working[biz.email+"_reset"]?"not-allowed":"pointer", fontSize:"14px", fontWeight:700 }}>
                  {working[biz.email+"_reset"] ? "Sending..." : "📧 Send Password Reset Email"}
                </button>
                {messages[biz.email+"_reset"] && (
                  <p style={{ margin:"6px 0 0", fontSize:"13px", fontWeight:600, color:messages[biz.email+"_reset"].startsWith("✅")?"#16a34a":"#dc2626" }}>
                    {messages[biz.email+"_reset"]}
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
