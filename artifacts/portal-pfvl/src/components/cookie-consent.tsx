import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Link } from 'wouter';
import { translateText } from '@/lib/i18n';
import {
  clearSidebarPreferenceCookie,
  COOKIE_CONSENT_STORAGE_KEY,
  readCookieConsent,
  saveCookieConsent,
  type CookieConsentChoice,
} from '@/lib/cookie-consent';

const CookiePreferencesContext = createContext<(() => void) | null>(null);

export function CookieConsentManager({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<CookieConsentChoice | null>(readCookieConsent);
  const [reopened, setReopened] = useState(false);
  const bannerOpen = choice === null || reopened;

  useEffect(() => {
    if (choice !== 'all') clearSidebarPreferenceCookie();
  }, [choice]);

  useEffect(() => {
    function syncChoice(event: StorageEvent) {
      if (event.key !== COOKIE_CONSENT_STORAGE_KEY) return;
      setChoice(readCookieConsent());
      setReopened(false);
    }

    window.addEventListener('storage', syncChoice);
    return () => window.removeEventListener('storage', syncChoice);
  }, []);

  const openPreferences = useCallback(() => setReopened(true), []);
  const choose = useCallback((nextChoice: CookieConsentChoice) => {
    saveCookieConsent(nextChoice);
    setChoice(nextChoice);
    setReopened(false);
  }, []);

  return (
    <CookiePreferencesContext.Provider value={openPreferences}>
      {children}
      {bannerOpen && (
        <section
          aria-describedby="cookie-consent-description"
          aria-label={translateText('Aviso de cookies')}
          className="cookie-consent-banner"
          role="region"
        >
          <div className="cookie-consent-copy">
            <h2>{translateText('Cookies e privacidade')}</h2>
            <p id="cookie-consent-description">
              {translateText('Usamos cookies necessários para login. O menu do painel só salva seu estado com sua autorização. Não usamos cookies de análise ou publicidade.')}
            </p>
            <Link className="cookie-consent-policy-link" href="/privacidade">
              {translateText('Política de Privacidade')}
            </Link>
          </div>
          <div className="cookie-consent-actions">
            <button
              className="cookie-consent-secondary"
              onClick={() => choose('necessary')}
              type="button"
            >
              {translateText('Somente necessários')}
            </button>
            <button
              className="cookie-consent-primary"
              onClick={() => choose('all')}
              type="button"
            >
              {translateText('Aceitar cookies')}
            </button>
          </div>
        </section>
      )}
    </CookiePreferencesContext.Provider>
  );
}

export function CookiePreferencesButton() {
  const openPreferences = useContext(CookiePreferencesContext);
  if (!openPreferences) return null;

  return (
    <button
      className="cookie-preferences-trigger"
      onClick={openPreferences}
      type="button"
    >
      {translateText('Preferências de cookies')}
    </button>
  );
}
