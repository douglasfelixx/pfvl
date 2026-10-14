import { createContext, type ReactNode, useContext } from "react";
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from "@clerk/react";
import { getGetCurrentUserQueryKey, useGetCurrentUser } from "@workspace/api-client-react";
import { Link } from "wouter";

export const AuthAvailabilityContext = createContext(false);
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
export const clerkAuthReady = Boolean(publishableKey?.startsWith("pk_"));

export function AuthContextProvider({ children }: { children: ReactNode }) {
  return clerkAuthReady && publishableKey ? (
    <ClerkProvider publishableKey={publishableKey}>
      <AuthAvailabilityContext.Provider value>{children}</AuthAvailabilityContext.Provider>
    </ClerkProvider>
  ) : (
    <AuthAvailabilityContext.Provider value={false}>{children}</AuthAvailabilityContext.Provider>
  );
}

export function AuthHeaderActions() {
  return useContext(AuthAvailabilityContext) ? <ClerkHeader /> : <span className="public-access-label">Acesso público</span>;
}

function ClerkHeader() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const profile = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), enabled: isSignedIn === true, retry: false } });
  if (!isLoaded) return <span className="public-access-label">Carregando conta…</span>;
  if (!isSignedIn) {
    return <div className="flex items-center gap-2"><Link className="auth-header-link" href="/sign-in">Entrar</Link><Link className="auth-header-primary" href="/sign-up">Criar conta</Link></div>;
  }
  return (
    <div className="flex items-center gap-2">
      {profile.data?.role === "admin" && <Link className="auth-header-link" href="/admin">Painel</Link>}
      <span className="hidden max-w-32 truncate text-xs font-semibold text-white/90 sm:block">{user?.firstName || profile.data?.displayName || "Minha conta"}</span>
      <button className="auth-header-link" onClick={() => void signOut({ redirectUrl: "/" })} type="button">Sair</button>
    </div>
  );
}

export function AuthRoute({ mode }: { mode: "sign-in" | "sign-up" }) {
  if (!useContext(AuthAvailabilityContext)) return <AuthSetupCard />;
  return <ClerkAuthRoute mode={mode} />;
}

function ClerkAuthRoute({ mode }: { mode: "sign-in" | "sign-up" }) {
  const common = {
    routing: "path" as const,
    appearance: { variables: { colorPrimary: "#233a59", colorText: "#012140", colorBackground: "#ffffff", borderRadius: "14px" } },
  };
  return (
    <div className="page-enter flex min-h-[65vh] items-center justify-center px-2 py-10">
      <div className="w-full max-w-[460px] text-center">
        <p className="eyebrow-pill">{mode === "sign-in" ? "Bem-vindo de volta" : "Comunidade PFVL"}</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-[#012140]">{mode === "sign-in" ? "Entre na sua conta." : "Crie sua conta PFVL."}</h1>
        <p className="mb-5 mt-2 text-sm leading-6 text-muted-foreground">Participe das conversas e responda aos artigos.</p>
        <div className="flex justify-center">
          {mode === "sign-in"
            ? <SignIn {...common} path="/sign-in" signUpUrl="/sign-up" />
            : <SignUp {...common} path="/sign-up" signInUrl="/sign-in" />}
        </div>
      </div>
    </div>
  );
}

export function AuthActionGate({ children }: { children: ReactNode }) {
  return useContext(AuthAvailabilityContext) ? <SignedInGate>{children}</SignedInGate> : <AuthSetupNotice />;
}

function SignedInGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <p className="rounded-xl border bg-white p-4 text-sm text-muted-foreground">Verificando sua conta…</p>;
  if (!isSignedIn) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#233a59]/15 bg-white p-5">
        <div><p className="font-semibold text-[#012140]">Entre para participar.</p><p className="mt-1 text-sm text-muted-foreground">Sua conta permite publicar e responder.</p></div>
        <div className="flex gap-2"><Link className="auth-header-link !border-[#233a59]/25 !text-[#233a59]" href="/sign-in">Entrar</Link><Link className="auth-header-primary" href="/sign-up">Criar conta</Link></div>
      </div>
    );
  }
  return <>{children}</>;
}

function AuthSetupNotice() {
  return <div className="rounded-2xl border border-[#233a59]/15 bg-white p-5 text-sm text-[#233a59]">O acesso do Clerk precisa ser configurado para liberar contas e publicações.</div>;
}

function AuthSetupCard() {
  return (
    <div className="page-enter mx-auto flex min-h-[60vh] max-w-2xl items-center">
      <section className="w-full rounded-3xl border border-[#233a59]/15 bg-white p-7 shadow-sm sm:p-10">
        <p className="eyebrow-pill">Acesso PFVL</p>
        <h1 className="mt-4 font-display text-3xl font-semibold text-[#012140]">Login ainda não conectado.</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">Configure as chaves do Clerk no ambiente do portal para liberar contas, publicações e respostas.</p>
        <Link className="auth-header-primary mt-6 inline-flex" href="/">Voltar ao início</Link>
      </section>
    </div>
  );
}
