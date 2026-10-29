import { type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  BarChart3,
  BookOpen,
  CircleHelp,
  Menu,
  MessageCircle,
  Newspaper,
  X,
} from 'lucide-react';
import { Link, Route, Switch, useLocation } from 'wouter';
import {
  AuthContextProvider,
  AuthHeaderActions,
  AuthRoute,
} from '@/components/auth-ui';
import { CountryFlag } from '@/components/country-flag';
import { ErrorBoundary } from '@/components/error-boundary';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AdminPage } from '@/pages/admin-page';
import NotFound from '@/pages/not-found';
import {
  BlogPage,
  CommunityPage,
  HelpPage,
  HomePage,
  IndicatorsPage,
  NewsPage,
  PostDetailPage,
  SuggestionsPage,
} from '@/pages/portal-pages';
import { NotificationsPage } from '@/pages/notifications-page';
import { ProfilePage } from '@/pages/profile-page';
import { I18nProvider, translateText, useI18n, type Locale } from '@/lib/i18n';
import {
  AboutPage,
  ContactPage,
  LegalPage,
  PresentationPage,
} from '@/pages/institutional-pages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const navigation = [
  { href: '/', label: 'Início', icon: BarChart3 },
  { href: '/blog', label: 'Conteúdos', icon: BookOpen },
  { href: '/indicators', label: 'Indicadores', icon: BarChart3 },
  { href: '/community', label: 'Comunidade', icon: MessageCircle },
  { href: '/news', label: 'Novidades', icon: Newspaper },
  { href: '/help', label: 'Central de Ajuda', icon: CircleHelp },
];

const pageMetadata = [
  {
    match: /^\/$/,
    title: 'PFVL | Planejamento financeiro para a vida real',
    description:
      'Entenda seu presente, organize suas finanças e planeje o futuro que você quer construir com o PFVL.',
  },
  {
    match: /^\/community(?:\/\d+)?$/,
    title: 'Comunidade PFVL | Conversas sobre finanças',
    description:
      'Leia dúvidas e experiências sobre planejamento financeiro, investimentos, Open Finance e metas.',
  },
  {
    match: /^\/blog(?:\/\d+)?$/,
    title: 'Guias e artigos | PFVL',
    description:
      'Conteúdos da equipe PFVL sobre planejamento, organização, objetivos, indicadores e recursos do sistema.',
  },
  {
    match: /^\/news(?:\/\d+)?$/,
    title: 'Novidades PFVL | Atualizações do portal',
    description:
      'Acompanhe atualizações, novos recursos e notícias importantes do portal PFVL.',
  },
  {
    match: /^\/indicators$/,
    title: 'Indicadores econômicos | PFVL',
    description:
      'Consulte referências econômicas como CDI, Selic, IPCA e INPC com fonte e data de atualização.',
  },
  {
    match: /^\/suggestions$/,
    title: 'Roadmap de sugestões | PFVL',
    description:
      'Consulte as sugestões da comunidade e acompanhe cada ideia por status.',
  },
  {
    match: /^\/notifications$/,
    title: 'Notificações | PFVL',
    description: 'Acompanhe novidades, publicações, respostas e mudanças nas sugestões do PFVL.',
  },
  {
    match: /^\/help(?:\/\d+)?$/,
    title: 'Central de Ajuda | PFVL',
    description: 'Encontre tutoriais e orientações práticas para usar o sistema PFVL.',
  },
  {
    match: /^\/apresentacao$/,
    title: 'Apresentação do PFVL | Orbe',
    description: 'Conheça o PFVL e veja como o produto conecta contas, compromissos e objetivos.',
  },
  {
    match: /^\/sobre$/,
    title: 'Sobre o PFVL e a Orbe | Orbe',
    description: 'Conheça o produto PFVL e a Orbe Sistemas Financeiros, empresa responsável.',
  },
  {
    match: /^\/contato$/,
    title: 'Contato | Orbe Sistemas Financeiros',
    description: 'Informações de contato oficiais da Orbe Sistemas Financeiros.',
  },
  {
    match: /^\/privacidade$/,
    title: 'Privacidade | PFVL',
    description: 'Informações sobre privacidade no PFVL.',
  },
  {
    match: /^\/termos$/,
    title: 'Termos de uso | PFVL',
    description: 'Condições de uso do PFVL.',
  },
];

function SeoManager() {
  const [location] = useLocation();
  const { locale } = useI18n();

  useEffect(() => {
    const route = location.split('?')[0] || '/';
    const metadata = pageMetadata.find((page) => page.match.test(route)) ?? {
      title: 'Página não encontrada | PFVL',
      description: 'A página solicitada não foi encontrada no portal PFVL.',
    };

    document.documentElement.lang = locale;
    document.title = translateText(metadata.title, locale);

    const setMetaContent = (selector: string, content: string) => {
      const element = document.head.querySelector<HTMLMetaElement>(selector);
      if (element) element.content = content;
    };

    const title = translateText(metadata.title, locale);
    const description = translateText(metadata.description, locale);
    setMetaContent('meta[name="description"]', description);
    setMetaContent('meta[property="og:title"]', title);
    setMetaContent('meta[property="og:description"]', description);
    setMetaContent('meta[name="twitter:title"]', title);
    setMetaContent('meta[name="twitter:description"]', description);

    const siteUrl = import.meta.env.VITE_SITE_URL?.replace(/\/$/, '');
    const canonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (siteUrl) {
      const canonicalUrl = `${siteUrl}${route}`;
      setMetaContent('meta[property="og:url"]', canonicalUrl);
      if (canonical) {
        canonical.href = canonicalUrl;
      } else {
        const link = document.createElement('link');
        link.rel = 'canonical';
        link.href = canonicalUrl;
        document.head.append(link);
      }
    } else if (canonical) {
      canonical.remove();
    }
  }, [location, locale]);

  return null;
}

function PortalShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { locale, setLocale } = useI18n();
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="brand-lockup" href="/" onClick={() => setMobileOpen(false)}>
            <img
              className="brand-logo"
              src="/pfvl-logo-negativa.png"
              alt={translateText('PFVL — Planeje. Acompanhe. Realize.')}
              fetchPriority="high"
            />
          </Link>
          <button
            aria-expanded={mobileOpen}
            aria-label={translateText(mobileOpen ? 'Fechar menu' : 'Abrir menu')}
            className="menu-button"
            onClick={() => setMobileOpen((open) => !open)}
            type="button"
          >
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <nav aria-label={translateText('Navegação principal')} className={`primary-navigation ${mobileOpen ? 'primary-navigation-open' : ''}`}>
            {navigation.map((item) => {
              const active = item.href === '/' ? location === '/' : location.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  className={`primary-nav-link ${active ? 'primary-nav-link-active' : ''}`}
                  href={item.href}
                  key={item.href}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="nav-item-icon" size={15} strokeWidth={1.9} />
                  <span>{translateText(item.label)}</span>
                </Link>
              );
            })}
          </nav>
          <div aria-label={translateText('Idioma')} className="language-switch" role="group">
            {([
              { locale: 'pt-BR', country: 'BR', label: 'Português (Brasil)' },
              { locale: 'en-US', country: 'US', label: 'English (United States)' },
            ] as const).map((option) => (
              <button
                aria-label={option.label}
                aria-pressed={locale === option.locale}
                className={`language-option ${locale === option.locale ? 'language-option-active' : ''}`}
                data-testid={`button-language-${option.locale}`}
                key={option.locale}
                onClick={() => setLocale(option.locale as Locale)}
                title={option.label}
                type="button"
              >
                <CountryFlag country={option.country} />
              </button>
            ))}
          </div>
          <AuthHeaderActions />
        </div>
      </header>
      <main className="main-area">
        <div className="page-container">{children}</div>
        <footer className="portal-footer">
          <span>{translateText('PFVL é um produto da Orbe Sistemas Financeiros.')}</span>
          <div className="footer-links">
            <Link href="/sobre">{translateText('Sobre')}</Link>
            <Link href="/contato">{translateText('Contato')}</Link>
            <Link href="/privacidade">{translateText('Privacidade')}</Link>
            <Link href="/termos">{translateText('Termos')}</Link>
            <Link href="/suggestions">{translateText('Sugestões')}</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

function RoutedContent() {
  return (
    <PortalShell>
      <SeoManager />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/community/:postId" component={PostDetailPage} />
        <Route path="/community" component={CommunityPage} />
        <Route path="/blog/:postId" component={PostDetailPage} />
        <Route path="/blog" component={BlogPage} />
        <Route path="/news/:postId" component={PostDetailPage} />
        <Route path="/news" component={NewsPage} />
        <Route path="/apresentacao" component={PresentationPage} />
        <Route path="/sobre" component={AboutPage} />
        <Route path="/contato" component={ContactPage} />
        <Route path="/privacidade" component={() => <LegalPage kind="privacy" />} />
        <Route path="/termos" component={() => <LegalPage kind="terms" />} />
        <Route path="/indicators" component={IndicatorsPage} />
        <Route path="/suggestions" component={SuggestionsPage} />
        <Route path="/notifications" component={NotificationsPage} />
        <Route path="/profile" component={() => <ProfilePage />} />
        <Route path="/help/:postId" component={PostDetailPage} />
        <Route path="/help" component={HelpPage} />
        <Route path="/sign-in/*?" component={() => <AuthRoute mode="sign-in" />} />
        <Route path="/sign-up/*?" component={() => <AuthRoute mode="sign-up" />} />
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    </PortalShell>
  );
}

function AppContent() {
  useI18n();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <AuthContextProvider>
            <RoutedContent />
          </AuthContextProvider>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}

export default App;
