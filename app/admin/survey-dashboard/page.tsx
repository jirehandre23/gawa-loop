"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

// ─── UPDATE THESE after sharing your Google Sheets ───────────────────────────
// Sheet → File → Share → "Anyone with the link can view" → copy the Sheet ID
// Sheet ID is the long string in the URL: docs.google.com/spreadsheets/d/SHEET_ID/edit
const BUSINESS_SHEET_ID = "YOUR_BUSINESS_SHEET_ID";
const CUSTOMER_SHEET_ID = "YOUR_CUSTOMER_SHEET_ID";
const BUSINESS_GOAL = 50;
const CUSTOMER_GOAL = 100;
// ─────────────────────────────────────────────────────────────────────────────

type BizRow = {
  date: string;
  time: string;
  businessName: string;
  address: string;
  motivation: string;
  status: string;
  rep: string;
};

type CustRow = {
  date: string;
  [key: string]: string;
};

export default function SurveyDashboard() {
  const [bizData, setBizData]     = useState<BizRow[]>([]);
  const [custData, setCustData]   = useState<CustRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  async function fetchSheet(sheetId: string, setter: (rows: any[]) => void) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=Sheet1`;
      const res  = await fetch(url);
      const text = await res.text();
      const json = JSON.parse(text.replace(/^.*?({.*}).*?$/s, "$1"));
      const cols = json.table.cols.map((c: any) => c.label);
      const rows = json.table.rows.map((r: any) => {
        const obj: any = {};
        r.c.forEach((cell: any, i: number) => {
          obj[cols[i]] = cell?.v ?? "";
        });
        return obj;
      }).filter((r: any) => Object.values(r).some(v => v !== ""));
      setter(rows);
    } catch (_) {
      setter([]);
    }
  }

  async function refresh() {
    setLoading(true);
    await Promise.all([
      fetchSheet(BUSINESS_SHEET_ID, (rows) => {
        setBizData(rows.map((r: any) => ({
          date:         r["Date of Interview"]     || r[Object.keys(r)[0]] || "",
          time:         r["Time of Interview"]     || "",
          businessName: r["Business Name"]         || "",
          address:      r["Business Address"]      || "",
          motivation:   r["1. Motivation: What is the primary reason this business would consider donating?"] || "",
          status:       r["Interview Completion Status"] || "",
          rep:          r["Outreach Representative Name"] || "",
        })));
      }),
      fetchSheet(CUSTOMER_SHEET_ID, (rows) => {
        setCustData(rows);
      }),
    ]);
    setLastRefresh(new Date());
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  const bizCompleted  = bizData.filter(r => r.status?.toLowerCase().includes("completed") && !r.status?.toLowerCase().includes("not") && !r.status?.toLowerCase().includes("partial")).length;
  const bizPartial    = bizData.filter(r => r.status?.toLowerCase().includes("partial")).length;
  const bizAttempted  = bizData.filter(r => r.status?.toLowerCase().includes("not")).length;
  const bizTotal      = bizData.length;
  const custTotal     = custData.length;

  const bizPct  = Math.min(Math.round((bizCompleted / BUSINESS_GOAL) * 100), 100);
  const custPct = Math.min(Math.round((custTotal / CUSTOMER_GOAL) * 100), 100);

  const jireh = bizData.filter(r => r.rep?.toLowerCase().includes("jireh")).length;
  const liam  = bizData.filter(r => r.rep?.toLowerCase().includes("liam")).length;

  const motivationCounts: Record<string, number> = {};
  bizData.forEach(r => {
    if (r.motivation) {
      r.motivation.toString().split(",").forEach(m => {
        const key = m.trim();
        if (key) motivationCounts[key] = (motivationCounts[key] || 0) + 1;
      });
    }
  });
  const topMotivations = Object.entries(motivationCounts).sort((a,b) => b[1]-a[1]).slice(0,4);

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: "16px", border: "1px solid #e5e7eb",
    padding: "24px 28px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  };

  function ProgressBar({ pct, color }: { pct: number; color: string }) {
    return (
      <div style={{ background: "#f1f5f9", borderRadius: "999px", height: "12px", overflow: "hidden", margin: "10px 0" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "999px", transition: "width 1s ease" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#0a2e1a", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width: "34px", height: "34px", objectFit: "contain" }} />
          <span style={{ fontWeight: 800, fontSize: "17px", color: "#fff" }}>GAWA Loop</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {lastRefresh && <span style={{ fontSize: "12px", color: "#a3c9b0" }}>Updated {lastRefresh.toLocaleTimeString()}</span>}
          <button onClick={refresh} disabled={loading}
            style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>
            {loading ? "..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 20px" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: 800, color: "#0a2e1a" }}>📊 Outreach Dashboard</h1>
        <p style={{ margin: "0 0 28px", fontSize: "14px", color: "#6b7280" }}>Live progress toward investor-ready survey goals</p>

        {/* Goal Progress */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>

          {/* Business goal */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>Business Interviews</p>
                <p style={{ margin: 0, fontSize: "40px", fontWeight: 900, color: "#16a34a", lineHeight: 1 }}>
                  {loading ? "—" : bizCompleted}<span style={{ fontSize: "18px", color: "#9ca3af", fontWeight: 600 }}>/{BUSINESS_GOAL}</span>
                </p>
              </div>
              <span style={{ fontSize: "36px" }}>🏪</span>
            </div>
            <ProgressBar pct={bizPct} color="#16a34a" />
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6b7280" }}>
              {bizPct}% complete · {BUSINESS_GOAL - bizCompleted} remaining
            </p>
            {(bizPartial > 0 || bizAttempted > 0) && (
              <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {bizPartial > 0 && <span style={{ background: "#fef9c3", color: "#854d0e", fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px" }}>{bizPartial} partial</span>}
                {bizAttempted > 0 && <span style={{ background: "#fef2f2", color: "#991b1b", fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px" }}>{bizAttempted} attempted</span>}
              </div>
            )}
          </div>

          {/* Customer goal */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>Customer Surveys</p>
                <p style={{ margin: 0, fontSize: "40px", fontWeight: 900, color: "#2563eb", lineHeight: 1 }}>
                  {loading ? "—" : custTotal}<span style={{ fontSize: "18px", color: "#9ca3af", fontWeight: 600 }}>/{CUSTOMER_GOAL}</span>
                </p>
              </div>
              <span style={{ fontSize: "36px" }}>🙋</span>
            </div>
            <ProgressBar pct={custPct} color="#2563eb" />
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6b7280" }}>
              {custPct}% complete · {CUSTOMER_GOAL - custTotal} remaining
            </p>
          </div>
        </div>

        {/* Team breakdown */}
        <div style={{ ...card, marginBottom: "24px" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 800, color: "#0a2e1a" }}>👥 Team Progress</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {[
              { name: "Jireh", count: jireh, color: "#16a34a" },
              { name: "Liam", count: liam, color: "#7c3aed" },
            ].map(rep => (
              <div key={rep.name} style={{ background: "#f9fafb", borderRadius: "12px", padding: "16px 20px", border: "1px solid #e5e7eb" }}>
                <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700, color: "#374151" }}>{rep.name}</p>
                <p style={{ margin: "0 0 8px", fontSize: "28px", fontWeight: 900, color: rep.color }}>{loading ? "—" : rep.count}</p>
                <div style={{ background: "#e5e7eb", borderRadius: "999px", height: "6px" }}>
                  <div style={{ width: `${Math.min((rep.count / BUSINESS_GOAL) * 100, 100)}%`, height: "100%", background: rep.color, borderRadius: "999px" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top motivations */}
        {topMotivations.length > 0 && (
          <div style={{ ...card, marginBottom: "24px" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 800, color: "#0a2e1a" }}>💡 Top Business Motivations</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {topMotivations.map(([label, count]) => (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "13px", color: "#374151", fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#16a34a" }}>{count}</span>
                  </div>
                  <div style={{ background: "#f1f5f9", borderRadius: "999px", height: "8px" }}>
                    <div style={{ width: `${(count / bizTotal) * 100}%`, height: "100%", background: "#16a34a", borderRadius: "999px" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent business interviews */}
        <div style={card}>
          <h2 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 800, color: "#0a2e1a" }}>
            🏪 Recent Business Interviews ({loading ? "..." : bizTotal} total)
          </h2>
          {loading ? (
            <p style={{ color: "#9ca3af", textAlign: "center", padding: "24px" }}>Loading...</p>
          ) : bizTotal === 0 ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <p style={{ fontSize: "32px", marginBottom: "8px" }}>📋</p>
              <p style={{ color: "#6b7280", fontSize: "14px" }}>No responses yet.</p>
              <p style={{ color: "#9ca3af", fontSize: "12px", marginTop: "8px" }}>
                Make sure BUSINESS_SHEET_ID is updated in the code and the sheet is publicly viewable.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                    {["Date", "Business", "Address", "Rep", "Status"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#6b7280", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bizData.slice().reverse().map((row, i) => {
                    const statusColor =
                      row.status?.toLowerCase().includes("not") ? { bg: "#fef2f2", text: "#991b1b" } :
                      row.status?.toLowerCase().includes("partial") ? { bg: "#fef9c3", text: "#854d0e" } :
                      { bg: "#f0fdf4", text: "#166534" };
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }}>
                        <td style={{ padding: "10px 12px", color: "#6b7280" }}>{row.date || "—"}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0a2e1a" }}>{row.businessName || "—"}</td>
                        <td style={{ padding: "10px 12px", color: "#6b7280", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.address || "—"}</td>
                        <td style={{ padding: "10px 12px", color: "#374151" }}>{row.rep || "—"}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ background: statusColor.bg, color: statusColor.text, fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", whiteSpace: "nowrap" }}>
                            {row.status || "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Investor summary box */}
        <div style={{ marginTop: "20px", background: "#0a2e1a", borderRadius: "16px", padding: "24px 28px", color: "#fff" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: "16px", fontWeight: 800, color: "#4ade80" }}>📈 Investor Summary</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {[
              { label: "Businesses surveyed", value: bizCompleted },
              { label: "Customers surveyed", value: custTotal },
              { label: "Total outreach", value: bizTotal + custTotal },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.08)", borderRadius: "12px", padding: "16px" }}>
                <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#a3c9b0", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</p>
                <p style={{ margin: 0, fontSize: "32px", fontWeight: 900, color: "#fff" }}>{loading ? "—" : s.value}</p>
              </div>
            ))}
          </div>
          <p style={{ margin: "16px 0 0", fontSize: "13px", color: "#a3c9b0", lineHeight: 1.6 }}>
            Goal: <b style={{ color: "#fff" }}>{BUSINESS_GOAL} business interviews</b> + <b style={{ color: "#fff" }}>{CUSTOMER_GOAL} customer surveys</b> = validated market demand in Brooklyn.
          </p>
        </div>

      </div>
    </div>
  );
}
