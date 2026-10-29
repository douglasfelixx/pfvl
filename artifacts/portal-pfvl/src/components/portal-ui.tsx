import { type ReactNode } from 'react';
import { ArrowRight, CircleHelp, RefreshCw, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import type { Post } from '@workspace/api-client-react';
import planningCover from '../assets/posts/pfvl-cover-planning.jpg';
import investingCover from '../assets/posts/pfvl-cover-investing.jpg';
import communityCover from '../assets/posts/pfvl-cover-community.jpg';

export function getPostCoverImage(post: Pick<Post, 'kind' | 'category' | 'coverImageUrl'>): string | null {
  if (post.coverImageUrl) return post.coverImageUrl;
  if (post.kind === 'forum') return communityCover;
  if (post.kind === 'blog') {
    return post.category.toLocaleLowerCase('pt-BR').includes('invest')
      ? investingCover
      : planningCover;
  }
  return null;
}

export function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="mb-8 max-w-3xl">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-primary">{eyebrow}</p>
      <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-[-.04em] text-foreground sm:text-5xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>
    </header>
  );
}

export function SectionHeading({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="font-display text-[22px] font-semibold tracking-[-.03em]">{title}</h2>
      {href && linkLabel && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:gap-2">
          {linkLabel}
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Carregando conteúdo">
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton-card" key={index}>
          <div className="skeleton-line w-24" />
          <div className="skeleton-line mt-4 h-5 w-3/5" />
          <div className="skeleton-line mt-3 w-full" />
          <div className="skeleton-line mt-2 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function QueryError({ retry }: { retry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900" role="alert">
      <p className="font-bold">Não foi possível carregar este conteúdo.</p>
      <p className="mt-1 text-red-800">Confira sua conexão e tente novamente.</p>
      <button className="mt-4 inline-flex items-center gap-2 font-bold underline" onClick={retry} type="button">
        <RefreshCw size={14} />
        Tentar novamente
      </button>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/70 px-5 py-12 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <Sparkles size={19} />
      </span>
      <h3 className="mt-3 font-display text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

export function ReadOnlyBanner({ compact = false }: { compact?: boolean }) {
  return (
    <aside className={`read-only-banner ${compact ? 'py-3' : 'py-4'}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#dcebe1] text-[#255b4d]">
        <CircleHelp size={17} />
      </span>
      <p className="text-xs leading-5 text-[#35574d]">
        <strong className="font-bold">Espaço público para consulta.</strong>
        {' '}A participação e a administração serão habilitadas depois da configuração da autenticação.
      </p>
    </aside>
  );
}

export function formatDate(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? 'Data indisponível'
    : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}

const postLabels: Record<string, string> = {
  blog: 'Conteúdo',
  news: 'Novidade',
  forum: 'Comunidade',
  help: 'Guia',
};

export function PostCard({ post, compact = false }: { post: Post; compact?: boolean }) {
  const detailRoot = post.kind === 'forum' ? '/community' : `/${post.kind}`;
  const detailHref = `${detailRoot}/${post.id}`;
  const coverImageUrl = getPostCoverImage(post);
  return (
    <article className="post-card group">
      {coverImageUrl && !compact && (
        <img className="mb-5 aspect-video w-full rounded-xl object-cover" src={coverImageUrl} alt={post.title} width="1200" height="675" loading="lazy" />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow-pill">{postLabels[post.kind] ?? post.kind}</span>
        <span className="text-[11px] font-medium text-muted-foreground">{post.category}</span>
        <span className="ml-auto text-[11px] text-muted-foreground">{formatDate(post.createdAt)}</span>
      </div>
      <Link href={detailHref} className="mt-3 block">
        <h3 className={`font-display font-semibold leading-snug tracking-[-.025em] transition group-hover:text-primary ${compact ? 'text-lg' : 'text-xl'}`}>
          {post.title}
        </h3>
      </Link>
      <p className="mt-2 line-clamp-3 text-[13px] leading-6 text-muted-foreground">{post.excerpt || post.body}</p>
      <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-3">
        <span className="text-[11px] text-muted-foreground">Por <strong className="text-foreground">{post.authorName}</strong></span>
        <Link href={detailHref} className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
          {post.kind === 'forum' ? `${post.commentCount} comentários` : 'Ler conteúdo'}
          <ArrowRight size={13} />
        </Link>
      </div>
    </article>
  );
}

export function Surface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[22px] border border-border bg-card ${className}`}>{children}</section>;
}
