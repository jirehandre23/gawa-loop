export default function ApiDocsPage() {
  const inp: React.CSSProperties = {
    width: "100%", background: "#0d1117", border: "1px solid #30363d",
    borderRadius: "10px", padding: "16px", fontFamily: "monospace",
    fontSize: "13px", color: "#e6edf3", lineHeight: 1.7, overflowX: "auto",
    whiteSpace: "pre", display: "block", boxSizing: "border-box",
  };
  const tag = (label: string, color: string) => (
    <span style={{ background: color, color: "#fff", fontSize: "11px", fontWeight: 800, padding: "3px 10px", borderRadius: "6px", marginRight: "10px", fontFamily: "monospace", letterSpacing: "0.5px" }}>
      {label}
    </span>
  );
  const section = (title: string) => (
    <h2 style={{ margin: "48px 0 16px", fontSize: "20px", fontWeight: 800, color: "#0a2e1a", borderBottom: "2px solid #e5e7eb", paddingBottom: "10px" }}>
      {title}
    </h2>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#0a2e1a,#166534)", padding: "48px 24px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
            <a href="/" style={{ color: "#4ade80", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>← gawaloop.com</a>
          </div>
          <h1 style={{ margin: "0 0 10px", fontSize: "36px", fontWeight: 900, color: "#fff" }}>GAWA Loop API</h1>
          <p style={{ margin: "0 0 20px", fontSize: "17px", color: "#a3c9b0", lineHeight: 1.6 }}>
            Post food listings automatically without logging in. Connect your POS, inventory system, or automate end-of-day surplus posting with a simple REST API.
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80", fontSize: "13px", fontWeight: 700, padding: "6px 14px", borderRadius: "8px" }}>
              ✅ Live
            </span>
            <span style={{ background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: "13px", padding: "6px 14px", borderRadius: "8px" }}>
              Base URL: https://gawaloop.com/api/v1
            </span>
            <span style={{ background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: "13px", padding: "6px 14px", borderRadius: "8px" }}>
              Auth: Bearer token
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px 80px" }}>

        {section("Authentication")}
        <p style={{ color: "#374151", lineHeight: 1.7, marginBottom: "14px" }}>
          Every request must include your API key as a Bearer token in the <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px", fontSize: "13px" }}>Authorization</code> header. Get your key from your business dashboard under 🔑 API Key.
        </p>
        <code style={inp}>{`Authorization: Bearer gawa_live_YOUR_KEY_HERE`}</code>
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "14px 18px", marginTop: "14px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#92400e" }}>
            🔑 Keep your API key private. If it is compromised, regenerate it from your dashboard — the old key will stop working immediately.
          </p>
        </div>

        {section("Endpoints")}

        {/* POST /listings */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "24px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
            {tag("POST", "#16a34a")}
            <code style={{ fontSize: "16px", fontWeight: 700, color: "#0a2e1a" }}>/listings</code>
            <span style={{ fontSize: "14px", color: "#6b7280", marginLeft: "8px" }}>Create a new food listing</span>
          </div>
          <p style={{ margin: "0 0 14px", fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>
            Posts a new food listing that appears on Browse immediately. The listing is scoped to your business address automatically.
          </p>
          <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 700, color: "#374151" }}>Request body</p>
          <code style={inp}>{`{
  "food_name":       "Jerk chicken plates",   // required
  "quantity":        "12",                    // required — number of portions
  "category":        "Prepared Meals",        // optional — Food | Bakery | Beverages | Prepared Meals | Produce | Other
  "allergy_note":    "Contains soy",          // optional
  "note":            "Ask for Maria.",        // optional
  "estimated_value": 60,                      // optional — USD
  "weight_lbs":      8,                       // optional
  "expires_in_hours": 2                       // optional — default 2
}`}</code>
          <p style={{ margin: "14px 0 8px", fontSize: "13px", fontWeight: 700, color: "#374151" }}>Response</p>
          <code style={inp}>{`{
  "success": true,
  "listing_id": "3f2a1b...",
  "message": "Listing created successfully."
}`}</code>
          <p style={{ margin: "14px 0 8px", fontSize: "13px", fontWeight: 700, color: "#374151" }}>Example</p>
          <code style={inp}>{`curl -X POST https://gawaloop.com/api/v1/listings \\
  -H "Authorization: Bearer gawa_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "food_name": "Jerk chicken plates",
    "quantity": "12",
    "category": "Prepared Meals",
    "expires_in_hours": 2
  }'`}</code>
        </div>

        {/* GET /listings */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "24px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
            {tag("GET", "#2563eb")}
            <code style={{ fontSize: "16px", fontWeight: 700, color: "#0a2e1a" }}>/listings</code>
            <span style={{ fontSize: "14px", color: "#6b7280", marginLeft: "8px" }}>Get your active listings</span>
          </div>
          <p style={{ margin: "0 0 14px", fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>
            Returns all current listings for your business including status, quantity remaining, and active claims.
          </p>
          <code style={inp}>{`curl https://gawaloop.com/api/v1/listings \\
  -H "Authorization: Bearer gawa_live_YOUR_KEY"`}</code>
          <p style={{ margin: "14px 0 8px", fontSize: "13px", fontWeight: 700, color: "#374151" }}>Response</p>
          <code style={inp}>{`{
  "success": true,
  "listings": [
    {
      "id": "3f2a1b...",
      "food_name": "Jerk chicken plates",
      "status": "AVAILABLE",
      "quantity_remaining": 10,
      "quantity_total": 12,
      "expires_at": "2026-04-13T21:30:00Z",
      "active_claims": 2
    }
  ]
}`}</code>
        </div>

        {/* PATCH /listings/:id */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "24px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
            {tag("PATCH", "#7c3aed")}
            <code style={{ fontSize: "16px", fontWeight: 700, color: "#0a2e1a" }}>/listings/:id</code>
            <span style={{ fontSize: "14px", color: "#6b7280", marginLeft: "8px" }}>Mark a listing as picked up</span>
          </div>
          <code style={inp}>{`curl -X PATCH https://gawaloop.com/api/v1/listings/3f2a1b \\
  -H "Authorization: Bearer gawa_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "action": "mark_picked_up" }'`}</code>
        </div>

        {/* DELETE /listings/:id */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "24px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
            {tag("DELETE", "#ef4444")}
            <code style={{ fontSize: "16px", fontWeight: 700, color: "#0a2e1a" }}>/listings/:id</code>
            <span style={{ fontSize: "14px", color: "#6b7280", marginLeft: "8px" }}>Cancel a listing</span>
          </div>
          <p style={{ margin: "0 0 14px", fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>
            Cancels the listing and notifies any active claimers by email automatically.
          </p>
          <code style={inp}>{`curl -X DELETE https://gawaloop.com/api/v1/listings/3f2a1b \\
  -H "Authorization: Bearer gawa_live_YOUR_KEY"`}</code>
        </div>

        {section("Integration Examples")}

        {/* Zapier */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "24px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <span style={{ fontSize: "28px" }}>⚡</span>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#0a2e1a" }}>Zapier / Make — no code</h3>
          </div>
          <p style={{ margin: "0 0 12px", fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>
            The easiest setup. Any app that supports Zapier (Google Sheets, Toast, Square, Slack, etc.) can trigger a GAWA Loop post automatically.
          </p>
          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "14px 16px", fontSize: "13px", color: "#374151", lineHeight: 2 }}>
            <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#0a2e1a" }}>Example: Google Sheets → GAWA Loop</p>
            <p style={{ margin: 0 }}>Trigger: New row added to sheet</p>
            <p style={{ margin: 0 }}>Action: Webhooks by Zapier → POST → https://gawaloop.com/api/v1/listings</p>
            <p style={{ margin: 0 }}>Header: Authorization: Bearer gawa_live_YOUR_KEY</p>
          </div>
        </div>

        {/* POS */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "24px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <span style={{ fontSize: "28px" }}>🖥️</span>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#0a2e1a" }}>POS Systems — Toast, Square, Clover</h3>
          </div>
          <p style={{ margin: "0 0 12px", fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>
            Configure a webhook in your POS to fire at end of shift. Point it at the GAWA Loop API with your key.
          </p>
          <code style={inp}>{`// Node.js middleware — catches POS webhook, posts to GAWA Loop
app.post("/pos-webhook", async (req) => {
  const { unsold_items } = req.body;
  for (const item of unsold_items) {
    await fetch("https://gawaloop.com/api/v1/listings", {
      method: "POST",
      headers: {
        "Authorization": "Bearer gawa_live_YOUR_KEY",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        food_name: item.name,
        quantity: String(item.qty),
        expires_in_hours: 1
      })
    });
  }
});`}</code>
        </div>

        {/* Cron */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "24px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <span style={{ fontSize: "28px" }}>⏰</span>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#0a2e1a" }}>Scheduled cron job — Linux / Mac</h3>
          </div>
          <p style={{ margin: "0 0 12px", fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>
            Runs automatically every night at 9 PM with no human action needed.
          </p>
          <code style={inp}>{`# Add to crontab (run: crontab -e)
0 21 * * * curl -X POST https://gawaloop.com/api/v1/listings \\
  -H "Authorization: Bearer gawa_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"food_name":"End of day surplus","quantity":"10","expires_in_hours":1}'`}</code>
        </div>

        {section("Error codes")}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", overflow: "hidden" }}>
          {[
            { code: "401", label: "Unauthorized", desc: "Missing or invalid API key" },
            { code: "400", label: "Bad Request", desc: "Missing required fields (food_name or quantity)" },
            { code: "404", label: "Not Found", desc: "Listing ID not found or belongs to a different business" },
            { code: "500", label: "Server Error", desc: "Something went wrong — try again or contact admin@gawaloop.com" },
          ].map((e, i) => (
            <div key={e.code} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 20px", borderBottom: i < 3 ? "1px solid #f3f4f6" : "none" }}>
              <span style={{ background: e.code.startsWith("4") ? "#fef2f2" : "#f0fdf4", color: e.code.startsWith("4") ? "#ef4444" : "#16a34a", fontFamily: "monospace", fontWeight: 800, fontSize: "14px", padding: "4px 10px", borderRadius: "6px", flexShrink: 0 }}>{e.code}</span>
              <span style={{ fontWeight: 700, fontSize: "14px", color: "#374151", flexShrink: 0 }}>{e.label}</span>
              <span style={{ fontSize: "13px", color: "#6b7280" }}>{e.desc}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "48px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "14px", padding: "24px", textAlign: "center" }}>
          <p style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 800, color: "#0a2e1a" }}>Ready to connect?</p>
          <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#374151" }}>Get your API key from your business dashboard, or contact us for integration help.</p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/business/dashboard" style={{ background: "#16a34a", color: "#fff", padding: "10px 24px", borderRadius: "8px", textDecoration: "none", fontWeight: 700, fontSize: "14px" }}>Get API Key</a>
            <a href="mailto:admin@gawaloop.com" style={{ background: "#fff", color: "#0a2e1a", border: "1px solid #d1fae5", padding: "10px 24px", borderRadius: "8px", textDecoration: "none", fontWeight: 700, fontSize: "14px" }}>Contact Us</a>
          </div>
        </div>

      </div>
    </div>
  );
}
