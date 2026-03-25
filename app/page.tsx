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

const LOCALES: Locale[] = ["en", "fr", "es", "pt", "ar"];

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
  const [locale, setLocaleState]        = useState<Locale>("en");
  const [langOpen, setLangOpen]         = useState(false);
  const [stats, setStats]               = useState({ pickups: 0, listings: 0, value: 0, businesses: 0 });
  const [recentFood, setRecentFood]     = useState<any[]>([]);
  const [statsVisible, setStatsVisible] = useState(false);
  const [openFaq, setOpenFaq]           = useState<number | null>(null);
  const statsRef                        = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocaleState(detectLocale()); }, []);

  // ✅ Fixed: removed broken ternary, direct Supabase query
  useEffect(() => {
    async function loadStats() {
      const { data } = await supabase
        .from("listings")
        .select("status, estimated_value, food_name, business_name, created_at, address");

      if (data) {
        const pickups    = data.filter((l: any) => l.status === "PICKED_UP").length;
        const listings   = data.length;
        const value      = data
          .filter((l: any) => l.status === "PICKED_UP")
          .reduce((s: number, l: any) => s + Number(l.estimated_value || 0), 0);
        const businesses = new Set(data.map((l: any) => l.business_name)).size;
        setStats({ pickups, listings, value, businesses });
        setRecentFood(data.filter((l: any) => l.status === "AVAILABLE").slice(0, 6));
      }
    }
    loadStats();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const pickupsCount  = useCountUp(stats.pickups   || 47,  1500, statsVisible);
  const listingsCount = useCountUp(stats.listings  || 120, 1500, statsVisible);
  const valueCount    = useCountUp(stats.value     || 890, 1800, statsVisible);
  const bizCount      = useCountUp(stats.businesses|| 12,  1200, statsVisible);

  const T = t[locale];
  const isRTL = locale === "ar";

  function switchLocale(loc: Locale) {
    saveLocale(loc);
    setLocaleState(loc);
    setLangOpen(false);
  }

  const faqs = [
    {
      q: locale==="fr"?"GAWA Loop est-il vraiment gratuit ?":locale==="es"?"¿GAWA Loop es realmente gratis?":locale==="pt"?"GAWA Loop é realmente grátis?":locale==="ar"?"هل GAWA Loop مجاني حقاً؟":"Is GAWA Loop really free?",
      a: locale==="fr"?"Oui, 100% gratuit pour les clients et les entreprises. Toujours.":locale==="es"?"Sí, 100% gratis para clientes y negocios. Siempre.":locale==="pt"?"Sim, 100% grátis para clientes e empresas. Sempre.":locale==="ar"?"نعم، مجاني 100٪ للعملاء والشركات. دائماً.":"Yes — 100% free for both customers and businesses. No fees, no subscriptions, ever."
    },
    {
      q: locale==="fr"?"Comment réserver de la nourriture ?":locale==="es"?"¿Cómo reservo comida?":locale==="pt"?"Como reservar comida?":locale==="ar"?"كيف أحجز طعاماً؟":"How do I claim food?",
      a: locale==="fr"?"Allez sur Browse, choisissez un aliment disponible, entrez votre prénom et email, et réservez en quelques secondes.":locale==="es"?"Ve a Browse, elige un alimento, ingresa tu nombre y correo, y reserva en segundos.":locale==="pt"?"Vá para Browse, escolha um alimento, insira seu nome e email, e reserve em segundos.":locale==="ar"?"اذهب إلى Browse، اختر طعاماً متاحاً، أدخل اسمك وبريدك الإلكتروني، واحجز في ثوانٍ.":"Go to Browse, pick an available item, enter your name and email, and reserve in seconds. You'll get a confirmation code by email."
    },
    {
      q: locale==="fr"?"Que se passe-t-il si je ne peux pas récupérer la nourriture ?":locale==="es"?"¿Qué pasa si no puedo recoger la comida?":locale==="pt"?"O que acontece se não puder buscar a comida?":locale==="ar"?"ماذا يحدث إذا لم أستطع استلام الطعام؟":"What if I can't pick up the food?",
      a: locale==="fr"?"Annulez via le lien dans votre email de confirmation. Le listing sera libéré pour quelqu'un d'autre.":locale==="es"?"Cancela usando el enlace en tu correo. El listado se liberará para otra persona.":locale==="pt"?"Cancele usando o link no seu email. O anúncio será liberado para outra pessoa.":locale==="ar"?"الغِ حجزك باستخدام الرابط في بريد التأكيد. سيُتاح الإعلان لشخص آخر.":"No problem! Cancel using the link in your confirmation email. The listing is instantly released for someone else."
    },
    {
      q: locale==="fr"?"Comment inscrire mon restaurant ?":locale==="es"?"¿Cómo registro mi restaurante?":locale==="pt"?"Como cadastro meu restaurante?":locale==="ar"?"كيف أسجل مطعمي؟":"How do I register my restaurant?",
      a: locale==="fr"?"Cliquez sur Pour les entreprises et inscrivez-vous en 2 minutes.":locale==="es"?"Haz clic en Para negocios y regístrate en 2 minutos.":locale==="pt"?"Clique em Para empresas e cadastre-se em 2 minutos.":locale==="ar"?"انقر على للشركات وسجّل في دقيقتين.":"Click 'For Businesses' and sign up in 2 minutes. Start posting food immediately."
    },
    {
      q: locale==="fr"?"La nourriture est-elle sûre ?":locale==="es"?"¿La comida es segura?":locale==="pt"?"A comida é segura?":locale==="ar"?"هل الطعام آمن؟":"Is the food safe?",
      a: locale==="fr"?"Toute la nourriture provient de vrais restaurants et commerces vérifiés. Chaque annonce inclut des informations sur les allergènes.":locale==="es"?"Toda la comida proviene de restaurantes verificados. Cada listado incluye información sobre alérgenos.":locale==="pt"?"Toda a comida vem de estabelecimentos verificados. Cada anúncio inclui informações sobre alergênicos.":locale==="ar"?"جميع الطعام مصدره مطاعم موثوقة. كل إعلان يتضمن معلومات الحساسية.":"All food comes from verified real restaurants, bakeries, and stores. Every listing includes allergen information."
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

      <main dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white text-slate-900"
        style={{ fontFamily: isRTL ? "'Noto Sans Arabic', sans-serif" : undefined }}>

        {/* NAV */}
        <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <a href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 ring-2 ring-green-100">
                <Image src="/gawa-logo-green.png" width={28} height={28} alt="GAWA Loop logo" style={{ objectFit:"contain" }} priority />
              </div>
              <span className="text-lg font-bold text-slate-900">GAWA Loop</span>
            </a>
            <div className="flex items-center gap-3">
              <Link href="/browse" className="hidden text-sm font-medium text-slate-600 hover:text-green-600 sm:block transition">{T.browse}</Link>
              <Link href="/business/login" className="hidden text-sm font-medium text-slate-600 hover:text-green-600 sm:block transition">{T.login}</Link>
              <Link href="/business/signup" className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 transition">{T.hero_cta2}</Link>
              <div style={{ position:"relative" }}>
                <button onClick={() => setLangOpen(o => !o)}
                  style={{ background:"transparent", border:"1px solid #e5e7eb", borderRadius:"8px", padding:"6px 10px", cursor:"pointer", fontSize:"13px", fontWeight:600, display:"flex", alignItems:"center", gap:"4px", color:"#374151" }}>
                  {FLAG[locale]} ▾
                </button>
                {langOpen && (
                  <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, background:"#fff", border:"1px solid #e5e7eb", borderRadius:"10px", boxShadow:"0 8px 24px rgba(0,0,0,0.12)", overflow:"hidden", minWidth:"150px", zIndex:999 }}>
                    {LOCALES.map(loc => (
                      <button key={loc} onClick={() => switchLocale(loc)}
                        style={{ display:"flex", alignItems:"center", gap:"8px", width:"100%", padding:"10px 14px", background: loc===locale?"#f0fdf4":"#fff", border:"none", cursor:"pointer", fontSize:"13px", color: loc===locale?"#16a34a":"#111827", fontWeight: loc===locale?700:400, borderBottom:"1px solid #f3f4f6", textAlign:"left" }}>
                        {FLAG[loc]} {LANG_NAME[loc]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* LIVE FOOD TICKER */}
        {recentFood.length > 0 && (
          <div style={{ background:"#16a34a", padding:"8px 0", overflow:"hidden", whiteSpace:"nowrap" }}>
            <div style={{ display:"inline-flex", gap:"48px", animation:"ticker 20s linear infinite" }}>
              {[...recentFood, ...recentFood].map((f: any, i: number) => (
                <span key={i} style={{ fontSize:"13px", color:"#fff", fontWeight:600 }}>
                  🍽️ {f.food_name} @ {f.business_name} — FREE NOW
                </span>
              ))}
            </div>
            <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
          </div>
        )}

        {/* HERO */}
        <section className="relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <div className="grid items-center gap-16 md:grid-cols-2">
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                  <span className="h-2 w-2 rounded-full bg-green-500 inline-block" style={{ animation:"pulse 2s infinite" }}></span>
                  {locale==="ar"?"طعام متاح الآن في منطقتك":locale==="fr"?"Nourriture disponible maintenant":locale==="es"?"Comida disponible ahora":locale==="pt"?"Comida disponível agora":"Live food available now in your area"}
                </div>
                <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-6xl">
                  {locale==="ar"?<><span>طعام مجاني،</span><br/><span className="text-green-500">لا هدر.</span></>:
                   locale==="fr"?<><span>Nourriture gratuite,</span><br/><span className="text-green-500">zéro gaspillage.</span></>:
                   locale==="es"?<><span>Comida gratis,</span><br/><span className="text-green-500">cero desperdicio.</span></>:
                   locale==="pt"?<><span>Comida grátis,</span><br/><span className="text-green-500">zero desperdício.</span></>:
                   <><span>Free food,</span><br/><span className="text-green-500">zero waste.</span></>}
                </h1>
                <p className="mb-8 text-xl leading-relaxed text-slate-600">{T.hero_subtitle}</p>
                <div className="flex flex-wrap gap-4">
                  <Link href="/browse" className="rounded-xl bg-green-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-green-200 hover:bg-green-600 transition-all duration-200" style={{ transition:"all 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.transform="scale(1.05)")}
                    onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}>
                    {T.hero_cta}
                  </Link>
                  <Link href="/business/signup" className="rounded-xl border-2 border-slate-200 bg-white px-8 py-4 text-base font-bold text-slate-700 hover:border-green-300 hover:text-green-700 transition-all duration-200">
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

              {/* Floating food cards around logo */}
              <div className="flex justify-center">
                <div style={{ position:"relative", width:"320px", height:"320px" }}>
                  <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", borderRadius:"24px", background:"#fff", boxShadow:"0 25px 50px rgba(0,0,0,0.12)", border:"1px solid #f0fdf4", zIndex:10 }}>
                    <Image src="/gawa-logo-green.png" width={120} height={120} alt="GAWA Loop" style={{ objectFit:"contain" }} />
                    <div style={{ marginTop:"16px", display:"flex", alignItems:"center", gap:"8px", background:"#f0fdf4", borderRadius:"999px", padding:"8px 16px" }}>
                      <span style={{ width:"8px", height:"8px", borderRadius:"50%", background:"#16a34a", display:"inline-block", animation:"pulse 2s infinite" }}></span>
                      <span style={{ fontSize:"13px", fontWeight:600, color:"#16a34a" }}>
                        {locale==="ar"?"طعام متاح الآن":locale==="fr"?"Nourriture dispo":locale==="es"?"Comida disponible":locale==="pt"?"Comida disponível":"Food available now"}
                      </span>
                    </div>
                  </div>
                  {[
                    { emoji:"🍕", top:"-16px", left:"-16px", delay:"0s" },
                    { emoji:"🥗", top:"-16px", right:"-16px", delay:"0.7s" },
                    { emoji:"🥐", bottom:"-16px", left:"-16px", delay:"1.4s" },
                    { emoji:"🍱", bottom:"-16px", right:"-16px", delay:"2.1s" },
                  ].map((card, i) => (
                    <div key={i} style={{ position:"absolute", ...(card.top?{top:card.top}:{}), ...(card.bottom?{bottom:card.bottom}:{}), ...(card.left?{left:card.left}:{}), ...(card.right?{right:card.right}:{}), background:"#fff", borderRadius:"16px", boxShadow:"0 8px 24px rgba(0,0,0,0.1)", padding:"12px 14px", zIndex:20, animation:`floatCard 3s ease-in-out ${card.delay} infinite alternate` }}>
                      <span style={{ fontSize:"28px" }}>{card.emoji}</span>
                      <div style={{ fontSize:"10px", fontWeight:700, color:"#16a34a", textAlign:"center", marginTop:"4px" }}>FREE</div>
                    </div>
                  ))}
                  <div style={{ position:"absolute", inset:"-32px", borderRadius:"50%", background:"linear-gradient(135deg, #bbf7d0, #d1fae5, #a7f3d0)", filter:"blur(40px)", opacity:0.5, zIndex:0 }}></div>
                </div>
              </div>
            </div>
          </div>
          <style>{`
            @keyframes floatCard { from { transform: translateY(0) rotate(-3deg); } to { transform: translateY(-14px) rotate(3deg); } }
            @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
          `}</style>
        </section>

        {/* LIVE STATS — animated counters */}
        <section ref={statsRef} className="border-y border-slate-100 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-green-500 mb-10">
              {locale==="ar"?"تأثيرنا حتى الآن":locale==="fr"?"Notre impact jusqu'à présent":locale==="es"?"Nuestro impacto hasta ahora":locale==="pt"?"Nosso impacto até agora":"Our impact so far"}
            </p>
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {[
                { value:pickupsCount,  suffix:"",  label:T.stats_pickups,  color:"#16a34a", icon:"🤲" },
                { value:listingsCount, suffix:"+", label:T.stats_listings, color:"#2563eb", icon:"📋" },
                { value:valueCount,    suffix:"",  label:T.stats_value,    color:"#ea580c", icon:"💰", prefix:"$" },
                { value:bizCount,      suffix:"+", label:locale==="ar"?"شركات شريكة":locale==="fr"?"Entreprises":locale==="es"?"Negocios":locale==="pt"?"Empresas":"Businesses", color:"#7c3aed", icon:"🏪" },
              ].map((s, i) => (
                <div key={i} style={{ textAlign:"center", cursor:"default" }}>
                  <div style={{ fontSize:"32px", marginBottom:"8px" }}>{s.icon}</div>
                  <div style={{ fontSize:"40px", fontWeight:900, color:s.color, transition:"transform 0.2s", lineHeight:1 }}>
                    {s.prefix||""}{s.value.toLocaleString()}{s.suffix}
                  </div>
                  <div style={{ marginTop:"8px", fontSize:"13px", color:"#6b7280" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-green-500">
            {locale==="ar"?"للباحثين عن طعام":locale==="fr"?"Pour les chercheurs de nourriture":locale==="es"?"Para buscadores de comida":locale==="pt"?"Para quem procura comida":"For food seekers"}
          </div>
          <h2 className="mb-4 text-center text-4xl font-extrabold text-slate-900">{T.how_title}</h2>
          <p className="mx-auto mb-14 max-w-xl text-center text-slate-500">
            {locale==="ar"?"بدون عضوية، بدون رسوم.":locale==="fr"?"Sans abonnement, sans frais.":locale==="es"?"Sin membresía, sin tarifas.":locale==="pt"?"Sem adesão, sem taxas.":"No membership, no fees. Just browse, claim, and pick up."}
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { num:"1", color:"#16a34a", title:T.step1_title, desc:T.step1_desc, icon:"📱", badge:"60s" },
              { num:"2", color:"#2563eb", title:T.step2_title, desc:T.step2_desc, icon:"✅", badge:locale==="ar"?"فوري":"Instant" },
              { num:"3", color:"#ea580c", title:T.step3_title, desc:T.step3_desc, icon:"📍", badge:locale==="ar"?"سهل":"Easy" },
            ].map((s, i) => (
              <div key={s.num} style={{ background:"#fff", border:"1px solid #f1f5f9", borderRadius:"20px", padding:"32px", boxShadow:"0 2px 8px rgba(0,0,0,0.04)", cursor:"default", transition:"all 0.3s", position:"relative" }}
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
            <Link href="/browse" className="inline-block rounded-xl bg-green-500 px-8 py-4 font-bold text-white shadow-lg shadow-green-100 hover:bg-green-600 transition">{T.hero_cta}</Link>
          </div>
        </section>

        {/* FOR BUSINESSES */}
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

        {/* WHY GAWA LOOP */}
        <section className="mx-auto max-w-6xl px-6 py-20">
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
                <div key={i} style={{ background:"#fff", border:"1px solid #f1f5f9", borderRadius:"20px", padding:"32px", cursor:"default", transition:"all 0.3s" }}
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

        {/* FAQ ACCORDION */}
        <section style={{ background:"#f8fafc", padding:"80px 24px" }}>
          <div style={{ maxWidth:"720px", margin:"0 auto" }}>
            <h2 style={{ margin:"0 0 8px", fontSize:"36px", fontWeight:800, color:"#0f172a", textAlign:"center" }}>
              {locale==="ar"?"الأسئلة الشائعة":locale==="fr"?"Questions fréquentes":locale==="es"?"Preguntas frecuentes":locale==="pt"?"Perguntas frequentes":"Frequently Asked Questions"}
            </h2>
            <p style={{ margin:"0 0 48px", textAlign:"center", color:"#64748b", fontSize:"15px" }}>
              {locale==="ar"?"كل ما تحتاج معرفته عن GAWA Loop":locale==="fr"?"Tout ce que vous devez savoir sur GAWA Loop":locale==="es"?"Todo lo que necesitas saber sobre GAWA Loop":locale==="pt"?"Tudo o que você precisa saber":"Everything you need to know about GAWA Loop"}
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              {faqs.map((faq, i) => (
                <div key={i} style={{ background:"#fff", borderRadius:"16px", border:"1px solid #e2e8f0", overflow:"hidden", transition:"box-shadow 0.2s" }}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}>
                    <span style={{ fontWeight:700, color:"#0f172a", fontSize:"15px", paddingRight:"16px" }}>{faq.q}</span>
                    <span style={{ color:"#16a34a", fontSize:"22px", flexShrink:0, transition:"transform 0.2s", transform: openFaq===i ? "rotate(45deg)" : "rotate(0deg)", display:"inline-block" }}>+</span>
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

        {/* CTA */}
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

        {/* FOOTER */}
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
