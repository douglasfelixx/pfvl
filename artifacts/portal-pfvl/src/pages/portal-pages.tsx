import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleDollarSign,
  MessageCircle,
  Play,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import {
  getGetDashboardQueryKey,
  getGetPostQueryKey,
  getListCommentsQueryKey,
  getListIndicatorsQueryKey,
  getListPostsQueryKey,
  getListSuggestionsQueryKey,
  useGetDashboard,
  useGetPost,
  useListComments,
  useListIndicators,
  useListPosts,
  useListSuggestions,
  type Indicator,
  type PostKind,
  type SuggestionStatus,
} from '@workspace/api-client-react';
import { Link, useParams } from 'wouter';
import {
  CommentComposer,
  CommunityCreatePanel,
  ReplyControl,
} from '@/components/community-actions';
import { CommunityPoll } from '@/components/community-poll';
import {
  HomeBottomCta,
  HomeDashboardPreview,
  HomeFeatureColumn,
  HomeNewsColumn,
  HomeTestimonialColumn,
} from '@/components/homepage-composition';
import {
  EmptyState,
  formatDate,
  getPostCoverImage,
  LoadingState,
  PageHeading,
  PostCard,
  QueryError,
  ReadOnlyBanner,
  SectionHeading,
  Surface,
} from '@/components/portal-ui';

const suggestionStatus: SuggestionStatus[] = ['under_review', 'planned', 'in_progress', 'completed'];
const suggestionStatusNames: Record<SuggestionStatus, string> = {
  under_review: 'Em análise',
  planned: 'Planejado',
  in_progress: 'Em andamento',
  completed: 'Concluído',
};
const suggestionStatusNotes: Record<SuggestionStatus, string> = {
  under_review: 'Ideias recebidas e em avaliação pela equipe.',
  planned: 'Próximas melhorias que entraram no planejamento.',
  in_progress: 'Trabalho em andamento para chegar até você.',
  completed: 'Melhorias que já fazem parte do portal.',
};

function MiniSparkline({ values }: { values: number[] }) {
  const series = values.length ? values : [1, 2, 1.7, 2.4, 2.1, 3.1, 3];
  const min = Math.min(...series);
  const max = Math.max(...series);
  const points = series.map((value, index) => {
    const x = (index / Math.max(series.length - 1, 1)) * 100;
    const y = 31 - ((value - min) / Math.max(max - min, 0.0001)) * 25;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg className="h-9 w-[86px]" viewBox="0 0 100 36" aria-hidden="true">
      <polyline points={points} fill="none" stroke="#233a59" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IndicatorCard({ indicator }: { indicator: Indicator }) {
  const up = indicator.change >= 0;
  return (
    <article className="indicator-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground">{indicator.code}</p>
          <h3 className="mt-1 font-display text-base font-semibold">{indicator.name}</h3>
        </div>
        <MiniSparkline values={indicator.history} />
      </div>
      <div className="mt-5 flex items-end justify-between gap-2">
        <p className="font-display text-[27px] font-semibold tracking-[-.04em]">
          {indicator.value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
          <span className="ml-1.5 text-xs font-medium text-muted-foreground">{indicator.unit}</span>
        </p>
        <span className="mb-1 inline-flex items-center gap-0.5 rounded-lg bg-[#e8e8e8] px-2 py-1 text-[10px] font-bold text-[#233a59]">
          {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(indicator.change).toLocaleString('pt-BR')}%
        </span>
      </div>
      {indicator.illustrative && <p className="mt-3 rounded-lg bg-[#e8e8e8] px-2.5 py-2 text-[10px] font-bold text-[#233a59]">Dado ilustrativo · não é cotação ao vivo</p>}
      <p className="mt-3 text-[10px] text-muted-foreground">Atualizado em {formatDate(indicator.updatedAt)}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">Fonte: {indicator.source}</p>
    </article>
  );
}

export function HomePage() {
  const dashboard = useGetDashboard({ query: { queryKey: getGetDashboardQueryKey() } });
  const news = useListPosts({ kind: 'news' }, { query: { queryKey: getListPostsQueryKey({ kind: 'news' }) } });
  return (
    <div className="page-enter home-page">
      <section className="home-hero-band">
        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <p className="home-welcome"><span /> Seja bem-vindo ao PFVL</p>
            <h1>Planeje hoje.<br /><span>Realize</span> amanhã.</h1>
            <p className="home-hero-description">O PFVL é o sistema de gestão financeira pessoal completo para você planejar, acompanhar e alcançar seus objetivos.</p>
            <div className="home-hero-actions">
              <Link className="home-cta-primary" href="/community">Começar agora <ArrowRight size={15} /></Link>
              <a className="home-cta-outline" href="#demo-pfvl">Ver demonstração <Play className="demo-play-icon" size={12} fill="currentColor" /></a>
            </div>
            <p className="home-content-count">
              {dashboard.isLoading ? 'Carregando conteúdo público…' : dashboard.isError ? 'Educação financeira para a vida real' : `${dashboard.data?.publishedPosts ?? 0} conteúdos publicados para você explorar`}
            </p>
          </div>
          <HomeDashboardPreview />
        </div>
      </section>

      <section className="home-content-grid" aria-label="Recursos, depoimentos e novidades">
        <HomeFeatureColumn />
        <HomeTestimonialColumn />
        <HomeNewsColumn
          posts={news.data ?? []}
          isLoading={news.isLoading}
          isError={news.isError}
          retry={() => void news.refetch()}
        />
      </section>

      <HomeBottomCta />
    </div>
  );
}

export function CommunityPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<'recent' | 'discussed'>('recent');
  const params = useMemo(() => ({ kind: 'forum' as PostKind, search: search.trim() || undefined }), [search]);
  const query = useListPosts(params, { query: { queryKey: getListPostsQueryKey(params) } });
  const categories = [...new Set((query.data ?? []).map((post) => post.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const posts = [...(query.data ?? [])]
    .filter((post) => category === 'all' || post.category === category)
    .sort((a, b) => sort === 'discussed'
      ? b.commentCount - a.commentCount || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return (
    <div className="page-enter community-page">
      <header className="community-heading">
        <div>
          <p className="community-kicker">Comunidade PFVL <span>·</span> Fórum</p>
          <h1>Conversa de dinheiro,<br /><em>sem complicação.</em></h1>
          <p className="community-heading-copy">Pergunte, conte o que funcionou e aprenda com quem está vivendo escolhas financeiras parecidas.</p>
        </div>
        <div className="community-heading-aside" aria-hidden="true">
          <MessageCircle size={27} strokeWidth={1.4} />
          <span>Uma dúvida real<br />pode ajudar muita gente.</span>
        </div>
      </header>

      <div className="community-layout">
        <main className="community-feed">
          <div className="community-toolbar">
            <div className="community-toolbar-title">
              <div><span className="community-live-dot" /> Espaço de conversa</div>
              <span>Experiências da comunidade, não artigos editoriais.</span>
            </div>
            <CommunityCreatePanel />
          </div>
          <div className="community-controls">
            <label className="search-field community-search">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Buscar tópicos</span>
              <input data-testid="input-community-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar conversas, temas ou palavras" type="search" />
              {search && <button aria-label="Limpar busca" className="text-xs font-bold text-primary" onClick={() => setSearch('')} type="button">Limpar</button>}
            </label>
            <label className="community-select-label">
              <SlidersHorizontal size={15} aria-hidden="true" />
              <span className="sr-only">Ordenar conversas</span>
              <select aria-label="Ordenar conversas" data-testid="select-community-sort" onChange={(event) => setSort(event.target.value as 'recent' | 'discussed')} value={sort}>
                <option value="recent">Mais recentes</option>
                <option value="discussed">Mais respondidas</option>
              </select>
            </label>
          </div>
          <div className="community-category-row" aria-label="Filtrar por categoria">
            <button aria-pressed={category === 'all'} className={category === 'all' ? 'community-filter active' : 'community-filter'} onClick={() => setCategory('all')} type="button">Todos os tópicos</button>
            {categories.map((item) => <button aria-pressed={category === item} className={category === item ? 'community-filter active' : 'community-filter'} key={item} onClick={() => setCategory(item)} type="button">{item}</button>)}
          </div>
          <div className="community-list-heading">
            <h2>Conversas abertas</h2>
            <span>{posts.length} {posts.length === 1 ? 'tópico' : 'tópicos'}</span>
          </div>
          {query.isLoading ? <LoadingState rows={4} /> : query.isError ? <QueryError retry={() => void query.refetch()} /> : posts.length ? (
            <div className="community-topic-list" data-testid="list-community-topics">
              {posts.map((post) => (
                <article className="community-topic-row" key={post.id} data-testid={`topic-${post.id}`}>
                  {getPostCoverImage(post) && (
                    <img
                      alt=""
                      className="topic-cover"
                      data-testid={`img-topic-cover-${post.id}`}
                      height="56"
                      loading="lazy"
                      src={getPostCoverImage(post) ?? undefined}
                      width="68"
                    />
                  )}
                  <div className="topic-main">
                    <div className="topic-meta"><span className="topic-category">{post.category}</span><span>{formatDate(post.createdAt)}</span></div>
                    <Link className="topic-title" href={`/community/${post.id}`}>{post.title}</Link>
                    <p className="topic-excerpt">{post.excerpt || post.body}</p>
                    <div className="topic-footer"><span>Iniciado por <strong>{post.authorName}</strong></span><span className="topic-tags">{post.tags?.slice(0, 2).map((tag) => <span className="tag-pill" key={tag}>{tag}</span>)}</span></div>
                  </div>
                  <Link aria-label={`${post.commentCount} respostas em ${post.title}`} className="topic-replies" href={`/community/${post.id}`}>
                    <MessageCircle size={17} />
                    <strong>{post.commentCount}</strong>
                    <span>{post.commentCount === 1 ? 'resposta' : 'respostas'}</span>
                  </Link>
                </article>
              ))}
            </div>
          ) : <EmptyState title={search || category !== 'all' ? 'Nenhuma conversa encontrada' : 'O fórum está começando'} description={search || category !== 'all' ? 'Ajuste a busca ou escolha outra categoria.' : 'Abra um tópico para compartilhar sua dúvida ou experiência com a comunidade.'} />}
        </main>
        <aside className="community-rail">
          <CommunityPoll />
          <div className="community-guideline">
            <span className="guideline-index">01</span>
            <div><strong>Prática antes de perfeita.</strong><p>Contexto real e respeito ajudam mais do que respostas prontas.</p></div>
          </div>
          <p className="community-editorial-note">Este espaço é feito de perguntas e respostas. Para guias e análises da equipe, visite o <Link href="/blog">Blog PFVL</Link>.</p>
        </aside>
      </div>
    </div>
  );
}

export function PostDetailPage() {
  const params = useParams<{ postId?: string }>();
  const postId = Number(params.postId);
  const validId = Number.isFinite(postId) && postId > 0;
  const post = useGetPost(postId, { query: { enabled: validId, queryKey: getGetPostQueryKey(postId) } });
  const comments = useListComments(postId, { query: { enabled: validId, queryKey: getListCommentsQueryKey(postId) } });
  useEffect(() => {
    const targetId = window.location.hash.slice(1);
    if (!comments.data || (targetId !== "comments" && !/^comment-\d+$/.test(targetId))) return;
    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }, [comments.data]);
  useEffect(() => {
    if (!post.data) return;
    const title = `${post.data.title} | PFVL`;
    const description = (post.data.excerpt || post.data.body).replace(/\s+/g, ' ').slice(0, 157);
    document.title = title;
    const setMetaContent = (selector: string, content: string) => {
      const element = document.head.querySelector<HTMLMetaElement>(selector);
      if (element) element.content = content;
    };
    setMetaContent('meta[name="description"]', description);
    setMetaContent('meta[property="og:title"]', title);
    setMetaContent('meta[property="og:description"]', description);
    setMetaContent('meta[name="twitter:title"]', title);
    setMetaContent('meta[name="twitter:description"]', description);
    const siteUrl = import.meta.env.VITE_SITE_URL?.replace(/\/$/, '');
    if (siteUrl) {
      const canonicalUrl = `${siteUrl}${window.location.pathname}`;
      setMetaContent('meta[property="og:url"]', canonicalUrl);
      const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (canonical) canonical.href = canonicalUrl;
    }
  }, [post.data]);
  const roots = (comments.data ?? []).filter((comment) => !comment.parentCommentId);
  const children = (comments.data ?? []).filter((comment) => comment.parentCommentId);
  const isForum = post.data?.kind === 'forum';
  const backHref = post.data?.kind === 'forum' ? '/community' : `/${post.data?.kind ?? 'community'}`;
  const coverImageUrl = post.data ? getPostCoverImage(post.data) : null;
  return (
    <div className="page-enter mx-auto max-w-[900px]">
      <Link href={backHref} className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-primary">← Voltar</Link>
      {post.isLoading ? <LoadingState rows={1} /> : post.isError || !post.data ? (
        <QueryError retry={() => void post.refetch()} />
      ) : (
        <>
          <article className={isForum ? "detail-panel forum-detail-panel" : "detail-panel"}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow-pill">{isForum ? 'Tópico da comunidade' : post.data.category}</span>
              {isForum && <span className="text-xs font-semibold text-[#233a59]">{post.data.category}</span>}
              <span className="text-xs text-muted-foreground">{formatDate(post.data.createdAt)}</span>
            </div>
            <h1 className="mt-4 font-display text-[34px] font-semibold leading-[1.12] tracking-[-.04em] sm:text-[46px]">{post.data.title}</h1>
            {isForum && <div className="forum-author-line"><span className="topic-avatar" aria-hidden="true">{post.data.authorName.trim().slice(0, 1).toLocaleUpperCase('pt-BR')}</span><span>Publicado por <strong>{post.data.authorName}</strong></span><span>·</span><span>{post.data.commentCount} respostas</span></div>}
            {post.data.excerpt && !isForum && <p className="mt-4 border-l-2 border-primary/45 pl-4 text-base leading-7 text-muted-foreground">{post.data.excerpt}</p>}
            {coverImageUrl && <img className="mt-6 max-h-[440px] w-full rounded-2xl object-cover" src={coverImageUrl} alt={post.data.title} width="1200" height="675" />}
            {post.data.videoUrl && <a className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary underline" href={post.data.videoUrl} target="_blank" rel="noopener noreferrer">Assistir vídeo relacionado <ArrowRight size={15} /></a>}
            {isForum && <div className="forum-post-label"><MessageCircle size={15} /> Publicação original</div>}
            <div className={`prose-content whitespace-pre-wrap text-sm leading-8 text-[#1d1d1b] ${isForum ? 'mt-3 forum-post-body' : 'mt-7'}`}>{post.data.body}</div>
            <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-border pt-5">
              {!isForum && <span className="text-xs text-muted-foreground">Publicado por <strong className="text-foreground">{post.data.authorName}</strong></span>}
              {post.data.tags?.map((tag) => <span className="tag-pill" key={tag}>{tag}</span>)}
            </div>
          </article>
          <section className="mt-8 scroll-mt-6" id="comments">
            <SectionHeading title={isForum ? `Respostas (${comments.data?.length ?? post.data.commentCount})` : `Comentários (${comments.data?.length ?? post.data.commentCount})`} />
            {isForum && <p className="mb-4 text-sm leading-6 text-muted-foreground">Compartilhe uma resposta útil, uma pergunta complementar ou o que funcionou na sua realidade.</p>}
            <CommentComposer postId={postId} />
            {comments.isLoading ? <div className="mt-4"><LoadingState rows={2} /></div> : comments.isError ? <div className="mt-4"><QueryError retry={() => void comments.refetch()} /></div> : roots.length ? (
              <div className="mt-4 space-y-3">
                {roots.map((comment) => (
                  <div className="scroll-mt-6" id={`comment-${comment.id}`} key={comment.id}>
                    <Surface className="p-5">
                      <div className="flex items-center justify-between gap-3">
                        <strong className="text-sm">{comment.authorName}</strong>
                        <span className="text-[11px] text-muted-foreground">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{comment.body}</p>
                      {children.filter((reply) => reply.parentCommentId === comment.id).map((reply) => (
                        <div className="ml-3 mt-4 border-l-2 border-[#233a59] pl-4 sm:ml-7" key={reply.id}>
                          <div className="flex items-center justify-between gap-3">
                            <strong className="text-xs">{reply.authorName}</strong>
                            <span className="text-[10px] text-muted-foreground">{formatDate(reply.createdAt)}</span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{reply.body}</p>
                        </div>
                      ))}
                      <ReplyControl postId={postId} commentId={comment.id} />
                    </Surface>
                  </div>
                ))}
              </div>
            ) : <div className="mt-4"><EmptyState title="Sem comentários por enquanto" description="Quando houver respostas publicadas, elas poderão ser consultadas nesta seção." /></div>}
          </section>
        </>
      )}
    </div>
  );
}

function PostsListingPage({ kind, eyebrow, title, description }: { kind: PostKind; eyebrow: string; title: string; description: string }) {
  const [search, setSearch] = useState('');
  const params = useMemo(() => ({ kind, search: search.trim() || undefined }), [kind, search]);
  const query = useListPosts(params, { query: { queryKey: getListPostsQueryKey(params) } });
  return (
    <div className="page-enter">
      <PageHeading eyebrow={eyebrow} title={title} description={description} />
      <label className="search-field mb-5">
        <Search size={17} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar neste espaço" type="search" />
      </label>
      {query.isLoading ? <LoadingState rows={4} /> : query.isError ? <QueryError retry={() => void query.refetch()} /> : query.data?.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{query.data.map((post) => <PostCard key={post.id} post={post} />)}</div>
      ) : <EmptyState title={search ? 'Nada encontrado com esse termo' : 'Estamos preparando novos conteúdos'} description={search ? 'Tente outra palavra ou remova a busca.' : 'As publicações serão exibidas aqui assim que estiverem disponíveis.'} />}
    </div>
  );
}

export function BlogPage() {
  return <PostsListingPage kind="blog" eyebrow="Aprender para escolher" title="Ideias que cabem na vida real." description="Conteúdos para entender melhor o dinheiro e transformar informação em decisões possíveis." />;
}

export function NewsPage() {
  return <PostsListingPage kind="news" eyebrow="O que há de novo" title="Novidades do PFVL." description="Acompanhe atualizações, novos recursos e notícias importantes do portal." />;
}

export function HelpPage() {
  const query = useListPosts({ kind: 'help' }, { query: { queryKey: getListPostsQueryKey({ kind: 'help' }) } });
  return (
    <div className="page-enter">
      <PageHeading eyebrow="Central de ajuda" title="Comece pelo que importa." description="Orientações diretas para navegar pelo portal e construir uma relação mais tranquila com o dinheiro." />
      <Surface className="mb-8 grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
        <div>
          <p className="eyebrow-pill">Um primeiro passo</p>
          <h2 className="mt-3 font-display text-2xl font-semibold">Organizar não precisa ser complicado.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">Comece registrando o que entra e o que sai. Depois, escolha uma prioridade pequena e possível para esta semana. Consistência vale mais do que perfeição.</p>
        </div>
        <Link className="inline-flex items-center gap-2 text-sm font-bold text-primary" href="/blog">Ver conteúdos <ArrowRight size={15} /></Link>
      </Surface>
      <ReadOnlyBanner />
      <section className="mt-8">
        <SectionHeading title="Guias e respostas" />
        {query.isLoading ? <LoadingState rows={3} /> : query.isError ? <QueryError retry={() => void query.refetch()} /> : query.data?.length ? (
          <div className="grid gap-3 md:grid-cols-2">{query.data.map((post) => <PostCard key={post.id} post={post} />)}</div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <HelpTip number="01" title="Comece pelo orçamento" text="Entenda sua renda e despesas antes de definir metas." />
            <HelpTip number="02" title="Crie uma reserva possível" text="Pequenos valores frequentes também constroem segurança." />
            <HelpTip number="03" title="Busque informação" text="Compare alternativas com calma e considere seu momento." />
          </div>
        )}
      </section>
    </div>
  );
}

function HelpTip({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <Surface className="p-5">
      <span className="font-display text-3xl font-semibold text-primary/65">{number}</span>
      <h3 className="mt-3 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </Surface>
  );
}

export function IndicatorsPage() {
  const query = useListIndicators({ query: { queryKey: getListIndicatorsQueryKey() } });
  return (
    <div className="page-enter">
      <PageHeading eyebrow="Panorama econômico" title="Indicadores sem mistério." description="Acompanhe referências econômicas importantes e entenda a variação apresentada em cada série." />
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#233a59] bg-[#e8e8e8] p-4 text-xs leading-5 text-[#1d1d1b]">
        <CircleDollarSign className="mt-0.5 shrink-0" size={17} />
        <p>Indicadores têm contextos e periodicidades diferentes. Os dados marcados como ilustrativos servem apenas para demonstração e não representam cotações ao vivo.</p>
      </div>
      {query.isLoading ? <LoadingState rows={3} /> : query.isError ? <QueryError retry={() => void query.refetch()} /> : query.data?.length ? (
        <>
          {query.data.some((indicator) => indicator.illustrative) && <p className="mb-3 text-[11px] font-bold uppercase tracking-[.13em] text-[#233a59]">Dados ilustrativos identificados</p>}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{query.data.map((indicator) => <IndicatorCard key={indicator.code} indicator={indicator} />)}</div>
          <p className="mt-5 text-xs text-muted-foreground">Fontes informadas pela API para cada indicador. Última atualização individual exibida no respectivo cartão.</p>
        </>
      ) : <EmptyState title="Nenhum indicador disponível" description="Quando houver dados publicados, eles aparecerão nesta página." />}
    </div>
  );
}

export function SuggestionsPage() {
  const query = useListSuggestions({ query: { queryKey: getListSuggestionsQueryKey() } });
  return (
    <div className="page-enter">
      <PageHeading eyebrow="Construído em conjunto" title="Ideias no horizonte." description="Veja o que está sendo avaliado, planejado e desenvolvido para o portal." />
      <ReadOnlyBanner compact />
      {query.isLoading ? <div className="mt-6"><LoadingState rows={3} /></div> : query.isError ? <div className="mt-6"><QueryError retry={() => void query.refetch()} /></div> : query.data?.length ? (
        <div className="mt-7 grid gap-4 xl:grid-cols-2">
          {suggestionStatus.map((status) => {
            const suggestions = query.data?.filter((suggestion) => suggestion.status === status) ?? [];
            return (
              <section className="status-column" key={status}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <span className={`status-dot status-${status}`} />
                    <h2 className="font-display text-lg font-semibold">{suggestionStatusNames[status]}</h2>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{suggestionStatusNotes[status]}</p>
                  </div>
                  <span className="count-pill">{suggestions.length}</span>
                </div>
                <div className="space-y-3">
                  {suggestions.length ? suggestions.map((suggestion) => (
                    <article className="suggestion-card" key={suggestion.id}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="eyebrow-pill">{suggestion.category}</span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(suggestion.createdAt)}</span>
                      </div>
                      <h3 className="mt-3 font-display text-lg font-semibold leading-snug">{suggestion.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{suggestion.details}</p>
                      <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-[11px] text-muted-foreground">
                        <span>Sugerido por {suggestion.authorName}</span>
                        <span className="inline-flex items-center gap-1"><Check size={12} /> {suggestion.voteCount} apoios</span>
                      </div>
                    </article>
                  )) : <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-xs text-muted-foreground">Nenhuma sugestão nesta etapa.</p>}
                </div>
              </section>
            );
          })}
        </div>
      ) : <div className="mt-6"><EmptyState title="O roadmap está começando" description="As ideias publicadas e seu andamento aparecerão por aqui." /></div>}
    </div>
  );
}

