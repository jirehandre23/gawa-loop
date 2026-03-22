'use client'
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import {
  Language,
  getStoredLanguage,
  isRtl,
  setStoredLanguage,
  translations,
} from "../../lib/i18n";

export default function BusinessLoginPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setLanguage(getStoredLanguage());
  }, []);

  const t = translations[language];
  const rtl = isRtl(language);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    router.push("/business/dashboard");
    setLoading(false);
  }

  async function handleForgotPassword() {
    if (!email) {
      alert(t.enterEmailFirst);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://gawaloop.com/business/login",
    });

    if (error) {
      alert(error.message);
    } else {
      alert(t.resetEmailSent);
    }
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
      <div className="max-w-xl mx-auto px-6 py-10">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher language={language} onChange={handleLanguageChange} />
        </div>

        <h1 className="text-3xl font-bold mb-2 text-slate-900">{t.businessLogin}</h1>
        <p className="text-slate-600 mb-6">{t.loginSubtitle}</p>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow p-6 space-y-4 text-slate-900 border border-slate-200">
          <div>
            <label className="block font-medium mb-2 text-slate-800">{t.businessEmail}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-2 text-slate-800">{t.password}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400"
              required
            />
          </div>

          <p className="text-sm text-center mt-2">
            <button
              type="button"
              className="text-blue-600 hover:underline"
              onClick={handleForgotPassword}
            >
              {t.forgotPassword}
            </button>
          </p>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? t.loggingIn : t.logIn}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4 text-center">
          {t.needHelp}{" "}
          <a
            href="mailto:admin@gawaloop.com"
            className="text-blue-600 hover:underline"
          >
            admin@gawaloop.com
          </a>
        </p>
      </div>
    </main>
  );
}
