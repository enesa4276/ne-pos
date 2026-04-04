import React, { createContext, useContext, useState } from 'react';
import { translations } from './i18n';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('pos-lang') || 'tr');

  const setLanguage = (code) => {
    setLang(code);
    localStorage.setItem('pos-lang', code);
  };

  const t = (key) => translations[lang]?.[key] ?? translations['tr'][key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}