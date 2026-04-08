export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* NAV */}
      <nav style={{ background: "#0a2e1a", padding: "0 24px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
          <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width: "28px", height: "28px", objectFit: "contain" }}/>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: "16px" }}>GAWA Loop</span>
        </a>
        <a href="/" style={{ color: "#4ade80", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>← Back to Home</a>
      </nav>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 24px 80px" }}>

        <h1 style={{ fontSize: "32px", fontWeight: 900, color: "#0a2e1a", margin: "0 0 8px" }}>Terms of Use</h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 40px" }}>Last updated: April 2026</p>

        {[
          {
            title: "1. Acceptance of Terms",
            body: "By creating an account or using GAWA Loop (gawaloop.com), you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use the platform. GAWA Loop is operated by GAWA Loop LLC and is provided free of charge to both businesses and community members.",
          },
          {
            title: "2. What GAWA Loop Does",
            body: "GAWA Loop is a free food-sharing platform that connects local businesses and community organizations with community members to redistribute surplus food before it goes to waste. The platform facilitates reservations and pickups — GAWA Loop does not handle, transport, prepare, or take possession of any food.",
          },
          {
            title: "3. Customer Accounts",
            body: "Community members may create a free account to browse and reserve available food listings. You agree to provide accurate contact information and to honor your reservations by picking up food within the stated time window. Repeated no-shows without cancellation may result in temporary or permanent suspension of your account.",
          },
          {
            title: "4. Business and Organization Accounts",
            body: "Businesses, restaurants, and community organizations must apply for an account, which is subject to manual review and approval within 24–48 hours. You agree to only post food that is safe for consumption, properly stored, accurately described, and not expired or contaminated. You agree not to charge any fee to customers for food listed on GAWA Loop.",
          },
          {
            title: "5. Community Organizations (NGOs)",
            body: "Approved community organizations may both post surplus food and claim food from other businesses on GAWA Loop. All the same food safety and accuracy obligations apply to community organizations as to other business accounts.",
          },
          {
            title: "6. Food Safety",
            body: "GAWA Loop does not verify, inspect, or take responsibility for the safety, quality, or content of food posted on the platform. By listing food, businesses and organizations accept full responsibility for ensuring that all food is safe for human consumption. By claiming and consuming food, community members acknowledge that GAWA Loop assumes no liability for any illness, injury, or harm arising from food obtained through the platform.",
          },
          {
            title: "7. No-Show Policy",
            body: "When you reserve food, you are expected to pick it up within your stated arrival window. If you cannot pick up your reservation, you must cancel using the link in your confirmation email so the food can be made available to someone else. Failing to cancel and failing to show up (a 'no-show') is tracked. Repeated no-shows result in escalating suspensions: 3 no-shows (1 week), 6 no-shows (3 weeks), 9 no-shows (8 weeks), and 12 no-shows (permanent ban).",
          },
          {
            title: "8. Prohibited Conduct",
            body: "You agree not to: post false, misleading, or fraudulent information; post food that is unsafe, expired, or contaminated; use the platform for any commercial purpose other than food sharing; harass, threaten, or discriminate against any user; attempt to circumvent account suspensions or bans; or use the platform in any way that violates applicable law.",
          },
          {
            title: "9. Account Termination",
            body: "GAWA Loop reserves the right to suspend or permanently ban any account at any time for violations of these terms, fraudulent activity, repeated no-shows, or any conduct deemed harmful to the community.",
          },
          {
            title: "10. Disclaimer of Warranties",
            body: "GAWA Loop is provided 'as is' without any warranties of any kind. We do not guarantee the availability of food listings, the accuracy of listing descriptions, or the behavior of any user. The platform may be unavailable at times due to maintenance or technical issues.",
          },
          {
            title: "11. Limitation of Liability",
            body: "To the fullest extent permitted by law, GAWA Loop and its founders, employees, and affiliates shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform, including but not limited to illness from food, missed pickups, or account suspension.",
          },
          {
            title: "12. Changes to These Terms",
            body: "We may update these Terms of Use from time to time. Continued use of the platform after changes are posted constitutes your acceptance of the updated terms. We will update the 'Last updated' date at the top of this page when changes are made.",
          },
          {
            title: "13. Contact",
            body: "If you have questions about these Terms of Use, please contact us at admin@gawaloop.com.",
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "17px", fontWeight: 800, color: "#0a2e1a", margin: "0 0 10px" }}>{section.title}</h2>
            <p style={{ fontSize: "15px", color: "#374151", lineHeight: 1.8, margin: 0 }}>{section.body}</p>
          </div>
        ))}

        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "32px", display: "flex", gap: "24px", flexWrap: "wrap" }}>
          <a href="/privacy" style={{ color: "#16a34a", fontWeight: 600, textDecoration: "none", fontSize: "14px" }}>Privacy Policy →</a>
          <a href="mailto:admin@gawaloop.com" style={{ color: "#6b7280", textDecoration: "none", fontSize: "14px" }}>admin@gawaloop.com</a>
        </div>
      </div>
    </div>
  );
}
