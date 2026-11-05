export type CookieConsentChoice = 'all' | 'necessary';

export const COOKIE_CONSENT_STORAGE_KEY = 'pfvl-cookie-consent-v1';

const SIDEBAR_PREFERENCE_COOKIE = 'sidebar_state';

export function readCookieConsent(): CookieConsentChoice | null {
  if (typeof window === 'undefined') return null;

  try {
    const saved = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    return saved === 'all' || saved === 'necessary' ? saved : null;
  } catch {
    return null;
  }
}

export function clearSidebarPreferenceCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${SIDEBAR_PREFERENCE_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function saveCookieConsent(choice: CookieConsentChoice) {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, choice);
    } catch {
      // The selection still applies for this session when storage is unavailable.
    }
  }

  if (choice === 'necessary') clearSidebarPreferenceCookie();
}

export function allowsPreferenceCookies() {
  return readCookieConsent() === 'all';
}

export function readSidebarPreference(defaultOpen: boolean) {
  if (typeof document === 'undefined' || !allowsPreferenceCookies()) {
    return defaultOpen;
  }

  const value = document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${SIDEBAR_PREFERENCE_COOKIE}=`))
    ?.split('=')[1];

  if (value === 'true') return true;
  if (value === 'false') return false;
  return defaultOpen;
}

export function saveSidebarPreference(open: boolean) {
  if (!allowsPreferenceCookies()) return;
  document.cookie = `${SIDEBAR_PREFERENCE_COOKIE}=${open}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
}
