import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleDollarSign,
  LifeBuoy,
  MessageCircle,
  Play,
  Search,
  Star,
  SlidersHorizontal,
} from 'lucide-react';
import {
  getGetCurrentUserQueryKey,
  getGetPostQueryKey,
  getGetSiteMediaQueryKey,
  getListCommentsQueryKey,
  getListIndicatorsQueryKey,
  getListMySuggestionsQueryKey,
  getListMySupportRequestsQueryKey,
  getListPostsQueryKey,
  getListPublicRoadmapSuggestionsQueryKey,
  getListSuggestionCategoriesQueryKey,
  getListTestimonialsQueryKey,
  getListSupportSubjectsQueryKey,
  useCreateMySuggestion,
  useCreateSupportRequest,
  useGetCurrentUser,
  useGetPost,
  useGetSiteMedia,
  useListComments,
  useListIndicators,
  useListPosts,
  useListMySuggestions,
  useListPublicRoadmapSuggestions,
  useListSuggestionCategories,
  useListTestimonials,
  useListSupportSubjects,
  type Indicator,
  type PostKind,
  type MySuggestion,
  type PublicRoadmapSuggestion,
  type SupportRequestStatus,
} from '@workspace/api-client-react';
import { Link, useParams } from 'wouter';
import { AuthActionGate } from '@/components/auth-ui';
import { getLocale, translateText } from '@/lib/i18n';
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
  ProductAppLink,
} from '@/components/homepage-composition';
import {
  EmptyState,
  formatDate,
  getPostCoverImage,
  LoadingState,
  PageHeading,
  PostCard,
  QueryError,
  SectionHeading,
  Surface,
} from '@/components/portal-ui';

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
          {indicator.value.toLocaleString(getLocale(), { maximumFractionDigits: 2 })}
          <span className="ml-1.5 text-xs font-medium text-muted-foreground">{indicator.unit}</span>
        </p>
        <span className="mb-1 inline-flex items-center gap-0.5 rounded-lg bg-[#e8e8e8] px-2 py-1 text-[10px] font-bold text-[#233a59]">
          {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(indicator.change).toLocaleString(getLocale())}%
        </span>
      </div>
      {indicator.illustrative && <p className="mt-3 rounded-lg bg-[#e8e8e8] px-2.5 py-2 text-[10px] font-bold text-[#233a59]">{translateText('Dado ilustrativo · não é cotação ao vivo')}</p>}
      <p className="mt-3 text-[10px] text-muted-foreground">{translateText('Atualizado em')} {formatDate(indicator.updatedAt)}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{translateText('Fonte:')} {indicator.source}</p>
    </article>
  );
}

export function HomePage() {
  const siteMedia = useGetSiteMedia({
    query: { queryKey: getGetSiteMediaQueryKey() },
  });
  const news = useListPosts({ kind: 'news' }, { query: { queryKey: getListPostsQueryKey({ kind: 'news' }) } });
  const testimonials = useListTestimonials({ query: { queryKey: getListTestimonialsQueryKey() } });
  const heroImageUrl = siteMedia.data?.homeImageUrl;
  return (
    <div className="page-enter home-page">
      <section className="home-hero-band">
        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <p className="home-welcome"><span /> {translateText('Seja bem-vindo ao PFVL')}</p>
            <h1>{translateText('Planeje hoje.')}<br /><span>{translateText('Realize')}</span>{translateText(' amanhã.')}</h1>
            <p className="home-hero-description">{translateText('Entenda seu presente, organize suas finanças e planeje o futuro que você quer construir. Com o PFVL, suas contas e objetivos fazem parte do mesmo plano.')}</p>
            <div className="home-hero-actions">
              <ProductAppLink className="home-cta-primary" />
              <Link className="home-cta-outline" href="/apresentacao">{translateText('Assistir à apresentação')} <Play className="demo-play-icon" size={12} fill="currentColor" /></Link>
            </div>
          </div>
          <HomeDashboardPreview previewImageUrl={heroImageUrl} />
        </div>
      </section>

      <section className="home-content-grid" aria-label={translateText('Recursos e novidades do PFVL')}>
        <HomeFeatureColumn />
        <HomeNewsColumn
          posts={news.data ?? []}
          isLoading={news.isLoading}
          isError={news.isError}
          retry={() => void news.refetch()}
        />
      </section>

      <HomeBottomCta />
      {testimonials.isLoading && <section className="home-testimonials-loading" aria-label={translateText("Depoimentos da comunidade")}><div className="skeleton-line" /><div className="skeleton-line" /></section>}
      {testimonials.isError && <div className="home-testimonials-error" role="status"><span>{translateText("Não foi possível carregar os depoimentos.")}</span><button onClick={() => void testimonials.refetch()} type="button">{translateText("Tentar novamente")}</button></div>}
      {testimonials.data?.length ? (
        <section className="home-testimonials" aria-labelledby="home-testimonials-title">
          <div className="home-testimonials-heading">
            <div><p className="profile-eyebrow">{translateText("Vozes da comunidade")}</p><h2 id="home-testimonials-title">{translateText("Experiências compartilhadas.")}</h2></div>
            <Link className="home-testimonials-link" href="/profile">{translateText("Compartilhe a sua")}</Link>
          </div>
          <div className="home-testimonials-grid">
            {testimonials.data.map((item) => (
              <article className="home-testimonial-card" key={item.id} data-testid={`testimonial-card-${item.id}`}>
                <div className="testimonial-display-stars" aria-label={`${item.rating} ${translateText(item.rating === 1 ? "estrela" : "estrelas")}`}>
                  {Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} fill={index < item.rating ? "currentColor" : "none"} />)}
                </div>
                <blockquote>{item.body}</blockquote>
                <div className="home-testimonial-author"><span>{item.authorName.trim().slice(0, 1).toLocaleUpperCase()}</span><strong>{item.authorName}</strong></div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
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
          <p className="community-kicker">{translateText('Comunidade PFVL')} <span>·</span> {translateText('Fórum')}</p>
          <h1>{translateText('Conversa de dinheiro,')}<br /><em>{translateText('sem complicação.')}</em></h1>
          <p className="community-heading-copy">{translateText('Pergunte, conte o que funcionou e aprenda com quem está vivendo escolhas financeiras parecidas.')}</p>
        </div>
        <div className="community-heading-aside" aria-hidden="true">
          <MessageCircle size={27} strokeWidth={1.4} />
          <span>{translateText('Uma dúvida real')}<br />{translateText('pode ajudar muita gente.')}</span>
        </div>
      </header>

      <div className="community-layout">
        <main className="community-feed">
          <div className="community-toolbar">
            <div className="community-toolbar-title">
              <div><span className="community-live-dot" /> {translateText('Espaço de conversa')}</div>
              <span>{translateText('Experiências da comunidade, não artigos editoriais.')}</span>
            </div>
            <CommunityCreatePanel />
          </div>
          <div className="community-controls">
            <label className="search-field community-search">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">{translateText('Buscar tópicos')}</span>
              <input data-testid="input-community-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={translateText('Buscar conversas, temas ou palavras')} type="search" />
              {search && <button aria-label={translateText('Limpar busca')} className="text-xs font-bold text-primary" onClick={() => setSearch('')} type="button">{translateText('Limpar')}</button>}
            </label>
            <label className="community-select-label">
              <SlidersHorizontal size={15} aria-hidden="true" />
              <span className="sr-only">{translateText('Ordenar conversas')}</span>
              <select aria-label={translateText('Ordenar conversas')} data-testid="select-community-sort" onChange={(event) => setSort(event.target.value as 'recent' | 'discussed')} value={sort}>
                <option value="recent">{translateText('Mais recentes')}</option>
                <option value="discussed">{translateText('Mais respondidas')}</option>
              </select>
            </label>
          </div>
          <div className="community-category-row" aria-label={translateText('Filtrar por categoria')}>
            <button aria-pressed={category === 'all'} className={category === 'all' ? 'community-filter active' : 'community-filter'} onClick={() => setCategory('all')} type="button">{translateText('Todos os tópicos')}</button>
            {categories.map((item) => <button aria-pressed={category === item} className={category === item ? 'community-filter active' : 'community-filter'} key={item} onClick={() => setCategory(item)} type="button">{item}</button>)}
          </div>
          <div className="community-list-heading">
            <h2>{translateText('Conversas abertas')}</h2>
            <span>{posts.length} {translateText(posts.length === 1 ? 'tópico' : 'tópicos')}</span>
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
                    <div className="topic-footer"><span>{translateText('Iniciado por')} <strong>{post.authorName}</strong></span><span className="topic-tags">{post.tags?.slice(0, 2).map((tag) => <span className="tag-pill" key={tag}>{tag}</span>)}</span></div>
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
            <div><strong>{translateText('Prática antes de perfeita.')}</strong><p>{translateText('Contexto real e respeito ajudam mais do que respostas prontas.')}</p></div>
          </div>
          <p className="community-editorial-note">{translateText('Este espaço é feito de perguntas e respostas. Para guias e análises da equipe, visite')} <Link href="/blog">{translateText('Conteúdos PFVL')}</Link>.</p>
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
      <Link href={backHref} className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-primary">← {translateText('Voltar')}</Link>
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
            {isForum && <div className="forum-author-line"><span className="topic-avatar" aria-hidden="true">{post.data.authorName.trim().slice(0, 1).toLocaleUpperCase('pt-BR')}</span><span>{translateText('Publicado por')} <strong>{post.data.authorName}</strong></span><span>·</span><span>{post.data.commentCount} {translateText('respostas')}</span></div>}
            {post.data.excerpt && !isForum && <p className="mt-4 border-l-2 border-primary/45 pl-4 text-base leading-7 text-muted-foreground">{post.data.excerpt}</p>}
            {coverImageUrl && <img className="mt-6 max-h-[440px] w-full rounded-2xl object-cover" src={coverImageUrl} alt={post.data.title} width="1200" height="675" />}
            {post.data.videoUrl && <a className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary underline" href={post.data.videoUrl} target="_blank" rel="noopener noreferrer">{translateText('Assistir vídeo relacionado')} <ArrowRight size={15} /></a>}
            {isForum && <div className="forum-post-label"><MessageCircle size={15} /> {translateText('Publicação original')}</div>}
            <div className={`prose-content whitespace-pre-wrap text-sm leading-8 text-[#1d1d1b] ${isForum ? 'mt-3 forum-post-body' : 'mt-7'}`}>{post.data.body}</div>
            <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-border pt-5">
              {!isForum && <span className="text-xs text-muted-foreground">{translateText('Publicado por')} <strong className="text-foreground">{post.data.authorName}</strong></span>}
              {post.data.tags?.map((tag) => <span className="tag-pill" key={tag}>{tag}</span>)}
            </div>
          </article>
          <section className="mt-8 scroll-mt-6" id="comments">
            <SectionHeading title={isForum ? `Respostas (${comments.data?.length ?? post.data.commentCount})` : `Comentários (${comments.data?.length ?? post.data.commentCount})`} />
            {isForum && <p className="mb-4 text-sm leading-6 text-muted-foreground">{translateText('Compartilhe uma resposta útil, uma pergunta complementar ou o que funcionou na sua realidade.')}</p>}
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
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={translateText('Buscar neste espaço')} type="search" />
      </label>
      {query.isLoading ? <LoadingState rows={4} /> : query.isError ? <QueryError retry={() => void query.refetch()} /> : query.data?.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{query.data.map((post) => <PostCard key={post.id} post={post} />)}</div>
      ) : <EmptyState title={search ? 'Nada encontrado com esse termo' : 'Estamos preparando novos conteúdos'} description={search ? 'Tente outra palavra ou remova a busca.' : 'As publicações serão exibidas aqui assim que estiverem disponíveis.'} />}
    </div>
  );
}

export function BlogPage() {
  return <PostsListingPage kind="blog" eyebrow="Conteúdos PFVL" title="Guias e artigos." description="Publicações da equipe sobre planejamento, organização, objetivos, indicadores e formas de usar o PFVL no dia a dia." />;
}

export function NewsPage() {
  return <PostsListingPage kind="news" eyebrow="O que há de novo" title="Novidades do PFVL." description="Acompanhe atualizações, novos recursos e notícias importantes do portal." />;
}

export function HelpPage() {
  const query = useListPosts({ kind: 'help' }, { query: { queryKey: getListPostsQueryKey({ kind: 'help' }) } });
  return (
    <div className="page-enter">
      <PageHeading eyebrow="Central de ajuda" title="Aprenda a usar o PFVL." description="Tutoriais práticos, organizados por assunto, para configurar contas, planejamentos, objetivos e outros recursos do sistema." />
      <section className="my-6 rounded-2xl border border-[#233a59]/15 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e8e8e8] text-[#233a59]">
              <LifeBuoy aria-hidden="true" size={21} />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-[#012140]">{translateText("Precisa de ajuda da equipe?")}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{translateText("Registre uma solicitação para acompanhar o atendimento pelo seu protocolo.")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="auth-header-link" href="/help/requests" data-testid="link-help-track-requests">
              {translateText("Acompanhar solicitações")}
            </Link>
            <Link className="auth-header-primary" href="/help/request" data-testid="link-help-request">
              {translateText("Registrar uma solicitação")}
            </Link>
          </div>
        </div>
      </section>
      <section className="mt-8">
        <SectionHeading title="Tutoriais e orientações" />
        {query.isLoading ? <LoadingState rows={3} /> : query.isError ? <QueryError retry={() => void query.refetch()} /> : query.data?.length ? (
          <div className="grid gap-3 md:grid-cols-2">{query.data.map((post) => <PostCard key={post.id} post={post} />)}</div>
        ) : (
          <EmptyState title="Tutoriais do PFVL em preparação" description="Os guias de uso serão publicados por assunto, com instruções, imagens e vídeos quando os recursos do sistema estiverem disponíveis." />
        )}
      </section>
    </div>
  );
}

export function HelpRequestPage() {
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="Central de Ajuda"
        title="Fale com a equipe do PFVL."
        description="Tem uma dúvida, encontrou alguma dificuldade ou quer conversar sobre outro assunto? Envie sua mensagem para a equipe da Orbe Sistemas Financeiros."
      />
      <p className="mb-6 text-sm text-muted-foreground">
        {translateText("Sua mensagem ficará registrada para acompanhamento pela nossa equipe.")}
      </p>
      <AuthActionGate returnTo="/help/request">
        <HelpRequestForm />
      </AuthActionGate>
    </div>
  );
}

function HelpRequestForm() {
  const queryClient = useQueryClient();
  const { user: clerkUser } = useUser();
  const profile = useGetCurrentUser({
    query: { queryKey: getGetCurrentUserQueryKey(), retry: false },
  });
  const subjects = useListSupportSubjects({
    query: { queryKey: getListSupportSubjectsQueryKey() },
  });
  const createRequest = useCreateSupportRequest();
  const [subjectId, setSubjectId] = useState("");
  const [message, setMessage] = useState("");
  const [protocol, setProtocol] = useState("");
  const [error, setError] = useState("");
  const maxMessageLength = 5000;

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const result = await createRequest.mutateAsync({
        data: { subjectId: Number(subjectId), message: message.trim() },
      });
      setProtocol(result.protocol);
      setMessage("");
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListMySupportRequestsQueryKey() }),
        ]);
    } catch (requestError) {
      const responseData =
        typeof requestError === "object" && requestError !== null && "data" in requestError
          ? requestError.data
          : null;
      const apiMessage =
        typeof responseData === "object" && responseData !== null && "error" in responseData
          ? responseData.error
          : null;
      setError(typeof apiMessage === "string" ? apiMessage : translateText("Não foi possível registrar sua solicitação. Tente novamente."));
    }
  }

  if (protocol) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8" role="status">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-800">{translateText("Atendimento PFVL")}</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-[#012140]">{translateText("Mensagem registrada com sucesso.")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#233a59]">
          {translateText("Nossa equipe poderá acompanhar sua solicitação. Guarde o protocolo de atendimento:")}
        </p>
        <p className="mt-4 inline-flex rounded-xl bg-white px-4 py-3 font-mono text-lg font-bold tracking-[.08em] text-[#012140]" data-testid="text-support-protocol">
          {protocol}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link className="auth-header-primary" href="/help/requests" data-testid="link-view-support-requests">
            {translateText("Ver andamento")}
          </Link>
          <button
            className="auth-header-link !border-[#233a59]/20 !text-[#233a59]"
            onClick={() => {
              setProtocol("");
              setSubjectId("");
              setError("");
            }}
            type="button"
          >
            {translateText("Registrar outra solicitação")}
          </button>
        </div>
      </section>
    );
  }

  if (profile.isLoading) return <LoadingState rows={2} />;
  if (profile.isError || !profile.data) {
    return <QueryError retry={() => void profile.refetch()} />;
  }

  const username = clerkUser?.username || profile.data?.email.split("@")[0] || "";
  const name = profile.data?.displayName ?? "";
  const email = profile.data?.email ?? "";
  const canSubmit =
    Boolean(subjectId) &&
    Boolean(profile.data) &&
    message.trim().length >= 20 &&
    message.length <= maxMessageLength &&
    !createRequest.isPending;

  return (
    <form className="space-y-5 rounded-2xl border border-[#233a59]/15 bg-white p-5 shadow-sm sm:p-7" onSubmit={(event) => void submitRequest(event)}>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Nome", value: name },
          { label: "Usuário", value: username },
          { label: "E-mail", value: email },
        ].map((field) => (
          <label className="block text-sm font-semibold text-[#233a59]" key={field.label}>
            {translateText(field.label)}
            <input
              aria-readonly="true"
              className={`${inputFieldClass} mt-1.5 w-full bg-[#f7f8fa] text-muted-foreground`}
              readOnly
              value={field.value}
            />
          </label>
        ))}
      </div>

      <label className="block text-sm font-semibold text-[#233a59]">
        {translateText("Assunto")}
        <select
          className={`${inputFieldClass} mt-1.5 w-full`}
          disabled={subjects.isLoading || subjects.isError || !subjects.data?.length}
          onChange={(event) => setSubjectId(event.target.value)}
          required
          value={subjectId}
        >
          <option value="">{translateText("Selecione um assunto")}</option>
          {(subjects.data ?? []).map((subject) => (
            <option key={subject.id} value={subject.id}>{subject.name}</option>
          ))}
        </select>
      </label>
      {subjects.isLoading && <p className="text-sm text-muted-foreground">{translateText("Carregando assuntos…")}</p>}
      {subjects.isError && <p className="text-sm text-red-700">{translateText("Não foi possível carregar os assuntos. Atualize a página e tente novamente.")}</p>}
      {!subjects.isLoading && !subjects.isError && !subjects.data?.length && (
        <p className="rounded-xl bg-[#f7f8fa] p-3 text-sm text-[#233a59]">
          {translateText("A equipe ainda não configurou os assuntos de atendimento.")}
        </p>
      )}

      <label className="block text-sm font-semibold text-[#233a59]">
        {translateText("Mensagem")}
        <textarea
          className={`${inputFieldClass} mt-1.5 min-h-48 w-full resize-y leading-6`}
          maxLength={maxMessageLength}
          minLength={20}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={translateText("Conte como podemos ajudar. Se encontrou um problema, explique o que estava tentando fazer e o que aconteceu.")}
          required
          value={message}
        />
      </label>
      <div className="flex flex-wrap items-start justify-between gap-2 text-xs text-muted-foreground">
        <p>{translateText("Não informe senhas, códigos de acesso ou dados financeiros sensíveis.")}</p>
        <p aria-live="polite" className="tabular-nums">
          {translateText("Caracteres restantes")}: {Math.max(0, maxMessageLength - message.length)}
        </p>
      </div>
      {message.trim().length > 0 && message.trim().length < 20 && (
        <p className="text-xs text-amber-700">{translateText("Escreva pelo menos 20 caracteres para explicar sua solicitação.")}</p>
      )}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{translateText(error)}</p>}
      <button className="auth-header-primary" disabled={!canSubmit} type="submit">
        {translateText(createRequest.isPending ? "Registrando…" : "Registrar mensagem")}
      </button>
    </form>
  );
}

const inputFieldClass =
  "rounded-lg border border-[#233a59]/15 bg-white px-3 py-2.5 text-sm text-[#012140] outline-none focus:border-[#233a59] disabled:cursor-not-allowed disabled:bg-[#f7f8fa]";

export function IndicatorsPage() {
  const query = useListIndicators({ query: { queryKey: getListIndicatorsQueryKey() } });
  return (
    <div className="page-enter">
      <PageHeading eyebrow="Panorama econômico" title="Indicadores sem mistério." description="Acompanhe referências econômicas importantes e entenda a variação apresentada em cada série." />
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#233a59] bg-[#e8e8e8] p-4 text-xs leading-5 text-[#1d1d1b]">
        <CircleDollarSign className="mt-0.5 shrink-0" size={17} />
        <p>{translateText("Indicadores têm contextos e periodicidades diferentes. Os dados marcados como ilustrativos servem apenas para demonstração e não representam cotações ao vivo.")}</p>
      </div>
      {query.isLoading ? <LoadingState rows={3} /> : query.isError ? <QueryError retry={() => void query.refetch()} /> : query.data?.length ? (
        <>
          {query.data.some((indicator) => indicator.illustrative) && <p className="mb-3 text-[11px] font-bold uppercase tracking-[.13em] text-[#233a59]">{translateText("Dados ilustrativos identificados")}</p>}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{query.data.map((indicator) => <IndicatorCard key={indicator.code} indicator={indicator} />)}</div>
          <p className="mt-5 text-xs text-muted-foreground">{translateText("Fontes informadas pela API para cada indicador. Última atualização individual exibida no respectivo cartão.")}</p>
        </>
      ) : <EmptyState title="Nenhum indicador disponível" description="Quando houver dados publicados, eles aparecerão nesta página." />}
    </div>
  );
}

export function SuggestionsPage() {
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="Sugestões"
        title="Envie e acompanhe suas ideias."
        description="Registre uma sugestão para a equipe PFVL e acompanhe em privado o status e os comentários da equipe."
      />
      <div className="mt-6">
        <AuthActionGate
          returnTo="/suggestions"
          signedOutTitle="Entre para enviar e acompanhar sugestões."
          signedOutDescription="Suas mensagens e respostas ficam disponíveis somente na sua conta."
        >
          <SuggestionWorkspace />
        </AuthActionGate>
      </div>
      <div className="mt-8">
        <PublicSuggestionRoadmap />
      </div>
    </div>
  );
}

const roadmapStatusLabel: Record<SupportRequestStatus, string> = {
  new: "Aprovada",
  in_progress: "Em andamento",
  completed: "Concluída",
};

function PublicSuggestionRoadmap() {
  const suggestions = useListPublicRoadmapSuggestions({
    query: {
      queryKey: getListPublicRoadmapSuggestionsQueryKey(),
      refetchInterval: 60_000,
    },
  });

  return (
    <section aria-labelledby="public-roadmap-heading" className="rounded-2xl border border-dashed border-[#233a59]/20 bg-white/50 p-5 sm:p-6">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#233a59]/65">{translateText("Roadmap público")}</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-[#012140]" id="public-roadmap-heading">{translateText("Ideias no horizonte.")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{translateText("Acompanhe as sugestões aprovadas pela equipe PFVL.")}</p>
      </div>
      {suggestions.isLoading ? (
        <LoadingState rows={2} />
      ) : suggestions.isError ? (
        <QueryError retry={() => void suggestions.refetch()} />
      ) : suggestions.data?.length ? (
        <div className="space-y-3">
          {suggestions.data.map((suggestion) => (
            <PublicRoadmapCard key={suggestion.id} suggestion={suggestion} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="O roadmap está começando"
          description="As sugestões aprovadas pela equipe aparecerão aqui, em ordem de aprovação."
        />
      )}
    </section>
  );
}

function PublicRoadmapCard({ suggestion }: { suggestion: PublicRoadmapSuggestion }) {
  const statusTone =
    suggestion.status === "completed"
      ? "bg-emerald-50 text-emerald-800"
      : suggestion.status === "in_progress"
        ? "bg-blue-50 text-blue-800"
        : "bg-amber-50 text-amber-800";

  return (
    <article className="rounded-xl border border-[#233a59]/12 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-[#eaf1f9] px-2.5 py-1 font-bold uppercase tracking-wide text-[#42658b]">
              {suggestion.categoryName ?? translateText("Sugestão")}
            </span>
            <span>{translateText("Aprovada em")} <time dateTime={suggestion.approvedAt}>{formatDate(suggestion.approvedAt)}</time></span>
          </div>
          <h3 className="mt-3 font-display text-lg font-semibold text-[#012140]">{suggestion.title}</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone}`}>
          {translateText(roadmapStatusLabel[suggestion.status])}
        </span>
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#233a59]">{suggestion.message}</p>
    </article>
  );
}

const suggestionRequestStatusLabel: Record<SupportRequestStatus, string> = {
  new: "Recebida",
  in_progress: "Em andamento",
  completed: "Concluída",
};

function SuggestionWorkspace() {
  const queryClient = useQueryClient();
  const categories = useListSuggestionCategories({
    query: { queryKey: getListSuggestionCategoriesQueryKey() },
  });
  const suggestions = useListMySuggestions({
    query: {
      queryKey: getListMySuggestionsQueryKey(),
      refetchInterval: 30_000,
    },
  });
  const mutation = useCreateMySuggestion();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [protocol, setProtocol] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const result = await mutation.mutateAsync({
        data: {
          title: title.trim(),
          categoryId: Number(categoryId),
          message: details.trim(),
        },
      });
      setTitle('');
      setDetails('');
      setProtocol(result.protocol);
      await queryClient.invalidateQueries({ queryKey: getListMySuggestionsQueryKey() });
    } catch (requestError) {
      const responseData =
        typeof requestError === "object" && requestError !== null && "data" in requestError
          ? requestError.data
          : null;
      const apiMessage =
        typeof responseData === "object" && responseData !== null && "error" in responseData
          ? responseData.error
          : null;
      setError(typeof apiMessage === "string" ? apiMessage : translateText("Não foi possível enviar sua sugestão agora. Tente novamente."));
    }
  }

  return (
    <div className="space-y-6">
      <form
        className="rounded-2xl border border-[#233a59]/15 bg-white p-5 shadow-sm sm:p-6"
        onSubmit={(event) => void submit(event)}
      >
        <div className="mb-5">
          <p className="eyebrow-pill">{translateText("Registro de mensagem")}</p>
          <h2 className="mt-2 font-display text-xl font-semibold text-[#012140]">{translateText("O que você gostaria de ver no PFVL?")}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{translateText("A sugestão será enviada em privado à equipe. Você poderá acompanhar as atualizações nesta página.")}</p>
        </div>
        {protocol && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
            <strong className="block">{translateText("Sugestão registrada com sucesso.")}</strong>
            <span>{translateText("Protocolo de acompanhamento")}: <span className="font-mono font-bold">{protocol}</span></span>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px]">
          <label className="block text-sm font-semibold text-[#012140]">
            {translateText("Título da sugestão")}
            <input
              className="mt-1.5 w-full rounded-xl border border-[#233a59]/15 bg-white px-3.5 py-3 text-sm text-[#1d1d1b] outline-none focus:border-[#233a59] focus:ring-2 focus:ring-[#233a59]/10"
              maxLength={220}
              minLength={4}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={translateText("Ex.: permitir exportar os relatórios")}
              required
              value={title}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-1">
            <label className="block text-sm font-semibold text-[#012140]">
              {translateText("Assunto")}
              <input
                aria-readonly="true"
                className="mt-1.5 w-full rounded-xl border border-[#233a59]/15 bg-[#f7f8fa] px-3.5 py-3 text-sm text-[#1d1d1b]"
                readOnly
                value={translateText("Sugestão")}
              />
            </label>
            <label className="block text-sm font-semibold text-[#012140]">
              {translateText("Categoria")}
              <select
                className="mt-1.5 w-full rounded-xl border border-[#233a59]/15 bg-white px-3.5 py-3 text-sm text-[#1d1d1b] outline-none focus:border-[#233a59] focus:ring-2 focus:ring-[#233a59]/10"
                disabled={categories.isLoading || categories.isError || !categories.data?.length}
                onChange={(event) => setCategoryId(event.target.value)}
                required
                value={categoryId}
              >
                <option value="">{translateText("Selecione uma categoria")}</option>
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {categories.isLoading && <p className="mt-2 text-sm text-muted-foreground">{translateText("Carregando categorias…")}</p>}
        {categories.isError && <p className="mt-2 text-sm text-red-700">{translateText("Não foi possível carregar as categorias. Atualize a página e tente novamente.")}</p>}
        {!categories.isLoading && !categories.isError && !categories.data?.length && (
          <p className="mt-3 rounded-xl bg-[#f7f8fa] p-3 text-sm text-[#233a59]">{translateText("O assunto Sugestão está temporariamente indisponível.")}</p>
        )}
        <label className="mt-3 block text-sm font-semibold text-[#012140]">
          {translateText("Como essa ideia ajudaria?")}
          <textarea
            className="mt-1.5 min-h-32 w-full resize-y rounded-xl border border-[#233a59]/15 bg-white px-3.5 py-3 text-sm text-[#1d1d1b] outline-none focus:border-[#233a59] focus:ring-2 focus:ring-[#233a59]/10"
            maxLength={5000}
            minLength={20}
            onChange={(event) => setDetails(event.target.value)}
            placeholder={translateText("Descreva sua sugestão com alguns detalhes.")}
            required
            value={details}
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>{translateText("Não informe senhas ou dados financeiros sensíveis.")}</p>
          <span>{details.length}/5000</span>
        </div>
        {details.trim().length > 0 && details.trim().length < 20 && (
          <p className="mt-2 text-xs text-amber-700">{translateText("Escreva pelo menos 20 caracteres para explicar sua sugestão.")}</p>
        )}
        {error && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{translateText(error)}</p>}
        <div className="mt-4">
          <button
            className="auth-header-primary"
            disabled={mutation.isPending || !categories.data?.length}
            type="submit"
          >
            {translateText(mutation.isPending ? "Enviando…" : "Enviar sugestão")}
          </button>
        </div>
      </form>
      <section aria-labelledby="my-suggestions-heading">
        <div className="mb-3">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-[#233a59]/65">{translateText("Área privada")}</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-[#012140]" id="my-suggestions-heading">{translateText("Minhas sugestões")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{translateText("Somente você e a equipe PFVL podem ver estas mensagens.")}</p>
        </div>
        {suggestions.isLoading ? <LoadingState rows={2} /> : suggestions.isError ? (
          <QueryError retry={() => void suggestions.refetch()} />
        ) : suggestions.data?.length ? (
          <div className="space-y-3">
            {suggestions.data.map((suggestion) => (
              <SuggestionRequestCard key={suggestion.id} suggestion={suggestion} />
            ))}
          </div>
        ) : (
          <EmptyState title="Você ainda não enviou sugestões" description="Depois de enviar uma ideia, o status e as respostas da equipe aparecerão aqui." />
        )}
      </section>
    </div>
  );
}

function SuggestionRequestCard({ suggestion }: { suggestion: MySuggestion }) {
  const statusTone =
    suggestion.status === "completed"
      ? "bg-emerald-50 text-emerald-800"
      : suggestion.status === "in_progress"
        ? "bg-blue-50 text-blue-800"
        : "bg-amber-50 text-amber-800";
  return (
    <article className="rounded-2xl border border-[#233a59]/15 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] font-bold tracking-[.08em] text-[#233a59]">{translateText("Protocolo")}: {suggestion.protocol}</p>
          <h3 className="mt-2 font-display text-lg font-semibold text-[#012140]">{suggestion.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {suggestion.categoryName ?? translateText("Sem categoria")} · {formatDate(suggestion.createdAt)}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone}`}>
          {translateText(suggestionRequestStatusLabel[suggestion.status])}
        </span>
      </div>
      <p className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-[#f7f8fa] p-3 text-sm leading-6 text-[#233a59]">{suggestion.message}</p>
      <div className="mt-4 border-t border-[#233a59]/10 pt-3">
        <p className="text-xs font-bold uppercase tracking-[.12em] text-[#233a59]/70">{translateText("Atualizações da equipe")}</p>
        {suggestion.comments.length ? (
          <div className="mt-2 space-y-2">
            {suggestion.comments.map((comment) => (
              <div className="rounded-xl border border-[#233a59]/10 bg-white p-3" key={comment.id}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <strong className="text-[#233a59]">{comment.authorName}</strong>
                  <time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#233a59]">{comment.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{translateText("Ainda não há comentários da equipe.")}</p>
        )}
      </div>
    </article>
  );
}

