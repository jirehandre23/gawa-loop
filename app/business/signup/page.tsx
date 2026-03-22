'use client'
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import {
  Language,
  getStoredLanguage,
  isRtl,
  setStoredLanguage,
  translations,
} from "../../lib/i18n";

export default function BusinessSignupPage() {
  const [language, setLanguage] = useState<Language>("en");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState("Restaurant");

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("USA");

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLanguage(getStoredLanguage());
  }, []);

  const t = translations[language];
  const rtl = isRtl(language);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const fullAddress = [
      street.trim(),
      city.trim(),
      stateRegion.trim(),
      postalCode.trim(),
      country.trim(),
    ]
      .filter(Boolean)
      .join(", ");

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: "https://gawaloop.com/business/login",
      },
    });

    if (authError) {
      alert(authError.message);
      setLoading(false);
      return;
    }

    const { error: businessError } = await supabase.from("businesses").insert({
      name,
      email,
      phone,
      type,
      address: fullAddress,
    });

    if (
      businessError &&
      !businessError.message.toLowerCase().includes("duplicate")
    ) {
      alert("Something went wrong saving your business profile.");
      console.error("Business insert error:", businessError);
      setLoading(false);
      return;
    }

    alert("Business account created. Please check your email and confirm your account before logging in.");

    setName("");
    setEmail("");
    setPhone("");
    setType("Restaurant");
    setStreet("");
    setCity("");
    setStateRegion("");
    setPostalCode("");
    setCountry("USA");
    setPassword("");
    setLoading(false);
  }

  function handleLanguageChange(newLanguage: Language) {
    setLanguage(newLanguage);
    setStoredLanguage(newLanguage);
  }

  return (
    <main
      className="min-h-screen bg-slate-100 text-slate-900"
      dir={rtl ? "rtl" : "ltr"}
    >
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher language={language} onChange={handleLanguageChange} />
        </div>

        <h1 className="text-3xl font-bold mb-2 text-slate-900">{t.businessSignup}</h1>
        <p className="text-slate-600 mb-6">{t.signupSubtitle}</p>

        <form
          onSubmit={handleSignup}
          className="bg-white rounded-2xl shadow p-6 space-y-5 text-slate-900 border border-slate-200"
        >
          <div>
            <label className="block font-medium mb-2 text-slate-800">{t.businessName} *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
              placeholder={t.exampleBusinessName}
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-2 text-slate-800">{t.businessType} *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
              required
            >
              <option value="Restaurant">{t.restaurant}</option>
              <option value="Hotel">{t.hotel}</option>
              <option value="Store">{t.store}</option>
              <option value="Bakery">{t.bakery}</option>
              <option value="Other">{t.other}</option>
            </select>
          </div>

          <div>
            <label className="block font-medium mb-2 text-slate-800">{t.businessEmail} *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
              placeholder={t.exampleEmail}
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-2 text-slate-800">{t.phoneNumber} *</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
              placeholder={t.examplePhone}
              required
            />
          </div>

          <div className="pt-2 border-t border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">{t.pickupAddress}</h2>

            <div className="space-y-4">
              <div>
                <label className="block font-medium mb-2 text-slate-800">{t.streetAddress} *</label>
                <input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                  placeholder={t.exampleStreet}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block font-medium mb-2 text-slate-800">{t.city} *</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                    placeholder={t.exampleCity}
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2 text-slate-800">{t.stateRegion} *</label>
                  <input
                    value={stateRegion}
                    onChange={(e) => setStateRegion(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                    placeholder={t.exampleState}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block font-medium mb-2 text-slate-800">{t.postalCode} *</label>
                  <input
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                    placeholder={t.examplePostal}
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2 text-slate-800">{t.country} *</label>
                  <input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                    placeholder={t.exampleCountry}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-medium mb-2 text-slate-800">{t.password} *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
              placeholder={t.createPassword}
              required
              minLength={8}
            />
            <p className="text-sm text-slate-500 mt-1">{t.passwordHint}</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-green-600 px-5 py-3 text-white font-medium hover:bg-green-700 disabled:bg-slate-400"
          >
            {loading ? t.creating : t.createBusinessAccount}
          </button>
        </form>

        <p className="text-sm text-slate-600 mt-4 text-center">
          {t.needHelp}{" "}
          <a
            href="mailto:admin@gawaloop.com"
            className="text-green-700 hover:underline"
          >
            admin@gawaloop.com
          </a>
        </p>
      </div>
    </main>
  );
}
