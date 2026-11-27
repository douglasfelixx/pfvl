import { useMemo, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Search, SlidersHorizontal } from 'lucide-react';
import { Link, useLocation, useSearch } from 'wouter';
import {
  getSearchPortalQueryKey,
  useSearchPortal,
  type SearchArea as SearchAreaType,
  type SearchResultType as SearchResultTypeValue,
} from '@workspace/api-client-react';
import { EmptyState, LoadingState } from '@/components/portal-ui';
import { useSearchAccountId } from '@/components/auth-ui';
import { translateText } from '@/lib/i18n';

const areaLabels: Record<SearchAreaType, string> = {
  content: 'Conteúdos',
  community: 'Comunidade',
  news: 'Novidades',
  tutorials: 'Tutoriais',
  roadmap: 'Próximos passos',
  private: 'Meus registros',
};

const resultLabels: Record<SearchResultTypeValue, string> = {
  article: 'Artigo',
  community_topic: 'Tópico da comunidade',
  community_comment: 'Comentário',
  update: 'Atualização',
  tutorial: 'Tutorial',
  roadmap_item: 'Item do roadmap',
  support_request: 'Solicitação de suporte',
  private_suggestion: 'Sugestão privada',
  private_update: 'Atualização privada',
};

function searchHref(q: string, area: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (area !== 'all') params.set('area', area);
  if (page > 1) params.set('page', String(page));
  const queryString = params.toString();
  return queryString ? `/search?${queryString}` : '/search';
}

export function SearchPage() {
  const userId = useSearchAccountId();
  const queryClient = useQueryClient();
  const locationSearch = useSearch();
  const [, setLocation] = useLocation();
  const urlParams = useMemo(() => new URLSearchParams(locationSearch), [locationSearch]);
  const queryText = urlParams.get('q')?.trim() ?? '';
  const activeArea = urlParams.get('area') ?? 'all';
  const requestedPage = Number(urlParams.get('page') ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const params = useMemo(() => ({
    q: queryText,
    ...(activeArea !== 'all' ? { area: activeArea as SearchAreaType } : {}),
    ...(page > 1 ? { page } : {}),
  }), [queryText, activeArea, page]);
  const results = useSearchPortal(params, {
    query: {
      enabled: queryText.length >= 2,
      queryKey: [...getSearchPortalQueryKey(params), userId ?? 'anonymous'],
      refetchOnWindowFocus: true,
    },
  });

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const q = String(form.get('q') ?? '').trim();
    const refreshedParams = {
      q,
      ...(activeArea !== 'all' ? { area: activeArea as SearchAreaType } : {}),
    };
    await queryClient.invalidateQueries({
      queryKey: [...getSearchPortalQueryKey(refreshedParams), userId ?? 'anonymous'],
      exact: true,
    });
    setLocation(searchHref(q, activeArea, 1));
  }

  function changeArea(area: string) {
    setLocation(searchHref(queryText, area, 1));
  }

  const groups = results.data?.groups ?? [];
  const hasMore = groups.some((group) => group.hasMore);
  const visibleResultCount = groups.reduce((count, group) => count + group.results.length, 0);

  return (
    <div className="page-enter search-page" data-testid="page-global-search">
      <header className="search-hero">
        <div className="search-hero-copy">
          <p className="search-kicker">{translateText('PFVL · busca geral')}</p>
          <h1>{translateText('Encontre o que ajuda no seu plano.')}</h1>
          <p>{translateText('Busque conversas, conteúdos e registros do portal em um só lugar.')}</p>
        </div>
        <span className="search-hero-mark" aria-hidden="true"><Search size={34} strokeWidth={1.35} /></span>
      </header>

      <form className="global-search-form" data-unsaved-ignore="true" onSubmit={submitSearch} data-testid="form-global-search">
        <label className="global-search-input-wrap">
          <Search aria-hidden="true" size={20} />
          <span className="sr-only">{translateText('Termo de busca')}</span>
          <input
            autoComplete="off"
            data-testid="input-global-search"
            defaultValue={queryText}
            key={queryText}
            maxLength={120}
            minLength={2}
            name="q"
            placeholder={translateText('Ex.: reserva de emergência, orçamento, investimentos')}
            required
            type="search"
          />
        </label>
        <button className="global-search-submit" data-testid="button-submit-search" type="submit">
          <Search aria-hidden="true" size={16} />
          {translateText('Buscar')}
        </button>
      </form>

      <div className="search-results-toolbar">
        <label className="search-area-filter">
          <SlidersHorizontal aria-hidden="true" size={15} />
          <span>{translateText('Buscar em')}</span>
          <select
            aria-label={translateText('Filtrar por área')}
            data-testid="select-search-area"
            onChange={(event) => changeArea(event.target.value)}
            value={activeArea}
          >
            <option value="all">{translateText('Todas as áreas')}</option>
            {Object.entries(areaLabels).map(([value, label]) => (
              <option key={value} value={value}>{translateText(label)}</option>
            ))}
          </select>
        </label>
        {queryText.length >= 2 && results.data && (
          <p className="search-result-count" data-testid="text-search-result-count">
            {visibleResultCount} {translateText(visibleResultCount === 1 ? 'resultado nesta página' : 'resultados nesta página')}
          </p>
        )}
      </div>

      {queryText.length < 2 ? (
        <div className="search-prompt" data-testid="empty-search-prompt">
          <div>
            <p>{translateText('Digite pelo menos duas letras para iniciar a busca.')}</p>
          </div>
        </div>
      ) : results.isLoading ? (
        <div data-testid="loading-search-results"><LoadingState rows={3} /></div>
      ) : results.isError ? (
        <section className="search-error" role="alert" data-testid="error-search-results">
          <strong>{translateText('A busca não foi concluída.')}</strong>
          <p>{translateText('Confira sua conexão e tente novamente.')}</p>
          <button data-testid="button-retry-search" onClick={() => void results.refetch()} type="button">
            {translateText('Tentar novamente')}
          </button>
        </section>
      ) : visibleResultCount === 0 ? (
        <div data-testid="empty-search-results">
          <EmptyState
            title="Nenhum resultado encontrado"
            description="Tente outro termo ou escolha uma área diferente para ampliar a busca."
          />
        </div>
      ) : (
        <div className="search-groups" data-testid="search-results">
          {groups.map((group) => group.results.length > 0 && (
            <section className="search-group" key={group.area} data-testid={`search-group-${group.area}`}>
              <header className="search-group-heading">
                <div>
                  <span>{translateText('Área')}</span>
                  <h2>{translateText(areaLabels[group.area])}</h2>
                </div>
                <span className="search-group-count">{group.results.length.toString().padStart(2, '0')}</span>
              </header>
              <div className="search-result-list">
                {group.results.map((result) => (
                  <article className="search-result" key={`${result.type}-${result.id}`} data-testid={`search-result-${result.type}-${result.id}`}>
                    <div className="search-result-type">{translateText(resultLabels[result.type])}</div>
                    <Link className="search-result-title" href={result.href} data-testid={`link-search-result-${result.type}-${result.id}`}>
                      <h3>{result.title}</h3>
                      <ArrowRight aria-hidden="true" size={17} />
                    </Link>
                    <p className="search-result-excerpt" data-testid={`text-search-excerpt-${result.type}-${result.id}`}>{result.excerpt}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}
          <nav aria-label={translateText('Paginação dos resultados')} className="search-pagination" data-testid="search-pagination">
            <button
              aria-label={translateText('Página anterior')}
              data-testid="button-search-previous"
              disabled={page <= 1}
              onClick={() => setLocation(searchHref(queryText, activeArea, Math.max(1, page - 1)))}
              type="button"
            >
              <ArrowLeft aria-hidden="true" size={15} />
              {translateText('Anterior')}
            </button>
            <span data-testid="text-search-page">{translateText('Página')} {results.data?.page ?? page}</span>
            <button
              aria-label={translateText('Próxima página')}
              data-testid="button-search-next"
              disabled={!hasMore}
              onClick={() => setLocation(searchHref(queryText, activeArea, page + 1))}
              type="button"
            >
              {translateText('Próxima')}
              <ArrowRight aria-hidden="true" size={15} />
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}

