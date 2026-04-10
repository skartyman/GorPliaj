import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { dictionary } from '../lib/i18n';

const STORAGE_KEY = 'gorpliaj-locale';
const LocaleContext = createContext(null);

function detectLocale() {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'ru' || saved === 'en') {
    return saved;
  }
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'ru';
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState('ru');

  useEffect(() => {
    const nextLocale = detectLocale();
    setLocaleState(nextLocale);
    document.documentElement.lang = nextLocale;
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale: (nextLocale) => {
        setLocaleState(nextLocale);
        document.documentElement.lang = nextLocale;
        window.localStorage.setItem(STORAGE_KEY, nextLocale);
      },
      t: (key) => dictionary[locale]?.[key] || key
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
