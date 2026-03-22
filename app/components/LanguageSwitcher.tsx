'use client'
import { Language, languageNames } from "../lib/i18n";

type Props = {
  language: Language;
  onChange: (language: Language) => void;
};

export default function LanguageSwitcher({ language, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language" className="text-sm font-medium text-slate-700">
        Language
      </label>
      <select
        id="language"
        value={language}
        onChange={(e) => onChange(e.target.value as Language)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
      >
        {Object.entries(languageNames).map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
