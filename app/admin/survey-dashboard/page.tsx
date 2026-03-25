"use client";
import { useEffect, useState } from "react";

const BUSINESS_SHEET_ID = "1VQ4UiEE74FLdXPQwEPz-uFoA1byHleyVX8RUVdU0nLk";
const CUSTOMER_SHEET_ID = "1Xm83TUkKrBrbiUgmHrl6iDh5441Yro3wZLUD7SpKrgc";
const BUSINESS_GOAL = 50;
const CUSTOMER_GOAL = 100;

type BizRow = {
  date: string; businessName: string; address: string;
  status: string; rep: string; motivation: string; barriers: string;
};

export default function SurveyDashboard() {
  const [bizData, setBizData]   = useState<BizRow[]>([]);
  const [custTotal, setCustTotal] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  async function fetchSheet(sheetId: string, gid: string) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;

      const res = await fetch(url, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const text = await res.text();

      // ✅ FIXED parsing (no regex /s issue)
      const json = JSON.parse(
        text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1)
      );

      const cols = (json.table?.cols || []).map((c: any) => c.label as string);

      const rows = (json.table?.rows || []).map((r: any) => {
        const obj: Record<string, string> = {};
        (r.c || []).forEach((cell: any, i: number) => {
          obj[cols[i]] = cell?.v != null ? String(cell.v) : "";
        });
        return obj;
      }).filter((r: any) => Object.values(r).some((v: any) => v !== ""));

      return { cols, rows };
    } catch (err) {
      console.error("❌ Google Sheets fetch failed:", err);
      return { cols: [], rows: [] };
    }
  }

  async function refresh() {
    setLoading(true);

    const biz = await fetchSheet(BUSINESS_SHEET_ID, "728361962");
    setBizData(biz.rows.map((r: any) => ({
      date:         r["Date of Interview"] || r[biz.cols[0]] || "",
      businessName: r["Business Name"] || "",
      address:      r["Business Address"] || "",
      motivation:   r["1. Motivation: What is the primary reason this business would consider donating?"] || "",
      barriers:     r["3. Barriers: What challenges or concerns might prevent them from donating?"] || "",
      status:       r["Interview Completion Status"] || "",
      rep:          r["Outreach Representative Name"] || "",
    })));

    const cust = await fetchSheet(CUSTOMER_SHEET_ID, "1882785104");
    setCustTotal(cust.rows.length);

    setLastRefresh(new Date());
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  const bizCompleted = bizData.filter(r => {
    const s = r.status?.toLowerCase() || "";
    return s.includes("completed") && !s.includes("not") && !s.includes("partial");
  }).length;
  const bizPartial  = bizData.filter(r => r.status?.toLowerCase().includes("partial")).length;
  const bizAttempted = bizData.filter(r => r.status?.toLowerCase().includes("not")).length;
  const bizTotal    = bizData.length;
  const bizPct      = Math.min(Math.round((bizCompleted / BUSINESS_GOAL) * 100), 100);
  const custPct     = Math.min(Math.round((custTotal / CUSTOMER_GOAL) * 100), 100);

  const jireh = bizData.filter(r => r.rep?.toLowerCase().includes("jireh")).length;
  const liam  = bizData.filter(r => r.rep?.toLowerCase().includes("liam")).length;

  const motivCounts: Record<string, number> = {};
  bizData.forEach(r => {
    (r.motivation || "").split(",").forEach(m => {
      const k = m.trim();
      if (k) motivCounts[k] = (motivCounts[k] || 0) + 1;
    });
  });
  const topMotivations = Object.entries(motivCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const barrierCounts: Record<string, number> = {};
  bizData.forEach(r => {
    (r.barriers || "").split(",").forEach(b => {
      const k = b.trim();
      if (k) barrierCounts[k] = (barrierCounts[k] || 0) + 1;
    });
  });
  const topBarriers = Object.entries(barrierCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

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

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      <div style={{ background: "#0a2e1a", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width: "34px", height: "34px", objectFit: "contain" }} />
          <span style={{ fontWeight: 800, fontSize: "17px", color: "#fff" }}>GAWA Loop</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {lastRefresh && (
            <span style={{ fontSize: "12px", color: "#a3c9b0" }}>
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button onClick={refresh} disabled={loading}
            style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 18px", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>
            {loading ? "..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "920px", margin: "0 auto", padding: "32px 20px" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: 800, color: "#0a2e1a" }}>📊 Outreach Dashboard</h1>
        <p style={{ margin: "0 0 28px", fontSize: "14px", color: "#6b7280" }}>Live progress toward investor-ready survey goals — Brooklyn, NY</p>

        <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
          {loading ? "Loading data..." : "If this is still empty → check console + Google Sheets permissions"}
        </div>

      </div>
    </div>
  );
}
