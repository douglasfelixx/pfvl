import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { englishTranslations } from './translations';

export type Locale = 'pt-BR' | 'en-US';

const STORAGE_KEY = 'pfvl-language';
const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
} | null>(null);

function readSavedLocale(): Locale {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'en-US' ? 'en-US' : 'pt-BR';
  } catch {
    return 'pt-BR';
  }
}

let activeLocale: Locale = typeof window === 'undefined' ? 'pt-BR' : readSavedLocale();

export function translateText(text: string, locale: Locale = activeLocale): string {
  return locale === 'en-US' ? englishTranslations[text] ?? text : text;
}

export function getLocale(): Locale {
  return activeLocale;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readSavedLocale);

  const setLocale = useCallback((nextLocale: Locale) => {
    activeLocale = nextLocale;
    try {
      window.localStorage.setItem(STORAGE_KEY, nextLocale);
    } catch {
      // The language remains active for this session if storage is unavailable.
    }
    setLocaleState(nextLocale);
  }, []);

  useEffect(() => {
    activeLocale = locale;
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    function syncFromAnotherTab(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      const nextLocale: Locale = event.newValue === 'en-US' ? 'en-US' : 'pt-BR';
      activeLocale = nextLocale;
      setLocaleState(nextLocale);
    }

    window.addEventListener('storage', syncFromAnotherTab);
    return () => window.removeEventListener('storage', syncFromAnotherTab);
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
