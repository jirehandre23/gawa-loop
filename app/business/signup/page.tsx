"use client";
import { useState, useEffect } from "react";
import { detectLocale, t, Locale } from "@/lib/i18n";

export default function BusinessSignup() {
  const [locale, setLocale] = useState<Locale>("en");
  const [step, setStep]     = useState<"terms" | "form">("terms");
  const [form, setForm]     = useState({
    name: "", email: "", phone: "", address: "",
    type: "Restaurant", account_type: "restaurant",
    password: "", confirmPassword: "", description: "",
  });
  const [accepted, setAccepted] = useState({
    terms: false, food_safety: false, accuracy: false, community: false, compliance: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => { setLocale(detectLocale()); }, []);
  const T     = t[locale];
  const isRTL = locale === "ar";
  const allAccepted = Object.values(accepted).every(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setSubmitting(true);
    const res = await fetch("/api/business-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:         form.name,
        email:        form.email,
        phone:        form.phone,
        address:      form.address,
        type:         form.type,
        account_type: form.account_type,
        password:     form.password,
        description:  form.description,
      }),
    });
    const data = await res.json();
    if (data.success) { setDone(true); }
    else { setError(data.error || "Something went wrong. Please try again."); }
    setSubmitting(false);
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: "8px",
    border: "1px solid #d1d5db", fontSize: "14px", color: "#111827",
    background: "#fff", outline: "none", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px",
  };
  const checkRow = (checked: boolean): React.CSSProperties => ({
    display: "flex", gap: "12px", alignItems: "flex-start",
    padding: "14px 16px", borderRadius: "10px",
    background: checked ? "#f0fdf4" : "#f9fafb",
    border: `1px solid ${checked ? "#bbf7d0" : "#e5e7eb"}`,
    cursor: "pointer", marginBottom: "10px", transition: "all 0.15s",
  });

  if (done) return (
    <div dir={isRTL ? "rtl" : "ltr"}
      style={{ minHeight: "100vh", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: "20px", padding: "48px 40px", maxWidth: "480px", width: "100%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize: "64px", marginBottom: "16px" }}>🕐</div>
        <h1 style={{ margin: "0 0 12px", fontSize: "24px", fontWeight: 800, color: "#0a2e1a" }}>Application Submitted!</h1>
        <p style={{ margin: "0 0 24px", fontSize: "15px", color: "#6b7280", lineHeight: 1.6 }}>
          Thank you! Your application is under review.<br/>
          We will email you within 24–48 hours once your account is approved.
        </p>
        <a href="/" style={{ display: "inline-block", background: "#16a34a", color: "#fff", fontWeight: 700, padding: "13px 32px", borderRadius: "10px", textDecoration: "none", fontSize: "15px" }}>
          Back to GAWA Loop
        </a>
      </div>
    </div>
  );

  return (
    <div dir={isRTL ? "rtl" : "ltr"}
      style={{ minHeight: "100vh", background: "#f3f4f6", padding: "32px 16px", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <a href="/"><img src="/gawa-logo-green.png" alt="GAWA Loop" style={{ width: "52px", height: "52px", objectFit: "contain", marginBottom: "12px" }}/></a>
          <h1 style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: 800, color: "#0a2e1a" }}>
            {step === "terms" ? "Terms & Authorization" : T.signup_title}
          </h1>
          <p style={{ margin: 0, fontSize: "14px", color: "#4b5563" }}>
            {step === "terms" ? "Please read and accept before creating your account" : T.signup_subtitle}
          </p>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "24px" }}>
          {["Terms", "Account Info"].map((label, i) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", background: (step === "form" && i === 0) || (i === 0 && step === "terms") || (i === 1 && step === "form") ? "#16a34a" : "#e5e7eb", color: (step === "form" && i === 0) || (i === 0 && step === "terms") || (i === 1 && step === "form") ? "#fff" : "#9ca3af" }}>
                {step === "form" && i === 0 ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#6b7280" }}>{label}</span>
              {i === 0 && <div style={{ width: "32px", height: "2px", background: step === "form" ? "#16a34a" : "#e5e7eb", borderRadius: "2px" }}/>}
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>

          {/* STEP 1: TERMS */}
          {step === "terms" && (
            <div>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "14px 18px", marginBottom: "24px" }}>
                <p style={{ margin: 0, fontSize: "14px", color: "#166534", lineHeight: 1.6 }}>
                  <b>GAWA Loop</b> is a free platform connecting businesses and NGOs with community members to share surplus food before it goes to waste. By creating an account, you agree to the following terms.
                </p>
              </div>

              {[
                { key: "terms",       title: "I agree to the Platform Terms of Use *",         body: "I understand that GAWA Loop is a free food-sharing platform. I will use it responsibly and only for its intended purpose of sharing surplus food with community members." },
                { key: "food_safety", title: "I commit to food safety standards *",              body: "I confirm that all food listed on GAWA Loop will be safe for consumption, properly stored, and clearly described. I will not post expired, contaminated, or unsafe food items." },
                { key: "accuracy",    title: "I will provide accurate information *",            body: "I agree to provide truthful and accurate information about my business or organization. I understand that false information may result in immediate account suspension." },
                { key: "community",   title: "I will respect community members *",               body: "I agree to treat all community members with dignity and respect. I will not discriminate on the basis of race, ethnicity, religion, gender, or any other characteristic." },
                { key: "compliance",  title: "I acknowledge data and compliance terms *",        body: "I understand that GAWA Loop may share my business name, address, and food listings publicly. I consent to GAWA Loop contacting me by email about my account. GAWA Loop reserves the right to suspend accounts that violate these terms." },
              ].map(item => (
                <label key={item.key} style={checkRow((accepted as any)[item.key])}
                  onClick={() => setAccepted(a => ({ ...a, [item.key]: !(a as any)[item.key] }))}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "5px", border: `2px solid ${(accepted as any)[item.key] ? "#16a34a" : "#d1d5db"}`, background: (accepted as any)[item.key] ? "#16a34a" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                    {(accepted as any)[item.key] && <span style={{ color: "#fff", fontSize: "13px", fontWeight: 700 }}>✓</span>}
                  </div>
                  <div>
                    <p style={{ margin: "0 0 3px", fontSize: "13px", fontWeight: 700, color: "#0a2e1a" }}>{item.title}</p>
                    <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", lineHeight: 1.5 }}>{item.body}</p>
                  </div>
                </label>
              ))}

              {!allAccepted && (
                <p style={{ margin: "8px 0 12px", fontSize: "12px", color: "#9ca3af", textAlign: "center" }}>
                  Please accept all terms above to continue
                </p>
              )}

              <button onClick={() => { if (allAccepted) setStep("form"); }} disabled={!allAccepted}
                style={{ width: "100%", background: allAccepted ? "#16a34a" : "#d1d5db", color: "#fff", border: "none", padding: "13px", borderRadius: "10px", cursor: allAccepted ? "pointer" : "not-allowed", fontSize: "15px", fontWeight: 700, marginTop: "8px" }}>
                Continue to Account Setup →
              </button>

              <p style={{ textAlign: "center", marginTop: "16px", fontSize: "13px", color: "#6b7280" }}>
                Already have an account?{" "}
                <a href="/business/login" style={{ color: "#16a34a", fontWeight: 600, textDecoration: "none" }}>{T.signup_login}</a>
              </p>
            </div>
          )}

          {/* STEP 2: FORM */}
          {step === "form" && (
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", color: "#991b1b", fontSize: "13px" }}>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: "20px" }}>
                <label style={lbl}>Account Type *</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  {[
                    { val: "restaurant", label: "🍽️ Restaurant / Business" },
                    { val: "ngo",        label: "🤝 NGO / Food Bank" },
                  ].map(opt => (
                    <button key={opt.val} type="button"
                      onClick={() => setForm(f => ({ ...f, account_type: opt.val }))}
                      style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `2px solid ${form.account_type === opt.val ? "#16a34a" : "#e5e7eb"}`, background: form.account_type === opt.val ? "#f0fdf4" : "#fff", color: form.account_type === opt.val ? "#15803d" : "#374151", fontWeight: form.account_type === opt.val ? 700 : 400, cursor: "pointer", fontSize: "13px" }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {form.account_type === "ngo" && (
                  <div style={{ marginTop: "10px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "10px 14px" }}>
                    <p style={{ margin: 0, fontSize: "12px", color: "#1d4ed8" }}>
                      ℹ️ As an NGO or Food Bank, you can both <b>post surplus food</b> and <b>claim food</b> from other businesses on GAWA Loop.
                    </p>
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>{T.signup_name} *</label>
                  <input style={inp} required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mami's Kitchen / Brooklyn Food Bank"/>
                </div>
                <div>
                  <label style={lbl}>{T.signup_email} *</label>
                  <input style={inp} type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/>
                </div>
                <div>
                  <label style={lbl}>{T.signup_phone}</label>
                  <input style={inp} type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}/>
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>{T.signup_address} *</label>
                  <input style={inp} required value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full street address"/>
                </div>
                <div>
                  <label style={lbl}>{T.signup_type}</label>
                  <select style={{ ...inp, cursor: "pointer" }} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option>Restaurant</option><option>Bakery</option><option>Café</option>
                    <option>Grocery / Bodega</option><option>Catering</option>
                    <option>Food Bank</option><option>NGO</option><option>Other</option>
                  </select>
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Short Description</label>
                  <textarea style={{ ...inp, height: "70px", resize: "vertical" }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Tell us briefly about your business or organization"/>
                </div>
                <div>
                  <label style={lbl}>{T.signup_password} *</label>
                  <input style={inp} type="password" required minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 8 characters"/>
                </div>
                <div>
                  <label style={lbl}>Confirm Password *</label>
                  <input style={inp} type="password" required value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}/>
                </div>
              </div>

              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "12px 14px", marginTop: "20px", marginBottom: "20px" }}>
                <p style={{ margin: 0, fontSize: "13px", color: "#92400e" }}>
                  ⏳ <b>Manual review:</b> All business and NGO accounts are manually reviewed before activation. You'll receive an email within 24–48 hours.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={() => setStep("terms")}
                  style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "13px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>
                  ← Back
                </button>
                <button type="submit" disabled={submitting}
                  style={{ flex: 1, background: submitting ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", padding: "13px", borderRadius: "10px", cursor: submitting ? "not-allowed" : "pointer", fontSize: "15px", fontWeight: 700 }}>
                  {submitting ? "Submitting..." : T.signup_btn}
                </button>
              </div>

              <p style={{ textAlign: "center", marginTop: "16px", fontSize: "13px", color: "#6b7280" }}>
                {T.signup_have_account}{" "}
                <a href="/business/login" style={{ color: "#16a34a", fontWeight: 600, textDecoration: "none" }}>{T.signup_login}</a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
