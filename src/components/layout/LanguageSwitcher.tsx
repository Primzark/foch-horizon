import { useState } from "react";
import { useSiteLanguage } from "@/lib/i18n/LanguageProvider";
import type { SiteLanguage } from "@/lib/i18n/catalog";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { language, setLanguage } = useSiteLanguage();
  const [sweepKey, setSweepKey] = useState(0);

  const selectLanguage = (nextLanguage: SiteLanguage) => {
    if (nextLanguage === language) return;
    setLanguage(nextLanguage);
    setSweepKey((key) => key + 1);
  };

  return (
    <div
      className={`language-switcher ${className}`}
      role="group"
      aria-label="Language / Langue"
      data-language={language}
      data-sweep-key={sweepKey}
      data-no-translate
    >
      <span className="language-switcher__selection" aria-hidden="true" />
      <span className="language-switcher__sweep" aria-hidden="true" key={sweepKey} />
      {(["fr", "en"] as const).map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-label={option === "fr" ? "Français" : "English"}
          aria-pressed={language === option}
          className="language-switcher__option"
          onClick={() => selectLanguage(option)}
        >
          <span className="language-switcher__label" key={`${option}-${language}`}>
            {option.toUpperCase()}
          </span>
          <span className="language-switcher__underline" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
