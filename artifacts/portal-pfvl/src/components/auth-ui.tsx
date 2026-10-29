import { createContext, type ReactNode, useContext, useEffect } from "react";
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from "@clerk/react";
import { enUS, ptBR } from "@clerk/localizations";
import { Bell, UserRound } from "lucide-react";
import {
  getGetCurrentUserQueryKey,
  getListNotificationsQueryKey,
  useGetCurrentUser,
  useListNotifications,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { translateText, useI18n } from "@/lib/i18n";

export const AuthAvailabilityContext = createContext(false);
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
export const clerkAuthReady = Boolean(publishableKey?.startsWith("pk_"));

function safeInternalRedirect(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const target = new URL(value, window.location.origin);
    if (target.origin !== window.location.origin) return undefined;
    if (/^\/sign-(in|up)(\/|$)/.test(target.pathname)) return undefined;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return undefined;
  }
}

function authHref(path: "/sign-in" | "/sign-up", returnTo?: string): string {
  const target = safeInternalRedirect(returnTo ?? `${window.location.pathname}${window.location.search}${window.location.hash}`);
  if (!target) return path;
  const query = new URLSearchParams({ redirect_url: target });
  return `${path}?${query.toString()}`;
}

export function AuthContextProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  return clerkAuthReady && publishableKey ? (
    <ClerkProvider publishableKey={publishableKey} localization={locale === "en-US" ? enUS : ptBR}>
      <AuthAvailabilityContext.Provider value>{children}</AuthAvailabilityContext.Provider>
    </ClerkProvider>
  ) : (
    <AuthAvailabilityContext.Provider value={false}>{children}</AuthAvailabilityContext.Provider>
  );
}

export function AuthHeaderActions() {
  return useContext(AuthAvailabilityContext) ? <ClerkHeader /> : <span className="public-access-label">{translateText("Acesso público")}</span>;
}

function ClerkHeader() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { locale, setLocale } = useI18n();
  const profile = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), enabled: isSignedIn === true, retry: false } });
  const notifications = useListNotifications({
    query: {
      queryKey: getListNotificationsQueryKey(),
      enabled: isSignedIn === true,
      refetchInterval: 30_000,
    },
  });
  useEffect(() => {
    if (isSignedIn && profile.data?.preferredLanguage && profile.data.preferredLanguage !== locale) {
      setLocale(profile.data.preferredLanguage);
    }
  }, [isSignedIn, profile.data?.id, profile.data?.preferredLanguage, setLocale]);
  if (!isLoaded) return <span className="public-access-label">{translateText("Carregando conta…")}</span>;
  if (!isSignedIn) {
    return <div className="header-auth-actions flex items-center gap-2"><Link className="auth-header-link" href={authHref("/sign-in")}>{translateText("Entrar")}</Link><Link className="auth-header-primary" href={authHref("/sign-up")}>{translateText("Criar conta")}</Link></div>;
  }
  const unreadCount = notifications.data?.unreadCount ?? 0;
  return (
    <div className="header-auth-actions flex items-center gap-2">
      {profile.data?.role === "admin" && <Link className="auth-header-link" href="/admin">{translateText("Painel")}</Link>}
      <Link aria-label={translateText("Meu perfil")} className="auth-header-link !px-2.5" href="/profile" data-testid="link-profile">
        <UserRound aria-hidden="true" size={16} /><span className="sr-only">{translateText("Perfil")}</span>
      </Link>
      <span className="hidden max-w-32 truncate text-xs font-semibold text-white/90 sm:block">{user?.firstName || profile.data?.displayName || translateText("Minha conta")}</span>
      <Link
        aria-label={`${translateText("Notificações")}${unreadCount ? `, ${unreadCount} ${translateText("não lidas")}` : ""}`}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 text-white transition hover:bg-white/10"
        href="/notifications"
      >
        <Bell aria-hidden="true" size={19} />
        {!!notifications.data?.unreadCount && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#286bd4] px-1 text-center text-[10px] font-bold leading-5 text-white">
            {notifications.data.unreadCount > 99 ? "99+" : notifications.data.unreadCount}
          </span>
        )}
      </Link>
      <button className="auth-header-link" onClick={() => void signOut({ redirectUrl: "/" })} type="button">{translateText("Sair")}</button>
    </div>
  );
}

export function AuthRoute({ mode }: { mode: "sign-in" | "sign-up" }) {
  if (!useContext(AuthAvailabilityContext)) return <AuthSetupCard />;
  return <ClerkAuthRoute mode={mode} />;
}

function ClerkAuthRoute({ mode }: { mode: "sign-in" | "sign-up" }) {
  const redirectUrl = safeInternalRedirect(new URLSearchParams(window.location.search).get("redirect_url"));
  const common = {
    routing: "path" as const,
    forceRedirectUrl: redirectUrl,
    fallbackRedirectUrl: redirectUrl ?? "/",
    appearance: { variables: { colorPrimary: "#233a59", colorText: "#012140", colorBackground: "#ffffff", borderRadius: "14px" } },
  };
  return (
    <div className="page-enter flex min-h-[65vh] items-center justify-center px-2 py-10">
      <div className="w-full max-w-[460px] text-center">
        <p className="eyebrow-pill">{translateText(mode === "sign-in" ? "Bem-vindo de volta" : "Comunidade PFVL")}</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-[#012140]">{translateText(mode === "sign-in" ? "Entre na sua conta." : "Crie sua conta PFVL.")}</h1>
        <p className="mb-5 mt-2 text-sm leading-6 text-muted-foreground">{translateText("Participe das conversas e responda aos artigos.")}</p>
        <div className="flex justify-center">
          {mode === "sign-in"
            ? <SignIn {...common} path="/sign-in" signUpUrl={authHref("/sign-up", redirectUrl)} />
            : <SignUp {...common} path="/sign-up" signInUrl={authHref("/sign-in", redirectUrl)} />}
        </div>
      </div>
    </div>
  );
}

export function AuthActionGate({ children, returnTo }: { children: ReactNode; returnTo?: string }) {
  return useContext(AuthAvailabilityContext) ? <SignedInGate returnTo={returnTo}>{children}</SignedInGate> : <AuthSetupNotice />;
}

function SignedInGate({ children, returnTo }: { children: ReactNode; returnTo?: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <p className="rounded-xl border bg-white p-4 text-sm text-muted-foreground">{translateText("Verificando sua conta…")}</p>;
  if (!isSignedIn) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#233a59]/15 bg-white p-5">
        <div><p className="font-semibold text-[#012140]">{translateText("Entre para participar.")}</p><p className="mt-1 text-sm text-muted-foreground">{translateText("Sua conta permite publicar e responder.")}</p></div>
        <div className="flex gap-2"><Link className="auth-header-link !border-[#233a59]/25 !text-[#233a59]" href={authHref("/sign-in", returnTo)}>{translateText("Entrar")}</Link><Link className="auth-header-primary" href={authHref("/sign-up", returnTo)}>{translateText("Criar conta")}</Link></div>
      </div>
    );
  }
  return <>{children}</>;
}

function AuthSetupNotice() {
  return <div className="rounded-2xl border border-[#233a59]/15 bg-white p-5 text-sm text-[#233a59]">{translateText("O acesso do Clerk precisa ser configurado para liberar contas e publicações.")}</div>;
}

function AuthSetupCard() {
  return (
    <div className="page-enter mx-auto flex min-h-[60vh] max-w-2xl items-center">
      <section className="w-full rounded-3xl border border-[#233a59]/15 bg-white p-7 shadow-sm sm:p-10">
        <p className="eyebrow-pill">{translateText("Acesso PFVL")}</p>
        <h1 className="mt-4 font-display text-3xl font-semibold text-[#012140]">{translateText("Login ainda não conectado.")}</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{translateText("Configure as chaves do Clerk no ambiente do portal para liberar contas, publicações e respostas.")}</p>
        <Link className="auth-header-primary mt-6 inline-flex" href="/">{translateText("Voltar ao início")}</Link>
      </section>
    </div>
  );
}
