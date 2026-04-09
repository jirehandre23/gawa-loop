"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { detectLocale, t, Locale, setLocale as saveLocale, FLAG, LANG_NAME } from "@/lib/i18n";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LOCALES: Locale[] = ["en", "fr", "es", "pt", "ar"];

export default function HomePage() {
  const [locale, setLocaleState]      = useState<Locale>("en");
  const [langOpen, setLangOpen]       = useState(false);
  const [openFaq, setOpenFaq]         = useState<number | null>(null);
  const [liveStats, setLiveStats]     = useState({ total_pickups: 0, co2_saved_lbs: 0 });
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [user, setUser]               = useState<any>(null);

  // --- NEW: nav state ---
  const [menuOpen, setMenuOpen]           = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [signinEmail, setSigninEmail]       = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signinLoading, setSigninLoading]   = useState(false);
  const [signinError, setSigninError]       = useState("");
  const [signinMode, setSigninMode]         = useState<"signin" | "signup">("signin");
  const [termsAccepted, setTermsAccepted]   = useState(false);

  const [contactName, setContactName]       = useState("");
  const [contactEmail, setContactEmail]     = useState("");
  const [contactMsg, setContactMsg]         = useState("");
  const [contactSending, setContactSending] = useState(false);
  const [contactDone, setContactDone]       = useState(false);
  const [contactError, setContactError]     = useState("");

  useEffect(() => { setLocaleState(detectLocale()); }, []);

  useEffect(() => {
    fetch("/api/platform-stats")
      .then(r => r.json())
      .then(d => { setLiveStats(d); setStatsLoaded(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  // Close dropdown/menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("#main-nav")) {
        setActiveDropdown(null);
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const T     = t[locale];
  const isRTL = locale === "ar";

  function switchLocale(loc: Locale) {
    saveLocale(loc);
    setLocaleState(loc);
    setLangOpen(false);
  }

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveDropdown(null);
    setMenuOpen(false);
  }

  async function handleCustomerAuth(e: React.FormEvent) {
    e.preventDefault();
    setSigninLoading(true); setSigninError("");
    if (signinMode === "signin") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signinEmail.trim().toLowerCase(), password: signinPassword,
      });
      if (error) { setSigninError(locale==="fr"?"Email ou mot de passe invalide.":locale==="es"?"Email o contraseña inválidos.":locale==="pt"?"Email ou senha inválidos.":locale==="ar"?"بريد إلكتروني أو كلمة مرور غير صحيحة.":"Invalid email or password."); setSigninLoading(false); return; }
      const { data: biz } = await supabase.from("businesses").select("id").eq("email", signinEmail.trim().toLowerCase()).single();
      if (biz) { window.location.href = "/business/dashboard"; return; }
      window.location.href = "/customer/profile";
    } else {
      const { error } = await supabase.auth.signUp({
        email: signinEmail.trim().toLowerCase(), password: signinPassword,
        options: { emailRedirectTo: "https://gawaloop.com/customer/profile" },
      });
      if (error) { setSigninError(error.message); setSigninLoading(false); return; }
      window.location.href = "/customer/profile";
    }
  }

  async function handleContact(e: React.FormEvent) {
    e.preventDefault();
    setContactSending(true); setContactError("");
    const res = await fetch("/api/contact", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: contactName, email: contactEmail, message: contactMsg }),
    });
    const data = await res.json();
    if (data.success) { setContactDone(true); setContactName(""); setContactEmail(""); setContactMsg(""); }
    else { setContactError("Failed to send. Email us at admin@gawaloop.com"); }
    setContactSending(false);
  }

  const faqs = [
    {
      q: locale==="fr"?"GAWA Loop est-il vraiment gratuit ?":locale==="es"?"¿GAWA Loop es realmente gratis?":locale==="pt"?"GAWA Loop é realmente grátis?":locale==="ar"?"هل GAWA Loop مجاني حقاً؟":"Is GAWA Loop really free?",
      a: locale==="fr"?"Oui, 100% gratuit pour les clients et les entreprises. Toujours.":locale==="es"?"Sí, 100% gratis para clientes y negocios. Siempre.":locale==="pt"?"Sim, 100% grátis para clientes e empresas. Sempre.":locale==="ar"?"نعم، مجاني 100٪ للعملاء والشركات. دائماً.":"Yes — 100% free for both customers and businesses. No fees, no subscriptions, ever."
    },
    {
      q: locale==="fr"?"Comment réserver de la nourriture ?":locale==="es"?"¿Cómo reservo comida?":locale==="pt"?"Como reservar comida?":locale==="ar"?"كيف أحجز طعاماً؟":"How do I claim food?",
      a: locale==="fr"?"Créez un compte gratuit, allez sur Browse, choisissez un aliment et réservez en quelques secondes.":locale==="es"?"Crea una cuenta gratuita, ve a Browse, elige un alimento y reserva en segundos.":locale==="pt"?"Crie uma conta gratuita, vá para Browse, escolha um alimento e reserve em segundos.":locale==="ar"?"أنشئ حساباً مجانياً، اذهب إلى Browse، اختر طعاماً واحجز في ثوانٍ.":"Create a free account, go to Browse, pick an available item, and reserve in seconds. You'll get a confirmation code by email."
    },
    {
      q: locale==="fr"?"Que se passe-t-il si je ne peux pas récupérer la nourriture ?":locale==="es"?"¿Qué pasa si no puedo recoger la comida?":locale==="pt"?"O que acontece se não puder buscar a comida?":locale==="ar"?"ماذا يحدث إذا لم أستطع استلام الطعام؟":"What if I can't pick up the food?",
      a: locale==="fr"?"Annulez via le lien dans votre email. Le listing sera libéré pour quelqu'un d'autre.":locale==="es"?"Cancela usando el enlace en tu correo. El listado se liberará para otra persona.":locale==="pt"?"Cancele usando o link no seu email. O anúncio será liberado para outra pessoa.":locale==="ar"?"الغِ حجزك باستخدام الرابط في بريد التأكيد. سيُتاح الإعلان لشخص آخر.":"No problem! Cancel using the link in your confirmation email. The listing is instantly released for someone else."
    },
    {
      q: locale==="fr"?"Comment inscrire mon restaurant ?":locale==="es"?"¿Cómo registro mi restaurante?":locale==="pt"?"Como cadastro meu restaurante?":locale==="ar"?"كيف أسجل مطعمي؟":"How do I register my restaurant?",
      a: locale==="fr"?"Cliquez sur Pour les entreprises et inscrivez-vous en 2 minutes. Votre compte est examiné manuellement sous 24-48h.":locale==="es"?"Haz clic en Para negocios y regístrate en 2 minutos. Tu cuenta se revisa manualmente en 24-48h.":locale==="pt"?"Clique em Para empresas e cadastre-se em 2 minutos. Sua conta é revisada manualmente em 24-48h.":locale==="ar"?"انقر على للشركات وسجّل في دقيقتين. سيتم مراجعة حسابك خلال 24-48 ساعة.":"Click 'For Businesses' and sign up in 2 minutes. Your account is manually reviewed within 24–48 hours."
    },
    {
      q: locale==="fr"?"La nourriture est-elle sûre ?":locale==="es"?"¿La comida es segura?":locale==="pt"?"A comida é segura?":locale==="ar"?"هل الطعام آمن؟":"Is the food safe?",
      a: locale==="fr"?"Toute la nourriture provient de vrais restaurants et commerces vérifiés près de chez vous.":locale==="es"?"Toda la comida proviene de restaurantes y tiendas verificados cerca de ti.":locale==="pt"?"Toda a comida vem de restaurantes e lojas verificadas perto de você.":locale==="ar"?"جميع الطعام مصدره مطاعم ومحلات تجارية موثوقة بالقرب منك.":"All food comes from verified real restaurants, bakeries, and stores near you."
    },
  ];

  const inp: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: "10px",
    border: "1px solid #d1d5db", fontSize: "14px", color: "#111827",
    background: "#fff", outline: "none", boxSizing: "border-box",
  };

  // --- NAV DROPDOWN DEFINITIONS ---
  const navSections = [
    {
      id: "explore",
      label: locale==="ar"?"استكشف":locale==="fr"?"Explorer":locale==="es"?"Explorar":locale==="pt"?"Explorar":"Explore",
      items: [
        { label: locale==="ar"?"تصفح الطعام المجاني":locale==="fr"?"Voir la nourriture gratuite":locale==="es"?"Ver comida gratis":locale==="pt"?"Ver comida grátis":"Browse Free Food", href: "/browse", icon: "🍽️" },
        { label: locale==="ar"?"كيف يعمل":locale==="fr"?"Comment ça marche":locale==="es"?"Cómo funciona":locale==="pt"?"Como funciona":"How It Works", onClick: () => scrollTo("how-it-works"), icon: "📖" },
        { label: locale==="ar"?"خريطة المجتمع":locale==="fr"?"Carte communautaire":locale==="es"?"Mapa comunitario":locale==="pt"?"Mapa comunitário":"Community Map", href: "/community-map", icon: "🗺️" },
      ],
    },
    {
      id: "businesses",
      label: locale==="ar"?"للشركات":locale==="fr"?"Entreprises":locale==="es"?"Negocios":locale==="pt"?"Empresas":"Businesses",
      items: [
        { label: locale==="ar"?"سجل مطعمك":locale==="fr"?"Inscrire mon restaurant":locale==="es"?"Registrar negocio":locale==="pt"?"Cadastrar empresa":"Register Your Business", href: "/business/signup", icon: "🏪" },
        { label: locale==="ar"?"دخول الشركات":locale==="fr"?"Connexion entreprise":locale==="es"?"Login empresas":locale==="pt"?"Login empresas":"Business Login", href: "/business/login", icon: "🔑" },
        { label: locale==="ar"?"لماذا GAWA Loop؟":locale==="fr"?"Pourquoi GAWA Loop ?":locale==="es"?"¿Por qué GAWA?":locale==="pt"?"Por que GAWA?":"Why GAWA Loop?", onClick: () => scrollTo("why-gawa"), icon: "💡" },
      ],
    },
    {
      id: "info",
      label: locale==="ar"?"معلومات":locale==="fr"?"Infos":locale==="es"?"Info":locale==="pt"?"Info":"Info",
      items: [
        { label: locale==="ar"?"الأسئلة الشائعة":locale==="fr"?"FAQ":locale==="es"?"Preguntas frecuentes":locale==="pt"?"Perguntas frequentes":"FAQ", onClick: () => scrollTo("faq"), icon: "❓" },
        { label: locale==="ar"?"اتصل بنا":locale==="fr"?"Nous contacter":locale==="es"?"Contáctanos":locale==="pt"?"Contate-nos":"Contact Us", onClick: () => scrollTo("contact"), icon: "✉️" },
        { label: locale==="ar"?"حسابي":locale==="fr"?"Mon compte":locale==="es"?"Mi cuenta":locale==="pt"?"Minha conta":"My Account", href: user ? "/customer/profile" : undefined, onClick: user ? undefined : () => scrollTo("signin"), icon: "👤" },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "GAWA Loop",
        "url": "https://gawaloop.com",
        "description": "Free food app connecting local restaurants and stores with people in the community — sharing surplus food before it goes to waste.",
        "applicationCategory": "FoodApplication",
        "operatingSystem": "Any",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
        "address": { "@type": "PostalAddress", "addressLocality": "Brooklyn", "addressRegion": "NY", "addressCountry": "US" }
      })}} />

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;}50%{opacity:0.4;} }
        @keyframes fadeInDown { from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);} }
        .nav-dropdown { animation: fadeInDown 0.18s ease; }
        .nav-item:hover { background: #f0fdf4 !important; color: #16a34a !important; }
        .hamburger-item:hover { background: #f0fdf4 !important; }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .hamburger-btn { display: none !important; }
          .mobile-menu { display: none !important; }
        }
      `}</style>

      <main dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white text-slate-900"
        style={{ fontFamily: isRTL ? "'Noto Sans Arabic', sans-serif" : undefined }}>

        {/* ===== NAV ===== */}
        <nav id="main-nav" className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            {/* Logo */}
            <a href="/" className="flex items-center gap-3" style={{ textDecoration: "none" }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 ring-2 ring-green-100">
                <Image src="/gawa-logo-green.png" width={28} height={28} alt="GAWA Loop logo" style={{ objectFit:"contain" }} priority />
              </div>
              <span className="text-lg font-bold text-slate-900">GAWA Loop</span>
            </a>

            {/* Desktop nav */}
            <div className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {navSections.map(section => (
                <div key={section.id} style={{ position: "relative" }}>
                  <button
                    onClick={() => setActiveDropdown(activeDropdown === section.id ? null : section.id)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      padding: "8px 12px", borderRadius: "8px", fontSize: "14px",
                      fontWeight: 600, color: activeDropdown === section.id ? "#16a34a" : "#374151",
                      display: "flex", alignItems: "center", gap: "4px",
                      background: activeDropdown === section.id ? "#f0fdf4" : "transparent",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { if (activeDropdown !== section.id) (e.currentTarget as HTMLElement).style.background = "#f9fafb"; }}
                    onMouseLeave={e => { if (activeDropdown !== section.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    {section.label}
                    <span style={{ fontSize: "10px", opacity: 0.6, transform: activeDropdown === section.id ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", display: "inline-block" }}>▼</span>
                  </button>
                  {activeDropdown === section.id && (
                    <div className="nav-dropdown" style={{
                      position: "absolute", top: "calc(100% + 8px)", left: 0,
                      background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px",
                      boxShadow: "0 12px 40px rgba(0,0,0,0.12)", overflow: "hidden",
                      minWidth: "220px", zIndex: 999,
                    }}>
                      {section.items.map((item, i) => (
                        <button key={i} className="nav-item"
                          onClick={() => { item.onClick ? item.onClick() : item.href ? (window.location.href = item.href) : null; setActiveDropdown(null); }}
                          style={{
                            display: "flex", alignItems: "center", gap: "10px", width: "100%",
                            padding: "12px 16px", background: "#fff", border: "none", cursor: "pointer",
                            fontSize: "13px", color: "#111827", fontWeight: 500, textAlign: "left",
                            borderBottom: i < section.items.length - 1 ? "1px solid #f3f4f6" : "none",
                            transition: "all 0.12s",
                          }}>
                          <span style={{ fontSize: "16px", flexShrink: 0 }}>{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* CTA */}
              <div style={{ marginLeft: "8px", display: "flex", gap: "8px", alignItems: "center" }}>
                <Link href="/browse"
                  style={{ background: "#16a34a", color: "#fff", padding: "8px 18px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 700, transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#15803d"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#16a34a"}>
                  {T.browse}
                </Link>
                {/* Language picker */}
                <div style={{ position: "relative" }}>
                  <button onClick={() => setLangOpen(o => !o)}
                    style={{ background: "transparent", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px", color: "#374151" }}>
                    {FLAG[locale]} ▾
                  </button>
                  {langOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden", minWidth: "150px", zIndex: 999 }}>
                      {LOCALES.map(loc => (
                        <button key={loc} onClick={() => switchLocale(loc)}
                          style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "10px 14px", background: loc===locale?"#f0fdf4":"#fff", border: "none", cursor: "pointer", fontSize: "13px", color: loc===locale?"#16a34a":"#111827", fontWeight: loc===locale?700:400, borderBottom: "1px solid #f3f4f6", textAlign: "left" }}>
                          {FLAG[loc]} {LANG_NAME[loc]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Hamburger button (mobile only) */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* Language picker always visible */}
              <div style={{ position: "relative" }}>
                <button onClick={() => setLangOpen(o => !o)}
                  style={{ background: "transparent", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px", color: "#374151" }}>
                  {FLAG[locale]} ▾
                </button>
                {langOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden", minWidth: "150px", zIndex: 999 }}>
                    {LOCALES.map(loc => (
                      <button key={loc} onClick={() => switchLocale(loc)}
                        style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "10px 14px", background: loc===locale?"#f0fdf4":"#fff", border: "none", cursor: "pointer", fontSize: "13px", color: loc===locale?"#16a34a":"#111827", fontWeight: loc===locale?700:400, borderBottom: "1px solid #f3f4f6", textAlign: "left" }}>
                        {FLAG[loc]} {LANG_NAME[loc]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="hamburger-btn"
                onClick={() => setMenuOpen(o => !o)}
                style={{ display: "none", flexDirection: "column", gap: "5px", background: "none", border: "1px solid #e5e7eb", padding: "8px 10px", borderRadius: "8px", cursor: "pointer" }}>
                <span style={{ display: "block", width: "20px", height: "2px", background: menuOpen ? "#16a34a" : "#374151", transition: "all 0.2s", transform: menuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
                <span style={{ display: "block", width: "20px", height: "2px", background: menuOpen ? "#16a34a" : "#374151", transition: "all 0.2s", opacity: menuOpen ? 0 : 1 }} />
                <span style={{ display: "block", width: "20px", height: "2px", background: menuOpen ? "#16a34a" : "#374151", transition: "all 0.2s", transform: menuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <div className="mobile-menu" style={{ borderTop: "1px solid #e5e7eb", background: "#fff", padding: "8px 0 16px" }}>
              {navSections.map(section => (
                <div key={section.id} style={{ padding: "0 16px" }}>
                  <p style={{ margin: "12px 0 4px", fontSize: "11px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.8px" }}>{section.label}</p>
                  {section.items.map((item, i) => (
                    <button key={i} className="hamburger-item"
                      onClick={() => { item.onClick ? item.onClick() : item.href ? (window.location.href = item.href) : null; setMenuOpen(false); }}
                      style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#111827", fontWeight: 500, borderRadius: "8px", textAlign: "left", transition: "background 0.12s" }}>
                      <span style={{ fontSize: "18px" }}>{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              ))}
              <div style={{ padding: "12px 16px 0", borderTop: "1px solid #f3f4f6", marginTop: "8px" }}>
                <a href="/browse" style={{ display: "block", background: "#16a34a", color: "#fff", padding: "12px 16px", borderRadius: "10px", textDecoration: "none", fontSize: "14px", fontWeight: 700, textAlign: "center" }}>
                  🍽️ {T.browse}
                </a>
              </div>
            </div>
          )}
        </nav>

        {/* ===== HERO ===== */}
        <section style={{ position:"relative", width:"100%", height:"480px", overflow:"hidden" }}>
          <video autoPlay muted loop playsInline
            style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}>
            <source src="/hero-video.mp4" type="video/mp4"/>
          </video>
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(10,46,26,0.55), rgba(10,46,26,0.82))", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"32px" }}>
            <div style={{ marginBottom:"16px", display:"inline-flex", alignItems:"center", gap:"8px", background:"rgba(74,222,128,0.15)", border:"1px solid rgba(74,222,128,0.4)", borderRadius:"999px", padding:"7px 16px" }}>
              <span style={{ width:"8px", height:"8px", borderRadius:"50%", background:"#4ade80", display:"inline-block", animation:"pulse 2s infinite" }}></span>
              <span style={{ fontSize:"13px", fontWeight:700, color:"#4ade80" }}>
                {locale==="ar"?"طعام متاح الآن":locale==="fr"?"Nourriture dispo maintenant":locale==="es"?"Comida disponible ahora":locale==="pt"?"Comida disponível agora":"Live food available now"}
              </span>
            </div>
            <h1 style={{ margin:"0 0 16px", fontSize:"clamp(36px,6vw,64px)", fontWeight:900, color:"#fff", lineHeight:1.1 }}>
              {locale==="ar"?"طعام مجاني،":locale==="fr"?"Nourriture gratuite,":locale==="es"?"Comida gratis,":locale==="pt"?"Comida grátis,":"Free food,"}<br/>
              <span style={{ color:"#4ade80" }}>
                {locale==="ar"?"لا هدر.":locale==="fr"?"zéro gaspillage.":locale==="es"?"cero desperdicio.":locale==="pt"?"zero desperdício.":"zero waste."}
              </span>
            </h1>
            <p style={{ margin:"0 0 32px", fontSize:"18px", color:"rgba(255,255,255,0.9)", maxWidth:"560px", lineHeight:1.6 }}>
              {T.hero_subtitle}
            </p>
            <div style={{ display:"flex", gap:"14px", flexWrap:"wrap", justifyContent:"center" }}>
              <Link href="/browse"
                style={{ background:"#16a34a", color:"#fff", fontWeight:700, fontSize:"16px", padding:"14px 36px", borderRadius:"12px", textDecoration:"none", boxShadow:"0 4px 20px rgba(22,163,74,0.5)" }}>
                {T.hero_cta}
              </Link>
              <Link href="/business/signup"
                style={{ background:"rgba(255,255,255,0.15)", color:"#fff", fontWeight:700, fontSize:"16px", padding:"14px 36px", borderRadius:"12px", textDecoration:"none", border:"2px solid rgba(255,255,255,0.4)" }}>
                {T.forBusiness}
              </Link>
            </div>
          </div>
        </section>

        <section style={{ borderBottom:"1px solid #e5e7eb", background:"#fff" }}>
          <div style={{ maxWidth:"900px", margin:"0 auto", padding:"18px 24px", display:"flex", flexWrap:"wrap", justifyContent:"center", gap:"32px" }}>
            {[
              { val:"100%", label: locale==="ar"?"مجاني":locale==="fr"?"Gratuit":locale==="es"?"Gratis":locale==="pt"?"Grátis":"Free" },
              { val: locale==="ar"?"فوري":"Real-time", label: locale==="ar"?"إعلانات":locale==="fr"?"annonces":locale==="es"?"anuncios":locale==="pt"?"anúncios":"listings" },
              { val:"NYC", label: locale==="ar"?"محلي":locale==="fr"?"local":locale==="es"?"local":locale==="pt"?"local":"based" },
            ].map((item, i) => (
              <div key={i} style={{ textAlign:"center" }}>
                <span style={{ fontWeight:800, color:"#0a2e1a", fontSize:"15px" }}>{item.val} </span>
                <span style={{ color:"#6b7280", fontSize:"14px" }}>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ padding:0 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gridTemplateRows:"220px 220px", gap:"3px" }}>
            <div style={{ gridColumn:"1/3", overflow:"hidden" }}>
              <img src="/hero-community.jpg" alt="Community sharing food" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform 0.4s" }} onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.04)")} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}/>
            </div>
            <div style={{ overflow:"hidden" }}>
              <img src="/hero-kitchen.jpg" alt="Restaurant kitchen" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform 0.4s" }} onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.04)")} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}/>
            </div>
            <div style={{ overflow:"hidden" }}>
              <img src="/hero-chefs.jpg" alt="Chefs preparing food" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform 0.4s" }} onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.04)")} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}/>
            </div>
            <div style={{ overflow:"hidden" }}>
              <img src="/hero-restaurant.jpg" alt="Restaurant" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform 0.4s" }} onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.04)")} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}/>
            </div>
            <div style={{ overflow:"hidden" }}>
              <img src="/hero-buffet.jpg" alt="Food buffet" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform 0.4s" }} onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.04)")} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}/>
            </div>
            <div style={{ overflow:"hidden" }}>
              <img src="/hero-phone.jpg" alt="Using the app on phone" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform 0.4s" }} onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.04)")} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}/>
            </div>
            <div style={{ overflow:"hidden" }}>
              <img src="/hero-market.jpg" alt="Fresh produce market" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform 0.4s" }} onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.04)")} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}/>
            </div>
          </div>
        </section>

        {/* Added id for scroll targeting */}
        <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-green-500">
            {locale==="ar"?"للباحثين عن طعام":locale==="fr"?"Pour les chercheurs de nourriture":locale==="es"?"Para buscadores de comida":locale==="pt"?"Para quem procura comida":"For food seekers"}
          </div>
          <h2 className="mb-4 text-center text-4xl font-extrabold text-slate-900">{T.how_title}</h2>
          <p className="mx-auto mb-14 max-w-xl text-center text-slate-500">
            {locale==="ar"?"بدون عضوية، بدون رسوم.":locale==="fr"?"Sans abonnement, sans frais.":locale==="es"?"Sin membresía, sin tarifas.":locale==="pt"?"Sem adesão, sem taxas.":"No membership, no fees. Just browse, claim, and pick up."}
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { color:"#16a34a", title:T.step1_title, desc:T.step1_desc, icon:"📱", badge:"60s" },
              { color:"#2563eb", title:T.step2_title, desc:T.step2_desc, icon:"✅", badge:locale==="ar"?"فوري":"Instant" },
              { color:"#ea580c", title:T.step3_title, desc:T.step3_desc, icon:"📍", badge:locale==="ar"?"سهل":"Easy" },
            ].map((s, i) => (
              <div key={i}
                style={{ background:"#fff", border:"1px solid #f1f5f9", borderRadius:"20px", padding:"32px", boxShadow:"0 2px 8px rgba(0,0,0,0.04)", transition:"all 0.3s", position:"relative", cursor:"default" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform="translateY(-4px)"; (e.currentTarget as HTMLElement).style.boxShadow="0 12px 32px rgba(0,0,0,0.1)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform="translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow="0 2px 8px rgba(0,0,0,0.04)"; }}>
                <span style={{ position:"absolute", top:"16px", right:"16px", fontSize:"11px", fontWeight:700, color:"#9ca3af", background:"#f9fafb", padding:"4px 10px", borderRadius:"999px" }}>{s.badge}</span>
                <div style={{ width:"52px", height:"52px", borderRadius:"16px", background:s.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"24px", marginBottom:"16px" }}>{s.icon}</div>
                <h3 style={{ margin:"0 0 10px", fontSize:"19px", fontWeight:800, color:"#0f172a" }}>{s.title}</h3>
                <p style={{ margin:0, color:"#64748b", lineHeight:1.7, fontSize:"14px" }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/browse" className="inline-block rounded-xl bg-green-500 px-8 py-4 font-bold text-white shadow-lg shadow-green-100 hover:bg-green-600 transition">
              {T.hero_cta}
            </Link>
          </div>
        </section>

        <section style={{ background:"#0a2e1a", padding:"72px 24px" }}>
          <div style={{ maxWidth:"820px", margin:"0 auto", textAlign:"center" }}>
            <p style={{ margin:"0 0 8px", fontSize:"13px", fontWeight:700, color:"#4ade80", textTransform:"uppercase", letterSpacing:"0.8px" }}>
              🌍 {locale==="ar"?"تأثير حقيقي":locale==="fr"?"Impact Réel":locale==="es"?"Impacto Real":locale==="pt"?"Impacto Real":"Real Impact, Right Now"}
            </p>
            <h2 style={{ margin:"0 0 12px", fontSize:"36px", fontWeight:800, color:"#fff" }}>
              {locale==="ar"?"مجتمعنا في العمل":locale==="fr"?"Notre Communauté en Action":locale==="es"?"Nuestra Comunidad en Acción":locale==="pt"?"Nossa Comunidade em Ação":"Our Community in Action"}
            </h2>
            <p style={{ margin:"0 0 48px", fontSize:"16px", color:"#a3c9b0" }}>
              {locale==="ar"?"كل وجبة محجوزة هي طعام نُقذ من الهدر.":locale==="fr"?"Chaque repas réclamé est de la nourriture sauvée.":locale==="es"?"Cada comida reclamada es alimento rescatado.":locale==="pt"?"Cada refeição salva vai direto para a comunidade.":"Every meal claimed is food saved from the landfill."}
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>
              <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:"20px", padding:"36px 24px" }}>
                <p style={{ margin:"0 0 8px", fontSize:"56px", fontWeight:900, color:"#4ade80", lineHeight:1 }}>
                  {statsLoaded ? liveStats.total_pickups.toLocaleString() : "—"}
                </p>
                <p style={{ margin:0, fontSize:"16px", color:"#a3c9b0", fontWeight:600 }}>
                  🤲 {locale==="ar"?"وجبات مجانية محجوزة":locale==="fr"?"Repas offerts":locale==="es"?"Comidas reclamadas":locale==="pt"?"Refeições resgatadas":"Free meals claimed"}
                </p>
              </div>
              <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:"20px", padding:"36px 24px" }}>
                <p style={{ margin:"0 0 8px", fontSize:"56px", fontWeight:900, color:"#4ade80", lineHeight:1 }}>
                  {statsLoaded ? liveStats.co2_saved_lbs.toLocaleString() : "—"}
                </p>
                <p style={{ margin:0, fontSize:"16px", color:"#a3c9b0", fontWeight:600 }}>
                  🌱 {locale==="ar"?"رطل CO₂e تم توفيرها":locale==="fr"?"lbs CO₂e économisées":locale==="es"?"lbs CO₂e ahorradas":locale==="pt"?"lbs CO₂e salvas":"lbs CO₂e saved"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-900 text-white">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="grid items-center gap-12 md:grid-cols-2">
              <div>
                <div className="mb-4 text-sm font-semibold uppercase tracking-widest text-green-400">{T.forBusiness}</div>
                <h2 className="mb-6 text-4xl font-extrabold leading-tight">
                  {locale==="ar"?<>{"حوّل الطعام الفائض إلى"}<br/><span className="text-green-400">{"حسن نية مجتمعي"}</span></>:
                   locale==="fr"?<>{"Transformez les surplus en"}<br/><span className="text-green-400">{"soutien communautaire"}</span></>:
                   locale==="es"?<>{"Convierte el excedente en"}<br/><span className="text-green-400">{"buena voluntad comunitaria"}</span></>:
                   locale==="pt"?<>{"Transforme excedentes em"}<br/><span className="text-green-400">{"boa vontade comunitária"}</span></>:
                   <>{"Turn surplus food into"}<br/><span className="text-green-400">{"community goodwill"}</span></>}
                </h2>
                <p className="mb-8 text-lg text-slate-300 leading-relaxed">{T.mission_desc}</p>
                <div className="mb-8 space-y-4">
                  {[T.step1_desc, T.step2_desc, T.step3_desc,
                    locale==="ar"?"بناء سمعة كشركة مجتمعية":locale==="fr"?"Construisez votre réputation":locale==="es"?"Construye reputación comunitaria":locale==="pt"?"Construa reputação comunitária":"Build reputation as a community-first business"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-white text-xs font-black">✓</div>
                      <p className="text-slate-300">{item}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-4">
                  <Link href="/business/signup" className="rounded-xl bg-green-500 px-8 py-4 font-bold text-white hover:bg-green-600 transition">{T.hero_cta2}</Link>
                  <Link href="/business/login" className="rounded-xl border border-white/20 px-8 py-4 font-bold text-white hover:bg-white/10 transition">{T.login}</Link>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="rounded-3xl bg-white/10 p-12 ring-1 ring-white/20">
                  <Image src="/gawa-logo-green.png" width={180} height={180} alt="GAWA Loop for businesses" style={{ objectFit:"contain" }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Added id for scroll targeting */}
        <section id="why-gawa" className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="mb-4 text-center text-4xl font-extrabold text-slate-900">
            {locale==="ar"?"لماذا GAWA Loop؟":locale==="fr"?"Pourquoi GAWA Loop ?":locale==="es"?"¿Por qué GAWA Loop?":locale==="pt"?"Por que GAWA Loop?":"Why GAWA Loop?"}
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center text-slate-500">
            {locale==="ar"?"مبني لجعل مشاركة الطعام بسيطة وآمنة.":locale==="fr"?"Conçu pour rendre le partage alimentaire simple et sûr.":locale==="es"?"Construido para hacer el intercambio simple y seguro.":locale==="pt"?"Construído para tornar o compartilhamento simples e seguro.":"Built to make food sharing simple, safe, and reliable."}
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon:"🔐", en:["Safe reservations","Unique code per claim. No double bookings, ever."],fr:["Réservations sécurisées","Code unique par réservation."],es:["Reservas seguras","Código único por reclamo."],pt:["Reservas seguras","Código único por pedido."],ar:["حجوزات آمنة","رمز فريد لكل حجز."] },
              { icon:"📧", en:["Email confirmation","Instant email with code, directions, and cancel link."],fr:["Confirmation par email","Email instantané avec code et directions."],es:["Confirmación por email","Email instantáneo con código."],pt:["Confirmação por email","Email instantâneo com código."],ar:["تأكيد بالبريد","بريد فوري مع رمزك."] },
              { icon:"🗺️", en:["Easy directions","One tap to Google Maps, Apple Maps, or Waze."],fr:["Itinéraire facile","Ouvrez Maps en un tap."],es:["Direcciones fáciles","Abre Maps con un toque."],pt:["Direções fáceis","Abra Maps com um toque."],ar:["اتجاهات سهلة","افتح خرائط Google بنقرة."] },
              { icon:"⚡", en:["Real-time updates","Listings refresh every 30 seconds automatically."],fr:["Mises à jour en temps réel","Actualisation toutes les 30 secondes."],es:["Actualizaciones en tiempo real","Actualización cada 30 segundos."],pt:["Atualizações em tempo real","Atualização a cada 30 segundos."],ar:["تحديثات فورية","تحديث كل 30 ثانية."] },
              { icon:"🆓", en:["Completely free","No fees. No subscriptions. Forever."],fr:["Totalement gratuit","Aucun frais. Pour toujours."],es:["Completamente gratis","Sin cargos. Para siempre."],pt:["Completamente grátis","Sem taxas. Para sempre."],ar:["مجاني تماماً","بدون رسوم. إلى الأبد."] },
              { icon:"🌍", en:["Reduce food waste","Every claim = less food in landfills."],fr:["Réduire le gaspillage","Chaque réservation réduit le gaspillage."],es:["Reduce el desperdicio","Cada reclamo = menos desperdicio."],pt:["Reduzir o desperdício","Cada pedido = menos desperdício."],ar:["تقليل الهدر","كل حجز = أقل هدراً."] },
            ].map((card, i) => {
              const [title, desc] = (card as any)[locale] || card.en;
              return (
                <div key={i}
                  style={{ background:"#fff", border:"1px solid #f1f5f9", borderRadius:"20px", padding:"32px", cursor:"default", transition:"all 0.3s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform="translateY(-4px)"; (e.currentTarget as HTMLElement).style.boxShadow="0 12px 32px rgba(0,0,0,0.08)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform="translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow="none"; }}>
                  <div style={{ fontSize:"32px", marginBottom:"14px" }}>{card.icon}</div>
                  <h3 style={{ margin:"0 0 8px", fontSize:"17px", fontWeight:800, color:"#0f172a" }}>{title}</h3>
                  <p style={{ margin:0, color:"#64748b", fontSize:"13px", lineHeight:1.7 }}>{desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Added id for scroll targeting */}
        <section id="faq" style={{ background:"#f8fafc", padding:"80px 24px" }}>
          <div style={{ maxWidth:"720px", margin:"0 auto" }}>
            <h2 style={{ margin:"0 0 8px", fontSize:"36px", fontWeight:800, color:"#0f172a", textAlign:"center" }}>
              {locale==="ar"?"الأسئلة الشائعة":locale==="fr"?"Questions fréquentes":locale==="es"?"Preguntas frecuentes":locale==="pt"?"Perguntas frequentes":"Frequently Asked Questions"}
            </h2>
            <p style={{ margin:"0 0 48px", textAlign:"center", color:"#64748b", fontSize:"15px" }}>
              {locale==="ar"?"كل ما تحتاج معرفته":locale==="fr"?"Tout ce que vous devez savoir":locale==="es"?"Todo lo que necesitas saber":locale==="pt"?"Tudo o que você precisa saber":"Everything you need to know about GAWA Loop"}
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              {faqs.map((faq, i) => (
                <div key={i} style={{ background:"#fff", borderRadius:"16px", border:"1px solid #e2e8f0", overflow:"hidden" }}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}>
                    <span style={{ fontWeight:700, color:"#0f172a", fontSize:"15px", paddingRight:"16px" }}>{faq.q}</span>
                    <span style={{ color:"#16a34a", fontSize:"22px", flexShrink:0, transition:"transform 0.2s", transform: openFaq===i?"rotate(45deg)":"rotate(0deg)", display:"inline-block" }}>+</span>
                  </button>
                  {openFaq === i && (
                    <div style={{ padding:"0 24px 20px" }}>
                      <p style={{ margin:0, color:"#475569", lineHeight:1.7, fontSize:"14px" }}>{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Added id for scroll targeting */}
        <section id="signin" style={{ background:"#f0fdf4", padding:"80px 24px", borderTop:"1px solid #bbf7d0" }}>
          <div style={{ maxWidth:"480px", margin:"0 auto" }}>
            <p style={{ margin:"0 0 8px", fontSize:"13px", fontWeight:700, color:"#16a34a", textTransform:"uppercase", letterSpacing:"0.8px", textAlign:"center" }}>
              {locale==="ar"?"أعضاء المجتمع":locale==="fr"?"Membres de la communauté":locale==="es"?"Miembros de la comunidad":locale==="pt"?"Membros da comunidade":"Community Members"}
            </p>
            <h2 style={{ margin:"0 0 8px", fontSize:"32px", fontWeight:800, color:"#0a2e1a", textAlign:"center" }}>
              {signinMode === "signin"
                ? (locale==="ar"?"سجّل الدخول":locale==="fr"?"Se connecter":locale==="es"?"Iniciar sesión":locale==="pt"?"Entrar":"Sign in to your account")
                : (locale==="ar"?"إنشاء حساب مجاني":locale==="fr"?"Créer un compte":locale==="es"?"Crear cuenta":locale==="pt"?"Criar conta":"Create a free account")}
            </h2>
            <p style={{ margin:"0 0 32px", color:"#4b7c5e", textAlign:"center", fontSize:"15px" }}>
              {signinMode === "signin"
                ? (locale==="ar"?"الوصول إلى حجوزاتك":locale==="fr"?"Accédez à vos réservations":locale==="es"?"Accede a tus reservas":locale==="pt"?"Acesse suas reservas":"Access your reservations and order history.")
                : (locale==="ar"?"انضم للحصول على طعام مجاني":locale==="fr"?"Rejoignez-nous pour de la nourriture gratuite":locale==="es"?"Únete para obtener comida gratis":locale==="pt"?"Junte-se para comida grátis":"Join GAWA Loop to start claiming free food.")}
            </p>
            <div style={{ background:"#fff", borderRadius:"20px", padding:"32px", boxShadow:"0 4px 20px rgba(0,0,0,0.06)", border:"1px solid #d1fae5" }}>
              {user ? (
                <div style={{ textAlign:"center" }}>
                  <p style={{ margin:"0 0 16px", fontSize:"16px", color:"#0a2e1a", fontWeight:600 }}>✅ {user.email}</p>
                  <div style={{ display:"flex", gap:"12px", justifyContent:"center", flexWrap:"wrap" }}>
                    <a href="/customer/profile" style={{ background:"#16a34a", color:"#fff", padding:"12px 24px", borderRadius:"10px", textDecoration:"none", fontWeight:700, fontSize:"14px" }}>
                      {locale==="ar"?"حسابي":locale==="fr"?"Mon Compte":locale==="es"?"Mi Cuenta":locale==="pt"?"Minha Conta":"My Account"}
                    </a>
                    <a href="/browse" style={{ background:"#f3f4f6", color:"#374151", padding:"12px 24px", borderRadius:"10px", textDecoration:"none", fontWeight:600, fontSize:"14px", border:"1px solid #e5e7eb" }}>{T.hero_cta}</a>
                    <button onClick={async () => { await supabase.auth.signOut(); setUser(null); }} style={{ background:"none", border:"none", color:"#9ca3af", fontSize:"13px", cursor:"pointer" }}>
                      {locale==="ar"?"خروج":locale==="fr"?"Déconnexion":locale==="es"?"Cerrar sesión":locale==="pt"?"Sair":"Sign Out"}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCustomerAuth}>
                  {signinError && (
                    <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"8px", padding:"10px 14px", marginBottom:"16px" }}>
                      <p style={{ margin:0, color:"#991b1b", fontSize:"13px" }}>{signinError}</p>
                    </div>
                  )}
                  <div style={{ marginBottom:"14px" }}>
                    <label style={{ display:"block", fontSize:"13px", fontWeight:600, color:"#374151", marginBottom:"6px" }}>
                      {locale==="ar"?"البريد الإلكتروني":locale==="fr"?"Adresse email":locale==="es"?"Correo electrónico":locale==="pt"?"Email":"Email Address"}
                    </label>
                    <input style={inp} type="email" required value={signinEmail} onChange={e => setSigninEmail(e.target.value)} placeholder="you@email.com" />
                  </div>
                  <div style={{ marginBottom: signinMode === "signup" ? "16px" : "20px" }}>
                    <label style={{ display:"block", fontSize:"13px", fontWeight:600, color:"#374151", marginBottom:"6px" }}>
                      {locale==="ar"?"كلمة المرور":locale==="fr"?"Mot de passe":locale==="es"?"Contraseña":locale==="pt"?"Senha":"Password"}
                    </label>
                    <input style={inp} type="password" required value={signinPassword} onChange={e => setSigninPassword(e.target.value)} placeholder="••••••••" minLength={6} />
                  </div>
                  {signinMode === "signup" && (
                    <label style={{ display:"flex", gap:"10px", alignItems:"flex-start", marginBottom:"16px", cursor:"pointer" }}
                      onClick={() => setTermsAccepted(v => !v)}>
                      <div style={{ width:"20px", height:"20px", borderRadius:"5px", border:`2px solid ${termsAccepted ? "#16a34a" : "#d1d5db"}`, background:termsAccepted ? "#16a34a" : "#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:"1px", transition:"all 0.15s" }}>
                        {termsAccepted && <span style={{ color:"#fff", fontSize:"12px", fontWeight:900 }}>✓</span>}
                      </div>
                      <p style={{ margin:0, fontSize:"13px", color:"#374151", lineHeight:1.5 }}>
                        {locale==="fr"?"J'accepte les ":locale==="es"?"Acepto los ":locale==="pt"?"Aceito os ":locale==="ar"?"أوافق على ":"I agree to the "}
                        <a href="/terms" target="_blank" onClick={e => e.stopPropagation()} style={{ color:"#16a34a", fontWeight:600, textDecoration:"none" }}>
                          {locale==="fr"?"Conditions d'utilisation":locale==="es"?"Términos de uso":locale==="pt"?"Termos de uso":locale==="ar"?"شروط الاستخدام":"Terms of Use"}
                        </a>
                        {" "}{locale==="fr"?"et la ":locale==="es"?"y la ":locale==="pt"?"e a ":locale==="ar"?"و":"and "}
                        <a href="/privacy" target="_blank" onClick={e => e.stopPropagation()} style={{ color:"#16a34a", fontWeight:600, textDecoration:"none" }}>
                          {locale==="fr"?"Politique de confidentialité":locale==="es"?"Política de privacidad":locale==="pt"?"Política de privacidade":locale==="ar"?"سياسة الخصوصية":"Privacy Policy"}
                        </a>
                        {" *"}
                      </p>
                    </label>
                  )}
                  <button type="submit" disabled={signinLoading || (signinMode === "signup" && !termsAccepted)}
                    style={{ width:"100%", background:(signinLoading || (signinMode === "signup" && !termsAccepted))?"#9ca3af":"#16a34a", color:"#fff", border:"none", padding:"13px", borderRadius:"10px", cursor:(signinLoading || (signinMode === "signup" && !termsAccepted))?"not-allowed":"pointer", fontSize:"15px", fontWeight:700, marginBottom:"16px" }}>
                    {signinLoading ? "..." : signinMode === "signin"
                      ? (locale==="ar"?"دخول":locale==="fr"?"Se connecter":locale==="es"?"Iniciar sesión":locale==="pt"?"Entrar":"Sign In")
                      : (locale==="ar"?"إنشاء حساب":locale==="fr"?"Créer le compte":locale==="es"?"Crear cuenta":locale==="pt"?"Criar conta":"Create Account")}
                  </button>
                  <p style={{ textAlign:"center", fontSize:"13px", color:"#6b7280", margin:0 }}>
                    {signinMode === "signin"
                      ? (locale==="ar"?"ليس لديك حساب؟":locale==="fr"?"Pas de compte ?":locale==="es"?"¿Sin cuenta?":locale==="pt"?"Sem conta?":"No account yet?")
                      : (locale==="ar"?"لديك حساب؟":locale==="fr"?"Déjà un compte ?":locale==="es"?"¿Ya tienes cuenta?":locale==="pt"?"Já tem conta?":"Already have an account?")}{" "}
                    <button type="button" onClick={() => { setSigninMode(signinMode === "signin" ? "signup" : "signin"); setSigninError(""); setTermsAccepted(false); }}
                      style={{ background:"none", border:"none", color:"#16a34a", fontWeight:700, cursor:"pointer", fontSize:"13px", padding:0 }}>
                      {signinMode === "signin"
                        ? (locale==="ar"?"إنشاء حساب مجاني":locale==="fr"?"Créer un compte":locale==="es"?"Crear cuenta":locale==="pt"?"Criar conta":"Create one free")
                        : (locale==="ar"?"تسجيل الدخول":locale==="fr"?"Se connecter":locale==="es"?"Iniciar sesión":locale==="pt"?"Entrar":"Sign in")}
                    </button>
                  </p>
                </form>
              )}
            </div>
            <p style={{ textAlign:"center", marginTop:"16px", fontSize:"12px", color:"#9ca3af" }}>
              {locale==="ar"?"هل أنت مطعم؟":locale==="fr"?"Vous êtes un restaurant ?":locale==="es"?"¿Eres un restaurante?":locale==="pt"?"É um restaurante?":"Are you a restaurant or business?"}{" "}
              <a href="/business/login" style={{ color:"#16a34a", fontWeight:600, textDecoration:"none" }}>
                {locale==="ar"?"دخول الشركات ←":locale==="fr"?"Connexion entreprise →":locale==="es"?"Login empresas →":locale==="pt"?"Login empresas →":"Business login →"}
              </a>
            </p>
          </div>
        </section>

        {/* Added id for scroll targeting */}
        <section id="contact" style={{ background:"#fff", padding:"80px 24px", borderTop:"1px solid #e5e7eb" }}>
          <div style={{ maxWidth:"560px", margin:"0 auto" }}>
            <p style={{ margin:"0 0 8px", fontSize:"13px", fontWeight:700, color:"#16a34a", textTransform:"uppercase", letterSpacing:"0.8px", textAlign:"center" }}>
              {locale==="ar"?"تواصل معنا":locale==="fr"?"Contactez-nous":locale==="es"?"Contáctenos":locale==="pt"?"Entre em contato":"Get in touch"}
            </p>
            <h2 style={{ margin:"0 0 8px", fontSize:"32px", fontWeight:800, color:"#0a2e1a", textAlign:"center" }}>
              {locale==="ar"?"اتصل بنا":locale==="fr"?"Nous contacter":locale==="es"?"Contáctanos":locale==="pt"?"Contate-nos":"Contact Us"}
            </h2>
            <p style={{ margin:"0 0 32px", color:"#64748b", textAlign:"center", fontSize:"15px" }}>
              {locale==="ar"?"لديك سؤال أو فكرة؟ نحن نحب أن نسمع منك.":locale==="fr"?"Une question ou une idée ? Nous serions ravis de vous lire.":locale==="es"?"¿Tienes una pregunta? Nos encantaría saber de ti.":locale==="pt"?"Tem uma pergunta? Adoraríamos ouvir de você.":"Have a question, partnership idea, or just want to say hi? We'd love to hear from you."}
            </p>
            <div style={{ background:"#f9fafb", borderRadius:"20px", padding:"32px", border:"1px solid #e5e7eb" }}>
              {contactDone ? (
                <div style={{ textAlign:"center", padding:"24px 0" }}>
                  <div style={{ fontSize:"48px", marginBottom:"12px" }}>✅</div>
                  <h3 style={{ margin:"0 0 8px", fontSize:"20px", fontWeight:800, color:"#0a2e1a" }}>
                    {locale==="ar"?"تم الإرسال!":locale==="fr"?"Message envoyé !":locale==="es"?"¡Mensaje enviado!":locale==="pt"?"Mensagem enviada!":"Message sent!"}
                  </h3>
                  <p style={{ margin:"0 0 20px", color:"#6b7280", fontSize:"14px" }}>
                    {locale==="ar"?"سنرد عليك خلال 24-48 ساعة.":locale==="fr"?"Nous vous répondrons sous 24–48h.":locale==="es"?"Te responderemos en 24–48h.":locale==="pt"?"Responderemos em 24–48h.":"We'll get back to you within 24–48 hours."}
                  </p>
                  <button onClick={() => setContactDone(false)} style={{ background:"#f3f4f6", border:"1px solid #e5e7eb", padding:"10px 20px", borderRadius:"8px", cursor:"pointer", fontWeight:600, fontSize:"14px", color:"#374151" }}>
                    {locale==="ar"?"إرسال رسالة أخرى":locale==="fr"?"Envoyer un autre message":locale==="es"?"Enviar otro mensaje":locale==="pt"?"Enviar outra mensagem":"Send another message"}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContact}>
                  {contactError && <p style={{ margin:"0 0 14px", fontSize:"13px", color:"#ef4444", fontWeight:600 }}>{contactError}</p>}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"14px" }}>
                    <div>
                      <label style={{ display:"block", fontSize:"13px", fontWeight:600, color:"#374151", marginBottom:"6px" }}>
                        {locale==="ar"?"الاسم *":locale==="fr"?"Votre nom *":locale==="es"?"Tu nombre *":locale==="pt"?"Seu nome *":"Your Name *"}
                      </label>
                      <input style={inp} required value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Alex Johnson" />
                    </div>
                    <div>
                      <label style={{ display:"block", fontSize:"13px", fontWeight:600, color:"#374151", marginBottom:"6px" }}>
                        {locale==="ar"?"البريد الإلكتروني *":locale==="fr"?"Email *":locale==="es"?"Email *":locale==="pt"?"Email *":"Email *"}
                      </label>
                      <input style={inp} type="email" required value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@email.com" />
                    </div>
                  </div>
                  <div style={{ marginBottom:"20px" }}>
                    <label style={{ display:"block", fontSize:"13px", fontWeight:600, color:"#374151", marginBottom:"6px" }}>
                      {locale==="ar"?"الرسالة *":locale==="fr"?"Message *":locale==="es"?"Mensaje *":locale==="pt"?"Mensagem *":"Message *"}
                    </label>
                    <textarea style={{ ...inp, height:"120px", resize:"vertical" }} required value={contactMsg} onChange={e => setContactMsg(e.target.value)}
                      placeholder={locale==="ar"?"اكتب رسالتك هنا...":locale==="fr"?"Votre message...":locale==="es"?"Tu mensaje...":locale==="pt"?"Sua mensagem...":"Tell us what's on your mind..."} />
                  </div>
                  <button type="submit" disabled={contactSending}
                    style={{ width:"100%", background:contactSending?"#9ca3af":"#0a2e1a", color:"#fff", border:"none", padding:"13px", borderRadius:"10px", cursor:contactSending?"not-allowed":"pointer", fontSize:"15px", fontWeight:700 }}>
                    {contactSending ? "..." : (locale==="ar"?"إرسال الرسالة":locale==="fr"?"Envoyer le message":locale==="es"?"Enviar mensaje":locale==="pt"?"Enviar mensagem":"Send Message")}
                  </button>
                  <p style={{ textAlign:"center", marginTop:"14px", fontSize:"12px", color:"#9ca3af" }}>
                    {locale==="ar"?"أو راسلنا مباشرة:":locale==="fr"?"Ou par email :":locale==="es"?"O escríbenos:":locale==="pt"?"Ou por email:":"Or email directly:"}{" "}
                    <a href="mailto:admin@gawaloop.com" style={{ color:"#16a34a", fontWeight:600, textDecoration:"none" }}>admin@gawaloop.com</a>
                  </p>
                </form>
              )}
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-br from-green-500 to-emerald-600">
          <div className="mx-auto max-w-4xl px-6 py-20 text-center">
            <div className="mb-8 flex justify-center">
              <div className="rounded-3xl bg-white/20 p-10 backdrop-blur-sm">
                <Image src="/gawa-logo-green.png" width={160} height={160} alt="GAWA Loop" style={{ objectFit:"contain" }} />
              </div>
            </div>
            <h2 className="mb-4 text-4xl font-extrabold text-white">
              {locale==="ar"?"هل أنت مستعد للبدء؟":locale==="fr"?"Prêt à commencer ?":locale==="es"?"¿Listo para empezar?":locale==="pt"?"Pronto para começar?":"Ready to get started?"}
            </h2>
            <p className="mb-10 text-lg text-green-100">
              {locale==="ar"?"انضم لمجتمعك. أقل من دقيقة.":locale==="fr"?"Rejoignez votre communauté en moins d'une minute.":locale==="es"?"Únete a tu comunidad en menos de un minuto.":locale==="pt"?"Junte-se à sua comunidade em menos de um minuto.":"Join your community. Find free food or share yours — less than a minute."}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/browse" className="rounded-xl bg-white px-8 py-4 text-base font-bold text-green-600 shadow-lg hover:bg-green-50 transition">{T.hero_cta}</Link>
              <Link href="/business/signup" className="rounded-xl border-2 border-white/40 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition">{T.hero_cta2}</Link>
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-100 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              <a href="/" className="flex items-center gap-3">
                <Image src="/gawa-logo-green.png" width={32} height={32} alt="GAWA Loop" style={{ objectFit:"contain" }} />
                <span className="font-bold text-slate-900">GAWA Loop</span>
              </a>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
                <Link href="/browse" className="hover:text-green-600 transition">{T.browse}</Link>
                <Link href="/business/signup" className="hover:text-green-600 transition">{T.forBusiness}</Link>
                <Link href="/business/login" className="hover:text-green-600 transition">{T.login}</Link>
                <Link href="/customer/signup" className="hover:text-green-600 transition">Join as Customer</Link>
                <a href="mailto:admin@gawaloop.com" className="hover:text-green-600 transition">
                  {locale==="ar"?"اتصل بنا":locale==="fr"?"Contact":locale==="es"?"Contacto":locale==="pt"?"Contato":"Contact Us"}
                </a>
              </div>
              <div className="text-sm text-slate-400">© 2026 GAWA Loop · Free food. Less waste. Real impact.</div>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
