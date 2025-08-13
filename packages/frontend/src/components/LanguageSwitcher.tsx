import React, { useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import "./LanguageSwitcher.css";

export const LanguageSwitcher: React.FC = () => {
  const { currentLanguage, changeLanguage, availableLanguages } = useLanguage();
  const [isChanging, setIsChanging] = useState(false);

  const handleLanguageChange = async (langCode: string) => {
    if (langCode === currentLanguage || isChanging) return;

    setIsChanging(true);
    try {
      await changeLanguage(langCode);
    } catch (error) {
      console.error("Failed to change language:", error);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="language-switcher">
      {availableLanguages.map((lang) => (
        <button
          key={lang.code}
          className={`lang-button ${currentLanguage === lang.code ? "active" : ""} ${isChanging ? "disabled" : ""}`}
          onClick={() => handleLanguageChange(lang.code)}
          disabled={isChanging}
          title={lang.name}
          aria-label={`Switch to ${lang.name}`}
        >
          {lang.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
};
