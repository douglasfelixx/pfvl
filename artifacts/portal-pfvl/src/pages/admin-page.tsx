import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  ArrowUpRight,
  BookOpen,
  CircleHelp,
  FileText,
  Image,
  Lightbulb,
  MessageCircle,
  MessageSquare,
  Newspaper,
  Pencil,
  Search,
  Star,
  Tags,
  Trash2,
  Users,
  Vote,
  type LucideIcon,
} from "lucide-react";
import {
  getGetDashboardQueryKey,
  getGetCurrentUserQueryKey,
  getListAdminPostsQueryKey,
  getListAdminUsersQueryKey,
  getListCommentsQueryKey,
  getGetActivePollQueryKey,
  getGetSiteMediaQueryKey,
  getListAdminPollsQueryKey,
  getListAdminSiteMediaQueryKey,
  getListAdminTaxonomyQueryKey,
  getListTaxonomyQueryKey,
  getListSuggestionsQueryKey,
  getListAdminTestimonialsQueryKey,
  getListTestimonialsQueryKey,
  useCloseAdminPoll,
  useCreateAdminPoll,
  useCreateAdminTaxonomy,
  useDeleteComment,
  useDeleteAdminTaxonomy,
  useDeletePost,
  useGetCurrentUser,
  useListAdminPosts,
  useListAdminUsers,
  useListAdminPolls,
  useListAdminSiteMedia,
  useListAdminTaxonomy,
  useListTaxonomy,
  useGetActivePoll,
  useListComments,
  useListSuggestions,
  useListAdminTestimonials,
  useUpdateAdminTestimonial,
  useUpdateAdminSuggestion,
  useUpdateAdminTaxonomy,
  useUpdateAdminSiteMedia,
  useUpdateAdminUser,
  useUpdatePost,
  type Post,
  type PostKind,
  type PostStatus,
  type Suggestion,
  type SuggestionStatus,
  type UserRole,
  type UserProfile,
  type UserStatus,
  type TaxonomyItem,
  type SiteMediaAsset,
  type SiteMediaSlot,
  type SiteMediaAssetUpdateExtension,
  type Testimonial,
} from "@workspace/api-client-react";
import { AuthActionGate } from "@/components/auth-ui";
import { CreatePostForm, ImageUploadField } from "@/components/community-actions";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { formatDate, LoadingState, PageHeading, Surface } from "@/components/portal-ui";
import { translateText } from "@/lib/i18n";

type AdminSection = PostKind | "comments" | "users" | "suggestions" | "polls" | "taxonomy" | "media" | "testimonials";
const inputClass =
  "rounded-lg border border-[#233a59]/15 bg-white px-2.5 py-2 text-sm text-[#012140] outline-none focus:border-[#233a59]";

function getApiResponseError(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("data" in error)) return undefined;
  const data = error.data;
  if (typeof data !== "object" || data === null || !("error" in data)) return undefined;
  return typeof data.error === "string" ? data.error : undefined;
}

function getSiteMediaSaveError(error: unknown): string {
  const apiMessage = getApiResponseError(error);
  if (apiMessage) return apiMessage;

  if (typeof error === "object" && error !== null && "status" in error) {
    const status = error.status;
    if (typeof status === "number") {
      return `${translateText("O servidor respondeu com erro HTTP")} ${status} ${translateText("ao salvar.")}`;
    }
  }

  if (error instanceof TypeError) {
    return "Não foi possível conectar ao servidor. Atualize a página e tente novamente.";
  }

  return "Não foi possível salvar a referência do arquivo.";
}

const postSectionDetails: Record<PostKind, { title: string; description: string }> = {
  blog: {
    title: "Conteúdos do blog",
    description: "Crie e organize artigos e materiais para os leitores do portal.",
  },
  forum: {
    title: "Tópicos da comunidade",
    description: "Acompanhe as conversas e publicações criadas pelos membros.",
  },
  news: {
    title: "Novidades do PFVL",
    description: "Publique atualizações, melhorias e comunicados do portal.",
  },
  help: {
    title: "Central de Ajuda",
    description: "Mantenha os guias e respostas de apoio atualizados.",
  },
};

const adminNavigation: {
  title: string;
  items: { key: AdminSection; label: string; icon: LucideIcon }[];
}[] = [
  {
    title: "Conteúdo",
    items: [
      { key: "blog", label: "Blog", icon: BookOpen },
      { key: "forum", label: "Comunidade", icon: MessageCircle },
      { key: "news", label: "Novidades", icon: Newspaper },
      { key: "help", label: "Central de Ajuda", icon: CircleHelp },
    ],
  },
  {
    title: "Gestão",
    items: [
      { key: "comments", label: "Comentários", icon: MessageSquare },
      { key: "users", label: "Contas", icon: Users },
      { key: "suggestions", label: "Sugestões", icon: Lightbulb },
      { key: "polls", label: "Enquetes", icon: Vote },
      { key: "taxonomy", label: "Configurar tags", icon: Tags },
      { key: "testimonials", label: "Depoimentos", icon: Star },
    ],
  },
  {
    title: "Site",
    items: [{ key: "media", label: "Imagem / Vídeo", icon: Image }],
  },
];

function statusLabel(status: PostStatus) {
  return translateText(status === "published" ? "Publicado" : status === "draft" ? "Rascunho" : "Oculto");
}

export function AdminPage() {
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="Administração PFVL"
        title="Painel de gestão."
        description="Gerencie publicações, comentários, contas, sugestões e enquetes."
      />
      <AuthActionGate>
        <AdminConsole />
      </AuthActionGate>
    </div>
  );
}

function AdminConsole() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AdminSection>("blog");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<number | null>(null);
  const profile = useGetCurrentUser({
    query: { queryKey: getGetCurrentUserQueryKey(), retry: false },
  });
  const posts = useListAdminPosts({
    query: { queryKey: getListAdminPostsQueryKey(), enabled: profile.data?.role === "admin" },
  });
  const users = useListAdminUsers({
    query: { queryKey: getListAdminUsersQueryKey(), enabled: profile.data?.role === "admin" },
  });
  const suggestions = useListSuggestions({
    query: { queryKey: getListSuggestionsQueryKey(), enabled: profile.data?.role === "admin" },
  });
  const taxonomy = useListAdminTaxonomy({
    query: { queryKey: getListAdminTaxonomyQueryKey(), enabled: profile.data?.role === "admin" },
  });
  const testimonials = useListAdminTestimonials({
    query: { queryKey: getListAdminTestimonialsQueryKey(), enabled: profile.data?.role === "admin" },
  });
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();

  if (profile.isLoading) return <LoadingState rows={3} />;
  if (profile.isError || profile.data?.role !== "admin") {
    return (
      <Surface className="p-6">
        <h2 className="font-display text-xl font-semibold text-[#012140]">{translateText("Acesso administrativo restrito")}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {translateText("Esta conta não tem permissão para administrar o portal. Se você acabou de criar a conta inicial, confirme o e-mail no Clerk e verifique a configuração do administrador.")}
        </p>
      </Surface>
    );
  }

  async function changePostStatus(post: Post, status: PostStatus) {
    await updatePost.mutateAsync({ postId: post.id, data: { status } });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] }),
    ]);
  }

  async function removePost(post: Post) {
    if (!window.confirm(`${translateText("Excluir permanentemente")} “${post.title}” ${translateText("e os comentários vinculados?")}`)) return;
    await deletePost.mutateAsync({ postId: post.id });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] }),
    ]);
  }

  const isPostSection = tab in postSectionDetails;
  const visiblePosts = isPostSection
    ? (posts.data ?? []).filter((post) => post.kind === tab)
    : [];
  const sectionCount = (section: AdminSection): number | string | undefined => {
    if (section in postSectionDetails) {
      return posts.isLoading
        ? "—"
        : (posts.data ?? []).filter((post) => post.kind === section).length;
    }
    if (section === "comments") {
      return posts.isLoading
        ? "—"
        : (posts.data ?? [])
            .filter((post) => post.status === "published")
            .reduce((total, post) => total + post.commentCount, 0);
    }
    if (section === "users") return users.data?.length ?? "—";
    if (section === "suggestions") return suggestions.data?.length ?? "—";
    if (section === "taxonomy") return taxonomy.data?.length ?? "—";
    if (section === "testimonials") return testimonials.data?.filter((item) => item.status === "pending").length ?? "—";
    return undefined;
  };

  return (
    <div className="mt-6 space-y-5">
      <div
        aria-label={translateText("Resumo do portal")}
        className="grid grid-cols-3 divide-x divide-[#233a59]/10 rounded-xl border border-[#233a59]/10 bg-white/70"
      >
        {[
          { label: translateText("Publicações"), value: posts.data?.length ?? "—" },
          { label: translateText("Contas cadastradas"), value: users.data?.length ?? "—" },
          { label: translateText("Sugestões recebidas"), value: suggestions.data?.length ?? "—" },
        ].map((item) => (
          <div
            className="flex min-w-0 items-center justify-between gap-2 px-3 py-2.5 sm:px-4"
            key={item.label}
          >
            <p className="truncate text-[11px] font-medium text-muted-foreground sm:text-xs">{item.label}</p>
            <p className="font-display text-base font-semibold tabular-nums text-[#012140] sm:text-lg">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-2xl bg-[#012140] p-3 text-white shadow-sm lg:sticky lg:top-24 lg:h-fit lg:p-4">
          <div className="mb-3 border-b border-white/15 px-3 pb-3">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/55">{translateText("Área administrativa")}</p>
            <p className="mt-1 text-sm font-semibold">{translateText("Gerenciar PFVL")}</p>
          </div>
          <nav aria-label={translateText("Navegação do painel administrativo")} className="space-y-4">
            {adminNavigation.map((group) => (
              <div className="min-w-0" key={group.title}>
                <p className="hidden px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-white/45 lg:block">{translateText(group.title)}</p>
                <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = tab === item.key;
                    const count = sectionCount(item.key);
                    return (
                      <button
                        aria-current={isActive ? "page" : undefined}
                        className={`flex min-h-10 shrink-0 items-center gap-2.5 rounded-xl px-3 text-left text-sm font-semibold transition lg:w-full ${isActive ? "bg-white text-[#012140] shadow-sm" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
                        data-testid={`admin-nav-${item.key}`}
                        key={item.key}
                        onClick={() => {
                          setTab(item.key);
                          setCreateOpen(false);
                          setEditingPost(null);
                        }}
                        type="button"
                      >
                        <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${isActive ? "text-[#233a59]" : "text-white/65"}`} />
                        <span className="whitespace-nowrap">{translateText(item.label)}</span>
                        {count !== undefined && (
                          <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] tabular-nums ${isActive ? "bg-[#e8e8e8] text-[#012140]" : "bg-white/10 text-white/70"}`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#233a59]/15 bg-white">
          {isPostSection && (
            <div className="space-y-4 p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.14em] text-[#233a59]/65">
                    {translateText(tab === "forum" ? "Comunidade" : tab === "blog" ? "Blog" : tab === "news" ? "Atualizações" : "Suporte")}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-semibold text-[#012140]">
                    {translateText(postSectionDetails[tab as PostKind].title)}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {translateText(postSectionDetails[tab as PostKind].description)}
                  </p>
                </div>
                <button className="auth-header-primary" data-testid="admin-create-post" onClick={() => setCreateOpen((open) => !open)} type="button">
                  {translateText(createOpen ? "Fechar criação" : "Nova publicação")}
                </button>
              </div>
              {createOpen && (
                <CreatePostForm
                  key={tab}
                  fixedKind
                  initialKind={tab as PostKind}
                  mode="admin"
                  onCreated={() => setCreateOpen(false)}
                />
              )}
              {posts.isLoading ? <LoadingState rows={3} /> : posts.isError ? (
                <p className="rounded-xl bg-[#e8e8e8] p-4 text-sm text-[#233a59]">{translateText("Não foi possível carregar as publicações.")}</p>
              ) : (
                <div className="space-y-3">
                  {visiblePosts.map((post) => (
                    <article className="rounded-xl border border-[#233a59]/15 p-4" data-testid={`admin-post-${post.id}`} key={post.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 gap-3">
                          {post.coverImageUrl ? (
                            <img alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" src={post.coverImageUrl} />
                          ) : (
                            <div className="grid h-16 w-24 shrink-0 place-items-center rounded-lg bg-[#e8e8e8] text-[#233a59]">
                              <FileText aria-hidden="true" className="h-5 w-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="font-semibold text-[#012140]">{post.title}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {post.category} · {post.authorName} · {formatDate(post.updatedAt)}
                            </p>
                            {post.commentCount > 0 && (
                              <p className="mt-1 text-xs font-semibold text-[#233a59]">
                                {post.commentCount} {post.commentCount === 1 ? "comentário" : "comentários"}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="rounded-full bg-[#e8e8e8] px-3 py-1 text-xs font-semibold text-[#233a59]">{statusLabel(post.status)}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <label className="sr-only" htmlFor={`status-${post.id}`}>{translateText("Situação")} — {post.title}</label>
                        <select
                          className={inputClass}
                          data-testid={`admin-post-status-${post.id}`}
                          disabled={updatePost.isPending}
                          id={`status-${post.id}`}
                          onChange={(event) => void changePostStatus(post, event.target.value as PostStatus)}
                          value={post.status}
                        >
                          <option value="published">{translateText("Publicado")}</option>
                          <option value="draft">{translateText("Rascunho")}</option>
                          <option value="hidden">{translateText("Oculto")}</option>
                        </select>
                        <button className="auth-header-link !border-[#233a59]/20 !text-[#233a59]" data-testid={`admin-post-edit-${post.id}`} onClick={() => setEditingPost(editingPost === post.id ? null : post.id)} type="button">
                          {translateText(editingPost === post.id ? "Fechar edição" : "Editar")}
                        </button>
                        <button className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" data-testid={`admin-post-delete-${post.id}`} disabled={deletePost.isPending} onClick={() => void removePost(post)} type="button">
                          {translateText("Excluir")}
                        </button>
                        <a className="inline-flex items-center gap-1 self-center text-sm font-semibold text-[#233a59] hover:underline" href={`/${post.kind === "forum" ? "community" : post.kind}/${post.id}`}>
                          Abrir <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      {editingPost === post.id && (
                        <EditPostForm
                          key={post.id}
                          post={post}
                          onSaved={async () => {
                            setEditingPost(null);
                            await Promise.all([
                              queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() }),
                              queryClient.invalidateQueries({ queryKey: ["/api/posts"] }),
                            ]);
                          }}
                        />
                      )}
                    </article>
                  ))}
                  {!visiblePosts.length && (
                    <div className="rounded-xl border border-dashed border-[#233a59]/25 px-5 py-10 text-center">
                      <FileText aria-hidden="true" className="mx-auto h-7 w-7 text-[#233a59]/55" />
                      <p className="mt-3 font-semibold text-[#012140]">{translateText("Ainda não há publicações nesta seção.")}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{translateText("Crie a primeira para começar a organizar este espaço.")}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "taxonomy" && (
            <TaxonomyManager
              items={taxonomy.data ?? []}
              isLoading={taxonomy.isLoading}
              isError={taxonomy.isError}
            />
          )}

          {tab === "media" && <SiteMediaManager />}

          {tab === "comments" && <AdminCommentModeration posts={posts.data ?? []} />}

          {tab === "users" && (
            <div className="space-y-4 p-4 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.14em] text-[#233a59]/65">{translateText("Gestão de acessos")}</p>
                <h2 className="mt-1 font-display text-xl font-semibold text-[#012140]">{translateText("Contas e permissões")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{translateText("Altere papéis de acesso e suspenda ou reative contas.")}</p>
              </div>
              {users.isLoading ? <LoadingState rows={3} /> : users.isError ? (
                <p className="text-sm text-muted-foreground">{translateText("Não foi possível carregar as contas.")}</p>
              ) : (
                <UsersTable users={users.data ?? []} />
              )}
            </div>
          )}

          {tab === "suggestions" && (
            <div className="space-y-4 p-4 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.14em] text-[#233a59]/65">{translateText("Voz da comunidade")}</p>
                <h2 className="mt-1 font-display text-xl font-semibold text-[#012140]">{translateText("Sugestões da comunidade")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{translateText("Atualize o andamento das ideias recebidas.")}</p>
              </div>
              {suggestions.isLoading ? <LoadingState rows={3} /> : suggestions.isError ? (
                <p className="text-sm text-muted-foreground">{translateText("Não foi possível carregar as sugestões.")}</p>
              ) : (
                <SuggestionsTable suggestions={suggestions.data ?? []} />
              )}
            </div>
          )}

          {tab === "polls" && <AdminPollManagement />}
          {tab === "testimonials" && (
            <AdminTestimonialsPanel
              testimonials={testimonials.data ?? []}
              isLoading={testimonials.isLoading}
              isError={testimonials.isError}
              retry={() => void testimonials.refetch()}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function AdminTestimonialsPanel({
  testimonials,
  isLoading,
  isError,
  retry,
}: {
  testimonials: Testimonial[];
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
}) {
  const queryClient = useQueryClient();
  const updateTestimonial = useUpdateAdminTestimonial();
  const [feedback, setFeedback] = useState("");
  const [failure, setFailure] = useState("");

  async function review(testimonialId: number, status: "approved" | "rejected") {
    setFeedback("");
    setFailure("");
    try {
      await updateTestimonial.mutateAsync({ testimonialId, data: { status } });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAdminTestimonialsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListTestimonialsQueryKey() }),
      ]);
      setFeedback(translateText(status === "approved" ? "Depoimento aprovado e publicado." : "Depoimento recusado."));
    } catch {
      setFailure(translateText("Não foi possível atualizar este depoimento. Tente novamente."));
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#233a59]/65">{translateText("Voz da comunidade")}</p>
        <h2 className="mt-1 font-display text-xl font-semibold text-[#012140]">{translateText("Revisão de depoimentos")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{translateText("Leia cada avaliação antes de aprová-la para a página inicial ou recusá-la.")}</p>
      </header>
      {feedback && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800" role="status">{feedback}</p>}
      {failure && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800" role="alert">{failure}</p>}
      {isLoading ? <LoadingState rows={3} /> : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <p>{translateText("Não foi possível carregar os depoimentos.")}</p>
          <button className="mt-2 font-semibold underline" type="button" onClick={retry}>{translateText("Tentar novamente")}</button>
        </div>
      ) : testimonials.length ? (
        <div className="space-y-3">
          {testimonials.map((item) => (
            <article className="rounded-xl border border-[#233a59]/15 bg-[#fbfcfd] p-4 sm:p-5" key={item.id} data-testid={`admin-testimonial-${item.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[#012140]">{item.authorName}</h3>
                  <div className="mt-1 flex items-center gap-1 text-amber-500" aria-label={`${item.rating} ${translateText(item.rating === 1 ? "estrela" : "estrelas")}`}>
                    {Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} fill={index < item.rating ? "currentColor" : "none"} />)}
                    <span className="ml-1 text-xs font-semibold text-[#596773]">{item.rating}/5</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`testimonial-status-chip status-${item.status}`}>{translateText(item.status === "pending" ? "Em análise" : item.status === "approved" ? "Aprovado" : "Recusado")}</span>
                  <time className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</time>
                </div>
              </div>
              <blockquote className="mt-4 whitespace-pre-wrap border-l-2 border-[#a8bacb] pl-4 text-sm leading-7 text-[#394b5c]">{item.body}</blockquote>
              {item.status === "pending" && (
                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[#233a59]/10 pt-4">
                  <button className="auth-header-link !border-red-200 !text-red-700 hover:!bg-red-50" type="button" disabled={updateTestimonial.isPending} onClick={() => void review(item.id, "rejected")} data-testid={`button-reject-testimonial-${item.id}`}>{translateText("Recusar")}</button>
                  <button className="auth-header-primary" type="button" disabled={updateTestimonial.isPending} onClick={() => void review(item.id, "approved")} data-testid={`button-approve-testimonial-${item.id}`}>{translateText("Aprovar e publicar")}</button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#233a59]/25 px-5 py-10 text-center">
          <Star className="mx-auto h-7 w-7 text-[#233a59]/55" />
          <p className="mt-3 font-semibold text-[#012140]">{translateText("Nenhum depoimento enviado ainda.")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{translateText("Os depoimentos enviados pelos membros aparecerão para revisão.")}</p>
        </div>
      )}
    </div>
  );
}

function SiteMediaManager() {
  const media = useListAdminSiteMedia({
    query: { queryKey: getListAdminSiteMediaQueryKey() },
  });
  const slots: {
    slot: SiteMediaSlot;
    folder: string;
    title: string;
    description: string;
    extensions: SiteMediaAssetUpdateExtension[];
  }[] = [
    {
      slot: "home_image",
      folder: "imagemprincipal",
      title: "Imagem principal da Home",
      description: "Imagem de fundo da página inicial. O painel não envia o arquivo ao R2.",
      extensions: ["jpg", "jpeg", "png", "webp"],
    },
    {
      slot: "presentation_video",
      folder: "videop",
      title: "Vídeo de apresentação",
      description: "Vídeo exibido na página de apresentação do PFVL. O painel não envia o arquivo ao R2.",
      extensions: ["mp4", "webm"],
    },
  ];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#233a59]/65">{translateText("Arquivos no R2")}</p>
        <h2 className="mt-1 font-display text-xl font-semibold text-[#012140]">{translateText("Imagem / Vídeo")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {translateText("Informe o nome e a extensão exatos do arquivo já colocado no R2. A pasta é fixa; para trocar a mídia, substitua o arquivo no bucket e atualize esta referência.")}
        </p>
      </div>

      {media.isLoading ? (
        <LoadingState rows={2} />
      ) : media.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <p className="font-semibold">{translateText("Não foi possível carregar as mídias.")}</p>
          <p className="mt-1">{translateText("Confira sua sessão de administrador e tente novamente.")}</p>
          <button className="mt-3 font-semibold underline" onClick={() => void media.refetch()} type="button">{translateText("Tentar novamente")}</button>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {slots.map((item) => {
            const asset = media.data?.find((current) => current.slot === item.slot);
            return asset ? (
              <SiteMediaAssetEditor
                asset={asset}
                description={item.description}
                extensions={item.extensions}
                folder={item.folder}
                key={item.slot}
                title={item.title}
              />
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

function SiteMediaAssetEditor({
  asset,
  description,
  extensions,
  folder,
  title,
}: {
  asset: SiteMediaAsset;
  description: string;
  extensions: SiteMediaAssetUpdateExtension[];
  folder: string;
  title: string;
}) {
  const queryClient = useQueryClient();
  const update = useUpdateAdminSiteMedia();
  const [name, setName] = useState(asset.name ?? "");
  const [extension, setExtension] = useState<SiteMediaAssetUpdateExtension>(
    asset.extension as SiteMediaAssetUpdateExtension,
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(asset.name ?? "");
    setExtension(asset.extension as SiteMediaAssetUpdateExtension);
  }, [asset.extension, asset.name]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    try {
      await update.mutateAsync({
        slot: asset.slot,
        data: { name: name.trim() || null, extension },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAdminSiteMediaQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetSiteMediaQueryKey() }),
      ]);
      setSaved(true);
    } catch (saveError) {
      setError(getSiteMediaSaveError(saveError));
    }
  }

  return (
    <form className="rounded-xl border border-[#233a59]/15 p-4 sm:p-5" onSubmit={(event) => void save(event)}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8e8e8] text-[#233a59]">
          <Image aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold text-[#012140]">{translateText(title)}</h3>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{translateText(description)}</p>
        </div>
      </div>

      <p className="mt-4 rounded-lg bg-[#f5f7fa] px-3 py-2 text-xs text-[#233a59]">
        {translateText("Pasta do R2:")} <code className="font-semibold">{folder}/</code>
        <span className="mx-1.5 text-[#233a59]/45">·</span>
        {translateText("Arquivo atual:")} <code className="font-semibold">{asset.name ? `${asset.name}.${asset.extension}` : translateText("não configurado")}</code>
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px]">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-[#012140]" htmlFor={`media-name-${asset.slot}`}>
            {translateText("Nome do arquivo")}
          </label>
          <input
            autoComplete="off"
            className={`${inputClass} w-full`}
            data-testid={`site-media-name-${asset.slot}`}
            id={`media-name-${asset.slot}`}
            maxLength={120}
            onChange={(event) => {
              setName(event.target.value);
              setSaved(false);
            }}
            pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,119}"
            placeholder={translateText("imagem")}
            title={translateText("Use letras sem acento, números, hífen ou sublinhado; não inclua a extensão.")}
            value={name}
          />
          <p className="mt-1 text-xs text-muted-foreground">{translateText("Sem a extensão e sem a pasta do R2.")}</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-[#012140]" htmlFor={`media-extension-${asset.slot}`}>
            {translateText("Extensão")}
          </label>
          <select
            className={`${inputClass} w-full`}
            data-testid={`site-media-extension-${asset.slot}`}
            id={`media-extension-${asset.slot}`}
            onChange={(event) => {
              setExtension(event.target.value as SiteMediaAssetUpdateExtension);
              setSaved(false);
            }}
            value={extension}
          >
            {extensions.map((option) => (
              <option key={option} value={option}>{option.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {translateText("O objeto precisa existir no R2 como")} <code>{folder}/{name.trim() || "nome"}.{extension}</code>.
      </p>

      {error && <p className="mt-3 text-sm font-medium text-red-700" role="alert">{translateText(error)}</p>}
      {saved && <p className="mt-3 text-sm font-medium text-emerald-700" role="status">{translateText("Referência do arquivo atualizada.")}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          className="auth-header-primary"
          data-testid={`site-media-save-${asset.slot}`}
          disabled={update.isPending}
          type="submit"
        >
          {translateText(update.isPending ? "Salvando…" : "Salvar referência")}
        </button>
        <span className="text-xs text-muted-foreground">{translateText("Nenhum upload é feito por esta página.")}</span>
      </div>
    </form>
  );
}

function TaxonomyManager({
  items,
  isLoading,
  isError,
}: {
  items: TaxonomyItem[];
  isLoading: boolean;
  isError: boolean;
}) {
  const client = useQueryClient();
  const create = useCreateAdminTaxonomy();
  const remove = useDeleteAdminTaxonomy();
  const update = useUpdateAdminTaxonomy();
  const [kind, setKind] = useState<PostKind>("blog");
  const [type, setType] = useState<"category" | "tag">("category");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [message, setMessage] = useState("");

  async function refreshCatalog(refreshPosts = false) {
    const queries = [
      client.invalidateQueries({ queryKey: getListAdminTaxonomyQueryKey() }),
      client.invalidateQueries({ queryKey: ["/api/taxonomy"] }),
    ];
    if (refreshPosts) {
      queries.push(
        client.invalidateQueries({ queryKey: getListAdminPostsQueryKey() }),
        client.invalidateQueries({ queryKey: ["/api/posts"] }),
        client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }),
        client.invalidateQueries({
          predicate: (query) =>
            typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("/api/posts/"),
        }),
      );
    }
    await Promise.all(queries);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await create.mutateAsync({ data: { kind, type, name: name.trim() } });
      setName("");
      setMessage("Opção cadastrada e disponível para novas publicações.");
      await refreshCatalog();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível cadastrar esta opção.");
    }
  }

  async function deleteItem(item: TaxonomyItem) {
    if (!window.confirm(`Excluir ${item.type === "category" ? "a categoria" : "o marcador"} “${item.name}”?`)) return;
    setMessage("");
    try {
      await remove.mutateAsync({ taxonomyId: item.id });
      setMessage("Opção excluída.");
      await refreshCatalog();
    } catch (error) {
      setMessage(
        getApiResponseError(error) ??
          (error instanceof Error ? error.message : "Não foi possível excluir esta opção."),
      );
    }
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>, item: TaxonomyItem) {
    event.preventDefault();
    setMessage("");
    try {
      await update.mutateAsync({ taxonomyId: item.id, data: { name: editName.trim() } });
      setEditingId(null);
      setEditName("");
      setMessage("Nome atualizado nas publicações existentes e no catálogo.");
      await refreshCatalog(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível editar esta opção.");
    }
  }

  const kindLabel: Record<PostKind, string> = {
    blog: "Blog",
    forum: "Comunidade",
    news: "Novidades",
    help: "Central de Ajuda",
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#233a59]/65">{translateText("Organização do conteúdo")}</p>
        <h2 className="mt-1 font-display text-xl font-semibold text-[#012140]">{translateText("Configurar tags")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {translateText("Cadastre as opções que autores e membros poderão escolher. Ao editar o nome, as publicações existentes também serão atualizadas; a exclusão continua bloqueada enquanto a opção estiver em uso.")}
        </p>
      </header>

      <form className="grid gap-3 rounded-xl bg-[#f6f7f9] p-4 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end" onSubmit={submit}>
        <label className="block text-sm font-semibold text-[#012140]">
          {translateText("Área")}
          <select className={`${inputClass} mt-1.5 w-full`} onChange={(event) => setKind(event.target.value as PostKind)} value={kind}>
            <option value="blog">Blog</option>
            <option value="forum">{translateText("Comunidade")}</option>
            <option value="news">{translateText("Novidades")}</option>
            <option value="help">{translateText("Central de Ajuda")}</option>
          </select>
        </label>
        <label className="block text-sm font-semibold text-[#012140]">
          {translateText("Tipo")}
          <select className={`${inputClass} mt-1.5 w-full`} onChange={(event) => setType(event.target.value as "category" | "tag")} value={type}>
            <option value="category">{translateText("Categoria")}</option>
            <option value="tag">{translateText("Marcador")}</option>
          </select>
        </label>
        <label className="block text-sm font-semibold text-[#012140]">
          {translateText("Nome")}
          <input
            className={`${inputClass} mt-1.5 w-full`}
            maxLength={type === "tag" ? 40 : 100}
            minLength={2}
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </label>
        <button className="auth-header-primary" disabled={create.isPending} type="submit">
          {translateText(create.isPending ? "Salvando…" : "Adicionar")}
        </button>
      </form>
      {message && <p className="text-sm text-[#233a59]" role="status">{translateText(message)}</p>}

      {isLoading ? <LoadingState rows={3} /> : isError ? (
        <p className="rounded-xl bg-[#e8e8e8] p-4 text-sm text-[#233a59]">{translateText("Não foi possível carregar as categorias e marcadores.")}</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {(["blog", "forum", "news", "help"] as const).map((area) => (
            <section className="rounded-xl border border-[#233a59]/15 p-4" key={area}>
              <h3 className="font-semibold text-[#012140]">{kindLabel[area]}</h3>
              {(["category", "tag"] as const).map((itemType) => {
                const group = items.filter((item) => item.kind === area && item.type === itemType);
                return (
                  <div className="mt-3" key={itemType}>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {itemType === "category" ? "Categorias" : "Marcadores"}
                    </h4>
                    {group.length ? (
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {group.map((item) => (
                          <li className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#e8e8e8] px-3 py-1.5 text-sm text-[#012140]" key={item.id}>
                            {editingId === item.id ? (
                              <form className="flex flex-wrap items-center gap-2" onSubmit={(event) => void saveEdit(event, item)}>
                                <label className="sr-only" htmlFor={`taxonomy-edit-${item.id}`}>{translateText("Editar")} {item.name}</label>
                                <input
                                  autoFocus
                                  className="min-w-0 rounded-md border border-[#233a59]/20 bg-white px-2 py-1 text-sm"
                                  id={`taxonomy-edit-${item.id}`}
                                  maxLength={item.type === "tag" ? 40 : 100}
                                  minLength={2}
                                  onChange={(event) => setEditName(event.target.value)}
                                  required
                                  value={editName}
                                />
                                <button className="font-semibold text-[#012140] hover:underline disabled:opacity-50" disabled={update.isPending} type="submit">
                                  {translateText(update.isPending ? "Salvando…" : "Salvar")}
                                </button>
                                <button
                                  className="text-[#526171] hover:underline"
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditName("");
                                  }}
                                  type="button"
                                >
                                  {translateText("Cancelar")}
                                </button>
                              </form>
                            ) : (
                              <>
                                <span className="break-words">{item.name}</span>
                                <button
                                  aria-label={`${translateText("Editar")} ${item.name}`}
                                  className="ml-1 rounded-full p-1 text-[#526171] hover:bg-white hover:text-[#012140] disabled:opacity-50"
                                  disabled={update.isPending}
                                  onClick={() => {
                                    setEditingId(item.id);
                                    setEditName(item.name);
                                    setMessage("");
                                  }}
                                  title={`Editar ${item.name}`}
                                  type="button"
                                >
                                  <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  aria-label={`${translateText("Excluir")} ${item.name}`}
                                  className="rounded-full p-1 text-[#526171] hover:bg-white hover:text-red-700 disabled:opacity-50"
                                  disabled={remove.isPending || update.isPending}
                                  onClick={() => void deleteItem(item)}
                                  type="button"
                                >
                                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : <p className="mt-1 text-sm text-muted-foreground">{translateText("Nenhuma opção cadastrada.")}</p>}
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminPollManagement() {
  const client = useQueryClient();
  const form = useForm<{ question: string; details: string }>({
    defaultValues: { question: "", details: "" },
  });
  const [message, setMessage] = useState("");
  const polls = useListAdminPolls({ query: { queryKey: getListAdminPollsQueryKey() } });
  const active = useGetActivePoll({ query: { queryKey: getGetActivePollQueryKey() } });
  const create = useCreateAdminPoll();
  const close = useCloseAdminPoll();

  async function refreshPolls() {
    await Promise.all([
      client.invalidateQueries({ queryKey: getListAdminPollsQueryKey() }),
      client.invalidateQueries({ queryKey: getGetActivePollQueryKey() }),
    ]);
  }

  async function submit(values: { question: string; details: string }) {
    setMessage("");
    try {
      await create.mutateAsync({ data: { question: values.question.trim(), details: values.details.trim() || undefined } });
      form.reset();
      setMessage("Enquete publicada. A anterior, se ativa, foi encerrada.");
      await refreshPolls();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar a enquete.");
    }
  }

  async function closePoll(pollId: number) {
    if (!window.confirm("Encerrar esta enquete? Os votos ficam disponíveis no histórico.")) return;
    setMessage("");
    try {
      await close.mutateAsync({ pollId });
      setMessage("Enquete encerrada.");
      await refreshPolls();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível encerrar a enquete.");
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-[#012140]">{translateText("Enquetes da comunidade")}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{translateText("Publique uma pergunta para receber avaliações positivas ou negativas. Apenas uma enquete pode ficar ativa por vez.")}</p>
      </div>
      <Form {...form}>
        <form className="grid gap-3 rounded-xl border border-[#233a59]/15 bg-[#f6f7f9] p-4 sm:p-5" onSubmit={form.handleSubmit(submit)}>
          <FormField
            control={form.control}
            name="question"
            rules={{ validate: (value) => value.trim().length >= 5 || "Use pelo menos 5 caracteres." }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-[#012140]">{translateText("Pergunta da enquete")}</FormLabel>
                <FormControl>
                  <input
                    {...field}
                    className={`${inputClass} mt-1.5 w-full`}
                    data-testid="input-poll-question"
                    maxLength={220}
                    minLength={5}
                    placeholder={translateText("Ex.: O que mais ajudaria no seu planejamento?")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="details"
            rules={{ maxLength: { value: 1200, message: "Use até 1.200 caracteres." } }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-[#012140]">{translateText("Contexto (opcional)")}</FormLabel>
                <FormControl>
                  <textarea
                    {...field}
                    className={`${inputClass} mt-1.5 min-h-24 w-full resize-y`}
                    data-testid="input-poll-details"
                    maxLength={1200}
                    placeholder={translateText("Explique por que essa opinião é importante.")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {message && <p className="text-sm text-[#233a59]" role="status">{translateText(message)}</p>}
          <div>
            <button className="auth-header-primary" data-testid="button-poll-create" disabled={create.isPending || form.formState.isSubmitting} type="submit">
              {translateText(create.isPending ? "Publicando…" : "Publicar enquete")}
            </button>
          </div>
        </form>
      </Form>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3"><h3 className="font-display text-lg font-semibold text-[#012140]">{translateText("Histórico e resultados")}</h3><button className="auth-header-link !border-[#233a59]/20 !text-[#233a59]" onClick={() => { void polls.refetch(); void active.refetch(); }} type="button">{translateText("Atualizar")}</button></div>
        {polls.isLoading ? <LoadingState rows={2} /> : polls.isError ? <p className="rounded-xl bg-[#e8e8e8] p-4 text-sm text-[#233a59]">{translateText("Não foi possível carregar as enquetes. Tente atualizar.")}</p> : (
          <div className="space-y-3">
            {(polls.data ?? []).map((poll) => (
              <article className="rounded-xl border border-[#233a59]/15 bg-white p-4 sm:p-5" key={poll.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2"><span className={poll.status === "active" ? "rounded-full bg-[#e4efe9] px-2.5 py-1 text-[11px] font-bold text-[#285b48]" : "rounded-full bg-[#e8e8e8] px-2.5 py-1 text-[11px] font-bold text-[#233a59]"}>{poll.status === "active" ? "Ativa" : "Encerrada"}</span><span className="text-xs text-muted-foreground">{formatDate(poll.createdAt)}</span></div>
                    <h4 className="font-semibold leading-6 text-[#012140]">{poll.question}</h4>
                    {poll.details && <p className="mt-1 text-sm leading-6 text-muted-foreground">{poll.details}</p>}
                  </div>
                  {poll.status === "active" && <button className="rounded-lg border border-[#233a59]/25 px-3 py-2 text-sm font-semibold text-[#233a59] hover:bg-[#e8e8e8]" disabled={close.isPending} onClick={() => void closePoll(poll.id)} type="button">{translateText(close.isPending ? "Encerrando…" : "Encerrar enquete")}</button>}
                </div>
                <div className="mt-4 grid max-w-sm grid-cols-2 gap-2">
                  <div className="rounded-lg bg-[#e8e8e8] p-3"><span className="block text-xs text-[#233a59]">{translateText("Curtidas")}</span><strong className="mt-1 block text-xl text-[#012140]">{poll.likeCount}</strong></div>
                  <div className="rounded-lg bg-[#e8e8e8] p-3"><span className="block text-xs text-[#233a59]">{translateText("Não curtidas")}</span><strong className="mt-1 block text-xl text-[#012140]">{poll.dislikeCount}</strong></div>
                </div>
              </article>
            ))}
            {!polls.data?.length && <p className="rounded-xl border border-dashed border-[#233a59]/25 p-6 text-center text-sm text-muted-foreground">{translateText("Nenhuma enquete publicada ainda.")}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function EditPostForm({ post, onSaved }: { post: Post; onSaved: () => void | Promise<void> }) {
  const updatePost = useUpdatePost();
  const taxonomyParams = { kind: post.kind };
  const taxonomy = useListTaxonomy(taxonomyParams, {
    query: { queryKey: getListTaxonomyQueryKey(taxonomyParams) },
  });
  const [title, setTitle] = useState(post.title);
  const [category, setCategory] = useState(post.category);
  const [tags, setTags] = useState<string[]>(post.tags ?? []);
  const [body, setBody] = useState(post.body);
  const [imageUrl, setImageUrl] = useState(post.coverImageUrl ?? "");
  const [message, setMessage] = useState("");
  const categories = (taxonomy.data ?? []).filter((item) => item.type === "category");
  const tagOptions = (taxonomy.data ?? []).filter((item) => item.type === "tag");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await updatePost.mutateAsync({
        postId: post.id,
        data: {
          title: title.trim(),
          category,
          tags,
          body: body.trim(),
          coverImageUrl: imageUrl.trim() || null,
        },
      });
      setMessage("Alterações salvas.");
      await onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }

  return (
    <form className="mt-4 space-y-3 rounded-xl bg-[#f6f7f9] p-4" onSubmit={submit}>
      <label className="block text-sm font-semibold text-[#012140]">
        {translateText("Título")}
        <input className={`${inputClass} mt-1.5 w-full`} maxLength={220} minLength={4} onChange={(event) => setTitle(event.target.value)} required value={title} />
      </label>
      <label className="block text-sm font-semibold text-[#012140]">
        {translateText("Categoria")}
        <select className={`${inputClass} mt-1.5 w-full`} onChange={(event) => setCategory(event.target.value)} required value={category}>
          <option value="">{translateText("Selecione uma categoria")}</option>
          {categories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
        </select>
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-[#012140]">{translateText("Marcadores")} <span className="font-normal text-muted-foreground">{translateText("(opcional, até 8)")}</span></legend>
        <div className="flex flex-wrap gap-2">
          {tagOptions.map((item) => {
            const checked = tags.includes(item.name);
            return (
              <label className="inline-flex items-center gap-2 rounded-full border border-[#233a59]/15 px-3 py-2 text-sm text-[#012140]" key={item.id}>
                <input
                  checked={checked}
                  disabled={!checked && tags.length >= 8}
                  onChange={(event) => setTags((selected) => event.target.checked ? [...selected, item.name] : selected.filter((tag) => tag !== item.name))}
                  type="checkbox"
                />
                {item.name}
              </label>
            );
          })}
        </div>
      </fieldset>
      <label className="block text-sm font-semibold text-[#012140]">
        {translateText("Conteúdo")}
        <textarea className={`${inputClass} mt-1.5 min-h-36 w-full resize-y`} maxLength={20000} minLength={10} onChange={(event) => setBody(event.target.value)} required value={body} />
      </label>
      <ImageUploadField imageUrl={imageUrl} onImageUrlChange={setImageUrl} required={post.kind === "blog" || post.kind === "forum"} />
      {message && <p className="text-sm text-[#233a59]" role="status">{translateText(message)}</p>}
      <button className="auth-header-primary" disabled={updatePost.isPending} type="submit">
        {translateText(updatePost.isPending ? "Salvando…" : "Salvar alterações")}
      </button>
    </form>
  );
}

function UsersTable({ users }: { users: UserProfile[] }) {
  const queryClient = useQueryClient();
  const updateUser = useUpdateAdminUser();
  return (
    <div className="space-y-3">
      {users.map((user) => (
        <article className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[minmax(0,1fr)_150px_150px]" key={user.id}>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[#012140]">{user.displayName}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{user.email} {translateText("· entrou em")} {formatDate(user.createdAt)}</p>
          </div>
          <label className="text-xs font-semibold text-[#233a59]">
            {translateText("Papel")}
            <select
              className={`${inputClass} mt-1 block w-full`}
              disabled={updateUser.isPending}
              onChange={async (event) => {
                try {
                  await updateUser.mutateAsync({ userId: user.id, data: { role: event.target.value as UserRole } });
                  await queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
                } catch {
                  await queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
                }
              }}
              value={user.role}
            >
              <option value="member">{translateText("Membro")}</option>
              <option value="admin">{translateText("Administrador")}</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-[#233a59]">
            {translateText("Conta")}
            <select
              className={`${inputClass} mt-1 block w-full`}
              disabled={updateUser.isPending}
              onChange={async (event) => {
                try {
                  await updateUser.mutateAsync({ userId: user.id, data: { status: event.target.value as UserStatus } });
                  await queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
                } catch {
                  await queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
                }
              }}
              value={user.status}
            >
              <option value="active">{translateText("Ativa")}</option>
              <option value="suspended">{translateText("Suspensa")}</option>
            </select>
          </label>
        </article>
      ))}
      {!users.length && <p className="text-sm text-muted-foreground">{translateText("Nenhuma conta cadastrada ainda.")}</p>}
    </div>
  );
}

function SuggestionsTable({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  const queryClient = useQueryClient();
  const updateSuggestion = useUpdateAdminSuggestion();
  return (
    <div className="space-y-3">
      {suggestions.map((suggestion) => (
        <article className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[minmax(0,1fr)_190px]" key={suggestion.id}>
          <div>
            <p className="font-semibold text-[#012140]">{suggestion.title}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{suggestion.details}</p>
            <p className="mt-2 text-xs text-muted-foreground">{suggestion.authorName} · {suggestion.category}</p>
          </div>
          <label className="text-xs font-semibold text-[#233a59]">
            {translateText("Andamento")}
            <select
              className={`${inputClass} mt-1 block w-full`}
              disabled={updateSuggestion.isPending}
              onChange={async (event) => {
                await updateSuggestion.mutateAsync({
                  suggestionId: suggestion.id,
                  data: { status: event.target.value as SuggestionStatus },
                });
                await queryClient.invalidateQueries({ queryKey: getListSuggestionsQueryKey() });
              }}
              value={suggestion.status}
            >
              <option value="under_review">{translateText("Em análise")}</option>
              <option value="planned">{translateText("Planejada")}</option>
              <option value="in_progress">{translateText("Em andamento")}</option>
              <option value="completed">{translateText("Concluída")}</option>
            </select>
          </label>
        </article>
      ))}
      {!suggestions.length && <p className="text-sm text-muted-foreground">{translateText("Nenhuma sugestão cadastrada.")}</p>}
    </div>
  );
}

function AdminCommentModeration({ posts }: { posts: Post[] }) {
  const publishedPosts = posts
    .filter((post) => post.status === "published")
    .sort((a, b) => b.commentCount - a.commentCount || b.updatedAt.localeCompare(a.updatedAt));
  const [postId, setPostId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");
  const [commentFilter, setCommentFilter] = useState<"all" | "comments" | "replies">("all");
  const [moderationError, setModerationError] = useState("");
  useEffect(() => {
    const currentPublishedPosts = posts
      .filter((post) => post.status === "published")
      .sort((a, b) => b.commentCount - a.commentCount || b.updatedAt.localeCompare(a.updatedAt));
    if (!currentPublishedPosts.length) {
      setPostId(null);
    } else if (postId === null || !currentPublishedPosts.some((post) => post.id === postId)) {
      setPostId(currentPublishedPosts[0].id);
    }
  }, [posts, postId]);
  const queryClient = useQueryClient();
  const comments = useListComments(postId ?? 0, {
    query: {
      queryKey: getListCommentsQueryKey(postId ?? 0),
      enabled: postId !== null,
    },
  });
  const deleteComment = useDeleteComment();
  const selectedPost = publishedPosts.find((post) => post.id === postId);
  const visibleComments = (comments.data ?? []).filter((comment) => {
    const isReply = comment.parentCommentId !== null;
    const matchesFilter =
      commentFilter === "all" ||
      (commentFilter === "replies" && isReply) ||
      (commentFilter === "comments" && !isReply);
    const query = searchText.trim().toLocaleLowerCase("pt-BR");
    const matchesSearch =
      !query ||
      comment.authorName.toLocaleLowerCase("pt-BR").includes(query) ||
      comment.body.toLocaleLowerCase("pt-BR").includes(query);
    return matchesFilter && matchesSearch;
  });
  const replyCount = (comments.data ?? []).filter((comment) => comment.parentCommentId !== null).length;
  const topLevelCount = (comments.data ?? []).length - replyCount;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#233a59]/65">{translateText("Revisão da comunidade")}</p>
        <h2 className="mt-1 font-display text-xl font-semibold text-[#012140]">{translateText("Moderação de comentários")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{translateText("Localize uma conversa, filtre respostas e remova conteúdo quando necessário.")}</p>
      </div>

      {moderationError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {moderationError}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <section aria-label={translateText("Publicações com comentários")} className="min-w-0 rounded-xl border border-[#233a59]/15 bg-[#f8f9fb] p-3">
          <div className="flex items-center justify-between gap-2 px-1 pb-2">
            <h3 className="text-sm font-bold text-[#012140]">{translateText("Conversas")}</h3>
            <span className="text-xs text-muted-foreground">{publishedPosts.length} {translateText("publicações")}</span>
          </div>
          <div className="max-h-[540px] space-y-1 overflow-y-auto">
            {publishedPosts.map((post) => {
              const isSelected = post.id === postId;
              return (
                <button
                  aria-pressed={isSelected}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition ${isSelected ? "border-[#233a59]/25 bg-white shadow-sm" : "border-transparent hover:bg-white"}`}
                  data-testid={`moderate-post-${post.id}`}
                  key={post.id}
                  onClick={() => {
                    setPostId(post.id);
                    setSearchText("");
                    setCommentFilter("all");
                    setModerationError("");
                  }}
                  type="button"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[#012140]">{post.title}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {translateText(post.kind === "forum" ? "Comunidade" : post.kind === "blog" ? "Blog" : post.kind === "news" ? "Novidades" : "Ajuda")}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold tabular-nums ${isSelected ? "bg-[#012140] text-white" : "bg-[#e8e8e8] text-[#233a59]"}`}>
                      {post.commentCount}
                    </span>
                  </span>
                </button>
              );
            })}
            {!publishedPosts.length && (
              <p className="rounded-lg bg-white px-3 py-4 text-sm text-muted-foreground">{translateText("Não há publicações publicadas para revisar.")}</p>
            )}
          </div>
        </section>

        <section aria-label={translateText("Comentários da publicação selecionada")} className="min-w-0">
          {selectedPost ? (
            <>
              <div className="rounded-xl border border-[#233a59]/15 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#233a59]/65">{translateText("Publicação selecionada")}</p>
                    <h3 className="mt-1 truncate font-semibold text-[#012140]">{selectedPost.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedPost.authorName} · {formatDate(selectedPost.updatedAt)}
                    </p>
                  </div>
                  <a
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#233a59]/20 px-3 py-2 text-xs font-semibold text-[#233a59] hover:bg-[#e8e8e8]"
                    href={`/${selectedPost.kind === "forum" ? "community" : selectedPost.kind}/${selectedPost.id}`}
                  >
                    {translateText("Abrir conversa")} <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-[#233a59]/15 p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-[#012140]">{translateText("Comentários")}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {comments.data?.length ?? 0} {translateText("no total ·")} {topLevelCount} {translateText("comentários")} · {replyCount} {translateText("respostas")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 rounded-lg bg-[#e8e8e8] p-1" aria-label={translateText("Filtrar comentários")}>
                    {([
                      ["all", "Todos", comments.data?.length ?? 0],
                      ["comments", "Comentários", topLevelCount],
                      ["replies", "Respostas", replyCount],
                    ] as const).map(([filter, label, count]) => (
                      <button
                        aria-pressed={commentFilter === filter}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${commentFilter === filter ? "bg-white text-[#012140] shadow-sm" : "text-[#233a59] hover:bg-white/70"}`}
                        data-testid={`comment-filter-${filter}`}
                        key={filter}
                        onClick={() => setCommentFilter(filter)}
                        type="button"
                      >
                        {translateText(label)} <span className="ml-1 tabular-nums opacity-70">{count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="relative mt-3 block">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#233a59]/55" />
                  <span className="sr-only">{translateText("Buscar comentário por texto ou autor")}</span>
                  <input
                    className={`${inputClass} w-full pl-9`}
                    data-testid="comment-moderation-search"
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder={translateText("Buscar por comentário ou autor")}
                    type="search"
                    value={searchText}
                  />
                </label>

                <div className="mt-3 space-y-2">
                  {postId === null ? <p className="text-sm text-muted-foreground">{translateText("Selecione uma publicação.")}</p> : comments.isLoading ? (
                    <LoadingState rows={3} />
                  ) : comments.isError ? (
                    <p className="rounded-lg bg-[#e8e8e8] p-3 text-sm text-[#233a59]">{translateText("Não foi possível carregar os comentários desta publicação.")}</p>
                  ) : (
                    visibleComments.map((comment) => (
                      <article className={`rounded-lg border border-[#233a59]/15 p-3 ${comment.parentCommentId ? "ml-4 border-l-4 border-l-[#233a59]/35 sm:ml-7" : ""}`} data-testid={`moderation-comment-${comment.id}`} key={comment.id}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-[#012140]">{comment.authorName}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {comment.parentCommentId ? `Resposta ao comentário #${comment.parentCommentId}` : "Comentário"} · {formatDate(comment.createdAt)}
                            </p>
                          </div>
                          <button
                            aria-label={`${translateText("Excluir comentário de")} ${comment.authorName}`}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-200 px-2.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                            data-testid={`moderation-delete-comment-${comment.id}`}
                            disabled={deleteComment.isPending}
                            onClick={async () => {
                              if (!window.confirm("Excluir este comentário e as respostas vinculadas?")) return;
                              setModerationError("");
                              try {
                                await deleteComment.mutateAsync({ commentId: comment.id });
                                await Promise.all([
                                  queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) }),
                                  queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() }),
                                ]);
                              } catch (error) {
                                setModerationError(error instanceof Error ? error.message : "Não foi possível excluir o comentário.");
                              }
                            }}
                            type="button"
                          >
                            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                            {translateText("Excluir")}
                          </button>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#1d1d1b]">{comment.body}</p>
                      </article>
                    ))
                  )}
                  {!comments.isLoading && !comments.isError && comments.data?.length === 0 && (
                    <p className="rounded-lg bg-[#f8f9fb] px-4 py-8 text-center text-sm text-muted-foreground">{translateText("Esta publicação ainda não tem comentários.")}</p>
                  )}
                  {!comments.isLoading && !comments.isError && (comments.data?.length ?? 0) > 0 && visibleComments.length === 0 && (
                    <p className="rounded-lg bg-[#f8f9fb] px-4 py-8 text-center text-sm text-muted-foreground">{translateText("Nenhum comentário corresponde a esta busca.")}</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-[#233a59]/25 px-5 py-12 text-center">
              <MessageSquare aria-hidden="true" className="mx-auto h-7 w-7 text-[#233a59]/55" />
              <p className="mt-3 font-semibold text-[#012140]">{translateText("Nenhuma conversa para moderar.")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{translateText("Comentários de publicações publicadas aparecerão aqui.")}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
