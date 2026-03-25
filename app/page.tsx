"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { detectLocale, t, Locale, setLocale as saveLocale, FLAG, LANG_NAME } from "@/lib/i18n";

const LOCALES: Locale[] = ["en","fr","es","pt","ar"];

export default function HomePage() {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [open, setOpen] = useState(false);

  useEffect(() => { setLocaleState(detectLocale()); }, []);

  const T = t[locale];
  const isRTL = locale === "ar";

  function switchLocale(loc: Locale) {
    saveLocale(loc);
    setLocaleState(loc);
    setOpen(false);
  }

  return (
    <main dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white text-slate-900">

      {/* NAV — identical to original + language switcher */}
      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 ring-2 ring-green-100">
              <Image src="/gawa-logo-green.png" width={28} height={28} alt="GAWA Loop logo" style={{objectFit:"contain"}} />
            </div>
            <span className="text-lg font-bold text-slate-900">GAWA Loop</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/browse" className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block transition">{T.browse}</Link>
            <Link href="/business/login" className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block transition">{T.login}</Link>
            <Link href="/business/signup" className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 transition">{T.hero_cta2}</Link>
            {/* Language switcher */}
            <div style={{position:"relative"}}>
              <button onClick={() => setOpen(o=>!o)}
                style={{background:"transparent",border:"1px solid #e5e7eb",borderRadius:"8px",padding:"6px 10px",cursor:"pointer",fontSize:"13px",fontWeight:600,display:"flex",alignItems:"center",gap:"4px",color:"#374151"}}>
                {FLAG[locale]} ▾
              </button>
              {open && (
                <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,background:"#fff",border:"1px solid #e5e7eb",borderRadius:"10px",boxShadow:"0 8px 24px rgba(0,0,0,0.12)",overflow:"hidden",minWidth:"150px",zIndex:999}}>
                  {LOCALES.map(loc => (
                    <button key={loc} onClick={() => switchLocale(loc)}
                      style={{display:"flex",alignItems:"center",gap:"8px",width:"100%",padding:"10px 14px",background:loc===locale?"#f0fdf4":"#fff",border:"none",cursor:"pointer",fontSize:"13px",color:loc===locale?"#16a34a":"#111827",fontWeight:loc===locale?700:400,borderBottom:"1px solid #f3f4f6",textAlign:"left"}}>
                      {FLAG[loc]} {LANG_NAME[loc]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* HERO — identical layout, text swapped */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="grid items-center gap-16 md:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                <span className="h-2 w-2 rounded-full bg-green-500 inline-block"></span>
                {locale==="ar"?"طعام متاح الآن في منطقتك":locale==="fr"?"Nourriture disponible maintenant":locale==="es"?"Comida disponible ahora":locale==="pt"?"Comida disponível agora":"Live food available now in your area"}
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
                <Link href="/browse" className="rounded-xl bg-green-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-green-200 hover:bg-green-600 transition">{T.hero_cta}</Link>
                <Link href="/business/signup" className="rounded-xl border-2 border-slate-200 bg-white px-8 py-4 text-base font-bold text-slate-700 hover:border-green-300 hover:text-green-700 transition">{T.forBusiness}</Link>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-slate-500">
                <div><span className="font-bold text-slate-900">100%</span> {locale==="ar"?"مجاني":locale==="fr"?"Gratuit":locale==="es"?"Gratis":locale==="pt"?"Grátis":"Free to use"}</div>
                <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
                <div><span className="font-bold text-slate-900">{locale==="ar"?"فوري":"Real-time"}</span> {locale==="ar"?"إعلانات":locale==="fr"?"annonces":locale==="es"?"anuncios":locale==="pt"?"anúncios":"listings"}</div>
                <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
                <div><span className="font-bold text-slate-900">NYC</span> {locale==="ar"?"محلي":locale==="fr"?"local":locale==="es"?"local":locale==="pt"?"local":"based"}</div>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-8 rounded-full bg-gradient-to-br from-green-200 via-emerald-100 to-teal-100 blur-3xl opacity-60"></div>
                <div className="relative flex flex-col items-center justify-center rounded-3xl bg-white px-14 py-12 shadow-2xl ring-1 ring-green-100">
                  <Image src="/gawa-logo-green.png" width={200} height={200} alt="GAWA Loop logo" style={{objectFit:"contain"}} />
                  <div className="mt-6 flex items-center gap-2 rounded-full bg-green-50 px-4 py-2">
                    <span className="h-2 w-2 rounded-full bg-green-400 inline-block"></span>
                    <span className="text-sm font-semibold text-green-700">
                      {locale==="ar"?"طعام متاح الآن":locale==="fr"?"Nourriture disponible":locale==="es"?"Comida disponible":locale==="pt"?"Comida disponível":"Food available now"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS — identical */}
      <section className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className="text-center"><div className="text-3xl font-extrabold text-green-500">FREE</div><div className="mt-1 text-sm text-slate-500">{locale==="ar"?"مجاني دائماً":locale==="fr"?"Toujours gratuit":locale==="es"?"Siempre gratis":locale==="pt"?"Sempre grátis":"Always free for customers"}</div></div>
            <div className="text-center"><div className="text-3xl font-extrabold text-blue-500">LIVE</div><div className="mt-1 text-sm text-slate-500">{locale==="ar"?"إعلانات فورية":locale==="fr"?"Annonces en direct":locale==="es"?"Anuncios en vivo":locale==="pt"?"Anúncios ao vivo":"Real-time food listings"}</div></div>
            <div className="text-center"><div className="text-3xl font-extrabold text-orange-500">FAST</div><div className="mt-1 text-sm text-slate-500">{locale==="ar"?"احجز في ثوانٍ":locale==="fr"?"Réservez en secondes":locale==="es"?"Reclama en segundos":locale==="pt"?"Reserve em segundos":"Claim food in seconds"}</div></div>
            <div className="text-center"><div className="text-3xl font-extrabold text-purple-500">LOCAL</div><div className="mt-1 text-sm text-slate-500">{locale==="ar"?"من حيك":locale==="fr"?"De votre quartier":locale==="es"?"De tu barrio":locale==="pt"?"Do seu bairro":"From your neighborhood"}</div></div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — identical layout */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-green-500">{locale==="ar"?"للباحثين عن طعام":locale==="fr"?"Pour les chercheurs de nourriture":locale==="es"?"Para buscadores de comida":locale==="pt"?"Para quem procura comida":"For food seekers"}</div>
        <h2 className="mb-4 text-center text-4xl font-extrabold text-slate-900">{T.how_title}</h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-slate-500">{locale==="ar"?"بدون عضوية، بدون رسوم.":locale==="fr"?"Sans abonnement, sans frais.":locale==="es"?"Sin membresía, sin tarifas.":locale==="pt"?"Sem adesão, sem taxas.":"No membership, no fees. Just browse, claim, and pick up."}</p>
        <div className="grid gap-8 md:grid-cols-3">
          {[{num:"1",color:"bg-green-500",title:T.step1_title,desc:T.step1_desc},{num:"2",color:"bg-blue-500",title:T.step2_title,desc:T.step2_desc},{num:"3",color:"bg-orange-500",title:T.step3_title,desc:T.step3_desc}].map(s=>(
            <div key={s.num} className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm hover:shadow-lg transition-all">
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black text-white ${s.color}`}>{s.num}</div>
              <h3 className="mb-3 text-xl font-bold text-slate-900">{s.title}</h3>
              <p className="text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/browse" className="inline-block rounded-xl bg-green-500 px-8 py-4 font-bold text-white shadow-lg shadow-green-100 hover:bg-green-600 transition">{T.hero_cta}</Link>
        </div>
      </section>

      {/* FOR BUSINESSES — identical layout */}
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
                {[T.step1_desc,T.step2_desc,T.step3_desc,
                  locale==="ar"?"بناء سمعة كشركة مجتمعية":locale==="fr"?"Construisez votre réputation":locale==="es"?"Construye reputación comunitaria":locale==="pt"?"Construa reputação comunitária":"Build reputation as a community-first business"
                ].map((item,i)=>(
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
                <Image src="/gawa-logo-green.png" width={180} height={180} alt="GAWA Loop logo" style={{objectFit:"contain"}} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY GAWA LOOP — identical */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-4 text-center text-4xl font-extrabold text-slate-900">{locale==="ar"?"لماذا GAWA Loop؟":locale==="fr"?"Pourquoi GAWA Loop ?":locale==="es"?"¿Por qué GAWA Loop?":locale==="pt"?"Por que GAWA Loop?":"Why GAWA Loop?"}</h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-slate-500">{locale==="ar"?"مبني لجعل مشاركة الطعام بسيطة.":locale==="fr"?"Conçu pour rendre le partage alimentaire simple.":locale==="es"?"Construido para hacer el intercambio simple.":locale==="pt"?"Construído para tornar o compartilhamento simples.":"Built to make food sharing simple, safe, and reliable."}</p>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {en:["Safe reservations","Each claim gets a unique confirmation code. Only one person can claim each listing."],fr:["Réservations sécurisées","Code unique par réservation. Une seule personne peut réserver chaque annonce."],es:["Reservas seguras","Cada reclamo obtiene un código único. Solo una persona puede reclamar cada listado."],pt:["Reservas seguras","Cada pedido recebe um código único. Apenas uma pessoa pode reservar cada anúncio."],ar:["حجوزات آمنة","رمز فريد لكل حجز. شخص واحد فقط يمكنه حجز كل إعلان."]},
            {en:["Email confirmation","Instant email with your code, directions, and a one-click cancel option."],fr:["Confirmation par email","Email instantané avec code, adresse et option d'annulation."],es:["Confirmación por email","Email instantáneo con código, dirección y cancelación con un clic."],pt:["Confirmação por email","Email instantâneo com código, direções e cancelamento fácil."],ar:["تأكيد بالبريد","بريد فوري مع رمزك والعنوان وخيار الإلغاء."]},
            {en:["Easy directions","Tap the address to open Google Maps, Apple Maps, or Waze."],fr:["Itinéraire facile","Appuyez sur l'adresse pour ouvrir Google Maps ou Waze."],es:["Direcciones fáciles","Toca la dirección para abrir Google Maps o Waze."],pt:["Direções fáceis","Toque no endereço para abrir Google Maps ou Waze."],ar:["اتجاهات سهلة","اضغط على العنوان لفتح خرائط Google أو Waze."]},
            {en:["Real-time updates","Listings refresh automatically when food is claimed or expires."],fr:["Mises à jour en temps réel","Les annonces se rafraîchissent automatiquement."],es:["Actualizaciones en tiempo real","Los listados se actualizan automáticamente."],pt:["Atualizações em tempo real","Os anúncios são atualizados automaticamente."],ar:["تحديثات فورية","تتحدث الإعلانات تلقائياً عند الحجز أو الانتهاء."]},
            {en:["Completely free","No fees, no subscriptions. Always free for customers and businesses."],fr:["Totalement gratuit","Aucun frais, aucun abonnement. Toujours gratuit."],es:["Completamente gratis","Sin tarifas ni suscripciones. Siempre gratis."],pt:["Completamente grátis","Sem taxas nem assinaturas. Sempre grátis."],ar:["مجاني تماماً","بدون رسوم أو اشتراكات. مجاني دائماً."]},
            {en:["Reduce food waste","Every claim prevents good food from being thrown away."],fr:["Réduire le gaspillage","Chaque réservation empêche de la bonne nourriture d'être jetée."],es:["Reduce el desperdicio","Cada reclamo evita que buena comida se tire."],pt:["Reduzir o desperdício","Cada pedido evita que boa comida seja desperdiçada."],ar:["تقليل الهدر","كل حجز يمنع إهدار طعام جيد."]},
          ].map((card,i)=>{
            const [title,desc] = (card as any)[locale] || card.en;
            return (
              <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-8 hover:shadow-md transition">
                <h3 className="mb-2 text-lg font-bold text-slate-900">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA — identical */}
      <section className="bg-gradient-to-br from-green-500 to-emerald-600">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <div className="mb-8 flex justify-center">
            <div className="rounded-3xl bg-white/20 p-10 backdrop-blur-sm">
              <Image src="/gawa-logo-green.png" width={160} height={160} alt="GAWA Loop logo" style={{objectFit:"contain"}} />
            </div>
          </div>
          <h2 className="mb-4 text-4xl font-extrabold text-white">{locale==="ar"?"هل أنت مستعد للبدء؟":locale==="fr"?"Prêt à commencer ?":locale==="es"?"¿Listo para empezar?":locale==="pt"?"Pronto para começar?":"Ready to get started?"}</h2>
          <p className="mb-10 text-lg text-green-100">{locale==="ar"?"انضم لمجتمعك. أقل من دقيقة.":locale==="fr"?"Rejoignez votre communauté. Moins d'une minute.":locale==="es"?"Únete a tu comunidad. Menos de un minuto.":locale==="pt"?"Junte-se à sua comunidade. Menos de um minuto.":"Join your community. Find free food or share yours — it takes less than a minute."}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/browse" className="rounded-xl bg-white px-8 py-4 text-base font-bold text-green-600 shadow-lg hover:bg-green-50 transition">{T.hero_cta}</Link>
            <Link href="/business/signup" className="rounded-xl border-2 border-white/40 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition">{T.hero_cta2}</Link>
          </div>
        </div>
      </section>

      {/* FOOTER — identical */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <Image src="/gawa-logo-green.png" width={32} height={32} alt="GAWA Loop logo" style={{objectFit:"contain"}} />
              <span className="font-bold text-slate-900">GAWA Loop</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
              <Link href="/browse" className="hover:text-slate-900 transition">{T.browse}</Link>
              <Link href="/business/signup" className="hover:text-slate-900 transition">{T.forBusiness}</Link>
              <Link href="/business/login" className="hover:text-slate-900 transition">{T.login}</Link>
              <Link href="/support" className="hover:text-slate-900 transition">{T.support_contact}</Link>
            </div>
            <div className="text-sm text-slate-400">Free food. Less waste. Real impact.</div>
          </div>
        </div>
      </footer>
    </main>
  );
}

