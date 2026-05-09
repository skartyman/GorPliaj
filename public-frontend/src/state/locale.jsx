import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { dictionary } from '../lib/i18n';

const STORAGE_KEY = 'gorpliaj-locale';
const LocaleContext = createContext(null);

function detectLocale() {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'ru' || saved === 'en' || saved === 'ua') {
    return saved;
  }

  return 'ua';
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState('ua');

  useEffect(() => {
    const nextLocale = detectLocale();
    setLocaleState(nextLocale);
    document.documentElement.lang = nextLocale === 'ua' ? 'uk' : nextLocale;
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale: (nextLocale) => {
        setLocaleState(nextLocale);
        document.documentElement.lang = nextLocale === 'ua' ? 'uk' : nextLocale;
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
