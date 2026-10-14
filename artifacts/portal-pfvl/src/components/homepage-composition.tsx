import { type ReactNode } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  ChevronRight,
  CreditCard,
  Dumbbell,
  FileText,
  Flag,
  House,
  Landmark,
  LockKeyhole,
  PiggyBank,
  Plane,
  ShieldCheck,
  Target,
  Wallet,
  Wifi,
} from 'lucide-react';
import { Link } from 'wouter';
import type { Post } from '@workspace/api-client-react';
import { EmptyState, formatDate, LoadingState, QueryError } from '@/components/portal-ui';

const dashboardSections = [
  { label: 'Visão geral', icon: BarChart3, active: true },
  { label: 'Contas', icon: Wallet, active: false },
  { label: 'Planejamento', icon: FileText, active: false },
  { label: 'Investimentos', icon: Landmark, active: false },
  { label: 'Metas', icon: Target, active: false },
  { label: 'Relatórios', icon: ChartNoAxesColumnIncreasing, active: false },
  { label: 'Configurações', icon: LockKeyhole, active: false },
];

const features = [
  { title: 'Open Finance', description: 'Conecte suas contas com segurança.', icon: Landmark, tone: 'blue' },
  { title: 'Planejamento', description: 'Planeje e projete o seu futuro.', icon: FileText, tone: 'violet' },
  { title: 'Metas', description: 'Defina metas e acompanhe.', icon: Flag, tone: 'cyan' },
  { title: 'Relatórios', description: 'Relatórios completos e gráficos avançados.', icon: BarChart3, tone: 'sky' },
  { title: '100% Seguro', description: 'Seus dados sempre protegidos.', icon: ShieldCheck, tone: 'green' },
  { title: 'Integrações', description: 'Conecte com as principais instituições.', icon: BriefcaseBusiness, tone: 'teal' },
];

const testimonials = [
  {
    name: 'Mariana S.',
    initials: 'MS',
    tone: 'blue',
    quote: 'O PFVL mudou minha vida financeira. Consigo organizar minhas contas e investir com muito mais tranquilidade.',
  },
  {
    name: 'Roberto T.',
    initials: 'RT',
    tone: 'gold',
    quote: 'A integração com Open Finance é sensacional. Tudo automático!',
  },
  {
    name: 'Juliana M.',
    initials: 'JM',
    tone: 'rose',
    quote: 'Os relatórios e gráficos me ajudam a tomar decisões muito melhores.',
  },
];

export function HomeDashboardPreview() {
  return (
    <div className="dashboard-preview" id="demo-pfvl" aria-label="Prévia ilustrativa do painel PFVL">
      <aside className="dashboard-preview-sidebar">
        <div className="preview-brand">
          <span className="preview-brand-mark"><BarChart3 size={14} /></span>
          <strong>PFVL</strong>
        </div>
        <nav aria-label="Navegação ilustrativa do painel">
          {dashboardSections.map((section) => {
            const Icon = section.icon;
            return (
              <div className={`preview-nav-item ${section.active ? 'preview-nav-active' : ''}`} key={section.label}>
                <Icon size={11} />
                <span>{section.label}</span>
              </div>
            );
          })}
        </nav>
      </aside>
      <div className="dashboard-preview-content">
        <div className="preview-topline">
          <div>
            <p className="preview-greeting">Olá, João!</p>
            <p className="preview-subtitle">Aqui está o resumo da sua vida financeira.</p>
          </div>
          <span className="preview-month"><CalendarDays size={10} /> Este mês</span>
        </div>
        <p className="preview-demo-notice">Prévia ilustrativa · sem conexão bancária</p>
        <div className="preview-chart-grid">
          <PreviewChart title="Patrimônio líquido" value="R$ 248.420,00" variation="12,5%" kind="assets" />
          <PreviewChart title="Receitas no mês" value="R$ 8.450,00" variation="8,1%" kind="income" />
          <PreviewChart title="Despesas no mês" value="R$ 5.230,00" variation="3,4%" kind="expenses" />
        </div>
        <div className="preview-lower-grid">
          <section className="preview-widget goals-widget">
            <div className="preview-widget-title">
              <strong>Metas em andamento</strong>
              <span>Ver todas</span>
            </div>
            <ProgressGoal icon={<Plane size={12} />} title="Viagem para Europa" value="R$ 12.650,00 / R$ 25.000,00" progress={51} />
            <ProgressGoal icon={<PiggyBank size={12} />} title="Reserva de emergência" value="R$ 8.900,00 / R$ 15.000,00" progress={59} />
            <ProgressGoal icon={<BriefcaseBusiness size={12} />} title="Entrada do apartamento" value="R$ 42.300,00 / R$ 100.000,00" progress={42} />
          </section>
          <section className="preview-widget bills-widget">
            <div className="preview-widget-title">
              <strong>Próximas despesas</strong>
              <span>Ver todas</span>
            </div>
            <BillRow icon={<CreditCard size={10} />} title="Cartão de crédito" value="R$ 1.250,00" date="12/05" />
            <BillRow icon={<House size={10} />} title="Aluguel" value="R$ 2.300,00" date="15/05" />
            <BillRow icon={<Wifi size={10} />} title="Internet" value="R$ 119,90" date="20/05" />
            <BillRow icon={<Dumbbell size={10} />} title="Academia" value="R$ 89,90" date="26/05" />
          </section>
        </div>
      </div>
    </div>
  );
}

function PreviewChart({ title, value, variation, kind }: { title: string; value: string; variation: string; kind: 'assets' | 'income' | 'expenses' }) {
  return (
    <section className="preview-chart-card">
      <p className="preview-chart-title">{title}</p>
      <strong className="preview-chart-value">{value}</strong>
      <span className={`preview-variation ${kind === 'expenses' ? 'variation-down' : ''}`}>{variation}</span>
      {kind === 'assets' && <AssetChart />}
      {kind === 'income' && <IncomeBars />}
      {kind === 'expenses' && <ExpenseDonut />}
    </section>
  );
}

function AssetChart() {
  return (
    <svg className="preview-asset-chart" viewBox="0 0 180 61" preserveAspectRatio="none" aria-label="Gráfico ilustrativo de patrimônio">
      <path d="M4 51 C22 47, 26 31, 43 37 S64 41, 78 25 S99 38, 114 25 S142 24, 158 10 S172 15, 177 3" fill="none" stroke="#233a59" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M4 51 C22 47, 26 31, 43 37 S64 41, 78 25 S99 38, 114 25 S142 24, 158 10 S172 15, 177 3 L177 61 L4 61 Z" fill="url(#asset-fill)" opacity=".18" />
      <defs>
        <linearGradient id="asset-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#233a59" />
          <stop offset="100%" stopColor="#233a59" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IncomeBars() {
  const heights = [26, 38, 33, 48, 42, 58, 52, 46, 61, 55, 64];
  return (
    <div className="preview-income-bars" aria-label="Gráfico ilustrativo de receitas">
      {heights.map((height, index) => <span key={`${height}-${index}`} style={{ height: `${height}%` }} />)}
    </div>
  );
}

function ExpenseDonut() {
  return (
    <div className="preview-expense-chart" aria-label="Gráfico ilustrativo de despesas">
      <div className="expense-donut" />
      <ul>
        <li><i className="legend-blue" /> Moradia <span>32%</span></li>
        <li><i className="legend-green" /> Transporte <span>18%</span></li>
        <li><i className="legend-orange" /> Alimentação <span>15%</span></li>
        <li><i className="legend-violet" /> Outros <span>35%</span></li>
      </ul>
    </div>
  );
}

function ProgressGoal({ icon, title, value, progress }: { icon: ReactNode; title: string; value: string; progress: number }) {
  return (
    <div className="preview-goal-row">
      <span className="preview-goal-icon">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <strong>{title}</strong>
          <span>{progress}%</span>
        </div>
        <div className="preview-progress-track"><span style={{ width: `${progress}%` }} /></div>
        <p>{value}</p>
      </div>
    </div>
  );
}

function BillRow({ icon, title, value, date }: { icon: ReactNode; title: string; value: string; date: string }) {
  return (
    <div className="preview-bill-row">
      <span className="preview-bill-icon">{icon}</span>
      <strong>{title}</strong>
      <b>{value}</b>
      <small>{date}</small>
    </div>
  );
}

export function HomeFeatureColumn() {
  return (
    <section className="home-content-column home-features-column">
      <div className="home-column-heading">
        <h2>Tudo o que você precisa</h2>
      </div>
      <div className="feature-grid">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <article className="feature-item" key={feature.title}>
              <span className={`feature-icon feature-${feature.tone}`}><Icon size={15} /></span>
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function HomeTestimonialColumn() {
  return (
    <section className="home-content-column home-testimonials-column">
      <div className="home-column-heading">
        <h2>O que nossos usuários dizem</h2>
        <Link aria-label="Ver todos os depoimentos" href="/community">Ver depoimentos <ArrowRight size={11} /></Link>
      </div>
      <div className="testimonials-list">
        {testimonials.map((testimonial) => (
          <article className="testimonial-card" key={testimonial.name}>
            <div className={`testimonial-avatar avatar-${testimonial.tone}`} aria-hidden="true">{testimonial.initials}</div>
            <div className="min-w-0">
              <div className="testimonial-author">
                <strong>{testimonial.name}</strong>
                <span aria-label="5 de 5 estrelas">★★★★★</span>
              </div>
              <p>“{testimonial.quote}”</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HomeNewsColumn({ posts, isLoading, isError, retry }: { posts: Post[]; isLoading: boolean; isError: boolean; retry: () => void }) {
  return (
    <section className="home-content-column home-news-column">
      <div className="home-column-heading">
        <h2>Novidades recentes</h2>
        <Link href="/news">Ver todas <ArrowRight size={11} /></Link>
      </div>
      {isLoading ? (
        <LoadingState rows={2} />
      ) : isError ? (
        <QueryError retry={retry} />
      ) : posts.length ? (
        <div className="home-news-list">
          {posts.slice(0, 4).map((post, index) => (
            <Link className="home-news-item" href={`/${post.kind}/${post.id}`} key={post.id}>
              <span className={`news-icon news-icon-${index}`}>
                {index === 0 ? <BookOpen size={16} /> : index === 1 ? <ChartNoAxesColumnIncreasing size={16} /> : <ShieldCheck size={16} />}
              </span>
              <span className="home-news-copy">
                <strong>{post.title}</strong>
                <small>{post.excerpt || post.category} · {formatDate(post.createdAt)}</small>
              </span>
              <ChevronRight className="home-news-arrow" size={14} />
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="Novidades em breve" description="As atualizações publicadas pelo PFVL aparecerão aqui." />
      )}
    </section>
  );
}

export function HomeBottomCta() {
  return (
    <section className="home-bottom-cta">
      <div className="cta-illustration" aria-hidden="true">
        <div className="cta-mini-window">
          <span />
          <span />
          <span />
          <div className="cta-mini-bars"><i /><i /><i /><i /></div>
          <div className="cta-mini-pie" />
        </div>
        <span className="cta-orbit cta-orbit-a" />
        <span className="cta-orbit cta-orbit-b" />
      </div>
      <div className="cta-copy">
        <h2>Comece agora a transformar<br className="hidden sm:block" /> sua vida financeira.</h2>
        <p>Explore ideias, conteúdos e caminhos possíveis para cuidar melhor do seu dinheiro.</p>
      </div>
      <div className="cta-actions">
        <Link className="cta-primary-link" href="/community">Explorar a comunidade <ArrowRight size={14} /></Link>
        <Link className="cta-secondary-link" href="/blog"><BookOpen size={13} /> Conhecer o blog</Link>
      </div>
    </section>
  );
}
