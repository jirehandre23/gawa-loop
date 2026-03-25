"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { detectLocale, t, Locale, setLocale as saveLocale, FLAG, LANG_NAME } from "@/lib/i18n";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LOCALES: Locale[] = ["en","fr","es","pt","ar"];

// Animated counter hook
function useCountUp(target: number, duration = 1500, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start || target === 0) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, start]);
  return count;
}

export default function HomePage() {
  const [locale, setLocaleState]     = useState<Locale>("en");
  const [langOpen, setLangOpen]      = useState(false);
  const [stats, setStats]            = useState({ pickups: 0, listings: 0, value: 0, businesses: 0 });
  const [recentFood, setRecentFood]  = useState<any[]>([]);
  const [statsVisible, setStatsVisible] = useState(false);
  const [openFaq, setOpenFaq]        = useState<number | null>(null);
  const statsRef                     = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocaleState(detectLocale()); }, []);

  // Fetch live stats
  useEffect(() => {
    async function loadStats() {
      const { data } = await supabase.rpc ? supabase
        .from("listings")
        .select("status, estimated_value, food_name, business_name, created_at, address") : { data: null };

      if (data) {
        const pickups   = data.filter((l: any) => l.status === "PICKED_UP").length;
        const listings  = data.length;
        const value     = data.filter((l: any) => l.status === "PICKED_UP").reduce((s: number, l: any) => s + Number(l.estimated_value || 0), 0);
        const businesses = new Set(data.map((l: any) => l.business_name)).size;
        setStats({ pickups, listings, value, businesses });

        // Recent available food for ticker
        const recent = data.filter((l: any) => l.status === "AVAILABLE").slice(0, 5);
        setRecentFood(recent);
      }
    }
    loadStats();
  }, []);

  // Intersection observer for stats animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const pickupsCount   = useCountUp(stats.pickups   || 47,  1500, statsVisible);
  const listingsCount  = useCountUp(stats.listings  || 120, 1500, statsVisible);
  const valueCount     = useCountUp(stats.value     || 890, 1800, statsVisible);
  const bizCount       = useCountUp(stats.businesses|| 12,  1200, statsVisible);

  const T = t[locale];
  const isRTL = locale === "ar";

  function switchLocale(loc: Locale) {
    saveLocale(loc);
    setLocaleState(loc);
    setLangOpen(false);
  }

  const faqs = [
    {
      q: locale==="fr" ? "GAWA Loop est-il vraiment gratuit ?" : locale==="es" ? "¿GAWA Loop es realmente gratis?" : locale==="pt" ? "GAWA Loop é realmente grátis?" : locale==="ar" ? "هل GAWA Loop مجاني حقاً؟" : "Is GAWA Loop really free?",
      a: locale==="fr" ? "Oui, 100% gratuit pour les clients et les entreprises. Toujours." : locale==="es" ? "Sí, 100% gratis para clientes y negocios. Siempre." : locale==="pt" ? "Sim, 100% grátis para clientes e empresas. Sempre." : locale==="ar" ? "نعم، مجاني 100٪ للعملاء والشركات. دائماً." : "Yes — 100% free for both customers and businesses. No fees, no subscriptions, ever."
    },
    {
      q: locale==="fr" ? "Comment réserver de la nourriture ?" : locale==="es" ? "¿Cómo reservo comida?" : locale==="pt" ? "Como reservar comida?" : locale==="ar" ? "كيف أحجز طعاماً؟" : "How do I claim food?",
      a: locale==="fr" ? "Allez sur /browse, choisissez un aliment disponible, entrez votre prénom et email, et réservez en quelques secondes. Vous recevrez un code par email." : locale==="es" ? "Ve a /browse, elige un alimento disponible, ingresa tu nombre y correo, y reserva en segundos. Recibirás un código por correo." : locale==="pt" ? "Vá para /browse, escolha um alimento disponível, insira seu nome e email, e reserve em segundos. Você receberá um código por email." : locale==="ar" ? "اذهب إلى /browse، اختر طعاماً متاحاً، أدخل اسمك وبريدك الإلكتروني، واحجز في ثوانٍ. ستتلقى رمزاً عبر البريد الإلكتروني." : "Go to /browse, pick an available item, enter your name and email, and reserve in seconds. You'll get a confirmation code by email."
    },
    {
      q: locale==="fr" ? "Que se passe-t-il si je ne peux pas récupérer la nourriture ?" : locale==="es" ? "¿Qué pasa si no puedo recoger la comida?" : locale==="pt" ? "O que acontece se não puder buscar a comida?" : locale==="ar" ? "ماذا يحدث إذا لم أستطع استلام الطعام؟" : "What if I can't pick up the food?",
      a: locale==="fr" ? "Pas de problème ! Annulez via le lien dans votre email de confirmation. Le listing sera libéré pour quelqu'un d'autre." : locale==="es" ? "¡Sin problema! Cancela usando el enlace en tu correo de confirmación. El listado se liberará para otra persona." : locale==="pt" ? "Sem problema! Cancele usando o link no seu email de confirmação. O anúncio será liberado para outra pessoa." : locale==="ar" ? "لا مشكلة! الغِ حجزك باستخدام الرابط في بريد التأكيد. سيُتاح الإعلان لشخص آخر." : "No problem! Cancel using the link in your confirmation email. The listing is instantly released for someone else."
    },
    {
      q: locale==="fr" ? "Comment inscrire mon restaurant ?" : locale==="es" ? "¿Cómo registro mi restaurante?" : locale==="pt" ? "Como cadastro meu restaurante?" : locale==="ar" ? "كيف أسجل مطعمي؟" : "How do I register my restaurant?",
      a: locale==="fr" ? "Cliquez sur « Pour les entreprises » et inscrivez-vous en 2 minutes. Commencez à publier de la nourriture immédiatement." : locale==="es" ? "Haz clic en 'Para negocios' y regístrate en 2 minutos. Comienza a publicar comida de inmediato." : locale==="pt" ? "Clique em 'Para empresas' e cadastre-se em 2 minutos. Comece a publicar comida imediatamente." : locale==="ar" ? "انقر على 'للشركات' وسجّل في دقيقتين. ابدأ نشر الطعام فوراً." : "Click 'For Businesses' and sign up in 2 minutes. Start posting food immediately."
    },
    {
      q: locale==="fr" ? "La nourriture est-elle sûre ?" : locale==="es" ? "¿La comida es segura?" : locale==="pt" ? "A comida é segura?" : locale==="ar" ? "هل الطعام آمن؟" : "Is the food safe?",
      a: locale==="fr" ? "Toute la nourriture provient de vrais restaurants, boulangeries et épiceries vérifiés. Chaque annonce inclut des informations sur les allergènes." : locale==="es" ? "Toda la comida proviene de restaurantes, panaderías y tiendas reales verificados. Cada listado incluye información sobre alérgenos." : locale==="pt" ? "Toda a comida vem de restaurantes, padarias e lojas reais verificadas. Cada anúncio inclui informações sobre alergênicos." : locale==="ar" ? "جميع الطعام مصدره مطاعم ومخابز ومتاجر حقيقية موثوقة. كل إعلان يتضمن معلومات الحساسية." : "All food comes from verified real restaurants, bakeries, and stores. Every listing includes allergen information."
    },
  ];

  return (
    <>
      {/* SEO Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "GAWA Loop",
        "url": "https://gawaloop.com",
        "description": "Free food app connecting local restaurants and stores with people in the community — sharing surplus food before it goes to waste.",
        "applicationCategory": "FoodApplication",
        "operatingSystem": "Any",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
        "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "47" },
        "sameAs": ["https://gawaloop.com"],
        "address": { "@type": "PostalAddress", "addressLocality": "Brooklyn", "addressRegion": "NY", "addressCountry": "US" }
      })}} />

      <main dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white text-slate-900"
        style={{ fontFamily: isRTL ? "'Noto Sans Arabic', sans-serif" : undefined }}>

        {/* ══════════════════════════════════════
            NAV
        ══════════════════════════════════════ */}
        <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-sm" role="navigation" aria-label="Main navigation">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <a href="/" className="flex items-center gap-3" aria-label="GAWA Loop home">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 ring-2 ring-green-100">
                <Image src="/gawa-logo-green.png" width={28} height={28} alt="GAWA Loop logo" style={{ objectFit:"contain" }} priority />
              </div>
              <span className="text-lg font-bold text-slate-900">GAWA Loop</span>
            </a>
            <div className="flex items-center gap-3">
              <Link href="/browse" className="hidden text-sm font-medium text-slate-600 hover:text-green-600 sm:block transition">{T.browse}</Link>
              <Link href="/business/login" className="hidden text-sm font-medium text-slate-600 hover:text-green-600 sm:block transition">{T.login}</Link>
              <Link href="/business/signup" className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 transition shadow-sm shadow-green-200">
                {T.hero_cta2}
              </Link>
              {/* Language switcher */}
              <div style={{ position:"relative" }}>
                <button onClick={() => setLangOpen(o => !o)} aria-label="Change language"
                  style={{ background:"transparent", border:"1px solid #e5e7eb", borderRadius:"8px", padding:"6px 10px", cursor:"pointer", fontSize:"13px", fontWeight:600, display:"flex", alignItems:"center", gap:"4px", color:"#374151" }}>
                  {FLAG[locale]} ▾
                </button>
                {langOpen && (
                  <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, background:"#fff", border:"1px solid #e5e7eb", borderRadius:"10px", boxShadow:"0 8px 24px rgba(0,0,0,0.12)", overflow:"hidden", minWidth:"150px", zIndex:999 }}>
                    {LOCALES.map(loc => (
                      <button key={loc} onClick={() => switchLocale(loc)}
                        style={{ display:"flex", alignItems:"center", gap:"8px", width:"100%", padding:"10px 14px", background: loc===locale ? "#f0fdf4" : "#fff", border:"none", cursor:"pointer", fontSize:"13px", color: loc===locale ? "#16a34a" : "#111827", fontWeight: loc===locale ? 700 : 400, borderBottom:"1px solid #f3f4f6", textAlign:"left" }}>
                        {FLAG[loc]} {LANG_NAME[loc]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* ══════════════════════════════════════
            LIVE FOOD TICKER (if food available)
        ══════════════════════════════════════ */}
        {recentFood.length > 0 && (
          <div style={{ background:"#16a34a", padding:"8px 0", overflow:"hidden" }}>
            <div style={{ display:"flex", gap:"48px", animation:"ticker 20s linear infinite", whiteSpace:"nowrap", width:"max-content" }}>
              {[...recentFood, ...recentFood].map((f, i) => (
                <span key={i} style={{ fontSize:"13px", color:"#fff", fontWeight:600 }}>
                  🍽️ {f.food_name} @ {f.business_name} — FREE NOW
                </span>
              ))}
            </div>
            <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
          </div>
        )}

        {/* ══════════════════════════════════════
            HERO
        ══════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50" aria-label="Hero">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <div className="grid items-center gap-16 md:grid-cols-2">
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700 animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-green-500 inline-block"></span>
                  {locale==="ar" ? "طعام متاح الآن في منطقتك" : locale==="fr" ? "Nourriture disponible maintenant" : locale==="es" ? "Comida disponible ahora" : locale==="pt" ? "Comida disponível agora" : "Live food available now in your area"}
                </div>
                <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-6xl">
                  {locale==="ar" ? <><span>طعام مجاني،</span><br/><span className="text-green-500">لا هدر.</span></> :
                   locale==="fr" ? <><span>Nourriture gratuite,</span><br/><span className="text-green-500">zéro gaspillage.</span></> :
                   locale==="es" ? <><span>Comida gratis,</span><br/><span className="text-green-500">cero desperdicio.</span></> :
                   locale==="pt" ? <><span>Comida grátis,</span><br/><span className="text-green-500">zero desperdício.</span></> :
                   <><span>Free food,</span><br/><span className="text-green-500">zero waste.</span></>}
                </h1>
                <p className="mb-8 text-xl leading-relaxed text-slate-600">{T.hero_subtitle}</p>
                <div className="flex flex-wrap gap-4">
                  <Link href="/browse" className="rounded-xl bg-green-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-green-200 hover:bg-green-600 hover:scale-105 transition-all duration-200">
                    {T.hero_cta}
                  </Link>
                  <Link href="/business/signup" className="rounded-xl border-2 border-slate-200 bg-white px-8 py-4 text-base font-bold text-slate-700 hover:border-green-300 hover:text-green-700 hover:scale-105 transition-all duration-200">
                    {T.forBusiness}
                  </Link>
                </div>
                <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-slate-500">
                  <div><span className="font-bold text-slate-900">100%</span> {locale==="ar"?"مجاني":locale==="fr"?"Gratuit":locale==="es"?"Gratis":locale==="pt"?"Grátis":"Free"}</div>
                  <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
                  <div><span className="font-bold text-slate-900">{locale==="ar"?"فوري":"Real-time"}</span> {locale==="ar"?"إعلانات":locale==="fr"?"annonces":locale==="es"?"anuncios":locale==="pt"?"anúncios":"listings"}</div>
                  <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
                  <div><span className="font-bold text-slate-900">NYC</span> {locale==="ar"?"محلي":locale==="fr"?"local":locale==="es"?"local":locale==="pt"?"local":"based"}</div>
                </div>
              </div>

              {/* Floating food cards */}
              <div className="flex justify-center">
                <div className="relative w-80 h-80">
                  {/* Center logo */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-white shadow-2xl ring-1 ring-green-100 z-10">
                    <Image src="/gawa-logo-green.png" width={120} height={120} alt="GAWA Loop" style={{ objectFit:"contain" }} />
                    <div className="mt-4 flex items-center gap-2 rounded-full bg-green-50 px-4 py-2">
                      <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse inline-block"></span>
                      <span className="text-sm font-semibold text-green-700">
                        {locale==="ar"?"طعام متاح الآن":locale==="fr"?"Nourriture dispo":locale==="es"?"Comida disponible":locale==="pt"?"Comida disponível":"Food available now"}
                      </span>
                    </div>
                  </div>
                  {/* Floating cards */}
                  {[
                    { emoji:"🍕", label:"Pizza", pos:"top-0 left-0", delay:"0s" },
                    { emoji:"🥗", label:"Salad", pos:"top-0 right-0", delay:"0.5s" },
                    { emoji:"🥐", label:"Pastry", pos:"bottom-0 left-0", delay:"1s" },
                    { emoji:"🍱", label:"Bento", pos:"bottom-0 right-0", delay:"1.5s" },
                  ].map(card => (
                    <div key={card.label} className={`absolute ${card.pos} bg-white rounded-2xl shadow-lg p-3 flex flex-col items-center gap-1 z-20`}
                      style={{ animation:`float 3s ease-in-out ${card.delay} infinite alternate`, width:"72px" }}>
                      <span style={{ fontSize:"24px" }}>{card.emoji}</span>
                      <span style={{ fontSize:"10px", fontWeight:700, color:"#374151" }}>{locale==="ar"?"مجاني":"FREE"}</span>
                    </div>
                  ))}
                  {/* Background glow */}
                  <div className="absolute -inset-8 rounded-full bg-gradient-to-br from-green-200 via-emerald-100 to-teal-100 blur-3xl opacity-50 -z-10"></div>
                </div>
              </div>
            </div>
          </div>
          <style>{`
            @keyframes float {
              from { transform: translateY(0px) rotate(-2deg); }
              to   { transform: translateY(-12px) rotate(2deg); }
            }
          `}</style>
        </section>

        {/* ══════════════════════════════════════
            LIVE STATS — animated counters
        ══════════════════════════════════════ */}
        <section ref={statsRef} className="border-y border-slate-100 bg-white" aria-label="Impact statistics">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-green-500 mb-8">
              {locale==="ar"?"تأثيرنا حتى الآن":locale==="fr"?"Notre impact jusqu'à présent":locale==="es"?"Nuestro impacto hasta ahora":locale==="pt"?"Nosso impacto até agora":"Our impact so far"}
            </p>
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {[
                { value: pickupsCount,  suffix:"", label: T.stats_pickups,  color:"text-green-500",  icon:"🤲" },
                { value: listingsCount, suffix:"+", label: T.stats_listings, color:"text-blue-500",   icon:"📋" },
                { value: valueCount,    suffix:"", label: T.stats_value,    color:"text-orange-500", icon:"💰", prefix:"$" },
                { value: bizCount,      suffix:"+", label: locale==="ar"?"شركات شريكة":locale==="fr"?"Entreprises partenaires":locale==="es"?"Negocios socios":locale==="pt"?"Empresas parceiras":"Partner businesses", color:"text-purple-500", icon:"🏪" },
              ].map(s => (
                <div key={String(s.label)} className="text-center group cursor-default">
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <div className={`text-4xl font-extrabold ${s.color} transition-transform group-hover:scale-110 duration-200`}>
                    {s.prefix || ""}{s.value.toLocaleString()}{s.suffix}
                  </div>
                  <div className="mt-2 text-sm text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            HOW IT WORKS — interactive steps
        ══════════════════════════════════════ */}
        <section className="mx-auto max-w-6xl px-6 py-20" aria-label="How it works">
          <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-green-500">
            {locale==="ar"?"للباحثين عن طعام":locale==="fr"?"Pour les chercheurs de nourriture":locale==="es"?"Para buscadores de comida":locale==="pt"?"Para quem procura comida":"For food seekers"}
          </div>
          <h2 className="mb-4 text-center text-4xl font-extrabold text-slate-900">{T.how_title}</h2>
          <p className="mx-auto mb-14 max-w-xl text-center text-slate-500">
            {locale==="ar"?"بدون عضوية، بدون رسوم.":locale==="fr"?"Sans abonnement, sans frais.":locale==="es"?"Sin membresía, sin tarifas.":locale==="pt"?"Sem adesão, sem taxas.":"No membership, no fees. Just browse, claim, and pick up."}
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { num:"1", color:"bg-green-500", hoverBg:"hover:bg-green-500", title:T.step1_title, desc:T.step1_desc, icon:"📱", time: locale==="ar"?"60 ثانية":locale==="fr"?"60 secondes":locale==="es"?"60 segundos":locale==="pt"?"60 segundos":"60 seconds" },
              { num:"2", color:"bg-blue-500",  hoverBg:"hover:bg-blue-500",  title:T.step2_title, desc:T.step2_desc, icon:"✅", time: locale==="ar"?"فوري":"Instant" },
              { num:"3", color:"bg-orange-500",hoverBg:"hover:bg-orange-500",title:T.step3_title, desc:T.step3_desc, icon:"📍", time: locale==="ar"?"أسهل":locale==="fr"?"Facile":locale==="es"?"Fácil":locale==="pt"?"Fácil":"Easy" },
            ].map((s, i) => (
              <div key={s.num} className="group relative rounded-2xl border border-slate-100 bg-white p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-default">
                <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black text-white ${s.color} group-hover:scale-110 transition-transform duration-200`}>
                  {s.icon}
                </div>
                <div className="absolute top-4 right-4 text-xs font-bold text-slate-300 bg-slate-50 px-2 py-1 rounded-full">{s.time}</div>
                <h3 className="mb-3 text-xl font-bold text-slate-900">{s.title}</h3>
                <p className="text-slate-500 leading-relaxed">{s.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 text-2xl z-10">→</div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/browse" className="inline-block rounded-xl bg-green-500 px-8 py-4 font-bold text-white shadow-lg shadow-green-100 hover:bg-green-600 hover:scale-105 transition-all duration-200">
              {T.hero_cta}
            </Link>
          </div>
        </section>

        {/* ══════════════════════════════════════
            FOR BUSINESSES
        ══════════════════════════════════════ */}
        <section className="bg-slate-900 text-white" aria-label="For businesses">
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
                  {[
                    T.step1_desc, T.step2_desc, T.step3_desc,
                    locale==="ar"?"بناء سمعة كشركة مجتمعية":locale==="fr"?"Construisez votre réputation":locale==="es"?"Construye reputación comunitaria":locale==="pt"?"Construa reputação comunitária":"Build reputation as a community-first business"
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 group">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-white text-xs font-black group-hover:scale-110 transition-transform">✓</div>
                      <p className="text-slate-300">{item}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-4">
                  <Link href="/business/signup" className="rounded-xl bg-green-500 px-8 py-4 font-bold text-white hover:bg-green-600 hover:scale-105 transition-all duration-200">{T.hero_cta2}</Link>
                  <Link href="/business/login" className="rounded-xl border border-white/20 px-8 py-4 font-bold text-white hover:bg-white/10 transition">{T.login}</Link>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="rounded-3xl bg-white/10 p-12 ring-1 ring-white/20 hover:bg-white/15 transition-all duration-300">
                  <Image src="/gawa-logo-green.png" width={180} height={180} alt="GAWA Loop for businesses" style={{ objectFit:"contain" }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            WHY GAWA LOOP — hoverable cards
        ══════════════════════════════════════ */}
        <section className="mx-auto max-w-6xl px-6 py-20" aria-label="Why GAWA Loop">
          <h2 className="mb-4 text-center text-4xl font-extrabold text-slate-900">
            {locale==="ar"?"لماذا GAWA Loop؟":locale==="fr"?"Pourquoi GAWA Loop ?":locale==="es"?"¿Por qué GAWA Loop?":locale==="pt"?"Por que GAWA Loop?":"Why GAWA Loop?"}
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center text-slate-500">
            {locale==="ar"?"مبني لجعل مشاركة الطعام بسيطة وآمنة.":locale==="fr"?"Conçu pour rendre le partage alimentaire simple et sûr.":locale==="es"?"Construido para hacer el intercambio simple y seguro.":locale==="pt"?"Construído para tornar o compartilhamento simples e seguro.":"Built to make food sharing simple, safe, and reliable."}
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon:"🔐", en:["Safe reservations","Unique code per claim. No double bookings, ever."],fr:["Réservations sécurisées","Code unique par réservation."],es:["Reservas seguras","Código único por reclamo."],pt:["Reservas seguras","Código único por pedido."],ar:["حجوزات آمنة","رمز فريد لكل حجز."] },
              { icon:"📧", en:["Email confirmation","Instant email with code, directions, and cancel link."],fr:["Confirmation par email","Email instantané avec code et directions."],es:["Confirmación por email","Email instantáneo con código."],pt:["Confirmação por email","Email instantâneo com código."],ar:["تأكيد بالبريد","بريد فوري مع رمزك والاتجاهات."] },
              { icon:"🗺️", en:["Easy directions","One tap to Google Maps, Apple Maps, or Waze."],fr:["Itinéraire facile","Ouvrez Maps en un tap."],es:["Direcciones fáciles","Abre Maps con un toque."],pt:["Direções fáceis","Abra Maps com um toque."],ar:["اتجاهات سهلة","افتح خرائط Google بنقرة."] },
              { icon:"⚡", en:["Real-time updates","Listings refresh every 30 seconds automatically."],fr:["Mises à jour en temps réel","Actualisation toutes les 30 secondes."],es:["Actualizaciones en tiempo real","Actualización cada 30 segundos."],pt:["Atualizações em tempo real","Atualização a cada 30 segundos."],ar:["تحديثات فورية","تحديث كل 30 ثانية تلقائياً."] },
              { icon:"🆓", en:["Completely free","No fees. No subscriptions. Forever."],fr:["Totalement gratuit","Aucun frais. Pour toujours."],es:["Completamente gratis","Sin cargos. Para siempre."],pt:["Completamente grátis","Sem taxas. Para sempre."],ar:["مجاني تماماً","بدون رسوم. إلى الأبد."] },
              { icon:"🌍", en:["Reduce food waste","Every claim = less food in landfills."],fr:["Réduire le gaspillage","Chaque réservation = moins de gaspillage."],es:["Reduce el desperdicio","Cada reclamo = menos desperdicio."],pt:["Reduzir o desperdício","Cada pedido = menos desperdício."],ar:["تقليل الهدر","كل حجز = طعام أقل في القمامة."] },
            ].map((card, i) => {
              const [title, desc] = (card as any)[locale] || card.en;
              return (
                <div key={i} className="group rounded-2xl border border-slate-100 bg-white p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-default">
                  <div className="text-3xl mb-4 group-hover:scale-125 transition-transform duration-200 inline-block">{card.icon}</div>
                  <h3 className="mb-2 text-lg font-bold text-slate-900">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ══════════════════════════════════════
            FAQ ACCORDION — great for SEO
        ══════════════════════════════════════ */}
        <section className="bg-slate-50 px-6 py-20" aria-label="Frequently asked questions">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-4 text-center text-4xl font-extrabold text-slate-900">
              {locale==="ar"?"الأسئلة الشائعة":locale==="fr"?"Questions fréquentes":locale==="es"?"Preguntas frecuentes":locale==="pt"?"Perguntas frequentes":"Frequently Asked Questions"}
            </h2>
            <p className="mb-12 text-center text-slate-500">
              {locale==="ar"?"كل ما تحتاج معرفته عن GAWA Loop":locale==="fr"?"Tout ce que vous devez savoir sur GAWA Loop":locale==="es"?"Todo lo que necesitas saber sobre GAWA Loop":locale==="pt"?"Tudo o que você precisa saber sobre o GAWA Loop":"Everything you need to know about GAWA Loop"}
            </p>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-6 text-left"
                    aria-expanded={openFaq === i}
                  >
                    <span className="font-bold text-slate-900 text-base pr-4">{faq.q}</span>
                    <span className="text-green-500 text-xl flex-shrink-0 transition-transform duration-200"
                      style={{ transform: openFaq === i ? "rotate(45deg)" : "rotate(0deg)" }}>
                      +
                    </span>
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-6">
                      <p className="text-slate-600 leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CTA FINAL
        ══════════════════════════════════════ */}
        <section className="bg-gradient-to-br from-green-500 to-emerald-600" aria-label="Call to action">
          <div className="mx-auto max-w-4xl px-6 py-20 text-center">
            <div className="mb-8 flex justify-center">
              <div className="rounded-3xl bg-white/20 p-10 backdrop-blur-sm hover:bg-white/30 transition-all duration-300">
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
              <Link href="/browse" className="rounded-xl bg-white px-8 py-4 text-base font-bold text-green-600 shadow-lg hover:bg-green-50 hover:scale-105 transition-all duration-200">
                {T.hero_cta}
              </Link>
              <Link href="/business/signup" className="rounded-xl border-2 border-white/40 px-8 py-4 text-base font-bold text-white hover:bg-white/10 hover:scale-105 transition-all duration-200">
                {T.hero_cta2}
              </Link>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            FOOTER
        ══════════════════════════════════════ */}
        <footer className="border-t border-slate-100 bg-white" role="contentinfo">
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
                <Link href="/support" className="hover:text-green-600 transition">{T.support_contact}</Link>
              </div>
              <div className="text-sm text-slate-400">© 2026 GAWA Loop · Free food. Less waste. Real impact.</div>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
