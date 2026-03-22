'use client'
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import {
  Language,
  getStoredLanguage,
  isRtl,
  setStoredLanguage,
} from "../../lib/i18n";

type Listing = {
  id: string;
  food_name?: string | null;
  category: string;
  quantity: string;
  allergy_note?: string | null;
  address?: string | null;
  maps_url?: string | null;
  note?: string | null;
  status: string;
  estimated_value?: number | null;
  listing_expires_at?: string | null;
  claim_hold_minutes?: number | null;
  created_at?: string;
};

const dashboardTranslations = {
  en: {
    language: "Language",
    dashboard: "Business Dashboard",
    monthlySummaryBtn: "Monthly Summary",
    logout: "Log Out",
    loading: "Loading dashboard...",
    postFoodTitle: "Post Available Food",
    businessName: "Business name",
    pickupAddress: "Pickup address",
    exactFoodName: "Exact food name",
    category: "Category",
    quantity: "Quantity",
    allergyNote: "Allergy / dietary note",
    estimatedValue: "Estimated value",
    shortNote: "Short note",
    keepActive: "Keep listing active for",
    holdAfterClaim: "Hold item after claim for",
    postFood: "Post Food",
    posting: "Posting...",
    monthlySummary: "Monthly Summary",
    donationsPosted: "Donations posted this month",
    estimatedValueMonth: "Estimated value this month",
    summaryNote: "This summary is for recordkeeping and operational reporting.",
    yourListings: "Your Listings",
    noListings: "No listings yet.",
    status: "Status",
    extra: "Extra",
    expires: "Expires",
    posted: "Posted",
    visibleOnly: "Visible only to your business and admin.",
    aiHelper: "AI Listing Helper",
    aiHelperText: "Use AI to rewrite your listing into a cleaner version before posting.",
    improveWithAi: "Improve with AI",
    aiWorking: "AI is rewriting...",
    aiDone: "AI suggestion applied.",
    aiFailed: "AI could not improve the listing right now.",
    couldNotPost: "Could not post food.",
    postedSuccess: "Food posted successfully.",
    businessNotFound: "Business account not found.",
    foodPlaceholder: "Example: Chicken sandwich, vegetarian pasta",
    quantityPlaceholder: "Example: 10 meals",
    allergyPlaceholder: "Example: contains dairy, nuts, halal, vegetarian",
    notePlaceholder: "Example: Pickup before closing",
    food: "Food",
    preparedMeals: "Prepared Meals",
    bakedGoods: "Baked Goods",
    groceries: "Groceries",
    other: "Other",
    oneHour: "1 hour",
    twoHours: "2 hours",
    threeHours: "3 hours",
    tenMinutes: "10 minutes",
    fifteenMinutes: "15 minutes",
    twentyMinutes: "20 minutes",
    thirtyMinutes: "30 minutes",
    aiButtonHint: "AI can clean up the food name, quantity, allergy note, and short note.",
  },
  fr: {
    language: "Langue",
    dashboard: "Tableau de bord entreprise",
    monthlySummaryBtn: "Résumé mensuel",
    logout: "Se déconnecter",
    loading: "Chargement du tableau de bord...",
    postFoodTitle: "Publier la nourriture disponible",
    businessName: "Nom de l'entreprise",
    pickupAddress: "Adresse de retrait",
    exactFoodName: "Nom exact de l'aliment",
    category: "Catégorie",
    quantity: "Quantité",
    allergyNote: "Note allergie / régime",
    estimatedValue: "Valeur estimée",
    shortNote: "Note courte",
    keepActive: "Garder l'annonce active pendant",
    holdAfterClaim: "Bloquer l'article après réclamation pendant",
    postFood: "Publier",
    posting: "Publication...",
    monthlySummary: "Résumé mensuel",
    donationsPosted: "Dons publiés ce mois-ci",
    estimatedValueMonth: "Valeur estimée ce mois-ci",
    summaryNote: "Ce résumé sert au suivi et au reporting opérationnel.",
    yourListings: "Vos annonces",
    noListings: "Aucune annonce pour le moment.",
    status: "Statut",
    extra: "Extra",
    expires: "Expire",
    posted: "Publié",
    visibleOnly: "Visible uniquement pour votre entreprise et l’admin.",
    aiHelper: "Assistant IA pour l’annonce",
    aiHelperText: "Utilisez l’IA pour réécrire votre annonce avant publication.",
    improveWithAi: "Améliorer avec l’IA",
    aiWorking: "L’IA réécrit...",
    aiDone: "Suggestion IA appliquée.",
    aiFailed: "L’IA n’a pas pu améliorer l’annonce pour le moment.",
    couldNotPost: "Impossible de publier la nourriture.",
    postedSuccess: "Nourriture publiée avec succès.",
    businessNotFound: "Compte entreprise introuvable.",
    foodPlaceholder: "Exemple : sandwich au poulet, pâtes végétariennes",
    quantityPlaceholder: "Exemple : 10 repas",
    allergyPlaceholder: "Exemple : contient des produits laitiers, noix, halal, végétarien",
    notePlaceholder: "Exemple : retrait avant la fermeture",
    food: "Nourriture",
    preparedMeals: "Repas préparés",
    bakedGoods: "Produits de boulangerie",
    groceries: "Épicerie",
    other: "Autre",
    oneHour: "1 heure",
    twoHours: "2 heures",
    threeHours: "3 heures",
    tenMinutes: "10 minutes",
    fifteenMinutes: "15 minutes",
    twentyMinutes: "20 minutes",
    thirtyMinutes: "30 minutes",
    aiButtonHint: "L’IA peut améliorer le nom, la quantité, la note allergie et la note courte.",
  },
  es: {
    language: "Idioma",
    dashboard: "Panel de empresa",
    monthlySummaryBtn: "Resumen mensual",
    logout: "Cerrar sesión",
    loading: "Cargando panel...",
    postFoodTitle: "Publicar comida disponible",
    businessName: "Nombre del negocio",
    pickupAddress: "Dirección de recogida",
    exactFoodName: "Nombre exacto del alimento",
    category: "Categoría",
    quantity: "Cantidad",
    allergyNote: "Nota de alergias / dieta",
    estimatedValue: "Valor estimado",
    shortNote: "Nota corta",
    keepActive: "Mantener publicación activa por",
    holdAfterClaim: "Retener artículo después del reclamo por",
    postFood: "Publicar comida",
    posting: "Publicando...",
    monthlySummary: "Resumen mensual",
    donationsPosted: "Donaciones publicadas este mes",
    estimatedValueMonth: "Valor estimado este mes",
    summaryNote: "Este resumen es para registro y reportes operativos.",
    yourListings: "Tus publicaciones",
    noListings: "Aún no hay publicaciones.",
    status: "Estado",
    extra: "Extra",
    expires: "Expira",
    posted: "Publicado",
    visibleOnly: "Visible solo para su negocio y el administrador.",
    aiHelper: "Asistente de IA para publicaciones",
    aiHelperText: "Use IA para reescribir su publicación antes de publicarla.",
    improveWithAi: "Mejorar con IA",
    aiWorking: "La IA está reescribiendo...",
    aiDone: "Sugerencia de IA aplicada.",
    aiFailed: "La IA no pudo mejorar la publicación por ahora.",
    couldNotPost: "No se pudo publicar la comida.",
    postedSuccess: "Comida publicada correctamente.",
    businessNotFound: "No se encontró la cuenta del negocio.",
    foodPlaceholder: "Ejemplo: sándwich de pollo, pasta vegetariana",
    quantityPlaceholder: "Ejemplo: 10 comidas",
    allergyPlaceholder: "Ejemplo: contiene lácteos, nueces, halal, vegetariano",
    notePlaceholder: "Ejemplo: recoger antes del cierre",
    food: "Comida",
    preparedMeals: "Comidas preparadas",
    bakedGoods: "Panadería",
    groceries: "Comestibles",
    other: "Otro",
    oneHour: "1 hora",
    twoHours: "2 horas",
    threeHours: "3 horas",
    tenMinutes: "10 minutos",
    fifteenMinutes: "15 minutos",
    twentyMinutes: "20 minutos",
    thirtyMinutes: "30 minutos",
    aiButtonHint: "La IA puede mejorar el nombre, la cantidad, la nota de alergias y la nota corta.",
  },
  pt: {
    language: "Idioma",
    dashboard: "Painel da empresa",
    monthlySummaryBtn: "Resumo mensal",
    logout: "Sair",
    loading: "Carregando painel...",
    postFoodTitle: "Publicar alimentos disponíveis",
    businessName: "Nome da empresa",
    pickupAddress: "Endereço de retirada",
    exactFoodName: "Nome exato do alimento",
    category: "Categoria",
    quantity: "Quantidade",
    allergyNote: "Nota de alergia / dieta",
    estimatedValue: "Valor estimado",
    shortNote: "Nota curta",
    keepActive: "Manter publicação ativa por",
    holdAfterClaim: "Segurar item após solicitação por",
    postFood: "Publicar alimento",
    posting: "Publicando...",
    monthlySummary: "Resumo mensal",
    donationsPosted: "Doações publicadas neste mês",
    estimatedValueMonth: "Valor estimado neste mês",
    summaryNote: "Este resumo é para registro e relatórios operacionais.",
    yourListings: "Suas publicações",
    noListings: "Ainda não há publicações.",
    status: "Status",
    extra: "Extra",
    expires: "Expira",
    posted: "Publicado",
    visibleOnly: "Visível apenas para sua empresa e admin.",
    aiHelper: "Assistente de IA para publicação",
    aiHelperText: "Use IA para reescrever sua publicação antes de postar.",
    improveWithAi: "Melhorar com IA",
    aiWorking: "A IA está reescrevendo...",
    aiDone: "Sugestão da IA aplicada.",
    aiFailed: "A IA não conseguiu melhorar a publicação agora.",
    couldNotPost: "Não foi possível publicar o alimento.",
    postedSuccess: "Alimento publicado com sucesso.",
    businessNotFound: "Conta da empresa não encontrada.",
    foodPlaceholder: "Exemplo: sanduíche de frango, massa vegetariana",
    quantityPlaceholder: "Exemplo: 10 refeições",
    allergyPlaceholder: "Exemplo: contém leite, nozes, halal, vegetariano",
    notePlaceholder: "Exemplo: retirar antes do fechamento",
    food: "Alimento",
    preparedMeals: "Refeições prontas",
    bakedGoods: "Padaria",
    groceries: "Mercearia",
    other: "Outro",
    oneHour: "1 hora",
    twoHours: "2 horas",
    threeHours: "3 horas",
    tenMinutes: "10 minutos",
    fifteenMinutes: "15 minutos",
    twentyMinutes: "20 minutos",
    thirtyMinutes: "30 minutos",
    aiButtonHint: "A IA pode melhorar o nome, a quantidade, a nota de alergia e a nota curta.",
  },
  ar: {
    language: "اللغة",
    dashboard: "لوحة تحكم النشاط التجاري",
    monthlySummaryBtn: "الملخص الشهري",
    logout: "تسجيل الخروج",
    loading: "جارٍ تحميل لوحة التحكم...",
    postFoodTitle: "نشر الطعام المتاح",
    businessName: "اسم النشاط التجاري",
    pickupAddress: "عنوان الاستلام",
    exactFoodName: "الاسم الدقيق للطعام",
    category: "الفئة",
    quantity: "الكمية",
    allergyNote: "ملاحظة الحساسية / النظام الغذائي",
    estimatedValue: "القيمة التقديرية",
    shortNote: "ملاحظة قصيرة",
    keepActive: "إبقاء المنشور نشطًا لمدة",
    holdAfterClaim: "حجز العنصر بعد الطلب لمدة",
    postFood: "نشر الطعام",
    posting: "جارٍ النشر...",
    monthlySummary: "الملخص الشهري",
    donationsPosted: "التبرعات المنشورة هذا الشهر",
    estimatedValueMonth: "القيمة التقديرية هذا الشهر",
    summaryNote: "هذا الملخص مخصص لحفظ السجلات والتقارير التشغيلية.",
    yourListings: "منشوراتك",
    noListings: "لا توجد منشورات بعد.",
    status: "الحالة",
    extra: "إضافي",
    expires: "ينتهي",
    posted: "تم النشر",
    visibleOnly: "مرئي فقط لنشاطك التجاري وللإدارة.",
    aiHelper: "مساعد الذكاء الاصطناعي للمنشور",
    aiHelperText: "استخدم الذكاء الاصطناعي لإعادة كتابة المنشور بشكل أوضح قبل النشر.",
    improveWithAi: "تحسين بالذكاء الاصطناعي",
    aiWorking: "يقوم الذكاء الاصطناعي بإعادة الكتابة...",
    aiDone: "تم تطبيق اقتراح الذكاء الاصطناعي.",
    aiFailed: "تعذر على الذكاء الاصطناعي تحسين المنشور الآن.",
    couldNotPost: "تعذر نشر الطعام.",
    postedSuccess: "تم نشر الطعام بنجاح.",
    businessNotFound: "تعذر العثور على حساب النشاط التجاري.",
    foodPlaceholder: "مثال: ساندويتش دجاج، باستا نباتية",
    quantityPlaceholder: "مثال: 10 وجبات",
    allergyPlaceholder: "مثال: يحتوي على ألبان، مكسرات، حلال، نباتي",
    notePlaceholder: "مثال: الاستلام قبل الإغلاق",
    food: "طعام",
    preparedMeals: "وجبات جاهزة",
    bakedGoods: "مخبوزات",
    groceries: "بقالة",
    other: "أخرى",
    oneHour: "ساعة واحدة",
    twoHours: "ساعتان",
    threeHours: "3 ساعات",
    tenMinutes: "10 دقائق",
    fifteenMinutes: "15 دقيقة",
    twentyMinutes: "20 دقيقة",
    thirtyMinutes: "30 دقيقة",
    aiButtonHint: "يمكن للذكاء الاصطناعي تحسين اسم الطعام والكمية وملاحظات الحساسية والملاحظة القصيرة.",
  },
} as const;

export default function BusinessDashboardPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [foodName, setFoodName] = useState("");
  const [category, setCategory] = useState("Food");
  const [quantity, setQuantity] = useState("");
  const [allergyNote, setAllergyNote] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [note, setNote] = useState("");
  const [listingHours, setListingHours] = useState("1");
  const [claimHoldMinutes, setClaimHoldMinutes] = useState("10");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setLanguage(getStoredLanguage());
    loadDashboard();
  }, []);

  const t = dashboardTranslations[language];
  const rtl = isRtl(language);

  async function loadDashboard() {
    setLoading(true);

    const { data: authData, error: userError } = await supabase.auth.getUser();
    const email = authData?.user?.email;

    if (userError || !email) {
      router.push("/business/login");
      return;
    }

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("*")
      .eq("email", email)
      .single();

    if (businessError || !business) {
      alert(dashboardTranslations.en.businessNotFound);
      router.push("/business/login");
      return;
    }

    setBusinessName(business.name);
    setBusinessAddress(business.address || "");

    const { data: businessListings } = await supabase
      .from("listings")
      .select("*")
      .eq("business_name", business.name)
      .order("created_at", { ascending: false });

    setListings(businessListings || []);
    setLoading(false);
  }

  function handleLanguageChange(newLanguage: Language) {
    setLanguage(newLanguage);
    setStoredLanguage(newLanguage);
  }

  function buildMapsUrl(address: string) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  async function handleAiImprove() {
    setAiLoading(true);

    try {
      const res = await fetch("/api/ai-listing-helper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          foodName,
          category,
          quantity,
          allergyNote,
          note,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "AI failed");
      }

      if (data.foodName !== undefined) setFoodName(data.foodName);
      if (data.category !== undefined) setCategory(data.category);
      if (data.quantity !== undefined) setQuantity(data.quantity);
      if (data.allergyNote !== undefined) setAllergyNote(data.allergyNote);
      if (data.note !== undefined) setNote(data.note);

      alert(t.aiDone);
    } catch (error) {
      console.error(error);
      alert(t.aiFailed);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPosting(true);

    const expiresAt = new Date(
      Date.now() + Number(listingHours) * 60 * 60 * 1000
    ).toISOString();

    const mapsUrl = businessAddress ? buildMapsUrl(businessAddress) : null;

    const { error } = await supabase.from("listings").insert({
      business_name: businessName,
      food_name: foodName || null,
      category,
      quantity,
      allergy_note: allergyNote || null,
      address: businessAddress || null,
      maps_url: mapsUrl,
      estimated_value: estimatedValue ? Number(estimatedValue) : null,
      note: note || null,
      status: "AVAILABLE",
      listing_expires_at: expiresAt,
      claim_hold_minutes: Number(claimHoldMinutes),
    });

    if (error) {
      alert(t.couldNotPost);
      setPosting(false);
      return;
    }

    alert(t.postedSuccess);
    setFoodName("");
    setCategory("Food");
    setQuantity("");
    setAllergyNote("");
    setEstimatedValue("");
    setNote("");
    setListingHours("1");
    setClaimHoldMinutes("10");
    setPosting(false);
    loadDashboard();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/business/login");
  }

  function getMonthlySummary() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthListings = listings.filter((item) => {
      if (!item.created_at) return false;
      const date = new Date(item.created_at);
      return (
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear
      );
    });

    const totalItems = thisMonthListings.length;
    const totalValue = thisMonthListings.reduce(
      (sum, item) => sum + (item.estimated_value || 0),
      0
    );

    return { totalItems, totalValue };
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
        <p className="text-lg font-medium">{t.loading}</p>
      </main>
    );
  }

  const summary = getMonthlySummary();

  return (
    <main
      className="min-h-screen bg-slate-100 text-slate-900"
      dir={rtl ? "rtl" : "ltr"}
    >
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">{t.dashboard}</h1>
            <Link
              href="/business/summary"
              className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              {t.monthlySummaryBtn}
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher language={language} onChange={handleLanguageChange} />
            <button
              onClick={handleLogout}
              className="rounded-xl bg-slate-700 px-4 py-2 text-white hover:bg-slate-800"
            >
              {t.logout}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-8 border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">{t.postFoodTitle}</h2>
            </div>
            <div className="max-w-md">
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                <p className="font-semibold text-violet-900">{t.aiHelper}</p>
                <p className="text-sm text-violet-800 mt-1">{t.aiHelperText}</p>
                <p className="text-xs text-violet-700 mt-2">{t.aiButtonHint}</p>
                <button
                  type="button"
                  onClick={handleAiImprove}
                  disabled={aiLoading}
                  className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-white hover:bg-violet-700 disabled:bg-slate-400"
                >
                  {aiLoading ? t.aiWorking : t.improveWithAi}
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-medium mb-2 text-slate-800">{t.businessName}</label>
              <input
                value={businessName}
                disabled
                className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-slate-100 text-slate-800"
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-slate-800">{t.pickupAddress}</label>
              <input
                value={businessAddress}
                disabled
                className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-slate-100 text-slate-800"
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-slate-800">{t.exactFoodName}</label>
              <input
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                placeholder={t.foodPlaceholder}
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-slate-800">{t.category} *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
              >
                <option value="Food">{t.food}</option>
                <option value="Prepared Meals">{t.preparedMeals}</option>
                <option value="Baked Goods">{t.bakedGoods}</option>
                <option value="Groceries">{t.groceries}</option>
                <option value="Other">{t.other}</option>
              </select>
            </div>

            <div>
              <label className="block font-medium mb-2 text-slate-800">{t.quantity} *</label>
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                placeholder={t.quantityPlaceholder}
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-slate-800">{t.allergyNote}</label>
              <input
                value={allergyNote}
                onChange={(e) => setAllergyNote(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                placeholder={t.allergyPlaceholder}
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-slate-800">{t.estimatedValue}</label>
              <input
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                placeholder="50"
              />
              <p className="text-sm text-slate-500 mt-1">{t.visibleOnly}</p>
            </div>

            <div>
              <label className="block font-medium mb-2 text-slate-800">{t.shortNote}</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                rows={3}
                placeholder={t.notePlaceholder}
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-slate-800">{t.keepActive}</label>
              <select
                value={listingHours}
                onChange={(e) => setListingHours(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
              >
                <option value="1">{t.oneHour}</option>
                <option value="2">{t.twoHours}</option>
                <option value="3">{t.threeHours}</option>
              </select>
            </div>

            <div>
              <label className="block font-medium mb-2 text-slate-800">{t.holdAfterClaim}</label>
              <select
                value={claimHoldMinutes}
                onChange={(e) => setClaimHoldMinutes(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
              >
                <option value="10">{t.tenMinutes}</option>
                <option value="15">{t.fifteenMinutes}</option>
                <option value="20">{t.twentyMinutes}</option>
                <option value="30">{t.thirtyMinutes}</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={posting}
              className="rounded-xl bg-green-600 px-5 py-3 text-white font-medium hover:bg-green-700 disabled:bg-slate-400"
            >
              {posting ? t.posting : t.postFood}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-8 border border-slate-200">
          <h2 className="text-2xl font-semibold mb-4 text-slate-900">{t.monthlySummary}</h2>
          <p className="text-lg text-slate-800">
            {t.donationsPosted}: <span className="font-bold">{summary.totalItems}</span>
          </p>
          <p className="text-lg mt-2 text-slate-800">
            {t.estimatedValueMonth}: <span className="font-bold">${summary.totalValue}</span>
          </p>
          <p className="text-sm text-slate-500 mt-2">{t.summaryNote}</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 border border-slate-200">
          <h2 className="text-2xl font-semibold mb-4 text-slate-900">{t.yourListings}</h2>

          <div className="space-y-4">
            {listings.length === 0 && (
              <p className="text-slate-700">{t.noListings}</p>
            )}

            {listings.map((item) => (
              <div
                key={item.id}
                className="border border-slate-200 rounded-xl p-4 bg-slate-50"
              >
                <p className="font-semibold text-slate-900">{item.food_name || item.category}</p>
                <p className="text-slate-800">{item.quantity}</p>
                <p className="text-slate-800">{t.status}: {item.status}</p>

                {item.allergy_note && (
                  <p className="text-sm text-slate-700 mt-1">
                    {t.allergyNote}: {item.allergy_note}
                  </p>
                )}

                {item.note && (
                  <p className="text-sm text-slate-700 mt-1">
                    {t.extra}: {item.note}
                  </p>
                )}

                {item.estimated_value !== null && item.estimated_value !== undefined && (
                  <p className="text-sm text-slate-700 mt-1">
                    {t.estimatedValue}: ${item.estimated_value}
                  </p>
                )}

                {item.listing_expires_at && (
                  <p className="text-sm text-slate-500 mt-1">
                    {t.expires}: {new Date(item.listing_expires_at).toLocaleString()}
                  </p>
                )}

                {item.created_at && (
                  <p className="text-sm text-slate-500 mt-1">
                    {t.posted}: {new Date(item.created_at).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
