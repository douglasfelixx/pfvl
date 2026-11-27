import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  LifeBuoy,
  MessageCircle,
  Play,
  Search,
  Star,
  SlidersHorizontal,
} from 'lucide-react';
import { RichTextContent, richContentToPlainText } from '@/components/rich-text-content';
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
} from '@workspace/api-client-react';
import { Link, useLocation, useParams, useSearch } from 'wouter';
import { AuthActionGate, useSearchAccountId } from '@/components/auth-ui';
import { getLocale, translateText } from '@/lib/i18n';
import { getPrivateStatusLabelFromRequest } from '@/lib/private-status-label';
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

function readSelectedTag(search: string): string {
  return new URLSearchParams(search).get('tag')?.trim() ?? '';
}

function postListHref(kind: PostKind): string {
  if (kind === 'forum') return '/community';
  return kind === 'blog' ? '/content' : `/${kind}`;
}

function postTagHref(kind: PostKind, tag: string): string {
  return `${postListHref(kind)}?tag=${encodeURIComponent(tag)}`;
}

function postHasTag(post: { tags?: string[] }, selectedTag: string): boolean {
  if (!selectedTag) return true;
  const normalizedTag = selectedTag.toLocaleLowerCase('pt-BR');
  return post.tags?.some((tag) => tag.trim().toLocaleLowerCase('pt-BR') === normalizedTag) ?? false;
}

function ActiveTagFilter({ tag, clearHref }: { tag: string; clearHref: string }) {
  return (
    <div className="active-tag-filter">
      <span>{translateText('Filtrando pelo marcador')}: <strong>{tag}</strong></span>
      <Link href={clearHref}>{translateText('Limpar filtro')}</Link>
    </div>
  );
}

export function HomePage() {
  const siteMedia = useGetSiteMedia({
    query: { queryKey: getGetSiteMediaQueryKey() },
  });
  const news = useListPosts({ kind: 'news' }, { query: { queryKey: getListPostsQueryKey({ kind: 'news' }), refetchOnWindowFocus: true } });
  const testimonials = useListTestimonials({ query: { queryKey: getListTestimonialsQueryKey() } });
  const heroImageUrl = siteMedia.data?.homeImageUrl;
  return (
    <div className="page-enter home-page">
      <section className="home-hero-band">
        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <p className="home-welcome"><span /> {translateText('Seja bem-vindo ao PFVL')}</p>
            <h1><span>{translateText('Planeje.')}</span> <span>{translateText('Acompanhe.')}</span> <span>{translateText('Realize.')}</span></h1>
            <p className="home-hero-description">{translateText('Organize suas finanças, acompanhe o que foi planejado e transforme seus objetivos em planos com valores, prazos e aportes.')}</p>
            <div className="home-hero-actions">
              <ProductAppLink className="home-cta-primary" />
              <Link className="home-cta-outline" href="/overview">{translateText('Assistir à apresentação')} <Play className="demo-play-icon" size={12} fill="currentColor" /></Link>
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
      {testimonials.isError && <div className="home-testimonials-error" role="status"><span>{translateText("Não foi possível carregar as avaliações.")}</span><button onClick={() => void testimonials.refetch()} type="button">{translateText("Tentar novamente")}</button></div>}
      {testimonials.data && testimonials.data.length >= 3 ? (
        <section className="home-testimonials" aria-labelledby="home-testimonials-title">
          <div className="home-testimonials-heading">
            <div><p className="profile-eyebrow">{translateText("Vozes da comunidade")}</p><h2 id="home-testimonials-title">{translateText("Experiências compartilhadas.")}</h2></div>
            <Link className="home-testimonials-link" href="/profile">{translateText("Compartilhe sua experiência")}</Link>
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
  const locationSearch = useSearch();
  const selectedTag = readSelectedTag(locationSearch);
  const params = useMemo(() => ({ kind: 'forum' as PostKind, search: search.trim() || undefined }), [search]);
  const query = useListPosts(params, { query: { queryKey: getListPostsQueryKey(params), refetchOnWindowFocus: true } });
  const categories = [...new Set((query.data ?? []).map((post) => post.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const posts = [...(query.data ?? [])]
    .filter((post) => category === 'all' || post.category === category)
    .filter((post) => postHasTag(post, selectedTag))
    .sort((a, b) => sort === 'discussed'
      ? b.commentCount - a.commentCount || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return (
    <div className="page-enter community-page">
      <header className="community-heading">
        <div>
          <p className="community-kicker">{translateText('Comunidade PFVL')}</p>
          <h1>{translateText('Compartilhe experiências.')}<br /><em>{translateText('Descubra possibilidades.')}</em></h1>
          <p className="community-heading-copy">{translateText('Troque ideias sobre o uso do PFVL, compartilhe formas de organizar suas finanças e aprenda com as experiências de outras pessoas.')}</p>
        </div>
        <div className="community-heading-aside" aria-hidden="true">
          <MessageCircle size={27} strokeWidth={1.4} />
          <span>{translateText('Sua experiência pode ser o próximo aprendizado de alguém.')}</span>
        </div>
      </header>

      <div className="community-layout">
        <main className="community-feed">
          <div className="community-toolbar">
            <div className="community-toolbar-title">
              <div><span className="community-live-dot" /> {translateText('Espaço de conversa')}</div>
              <span>{translateText('Converse sobre suas experiências e tire dúvidas com a comunidade.')}</span>
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
          {selectedTag && <ActiveTagFilter tag={selectedTag} clearHref="/community" />}
          <div className="community-list-heading">
            <h2>{translateText('Conversas abertas')}</h2>
            <span>{posts.length} {translateText(posts.length === 1 ? 'tópico' : 'tópicos')}</span>
          </div>
          {query.isLoading ? <LoadingState rows={4} /> : query.isError ? <QueryError retry={() => void query.refetch()} /> : posts.length ? (
            <div className="community-topic-list" data-testid="list-community-topics">
              {posts.map((post) => (
                <article className="community-topic-row" key={post.id} data-testid={`topic-${post.id}`}>
                  {getPostCoverImage(post) && (
                    <Link
                      aria-label={`${translateText('Abrir tópico')}: ${post.title}`}
                      className="topic-cover-link"
                      href={`/community/${post.id}`}
                    >
                      <img
                        alt=""
                        className="topic-cover"
                        data-testid={`img-topic-cover-${post.id}`}
                        height="56"
                        loading="lazy"
                        src={getPostCoverImage(post) ?? undefined}
                        width="68"
                      />
                    </Link>
                  )}
                  <div className="topic-main">
                    <div className="topic-meta"><span className="topic-category">{post.category}</span><span>{formatDate(post.createdAt)}</span></div>
                    <Link className="topic-title" href={`/community/${post.id}`}>{post.title}</Link>
                    <p className="topic-excerpt">{post.excerpt || richContentToPlainText(post.body)}</p>
                    <div className="topic-footer"><span>{translateText('Iniciado por')} <strong>{post.authorName}</strong></span><span className="topic-tags">{post.tags?.slice(0, 2).map((tag) => <Link className="tag-pill tag-pill-link" href={postTagHref('forum', tag)} key={tag}>{tag}</Link>)}</span></div>
                  </div>
                  <Link aria-label={`${post.commentCount} ${translateText(post.commentCount === 1 ? 'resposta' : 'respostas')} ${translateText('em')} ${post.title}`} className="topic-replies" href={`/community/${post.id}`}>
                    <MessageCircle size={17} />
                    <strong>{post.commentCount}</strong>
                    <span>{translateText(post.commentCount === 1 ? 'resposta' : 'respostas')}</span>
                  </Link>
                </article>
              ))}
            </div>
          ) : <EmptyState
            title={selectedTag && search
              ? 'Nenhum conteúdo corresponde à busca e ao marcador selecionados.'
              : search || category !== 'all' || selectedTag
                ? 'Nenhuma conversa encontrada'
                : 'O fórum está começando'}
            description={selectedTag && search
              ? 'Tente outra palavra ou remova um dos filtros.'
              : search || category !== 'all' || selectedTag
                ? 'Ajuste a busca ou remova um dos filtros.'
                : 'Abra um tópico para compartilhar sua dúvida ou experiência com a comunidade.'}
          />}
        </main>
        <aside className="community-rail">
          <CommunityPoll />
          <p className="community-editorial-note">{translateText('Converse sobre suas experiências e tire dúvidas com a comunidade.')} <Link href="/content">{translateText('Conteúdos PFVL')}</Link>.</p>
        </aside>
      </div>
    </div>
  );
}

export function PostDetailPage() {
  const [location] = useLocation();
  const params = useParams<{ postId?: string }>();
  const postId = Number(params.postId);
  const validId = Number.isFinite(postId) && postId > 0;
  const route = window.location.pathname;
  const postKind: PostKind = route.startsWith('/content/') || route.startsWith('/blog/')
    ? 'blog'
    : route.startsWith('/news/')
      ? 'news'
      : route.startsWith('/help/')
        ? 'help'
        : 'forum';
  const backHref = postListHref(postKind);
  const post = useGetPost(postId, { query: { enabled: validId, queryKey: getGetPostQueryKey(postId), refetchOnWindowFocus: true, retry: false } });
  const comments = useListComments(postId, { query: { enabled: validId, queryKey: getListCommentsQueryKey(postId), refetchOnWindowFocus: true, retry: false } });
  const [commentUnavailable, setCommentUnavailable] = useState(false);
  useEffect(() => {
    if (!post.data || !comments.data) return;
    const url = new URL(window.location.href);
    const requestedComment = url.searchParams.get('pfvlComment');
    const hashComment = url.hash.match(/^#comment-(\d+)$/)?.[1];
    const requestedCommentId = Number(requestedComment ?? hashComment);
    const targetId = requestedComment ? `comment-${requestedComment}` : url.hash.slice(1);
    if (Number.isFinite(requestedCommentId) && requestedCommentId > 0) {
      const exists = comments.data.some((comment) => comment.id === requestedCommentId);
      setCommentUnavailable(!exists);
      url.searchParams.delete('pfvlComment');
      if (!exists) url.hash = 'comments';
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
      if (!exists) {
        window.requestAnimationFrame(() => {
          document.getElementById('comments')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        });
        return;
      }
    } else {
      setCommentUnavailable(false);
    }
    if (targetId !== 'comments' && !/^comment-\d+$/.test(targetId)) return;
    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }, [comments.data, location, post.data]);
  const roots = (comments.data ?? []).filter((comment) => !comment.parentCommentId);
  const children = (comments.data ?? []).filter((comment) => comment.parentCommentId);
  const isForum = post.data?.kind === 'forum';
  const wasEdited = Boolean(
    post.data &&
      new Date(post.data.updatedAt).getTime() > new Date(post.data.createdAt).getTime(),
  );
  const coverImageUrl = post.data ? getPostCoverImage(post.data) : null;
  const postStatus = (post.error as { status?: number } | null)?.status;
  const isUnavailable = !validId || (post.isError && (postStatus === 403 || postStatus === 404));
  return (
    <div className="page-enter mx-auto max-w-[900px]">
      <Link href={backHref} className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-primary">← {translateText('Voltar')}</Link>
      {post.isLoading ? <LoadingState rows={1} /> : isUnavailable ? (
        <Surface className="p-6 sm:p-8">
          <h1 className="font-display text-2xl font-semibold text-[#012140]">{translateText('Este conteúdo não está disponível.')}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{translateText('O conteúdo pode ter sido removido, ocultado ou não estar disponível para consulta.')}</p>
          <Link className="auth-header-primary mt-5 inline-flex" href={backHref}>{translateText('Voltar')}</Link>
        </Surface>
      ) : post.isError || !post.data ? (
        <QueryError retry={() => void post.refetch()} />
      ) : (
        <>
          <article className={isForum ? "detail-panel forum-detail-panel" : "detail-panel"}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow-pill">{isForum ? translateText('Tópico da comunidade') : post.data.category}</span>
              {isForum && <span className="text-xs font-semibold text-[#233a59]">{post.data.category}</span>}
              <div className="basis-full text-xs text-muted-foreground sm:basis-auto">
                <time dateTime={post.data.createdAt}>
                  {translateText('Criado em')}: {formatDate(post.data.createdAt)}
                </time>
                {wasEdited && (
                  <>
                    <span aria-hidden="true" className="px-2">|</span>
                    <span className="text-[#315571]" data-testid="text-post-updated-at">
                      {translateText('Atualizado em')}: <time dateTime={post.data.updatedAt}>{formatDate(post.data.updatedAt)}</time>
                    </span>
                  </>
                )}
              </div>
            </div>
            <h1 className="mt-4 font-display text-[34px] font-semibold leading-[1.12] tracking-[-.04em] sm:text-[46px]">{post.data.title}</h1>
            {isForum && <div className="forum-author-line"><span className="topic-avatar" aria-hidden="true">{post.data.authorName.trim().slice(0, 1).toLocaleUpperCase('pt-BR')}</span><span>{translateText('Publicado por')} <strong>{post.data.authorName}</strong></span><span>·</span><span>{post.data.commentCount} {translateText(post.data.commentCount === 1 ? 'resposta' : 'respostas')}</span></div>}
            {coverImageUrl && (
              <div className="mt-6 flex max-h-[440px] w-full items-center justify-center overflow-hidden rounded-2xl bg-[#e8e8e8]">
                <img className="max-h-[440px] w-full object-contain" src={coverImageUrl} alt={post.data.title} width="1200" height="675" />
              </div>
            )}
            {post.data.videoUrl && <a className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary underline" href={post.data.videoUrl} target="_blank" rel="noopener noreferrer">{translateText('Assistir vídeo relacionado')} <ArrowRight size={15} /></a>}
            {isForum && <div className="forum-post-label"><MessageCircle size={15} /> {translateText('Publicação original')}</div>}
            <RichTextContent className={`prose-content text-sm leading-8 text-[#1d1d1b] ${isForum ? 'mt-3 forum-post-body' : 'mt-7'}`} value={post.data.body} />
            <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-border pt-5">
              {!isForum && <span className="text-xs text-muted-foreground">{translateText('Publicado por')} <strong className="text-foreground">{post.data.authorName}</strong></span>}
              {post.data.tags?.map((tag) => <Link className="tag-pill tag-pill-link" href={postTagHref(post.data.kind, tag)} key={tag}>{tag}</Link>)}
            </div>
          </article>
          <section className="mt-8 scroll-mt-6" id="comments">
            {commentUnavailable && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
                <p>{translateText('Esse comentário não está mais disponível.')}</p>
                <Link className="mt-2 inline-flex font-semibold underline underline-offset-2" href={`${window.location.pathname}#comments`}>
                  {translateText('Abrir publicação de origem')}
                </Link>
              </div>
            )}
            <SectionHeading title={`${translateText(isForum ? 'Respostas' : 'Comentários')} (${comments.data?.length ?? post.data.commentCount})`} />
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
                        <div className="ml-3 mt-4 scroll-mt-6 border-l-2 border-[#233a59] pl-4 sm:ml-7" id={`comment-${reply.id}`} key={reply.id}>
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
            ) : <div className="mt-4"><EmptyState
              title={isForum ? 'Sem respostas por enquanto' : 'Sem comentários por enquanto'}
              description={isForum ? 'As respostas publicadas aparecerão aqui.' : 'Os comentários publicados aparecerão aqui.'}
            /></div>}
          </section>
        </>
      )}
    </div>
  );
}

function PostsListingPage({ kind, eyebrow, title, description }: { kind: PostKind; eyebrow: string; title: string; description: string }) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const locationSearch = useSearch();
  const selectedTag = readSelectedTag(locationSearch);
  const params = useMemo(() => ({ kind, search: search.trim() || undefined }), [kind, search]);
  const query = useListPosts(params, { query: { queryKey: getListPostsQueryKey(params), refetchOnWindowFocus: true } });
  const posts = (query.data ?? []).filter((post) => postHasTag(post, selectedTag));
  const shouldPaginate = kind === 'blog';
  const pageSize = 6;
  const totalPages = shouldPaginate ? Math.max(1, Math.ceil(posts.length / pageSize)) : 1;
  const visiblePage = Math.min(currentPage, totalPages);
  const visiblePosts = shouldPaginate
    ? posts.slice((visiblePage - 1) * pageSize, visiblePage * pageSize)
    : posts;
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  useEffect(() => {
    setCurrentPage(1);
  }, [kind, search, selectedTag]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <div className="page-enter">
      <PageHeading eyebrow={eyebrow} title={title} description={description} />
      <label className="search-field mb-5">
        <Search size={17} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={translateText('Buscar neste espaço')} type="search" />
      </label>
      {selectedTag && <ActiveTagFilter tag={selectedTag} clearHref={postListHref(kind)} />}
      {query.isLoading ? <LoadingState rows={4} /> : query.isError ? <QueryError retry={() => void query.refetch()} /> : posts.length ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visiblePosts.map((post) => <PostCard key={post.id} post={post} />)}</div>
          {shouldPaginate && totalPages > 1 && (
            <nav
              aria-label={translateText('Paginação de conteúdos')}
              className="mt-6 flex flex-wrap items-center justify-center gap-2"
              data-testid="content-pagination"
            >
              <button
                aria-label={translateText('Página anterior')}
                className="grid h-10 w-10 place-items-center rounded-lg border border-[#233a59]/15 bg-white text-[#233a59] transition hover:bg-[#f4f6f8] disabled:cursor-not-allowed disabled:opacity-45"
                data-testid="content-page-previous"
                disabled={visiblePage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                type="button"
              >
                <ChevronLeft aria-hidden="true" size={17} />
              </button>
              {pageNumbers.map((page) => (
                <button
                  aria-current={visiblePage === page ? 'page' : undefined}
                  aria-label={`${translateText('Página')} ${page}`}
                  className={`grid h-10 min-w-10 place-items-center rounded-lg px-3 text-sm font-semibold transition ${
                    visiblePage === page
                      ? 'bg-[#233a59] text-white'
                      : 'border border-[#233a59]/15 bg-white text-[#233a59] hover:bg-[#f4f6f8]'
                  }`}
                  data-testid={`content-page-${page}`}
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  type="button"
                >
                  {page}
                </button>
              ))}
              <button
                aria-label={translateText('Próxima página')}
                className="grid h-10 w-10 place-items-center rounded-lg border border-[#233a59]/15 bg-white text-[#233a59] transition hover:bg-[#f4f6f8] disabled:cursor-not-allowed disabled:opacity-45"
                data-testid="content-page-next"
                disabled={visiblePage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                type="button"
              >
                <ChevronRight aria-hidden="true" size={17} />
              </button>
            </nav>
          )}
        </>
      ) : <EmptyState
        title={selectedTag && search
          ? 'Nenhum conteúdo corresponde à busca e ao marcador selecionados.'
          : kind === 'news' && !search && !selectedTag
            ? 'Nenhuma novidade publicada ainda.'
            : selectedTag
              ? 'Nenhuma publicação encontrada para este marcador.'
            : search
              ? 'Nada encontrado com esse termo'
              : 'Estamos preparando novos conteúdos'}
        description={selectedTag && search
          ? 'Tente outra palavra ou remova um dos filtros.'
          : selectedTag
            ? 'Remova o filtro ou escolha outro marcador.'
            : search
              ? 'Tente outra palavra ou remova a busca.'
              : 'As publicações serão exibidas aqui assim que estiverem disponíveis.'}
      />}
    </div>
  );
}

export function BlogPage() {
  return <PostsListingPage kind="blog" eyebrow="Conteúdos PFVL" title="Conheça as possibilidades do PFVL." description="Entenda os conceitos por trás dos recursos e descubra formas de usar o PFVL para organizar suas finanças, acompanhar seus planos e cuidar dos seus objetivos." />;
}

export function NewsPage() {
  return <PostsListingPage kind="news" eyebrow="Evolução do PFVL" title="Acompanhe cada novidade." description="Conheça os novos recursos, as melhorias e as atualizações do site e da aplicação PFVL." />;
}

export function HelpPage() {
  const [search, setSearch] = useState('');
  const locationSearch = useSearch();
  const selectedTag = readSelectedTag(locationSearch);
  const params = useMemo(() => ({ kind: 'help' as PostKind, search: search.trim() || undefined }), [search]);
  const query = useListPosts(params, { query: { queryKey: getListPostsQueryKey(params), refetchOnWindowFocus: true } });
  const posts = (query.data ?? []).filter((post) => postHasTag(post, selectedTag));
  return (
    <div className="page-enter">
      <PageHeading eyebrow="Central de ajuda" title="Encontre o caminho para o que precisa." description="Consulte tutoriais, encontre respostas e veja como utilizar os recursos do PFVL. Se precisar de atendimento, registre uma solicitação e acompanhe as respostas da equipe." />
      <section className="my-6 grid gap-4 rounded-2xl border border-[#233a59]/15 bg-white p-4 shadow-sm sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#eef3f6] text-[#233a59] sm:h-12 sm:w-12">
              <LifeBuoy aria-hidden="true" size={21} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-[#012140]">{translateText("Precisa de ajuda da nossa equipe?")}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{translateText("Registre sua dúvida ou dificuldade e acompanhe o atendimento em Minhas solicitações.")}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Link className="auth-header-primary w-full justify-center sm:w-auto" href="/help/request" data-testid="link-help-request">
            {translateText("Registrar uma solicitação")}
          </Link>
          <Link className="auth-header-link inline-flex w-full items-center justify-center gap-2 !border-[#233a59]/20 !bg-[#f4f6f8] !text-[#233a59] hover:!bg-[#e8eef4] sm:w-auto" href="/help/requests" data-testid="link-help-track-requests">
              <ClipboardList aria-hidden="true" size={16} />
              {translateText("Minhas solicitações")}
          </Link>
        </div>
      </section>
      <section className="mt-8">
        <SectionHeading title="Tutoriais e orientações" />
        <label className="search-field mb-5">
          <Search aria-hidden="true" size={17} />
          <input data-testid="input-help-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={translateText('Buscar neste espaço')} type="search" />
        </label>
        {selectedTag && <ActiveTagFilter tag={selectedTag} clearHref="/help" />}
        {query.isLoading ? <LoadingState rows={3} /> : query.isError ? <QueryError retry={() => void query.refetch()} /> : posts.length ? (
          <div className="grid gap-3 md:grid-cols-2">{posts.map((post) => <PostCard key={post.id} post={post} />)}</div>
        ) : (
          <EmptyState
            title={selectedTag && search
              ? 'Nenhum conteúdo corresponde à busca e ao marcador selecionados.'
              : selectedTag
                ? 'Nenhuma publicação encontrada para este marcador.'
                : search
                  ? 'Nada encontrado com esse termo'
                  : 'Tutoriais do PFVL em preparação'}
            description={selectedTag && search
              ? 'Tente outra palavra ou remova um dos filtros.'
              : selectedTag
                ? 'Remova o filtro ou escolha outro marcador.'
                : search
                  ? 'Tente outra palavra ou remova a busca.'
                  : 'Os guias de uso serão publicados por assunto, com instruções, imagens e vídeos quando os recursos do sistema estiverem disponíveis.'}
          />
        )}
      </section>
    </div>
  );
}

export function HelpRequestPage() {
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="Atendimento PFVL"
        title="Como podemos ajudar?"
        description="Envie sua dúvida ou relate uma dificuldade. Sua solicitação ficará registrada para que você acompanhe o andamento e as respostas da equipe da Orbefin Sistemas Financeiros."
      />
      <p className="mb-6 text-sm text-muted-foreground">
        {translateText("Conte o que você precisa. Se encontrou um problema, explique o que estava tentando fazer e o que aconteceu.")}
      </p>
      <AuthActionGate
        returnTo="/help/request"
        signedOutTitle="Entre para registrar sua solicitação."
        signedOutDescription="Depois do envio, acompanhe o atendimento em Minhas solicitações."
      >
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
        <h2 className="mt-2 font-display text-2xl font-semibold text-[#012140]">{translateText("Solicitação registrada com sucesso.")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#233a59]">
          {translateText("Seu protocolo é")} <span className="font-mono font-bold" data-testid="text-support-protocol">{protocol}</span>. {translateText("Acompanhe o andamento e as respostas da equipe em Minhas solicitações.")}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link className="auth-header-primary" href="/help/requests" data-testid="link-view-support-requests">
            {translateText("Ver minha solicitação")}
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
        {translateText(createRequest.isPending ? "Registrando…" : "Registrar solicitação")}
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
        eyebrow="Suas ideias no PFVL"
        title="Ajude a construir os próximos passos."
        description="Compartilhe ideias para melhorar o PFVL e acompanhe, em um espaço privado, as respostas da equipe e o andamento das suas sugestões."
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

const roadmapStatusLabel: Record<PublicRoadmapSuggestion["status"], string> = {
  planned: "Planejada",
  in_progress: "Em desenvolvimento",
  available: "Disponível",
};

function PublicSuggestionRoadmap() {
  const suggestions = useListPublicRoadmapSuggestions({
    query: {
      queryKey: getListPublicRoadmapSuggestionsQueryKey(),
      refetchInterval: 60_000,
    },
  });
  useEffect(() => {
    const targetId = window.location.hash.slice(1);
    if (!suggestions.data || !/^roadmap-\d+$/.test(targetId)) return;
    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }, [suggestions.data]);

  return (
    <section aria-labelledby="public-roadmap-heading" className="rounded-2xl border border-dashed border-[#233a59]/20 bg-white/50 p-5 sm:p-6">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#233a59]/65">{translateText("Evolução do PFVL")}</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-[#012140]" id="public-roadmap-heading">{translateText("Próximos passos.")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{translateText("Acompanhe as melhorias planejadas e as novidades já disponíveis no PFVL.")}</p>
      </div>
      {suggestions.isLoading ? (
        <LoadingState rows={2} />
      ) : suggestions.isError ? (
        <QueryError retry={() => void suggestions.refetch()} />
      ) : suggestions.data?.length ? (
        <div className="space-y-6">
          {([
            { status: "planned", suggestions: suggestions.data.filter((item) => item.status === "planned") },
            { status: "in_progress", suggestions: suggestions.data.filter((item) => item.status === "in_progress") },
            { status: "available", suggestions: suggestions.data.filter((item) => item.status === "available") },
          ] as const)
            .filter((group) => group.suggestions.length > 0)
            .map((group) => (
              <section
                aria-labelledby={`roadmap-stage-${group.status}`}
                data-testid={`roadmap-stage-${group.status}`}
                key={group.status}
              >
                <h3
                  className="mb-3 font-display text-lg font-semibold text-[#012140]"
                  id={`roadmap-stage-${group.status}`}
                >
                  {translateText(roadmapStatusLabel[group.status])}
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {group.suggestions.map((suggestion) => (
                    <PublicRoadmapCard key={suggestion.id} suggestion={suggestion} />
                  ))}
                </div>
              </section>
            ))}
        </div>
      ) : (
        <EmptyState
          title="Ainda não há melhorias publicadas neste espaço."
          description="As próximas melhorias aparecerão aqui quando forem compartilhadas pela equipe. Você já pode enviar suas ideias pelo formulário de sugestões."
        />
      )}
    </section>
  );
}

function PublicRoadmapCard({ suggestion }: { suggestion: PublicRoadmapSuggestion }) {
  const statusTone =
    suggestion.status === "available"
      ? "bg-emerald-50 text-emerald-800"
      : suggestion.status === "in_progress"
        ? "bg-blue-50 text-blue-800"
        : "bg-amber-50 text-amber-800";

  return (
    <article id={`roadmap-${suggestion.id}`} className="flex h-full flex-col rounded-xl border border-[#233a59]/12 bg-white p-4 shadow-sm scroll-mt-24 sm:p-5" data-testid={`card-public-roadmap-${suggestion.id}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone}`}>
          {translateText(roadmapStatusLabel[suggestion.status])}
        </span>
        <span className="text-xs text-muted-foreground">
          {translateText("Aprovada em")} <time dateTime={suggestion.approvedAt}>{formatDate(suggestion.approvedAt)}</time>
        </span>
      </div>
      <h4 className="mt-3 font-display text-lg font-semibold leading-6 text-[#012140]">{suggestion.title}</h4>
      <p className="roadmap-description-clamp mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#233a59]">{suggestion.description}</p>
      {suggestion.categoryName && (
        <span className="mt-auto self-start pt-3 text-xs text-muted-foreground">
          {suggestion.categoryName}
        </span>
      )}
    </article>
  );
}

function SuggestionWorkspace() {
  const queryClient = useQueryClient();
  const userId = useSearchAccountId();
  const [expandedSuggestionId, setExpandedSuggestionId] = useState<number | null>(null);
  const categories = useListSuggestionCategories({
    query: { queryKey: getListSuggestionCategoriesQueryKey() },
  });
  const suggestions = useListMySuggestions({
    query: {
      queryKey: [...getListMySuggestionsQueryKey(), userId ?? "anonymous"],
      refetchInterval: 30_000,
    },
  });
  useEffect(() => {
    const targetId = window.location.hash.slice(1);
    const match = /^suggestion-(\d+)$/.exec(targetId);
    if (!suggestions.data || !match) return;
    const suggestionId = Number(match[1]);
    if (suggestions.data.some((suggestion) => suggestion.id === suggestionId)) {
      setExpandedSuggestionId(suggestionId);
    }
  }, [suggestions.data]);
  useEffect(() => {
    if (expandedSuggestionId === null) return;
    const suggestion = suggestions.data?.find((item) => item.id === expandedSuggestionId);
    if (!suggestion) return;
    window.requestAnimationFrame(() => {
      const target = window.matchMedia("(min-width: 1024px)").matches
        ? document.querySelector<HTMLElement>(`[data-testid="my-suggestion-row-${suggestion.id}"]`)
        : document.querySelector<HTMLElement>(`[data-testid="my-suggestion-card-${suggestion.id}"]`);
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, [expandedSuggestionId, suggestions.data]);
  const mutation = useCreateMySuggestion();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [protocol, setProtocol] = useState('');
  const [error, setError] = useState('');
  const [titleError, setTitleError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const cleanTitle = title.trim();
    if (cleanTitle.length < 4) {
      setTitleError("Informe um título com pelo menos 4 caracteres.");
      return;
    }
    setTitleError('');
    try {
      const result = await mutation.mutateAsync({
        data: {
          title: cleanTitle,
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
          <p className="eyebrow-pill">{translateText("Nova sugestão")}</p>
          <h2 className="mt-2 font-display text-xl font-semibold text-[#012140]">{translateText("O que podemos melhorar no PFVL?")}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{translateText("Conte o que você gostaria de fazer e como essa melhoria ajudaria no seu dia a dia.")}</p>
        </div>
        {protocol && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
            <strong className="block">{translateText("Sugestão registrada com sucesso.")}</strong>
            <span>{translateText("Protocolo de acompanhamento")}: <span className="font-mono font-bold">{protocol}</span></span>
          </div>
        )}
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
        <label className="mt-3 block text-sm font-semibold text-[#012140]">
          {translateText("Título da sugestão")}
          <input
            className="mt-1.5 w-full rounded-xl border border-[#233a59]/15 bg-white px-3.5 py-3 text-sm text-[#1d1d1b] outline-none focus:border-[#233a59] focus:ring-2 focus:ring-[#233a59]/10"
            maxLength={220}
            minLength={4}
            aria-describedby={titleError ? 'suggestion-title-error' : undefined}
            aria-invalid={Boolean(titleError)}
            onChange={(event) => {
              setTitle(event.target.value);
              if (event.target.value.trim().length >= 4) setTitleError('');
            }}
            placeholder={translateText("Ex.: Comparar o planejamento de diferentes períodos")}
            required
            value={title}
          />
        </label>
        {titleError && <p className="mt-1 text-xs text-red-700" id="suggestion-title-error" role="alert">{translateText(titleError)}</p>}
        {categories.isLoading && <p className="mt-2 text-sm text-muted-foreground">{translateText("Carregando categorias…")}</p>}
        {categories.isError && <p className="mt-2 text-sm text-red-700">{translateText("Não foi possível carregar as categorias. Atualize a página e tente novamente.")}</p>}
        {!categories.isLoading && !categories.isError && !categories.data?.length && (
          <p className="mt-3 rounded-xl bg-[#f7f8fa] p-3 text-sm text-[#233a59]">{translateText("Não há categorias de sugestão disponíveis no momento.")}</p>
        )}
        <label className="mt-3 block text-sm font-semibold text-[#012140]">
          {translateText("Descreva sua ideia")}
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
          <p>{translateText("Explique a situação, o que você propõe e como isso ajudaria. Não informe senhas, códigos de acesso ou dados financeiros sensíveis.")}</p>
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
          <p className="mt-1 text-sm text-muted-foreground">{translateText("Consulte suas ideias, acompanhe o andamento e veja as respostas da equipe.")}</p>
        </div>
        {suggestions.isLoading ? <LoadingState rows={2} /> : suggestions.isError ? (
          <QueryError retry={() => void suggestions.refetch()} />
        ) : suggestions.data?.length ? (
          <>
            <div className="hidden overflow-x-auto rounded-xl border border-[#233a59]/15 bg-white lg:block">
              <table aria-label={translateText("Minhas sugestões")} className="w-full min-w-[780px] border-collapse text-left text-sm" data-testid="my-suggestions-table">
                <thead className="bg-[#f7f8fa] text-xs uppercase tracking-wide text-[#233a59]/75">
                  <tr>
                    <th className="px-4 py-3">{translateText("Protocolo")}</th>
                    <th className="px-4 py-3">{translateText("Título")}</th>
                    <th className="px-4 py-3">{translateText("Categoria")}</th>
                    <th className="px-4 py-3">{translateText("Data de envio")}</th>
                    <th className="px-4 py-3">{translateText("Status")}</th>
                    <th className="px-4 py-3">{translateText("Ação")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#233a59]/10">
                  {suggestions.data.map((suggestion) => {
                    const expanded = expandedSuggestionId === suggestion.id;
                    const detailId = `suggestion-details-desktop-${suggestion.id}`;
                    return (
                      <Fragment key={suggestion.id}>
                        <tr data-testid={`my-suggestion-row-${suggestion.id}`}>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-[#233a59]">{suggestion.protocol}</td>
                          <td className="max-w-[260px] px-4 py-3 font-semibold text-[#012140]">{suggestion.title}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{suggestion.categoryName ?? translateText("Sem categoria")}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground"><time dateTime={suggestion.createdAt}>{formatDate(suggestion.createdAt)}</time></td>
                          <td className="px-4 py-3"><SuggestionStatusBadge suggestion={suggestion} /></td>
                          <td className="px-4 py-3">
                            <button
                              aria-controls={detailId}
                              aria-expanded={expanded}
                              className="rounded-lg px-2 py-1 font-semibold text-[#233a59] underline underline-offset-2 hover:bg-[#f7f8fa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#315571]"
                              onClick={() => setExpandedSuggestionId((current) => current === suggestion.id ? null : suggestion.id)}
                              type="button"
                            >
                              {translateText(expanded ? "Fechar" : "Abrir")}
                            </button>
                          </td>
                        </tr>
                        {expanded && (
                          <tr>
                            <td className="bg-[#fcfcfd] px-4 py-4" colSpan={6}>
                              <SuggestionDetails id={detailId} suggestion={suggestion} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 lg:hidden">
              {suggestions.data.map((suggestion) => {
                const expanded = expandedSuggestionId === suggestion.id;
                const detailId = `suggestion-details-mobile-${suggestion.id}`;
                return (
                  <article
                    className="rounded-xl border border-[#233a59]/15 bg-white p-4 shadow-sm"
                    data-testid={`my-suggestion-card-${suggestion.id}`}
                    key={suggestion.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[11px] font-bold text-[#233a59]">{translateText("Protocolo")}: {suggestion.protocol}</p>
                        <h3 className="mt-1 font-display text-base font-semibold text-[#012140]">{suggestion.title}</h3>
                      </div>
                      <SuggestionStatusBadge suggestion={suggestion} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{suggestion.categoryName ?? translateText("Sem categoria")}</span>
                      <time dateTime={suggestion.createdAt}>{translateText("Enviada em")} {formatDate(suggestion.createdAt)}</time>
                    </div>
                    <button
                      aria-controls={detailId}
                      aria-expanded={expanded}
                      className="mt-3 rounded-lg px-2 py-1 text-sm font-semibold text-[#233a59] underline underline-offset-2 hover:bg-[#f7f8fa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#315571]"
                      onClick={() => setExpandedSuggestionId((current) => current === suggestion.id ? null : suggestion.id)}
                      type="button"
                    >
                      {translateText(expanded ? "Fechar" : "Abrir")}
                    </button>
                    {expanded && <SuggestionDetails id={detailId} suggestion={suggestion} />}
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <EmptyState title="Você ainda não enviou sugestões." description="Quando enviar sua primeira ideia, você poderá acompanhar o andamento e as respostas da equipe por aqui." />
        )}
      </section>
    </div>
  );
}

function SuggestionStatusBadge({ suggestion }: { suggestion: MySuggestion }) {
  const statusTone =
    suggestion.status === "completed"
      ? "bg-emerald-50 text-emerald-800"
      : suggestion.status === "in_progress"
        ? "bg-blue-50 text-blue-800"
        : "bg-amber-50 text-amber-800";
  return (
    <span className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusTone}`}>
      {getPrivateStatusLabelFromRequest(suggestion)}
    </span>
  );
}

function SuggestionDetails({ id, suggestion }: { id: string; suggestion: MySuggestion }) {
  return (
    <div className="mt-3 rounded-xl bg-[#f7f8fa] p-3 sm:p-4" id={id} data-testid={`my-suggestion-details-${suggestion.id}`}>
      <h4 className="text-xs font-bold uppercase tracking-[.12em] text-[#233a59]/70">{translateText("Descrição original")}</h4>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#233a59]">{suggestion.message}</p>
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
    </div>
  );
}

