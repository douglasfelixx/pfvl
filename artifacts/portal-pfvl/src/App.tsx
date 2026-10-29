import { type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  BarChart3,
  BookOpen,
  CircleHelp,
  Lightbulb,
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
  { href: '/community', label: 'Comunidade', icon: MessageCircle },
  { href: '/news', label: 'Novidades', icon: Newspaper },
  { href: '/blog', label: 'Blog', icon: BookOpen },
  { href: '/indicators', label: 'Indicadores', icon: BarChart3 },
  { href: '/suggestions', label: 'Sugestões', icon: Lightbulb },
  { href: '/help', label: 'Central de Ajuda', icon: CircleHelp },
];

const pageMetadata = [
  {
    match: /^\/$/,
    title: 'PFVL | Planejamento financeiro para a vida real',
    description:
      'Planeje hoje e realize amanhã. Acompanhe conteúdos, conversas e indicadores para cuidar melhor do seu dinheiro.',
  },
  {
    match: /^\/community(?:\/\d+)?$/,
    title: 'Comunidade PFVL | Conversas sobre finanças',
    description:
      'Leia dúvidas e experiências sobre planejamento financeiro, investimentos, Open Finance e metas.',
  },
  {
    match: /^\/blog(?:\/\d+)?$/,
    title: 'Blog PFVL | Educação financeira prática',
    description:
      'Artigos para organizar as finanças, entender investimentos e tomar decisões mais conscientes.',
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
    title: 'Central de ajuda | PFVL',
    description:
      'Encontre orientações para usar o portal PFVL e organizar sua vida financeira.',
  },
];

function SeoManager() {
  const [location] = useLocation();

  useEffect(() => {
    const route = location.split('?')[0] || '/';
    const metadata = pageMetadata.find((page) => page.match.test(route)) ?? {
      title: 'Página não encontrada | PFVL',
      description: 'A página solicitada não foi encontrada no portal PFVL.',
    };

    document.documentElement.lang = 'pt-BR';
    document.title = metadata.title;

    const setMetaContent = (selector: string, content: string) => {
      const element = document.head.querySelector<HTMLMetaElement>(selector);
      if (element) element.content = content;
    };

    setMetaContent('meta[name="description"]', metadata.description);
    setMetaContent('meta[property="og:title"]', metadata.title);
    setMetaContent('meta[property="og:description"]', metadata.description);
    setMetaContent('meta[name="twitter:title"]', metadata.title);
    setMetaContent('meta[name="twitter:description"]', metadata.description);

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
  }, [location]);

  return null;
}

function PortalShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="brand-lockup" href="/" onClick={() => setMobileOpen(false)}>
            <img
              className="brand-logo"
              src="/pfvl-logo-negativa.png"
              alt="PFVL — Planeje. Acompanhe. Realize."
              fetchPriority="high"
            />
          </Link>
          <button
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
            className="menu-button"
            onClick={() => setMobileOpen((open) => !open)}
            type="button"
          >
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <nav aria-label="Navegação principal" className={`primary-navigation ${mobileOpen ? 'primary-navigation-open' : ''}`}>
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
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <AuthHeaderActions />
        </div>
      </header>
      <main className="main-area">
        <div className="page-container">{children}</div>
        <footer className="portal-footer">
          <span>PFVL · educação financeira para a vida real</span>
          <div className="footer-links">
            <Link href="/suggestions">Roadmap</Link>
            <Link href="/help">Sobre este espaço</Link>
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
        <Route path="/indicators" component={IndicatorsPage} />
        <Route path="/suggestions" component={SuggestionsPage} />
        <Route path="/notifications" component={NotificationsPage} />
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

function App() {
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

export default App;
