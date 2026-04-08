export default function PrivacyPage() {
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

        <h1 style={{ fontSize: "32px", fontWeight: 900, color: "#0a2e1a", margin: "0 0 8px" }}>Privacy Policy</h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 40px" }}>Last updated: April 2026</p>

        {[
          {
            title: "1. Who We Are",
            body: "GAWA Loop (gawaloop.com) is a free food-sharing platform connecting local businesses and community organizations with community members in New York City. We are committed to being transparent about how we collect and use your information.",
          },
          {
            title: "2. Information We Collect",
            body: "When you create a customer account, we collect your email address and password. When you claim food, we also collect your first name, phone number, and estimated arrival time. When a business or organization registers, we collect the business name, contact email, phone number, address, business type, and a short description. We also collect usage data such as which listings were viewed and claimed.",
          },
          {
            title: "3. How We Use Your Information",
            body: "We use your information to operate the platform — matching food listings with community members, sending reservation confirmation emails with pickup codes, sending cancellation and reminder notifications, managing your account status, and contacting you about your reservations or account. We do not use your information for advertising or sell it to third parties.",
          },
          {
            title: "4. What Information Is Made Public",
            body: "Business and organization names, addresses, food listing descriptions, and photos are publicly visible on the browse page to anyone visiting gawaloop.com — sign-in is not required to see that food is available. However, business contact details (phone number, email) and the full address are only shown to signed-in customers who are viewing a specific listing. Customer personal information (name, email, phone) is never displayed publicly.",
          },
          {
            title: "5. Email Communications",
            body: "By creating an account, you consent to receiving transactional emails from GAWA Loop, including reservation confirmations, pickup codes, and account-related notifications. We use Resend to send these emails. We do not send marketing emails without your explicit consent.",
          },
          {
            title: "6. Data Storage and Security",
            body: "Your data is stored securely using Supabase, hosted on Amazon Web Services (AWS) in the us-west-2 region. We use industry-standard security practices including encrypted connections (HTTPS) and secure authentication. Passwords are hashed and never stored in plain text.",
          },
          {
            title: "7. Data Retention",
            body: "We retain your account information for as long as your account is active. If your account is permanently banned or you request deletion, we will remove your personal information from our active systems within a reasonable time, except where retention is required by law.",
          },
          {
            title: "8. Third-Party Services",
            body: "GAWA Loop uses the following third-party services to operate: Supabase (database and authentication), Vercel (hosting), Resend (email delivery), and Google Maps / Apple Maps / Waze (directions links). Each of these services has its own privacy policy. We do not share your personal information with these services beyond what is necessary to operate the platform.",
          },
          {
            title: "9. Your Rights",
            body: "You have the right to access, correct, or delete your personal information at any time. To request access to your data or to request deletion of your account, please contact us at admin@gawaloop.com. We will respond within a reasonable time.",
          },
          {
            title: "10. Children's Privacy",
            body: "GAWA Loop is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has created an account, please contact us at admin@gawaloop.com so we can remove the account.",
          },
          {
            title: "11. Changes to This Policy",
            body: "We may update this Privacy Policy from time to time. We will update the 'Last updated' date at the top of this page when changes are made. Continued use of the platform after updates constitutes acceptance of the revised policy.",
          },
          {
            title: "12. Contact Us",
            body: "If you have any questions or concerns about this Privacy Policy or how your data is handled, please contact us at admin@gawaloop.com.",
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "17px", fontWeight: 800, color: "#0a2e1a", margin: "0 0 10px" }}>{section.title}</h2>
            <p style={{ fontSize: "15px", color: "#374151", lineHeight: 1.8, margin: 0 }}>{section.body}</p>
          </div>
        ))}

        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "32px", display: "flex", gap: "24px", flexWrap: "wrap" }}>
          <a href="/terms" style={{ color: "#16a34a", fontWeight: 600, textDecoration: "none", fontSize: "14px" }}>Terms of Use →</a>
          <a href="mailto:admin@gawaloop.com" style={{ color: "#6b7280", textDecoration: "none", fontSize: "14px" }}>admin@gawaloop.com</a>
        </div>
      </div>
    </div>
  );
}
