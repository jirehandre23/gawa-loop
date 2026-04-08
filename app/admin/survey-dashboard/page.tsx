"use client";
import { useEffect, useState } from "react";

const BUSINESS_SHEET_ID = "1VQ4UiEE74FLdXPQwEPz-uFoA1byHleyVX8RUVdU0nLk";
const CUSTOMER_SHEET_ID = "1Xm83TUkKrBrbiUgmHrl6iDh5441Yro3wZLUD7SpKrgc";
const BUSINESS_GOAL = 50;
const CUSTOMER_GOAL = 100;

type SheetRow = Record<string, string>;
type SheetResult = { cols: string[]; rows: SheetRow[] };

type BizRow = {
  date: string; businessName: string; address: string;
  status: string; rep: string; motivation: string; barriers: string;
};

type CustRow = SheetRow;

export default function SurveyDashboard() {
  const [bizData, setBizData]         = useState<BizRow[]>([]);
  const [custData, setCustData]       = useState<CustRow[]>([]);
  const [custCols, setCustCols]       = useState<string[]>([]);
  const [loading, setLoading]         = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [activeTab, setActiveTab]     = useState<"business" | "customer">("business");

  async function fetchSheet(sheetId: string, gid: string): Promise<SheetResult> {
    try {
      const url   = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
      const res   = await fetch(url);
      const text  = await res.text();
      const start = text.indexOf("{");
      const end   = text.lastIndexOf("}");
      const json  = JSON.parse(text.slice(start, end + 1));
      const cols: string[] = (json.table?.cols || []).map((c: { label: string }) => c.label);
      const rows: SheetRow[] = (json.table?.rows || [])
        .map((r: { c: Array<{ v: unknown } | null> }) => {
          const obj: SheetRow = {};
          (r.c || []).forEach((cell, i) => {
            obj[cols[i]] = cell?.v != null ? String(cell.v) : "";
          });
          return obj;
        })
        .filter((r: SheetRow) => Object.values(r).some((v) => v !== ""));
      return { cols, rows };
    } catch {
      return { cols: [], rows: [] };
    }
  }

  async function refresh() {
    setLoading(true);

    const biz = await fetchSheet(BUSINESS_SHEET_ID, "728361962");
    setBizData(
      biz.rows.map((r: SheetRow): BizRow => ({
        date:         r["Date of Interview"] || r[biz.cols[0]] || "",
        businessName: r["Business Name"] || "",
        address:      r["Business Address"] || "",
        motivation:   r["1. Motivation: What is the primary reason this business would consider donating?"] || "",
        barriers:     r["3. Barriers: What challenges or concerns might prevent them from donating?"] || "",
        status:       r["Interview Completion Status"] || "",
        rep:          r["Outreach Representative Name"] || "",
      }))
    );

    const cust = await fetchSheet(CUSTOMER_SHEET_ID, "1882785104");
    setCustData(cust.rows);
    setCustCols(cust.cols);

    setLastRefresh(new Date());
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  const bizCompleted = bizData.filter((r) => {
    const s = r.status?.toLowerCase() || "";
    return s.includes("completed") && !s.includes("not") && !s.includes("partial");
  }).length;
  const bizPartial   = bizData.filter((r) => r.status?.toLowerCase().includes("partial")).length;
  const bizAttempted = bizData.filter((r) => r.status?.toLowerCase().includes("not")).length;
  const bizTotal     = bizData.length;
  const bizPct       = Math.min(Math.round((bizCompleted / BUSINESS_GOAL) * 100), 100);

  const custTotal = custData.length;
  const custPct   = Math.min(Math.round((custTotal / CUSTOMER_GOAL) * 100), 100);

  const jireh = bizData.filter((r) => r.rep?.toLowerCase().includes("jireh")).length;
  const liam  = bizData.filter((r) => r.rep?.toLowerCase().includes("liam")).length;

  const motivCounts: Record<string, number> = {};
  bizData.forEach((r) => {
    (r.motivation || "").split(",").forEach((m) => {
      const k = m.trim();
      if (k) motivCounts[k] = (motivCounts[k] || 0) + 1;
    });
  });
  const topMotivations = Object.entries(motivCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const barrierCounts: Record<string, number> = {};
  bizData.forEach((r) => {
    (r.barriers || "").split(",").forEach((b) => {
      const k = b.trim();
      if (k) barrierCounts[k] = (barrierCounts[k] || 0) + 1;
    });
  });
  const topBarriers = Object.entries(barrierCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const custAnalysisCols = custCols.filter(c =>
    c && !c.toLowerCase().includes("timestamp") && !c.toLowerCase().includes("email")
  ).slice(0, 6);

  function getColBreakdown(col: string): Record<string, number> {
    const counts: Record<string, number> = {};
    custData.forEach((r) => {
      const val = r[col]?.trim();
      if (val) counts[val] = (counts[val] || 0) + 1;
    });
    return counts;
  }

  function ProgressBar({ pct, color }: { pct: number; color: string }) {
    return (
      <div style={{ background: "#f1f5f9", borderRadius: "999px", height: "12px", overflow: "hidden", margin: "10px 0" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "999px", transition: "width 1.2s ease" }} />
      </div>
    );
  }

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: "16px", border: "1px solid #e5e7eb",
    padding: "24px 28px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  };

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: "10px 24px", borderRadius: "10px", border: "none", cursor: "pointer",
    fontWeight: 700, fontSize: "14px",
    background: active ? "#16a34a" : "#f1f5f9",
    color: active ? "#fff" : "#6b7280",
    transition: "all 0.2s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* Header — CHANGED: added Admin Panel link */}
      <div style={{ background: "#0a2e1a", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width: "34px", height: "34px", objectFit: "contain" }} />
          <span style={{ fontWeight: 800, fontSize: "17px", color: "#fff" }}>GAWA Loop</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {lastRefresh && <span style={{ fontSize: "12px", color: "#a3c9b0" }}>Updated {lastRefresh.toLocaleTimeString()}</span>}
          <a href="/admin/business-lookup" style={{ background: "rgba(255,255,255,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)", borderRadius: "8px", padding: "8px 18px", textDecoration: "none", fontSize: "13px", fontWeight: 700 }}>🔑 Admin Panel</a>
          <button onClick={refresh} disabled={loading}
            style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 18px", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>
            {loading ? "..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "32px 20px" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: 800, color: "#0a2e1a" }}>📊 Outreach Dashboard</h1>
        <p style={{ margin: "0 0 24px", fontSize: "14px", color: "#6b7280" }}>Live progress toward investor-ready survey goals — Brooklyn, NY</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.6px" }}>Business Interviews</p>
                <p style={{ margin: 0, fontSize: "44px", fontWeight: 900, color: "#16a34a", lineHeight: 1 }}>
                  {loading ? "—" : bizCompleted}
                  <span style={{ fontSize: "18px", color: "#9ca3af", fontWeight: 500 }}>/{BUSINESS_GOAL}</span>
                </p>
              </div>
              <span style={{ fontSize: "40px" }}>🏪</span>
            </div>
            <ProgressBar pct={bizPct} color="#16a34a" />
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6b7280" }}>
              {bizPct}% of goal · <b>{BUSINESS_GOAL - bizCompleted}</b> remaining
            </p>
            <div style={{ marginTop: "10px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {bizPartial > 0 && <span style={{ background: "#fef9c3", color: "#854d0e", fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px" }}>{bizPartial} partial</span>}
              {bizAttempted > 0 && <span style={{ background: "#fef2f2", color: "#991b1b", fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px" }}>{bizAttempted} attempted</span>}
              {bizTotal > 0 && <span style={{ background: "#f0f9ff", color: "#0369a1", fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px" }}>{bizTotal} total contacts</span>}
            </div>
          </div>

          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.6px" }}>Customer Surveys</p>
                <p style={{ margin: 0, fontSize: "44px", fontWeight: 900, color: "#2563eb", lineHeight: 1 }}>
                  {loading ? "—" : custTotal}
                  <span style={{ fontSize: "18px", color: "#9ca3af", fontWeight: 500 }}>/{CUSTOMER_GOAL}</span>
                </p>
              </div>
              <span style={{ fontSize: "40px" }}>🙋</span>
            </div>
            <ProgressBar pct={custPct} color="#2563eb" />
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6b7280" }}>
              {custPct}% of goal · <b>{CUSTOMER_GOAL - custTotal}</b> remaining
            </p>
            {custTotal === 0 && (
              <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#f59e0b", fontWeight: 600 }}>
                ⚠️ Make sure your Customer Sheet is set to "Anyone with the link can view"
              </p>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          <button style={tabBtn(activeTab === "business")} onClick={() => setActiveTab("business")}>🏪 Business</button>
          <button style={tabBtn(activeTab === "customer")} onClick={() => setActiveTab("customer")}>🙋 Customers</button>
        </div>

        {activeTab === "business" && (
          <>
            <div style={{ ...card, marginBottom: "20px" }}>
              <h2 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 800, color: "#0a2e1a" }}>👥 Team Progress</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {[
                  { name: "Jireh", count: jireh, color: "#16a34a", emoji: "💚" },
                  { name: "Liam",  count: liam,  color: "#7c3aed", emoji: "💜" },
                ].map((rep) => (
                  <div key={rep.name} style={{ background: "#f9fafb", borderRadius: "12px", padding: "18px 20px", border: "1px solid #e5e7eb" }}>
                    <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700, color: "#374151" }}>{rep.emoji} {rep.name}</p>
                    <p style={{ margin: "0 0 10px", fontSize: "32px", fontWeight: 900, color: rep.color }}>
                      {loading ? "—" : rep.count}
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "#9ca3af" }}> interviews</span>
                    </p>
                    <div style={{ background: "#e5e7eb", borderRadius: "999px", height: "6px" }}>
                      <div style={{ width: `${Math.min((rep.count / BUSINESS_GOAL) * 100, 100)}%`, height: "100%", background: rep.color, borderRadius: "999px", transition: "width 1.2s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {(topMotivations.length > 0 || topBarriers.length > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                {topMotivations.length > 0 && (
                  <div style={card}>
                    <h2 style={{ margin: "0 0 14px", fontSize: "15px", fontWeight: 800, color: "#0a2e1a" }}>💡 Why Businesses Join</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {topMotivations.map(([label, count]) => (
                        <div key={label}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                            <span style={{ fontSize: "12px", color: "#374151", lineHeight: 1.3, flex: 1, paddingRight: "8px" }}>{label}</span>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#16a34a", flexShrink: 0 }}>{count}</span>
                          </div>
                          <div style={{ background: "#f1f5f9", borderRadius: "999px", height: "6px" }}>
                            <div style={{ width: `${bizTotal > 0 ? (count / bizTotal) * 100 : 0}%`, height: "100%", background: "#16a34a", borderRadius: "999px" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {topBarriers.length > 0 && (
                  <div style={card}>
                    <h2 style={{ margin: "0 0 14px", fontSize: "15px", fontWeight: 800, color: "#0a2e1a" }}>⚠️ Top Barriers</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {topBarriers.map(([label, count]) => (
                        <div key={label}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                            <span style={{ fontSize: "12px", color: "#374151", lineHeight: 1.3, flex: 1, paddingRight: "8px" }}>{label}</span>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#ef4444", flexShrink: 0 }}>{count}</span>
                          </div>
                          <div style={{ background: "#f1f5f9", borderRadius: "999px", height: "6px" }}>
                            <div style={{ width: `${bizTotal > 0 ? (count / bizTotal) * 100 : 0}%`, height: "100%", background: "#ef4444", borderRadius: "999px" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ ...card, marginBottom: "20px" }}>
              <h2 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 800, color: "#0a2e1a" }}>
                Recent Interviews ({loading ? "..." : bizTotal} total)
              </h2>
              {loading ? (
                <p style={{ color: "#9ca3af", textAlign: "center", padding: "32px" }}>Loading...</p>
              ) : bizTotal === 0 ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <p style={{ fontSize: "40px", margin: "0 0 8px" }}>📋</p>
                  <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>No responses yet — go hit the streets! 🚶</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                        {["Date", "Business", "Address", "Rep", "Status"].map((h) => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#9ca3af", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...bizData].reverse().map((row, i) => {
                        const s = row.status?.toLowerCase() || "";
                        const st =
                          s.includes("not")        ? { bg: "#fef2f2", text: "#991b1b", label: "Not completed" } :
                          s.includes("partial")    ? { bg: "#fef9c3", text: "#854d0e", label: "Partial" } :
                          s.includes("completed")  ? { bg: "#f0fdf4", text: "#166534", label: "Completed" } :
                          { bg: "#f9fafb", text: "#6b7280", label: row.status || "—" };
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }}>
                            <td style={{ padding: "10px 12px", color: "#9ca3af", whiteSpace: "nowrap" }}>{row.date || "—"}</td>
                            <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0a2e1a" }}>{row.businessName || "—"}</td>
                            <td style={{ padding: "10px 12px", color: "#6b7280", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.address || "—"}</td>
                            <td style={{ padding: "10px 12px", color: "#374151" }}>{row.rep || "—"}</td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{ background: st.bg, color: st.text, fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", whiteSpace: "nowrap" }}>{st.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "customer" && (
          <>
            {custTotal === 0 ? (
              <div style={{ ...card, textAlign: "center", padding: "60px" }}>
                <p style={{ fontSize: "48px", margin: "0 0 12px" }}>🙋</p>
                <h3 style={{ margin: "0 0 8px", color: "#0a2e1a", fontWeight: 800, fontSize: "18px" }}>No customer responses yet</h3>
                <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 16px" }}>
                  Make sure the Customer Google Sheet is set to<br /><b>"Anyone with the link can view"</b>
                </p>
                <p style={{ color: "#9ca3af", fontSize: "13px", margin: 0 }}>
                  Sheet ID: 1Xm83TUkKrBrbiUgmHrl6iDh5441Yro3wZLUD7SpKrgc
                </p>
              </div>
            ) : (
              <>
                {custAnalysisCols.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                    {custAnalysisCols.map((col) => {
                      const breakdown = getColBreakdown(col);
                      const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]).slice(0, 5);
                      if (entries.length === 0) return null;
                      return (
                        <div key={col} style={card}>
                          <h2 style={{ margin: "0 0 14px", fontSize: "13px", fontWeight: 800, color: "#0a2e1a", lineHeight: 1.4 }}>{col}</h2>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {entries.map(([label, count]) => (
                              <div key={label}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                  <span style={{ fontSize: "12px", color: "#374151", flex: 1, paddingRight: "8px", lineHeight: 1.3 }}>{label}</span>
                                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#2563eb", flexShrink: 0 }}>{count}</span>
                                </div>
                                <div style={{ background: "#f1f5f9", borderRadius: "999px", height: "5px" }}>
                                  <div style={{ width: `${custTotal > 0 ? (count / custTotal) * 100 : 0}%`, height: "100%", background: "#2563eb", borderRadius: "999px" }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={card}>
                  <h2 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 800, color: "#0a2e1a" }}>
                    All Responses ({custTotal} total)
                  </h2>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                          {custCols.slice(0, 6).map((col) => (
                            <th key={col} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#9ca3af", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {col.length > 30 ? col.slice(0, 30) + "…" : col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...custData].reverse().map((row, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }}>
                            {custCols.slice(0, 6).map((col) => (
                              <td key={col} style={{ padding: "9px 12px", color: "#374151", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {row[col] || "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        <div style={{ background: "#0a2e1a", borderRadius: "20px", padding: "28px 32px", marginTop: "20px" }}>
          <p style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.6px" }}>📈 Investor Summary</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "20px" }}>
            {[
              { label: "Businesses surveyed", value: bizCompleted, icon: "🏪" },
              { label: "Customers surveyed",  value: custTotal,    icon: "🙋" },
              { label: "Total outreach",       value: bizTotal + custTotal, icon: "📊" },
            ].map((s) => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.07)", borderRadius: "12px", padding: "16px 18px" }}>
                <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#a3c9b0", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.icon} {s.label}</p>
                <p style={{ margin: 0, fontSize: "36px", fontWeight: 900, color: "#fff", lineHeight: 1 }}>{loading ? "—" : s.value}</p>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "16px" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#a3c9b0", lineHeight: 1.8 }}>
              🎯 Goal: <b style={{ color: "#fff" }}>{BUSINESS_GOAL} business interviews</b> + <b style={{ color: "#fff" }}>{CUSTOMER_GOAL} customer surveys</b><br />
              📍 Market: Brooklyn, NY — Haitian, Congolese, Latino, Brazilian, Cape Verdean communities<br />
              💰 Ask: Seed round to scale GAWA Loop across NYC
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
