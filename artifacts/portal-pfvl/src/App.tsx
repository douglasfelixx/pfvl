import { type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getGetPostQueryKey, useGetPost } from '@workspace/api-client-react';
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  CircleHelp,
  Lightbulb,
  Menu,
  MessageCircle,
  Newspaper,
  Search,
  X,
} from 'lucide-react';
import { Link, Route, Switch, useLocation } from 'wouter';
import { SiInstagram } from 'react-icons/si';
import {
  AuthContextProvider,
  AuthHeaderActions,
  AuthRoute,
} from '@/components/auth-ui';
import { CookieConsentManager, CookiePreferencesButton } from '@/components/cookie-consent';
import { CountryFlag } from '@/components/country-flag';
import { ErrorBoundary } from '@/components/error-boundary';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AdminPage } from '@/pages/admin-page';
import NotFound from '@/pages/not-found';
import {
  BlogPage,
  CommunityPage,
  HelpPage,
  HelpRequestPage,
  HomePage,
  IndicatorsPage,
  NewsPage,
  PostDetailPage,
  SuggestionsPage,
} from '@/pages/portal-pages';
import { NotificationsPage } from '@/pages/notifications-page';
import { MySupportRequestsPage } from '@/pages/my-support-requests-page';
import { ProfilePage } from '@/pages/profile-page';
import { SearchPage } from '@/pages/search-page';
import { I18nProvider, translateText, useI18n, type Locale } from '@/lib/i18n';
import { richContentToPlainText } from '@/components/rich-text-content';
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
  { href: '/community', label: 'Comunidade', icon: MessageCircle },
  { href: '/news', label: 'Novidades', icon: Newspaper },
  { href: '/help', label: 'Central de Ajuda', icon: CircleHelp },
  { href: '/suggestions', label: 'Sugestões', icon: Lightbulb },
];

const pageMetadata = [
  {
    match: /^\/$/,
    title: 'PFVL | Planejamento Financeiro de Vida Longa',
    description: 'Organize suas finanças, acompanhe o que foi planejado e transforme seus objetivos em planos com valores, prazos e aportes.',
  },
  {
    match: /^\/search$/,
    title: 'Busca geral | PFVL',
    description: 'Encontre conteúdos, conversas da comunidade, tutoriais e registros da sua conta no portal PFVL.',
  },
  {
    match: /^\/community(?:\/\d+)?$/,
    title: 'Comunidade | PFVL',
    description:
      'Leia dúvidas e experiências sobre planejamento financeiro, investimentos, Open Finance e metas.',
  },
  {
    match: /^\/blog(?:\/\d+)?$/,
    title: 'Conteúdos | PFVL',
    description:
      'Conteúdos da equipe PFVL sobre planejamento, organização, objetivos, indicadores e recursos do sistema.',
  },
  {
    match: /^\/news(?:\/\d+)?$/,
    title: 'Novidades | PFVL',
    description:
      'Acompanhe atualizações, novos recursos e notícias importantes do portal PFVL.',
  },
  {
    match: /^\/indicators$/,
    title: 'Indicadores | PFVL',
    description:
      'Consulte referências econômicas como CDI, Selic, IPCA e INPC com fonte e data de atualização.',
  },
  {
    match: /^\/suggestions$/,
    title: 'Sugestões | PFVL',
    description:
      'Envie sugestões privadas à equipe PFVL e acompanhe o andamento pela sua conta.',
  },
  {
    match: /^\/notifications$/,
    title: 'Notificações | PFVL',
    description: 'Acompanhe novidades, publicações, respostas e mudanças nas sugestões do PFVL.',
  },
  {
    match: /^\/help\/requests$/,
    title: 'Minhas solicitações | PFVL',
    description: 'Acompanhe os protocolos, status e atualizações da equipe sobre suas solicitações de suporte.',
  },
  {
    match: /^\/help(?:\/\d+)?$/,
    title: 'Central de Ajuda | PFVL',
    description: 'Encontre tutoriais e orientações práticas para usar o sistema PFVL.',
  },
  {
    match: /^\/apresentacao$/,
    title: 'Apresentação | PFVL',
    description: 'Conheça o PFVL e veja como o produto conecta contas, compromissos e objetivos.',
  },
  {
    match: /^\/sobre$/,
    title: 'Sobre | PFVL',
    description: 'Organização para o presente, planejamento para o futuro. Conheça o PFVL e a Orbefin Sistemas Financeiros, empresa responsável pelo produto.',
  },
  {
    match: /^\/contato$/,
    title: 'Contato | PFVL',
    description: 'Informações de contato oficiais da Orbefin Sistemas Financeiros.',
  },
  {
    match: /^\/privacidade$/,
    title: 'Política de Privacidade | PFVL',
    description: 'Informações sobre privacidade no PFVL.',
  },
  {
    match: /^\/termos$/,
    title: 'Termos de Uso | PFVL',
    description: 'Condições de uso do PFVL.',
  },
  {
    match: /^\/help\/request$/,
    title: 'Registrar solicitação | PFVL',
    description: 'Envie sua dúvida ou relate uma dificuldade e acompanhe o andamento e as respostas da equipe.',
  },
  {
    match: /^\/suggestions$/,
    title: 'Sugestões | PFVL',
    description: 'Compartilhe ideias para melhorar o PFVL e acompanhe, em um espaço privado, as respostas da equipe e o andamento das suas sugestões.',
  },
  {
    match: /^\/notifications$/,
    title: 'Notificações | PFVL',
    description: 'Acompanhe novidades, publicações, respostas e mudanças nas sugestões do PFVL.',
  },
  {
    match: /^\/profile$/,
    title: 'Meu perfil | PFVL',
    description: 'Acesse seus dados, publicações, preferências e avaliações.',
  },
  {
    match: /^\/admin(?:\/.*)?$/,
    title: 'Painel | PFVL',
    description: 'Área administrativa do portal PFVL.',
  },
  {
    match: /^\/sign-in(?:\/.*)?$/,
    title: 'Entrar | PFVL',
    description: 'Acesse sua conta para participar da comunidade e acompanhar suas solicitações e sugestões.',
  },
  {
    match: /^\/sign-up(?:\/.*)?$/,
    title: 'Criar conta | PFVL',
    description: 'Acesse sua conta para participar da comunidade e acompanhar suas solicitações e sugestões.',
  },
];

function SeoManager() {
  const [location] = useLocation();
  const { locale } = useI18n();
  const route = location.split('?')[0] || '/';
  const detailId = route.match(/^\/(?:community|blog|news|help)\/(\d+)$/)?.[1];
  const postId = detailId ? Number(detailId) : 0;
  const post = useGetPost(postId, {
    query: {
      enabled: Boolean(detailId && Number.isFinite(postId) && postId > 0),
      queryKey: getGetPostQueryKey(postId),
      retry: false,
    },
  });

  useEffect(() => {
    const metadata = pageMetadata.find((page) => page.match.test(route)) ?? {
      title: 'Página não encontrada | PFVL',
      description: 'A página solicitada não foi encontrada no portal PFVL.',
    };

    const title = post.data ? `${post.data.title} | PFVL` : metadata.title;
    const description = post.data
      ? (post.data.excerpt || richContentToPlainText(post.data.body)).replace(/\s+/g, ' ').slice(0, 157)
      : metadata.description;
    document.documentElement.lang = locale;
    document.title = translateText(title, locale);

    const setMetaContent = (selector: string, content: string) => {
      const element = document.head.querySelector<HTMLMetaElement>(selector);
      if (element) element.content = content;
    };

    const translatedTitle = translateText(title, locale);
    const translatedDescription = translateText(description, locale);
    setMetaContent('meta[name="description"]', translatedDescription);
    setMetaContent('meta[property="og:title"]', translatedTitle);
    setMetaContent('meta[property="og:description"]', translatedDescription);
    setMetaContent('meta[name="twitter:title"]', translatedTitle);
    setMetaContent('meta[name="twitter:description"]', translatedDescription);

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
  }, [location, locale, post.data, route]);

  return null;
}

function PortalShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileLanguageOpen, setMobileLanguageOpen] = useState(false);
  const { locale, setLocale } = useI18n();
  const mobileLanguagePickerRef = useRef<HTMLDivElement>(null);
  const mobileLanguageTriggerRef = useRef<HTMLButtonElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const languageOptions = [
    { locale: 'pt-BR', country: 'BR', label: 'Português (Brasil)' },
    { locale: 'en-US', country: 'US', label: 'English (United States)' },
  ] as const;
  const selectedLanguage = languageOptions.find((option) => option.locale === locale) ?? languageOptions[0];

  useEffect(() => {
    if (!mobileLanguageOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !mobileLanguagePickerRef.current?.contains(event.target)) {
        setMobileLanguageOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMobileLanguageOpen(false);
      mobileLanguageTriggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileLanguageOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMobileOpen(false);
      menuTriggerRef.current?.focus();
    };
    const closeWhenWide = () => {
      if (window.innerWidth > 1120) setMobileOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', closeWhenWide);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', closeWhenWide);
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  return (
    <CookieConsentManager>
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
          <div className="header-menu-controls">
            <Link
              aria-label={translateText('Buscar no PFVL')}
              className={`header-search-link ${location === '/search' ? 'header-search-link-active' : ''}`}
              data-testid="link-global-search"
              href="/search"
              title={translateText('Buscar no PFVL')}
            >
              <Search aria-hidden="true" size={18} />
              <span>{translateText('Buscar')}</span>
            </Link>
            <ul aria-label={translateText('Idioma')} className="language-switch">
              {languageOptions.map((option) => (
                <li className="language-switch-item" key={option.locale}>
                  <button
                    aria-label={option.label}
                    aria-pressed={locale === option.locale}
                    className={`language-option ${locale === option.locale ? 'language-option-active' : ''}`}
                    data-testid={`button-language-${option.locale}`}
                    onClick={() => setLocale(option.locale as Locale)}
                    title={option.label}
                    type="button"
                  >
                    <CountryFlag country={option.country} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mobile-language-picker" ref={mobileLanguagePickerRef}>
              <button
                aria-controls="mobile-language-options"
                aria-expanded={mobileLanguageOpen}
                aria-label={`${translateText('Idioma')}: ${selectedLanguage.label}`}
                className="mobile-language-trigger"
                data-testid="button-mobile-language-menu"
                onClick={() => setMobileLanguageOpen((open) => !open)}
                ref={mobileLanguageTriggerRef}
                type="button"
              >
                <CountryFlag country={selectedLanguage.country} />
                <ChevronDown aria-hidden="true" size={13} />
              </button>
              {mobileLanguageOpen && (
                <ul aria-label={translateText('Idioma')} className="mobile-language-options" id="mobile-language-options">
                  {languageOptions.map((option) => (
                    <li key={option.locale}>
                      <button
                        aria-pressed={locale === option.locale}
                        className="mobile-language-option"
                        data-testid={`button-mobile-language-${option.locale}`}
                        onClick={() => {
                          setLocale(option.locale as Locale);
                          setMobileLanguageOpen(false);
                        }}
                        type="button"
                      >
                        <CountryFlag country={option.country} />
                        <span>{option.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <AuthHeaderActions />
          </div>
          <button
            aria-controls="primary-navigation"
            aria-expanded={mobileOpen}
            aria-label={translateText(mobileOpen ? 'Fechar menu' : 'Abrir menu')}
            className="menu-button"
            onClick={() => setMobileOpen((open) => !open)}
            ref={menuTriggerRef}
            type="button"
          >
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <nav aria-label={translateText('Navegação principal')} className={`primary-navigation ${mobileOpen ? 'primary-navigation-open' : ''}`} id="primary-navigation">
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
        </div>
      </header>
      <main className="main-area">
        <div className="page-container">{children}</div>
        <footer className="portal-footer">
          <span>{translateText('PFVL é um produto da Orbefin Sistemas Financeiros.')}</span>
          <div className="footer-links">
            <Link href="/sobre">{translateText('Sobre')}</Link>
            <Link href="/contato">{translateText('Contato')}</Link>
            <Link href="/privacidade">{translateText('Privacidade')}</Link>
            <Link href="/termos">{translateText('Termos')}</Link>
            <a
              aria-label={translateText('Instagram oficial do PFVL')}
              className="footer-instagram-link"
              href="https://www.instagram.com/pfvl.oficial/"
              rel="noopener noreferrer"
              target="_blank"
              title={translateText('Instagram oficial do PFVL')}
            >
              <SiInstagram aria-hidden="true" size={18} />
            </a>
              <CookiePreferencesButton />
          </div>
        </footer>
      </main>
    </div>
    </CookieConsentManager>
  );
}

function RoutedContent() {
  return (
    <PortalShell>
      <SeoManager />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/search" component={SearchPage} />
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
        <Route path="/help/requests" component={MySupportRequestsPage} />
        <Route path="/help/request" component={HelpRequestPage} />
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
