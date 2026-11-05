import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  ArrowUpRight,
  BookOpen,
  CircleHelp,
  FileText,
  Headset,
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
  UserRound,
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
  getListAdminSuggestionCategoriesQueryKey,
  getListAdminSiteMediaQueryKey,
  getListAdminTaxonomyQueryKey,
  getListTaxonomyQueryKey,
  getListSuggestionsQueryKey,
  getListAdminTestimonialsQueryKey,
  getListTestimonialsQueryKey,
  getListAdminSupportRequestsQueryKey,
  getListAdminSupportSubjectsQueryKey,
  getListPublicRoadmapSuggestionsQueryKey,
  getListSupportSubjectsQueryKey,
  getListSuggestionCategoriesQueryKey,
  useCloseAdminPoll,
  useCreateAdminPoll,
  useCreateAdminSuggestionCategory,
  useCreateAdminSupportRequestComment,
  useCreateAdminTaxonomy,
  useDeleteComment,
  useDeleteAdminTaxonomy,
  useDeletePost,
  useGetCurrentUser,
  useListAdminPosts,
  useListAdminUsers,
  useListAdminPolls,
  useListAdminSuggestionCategories,
  useListAdminSiteMedia,
  useListAdminTaxonomy,
  useListTaxonomy,
  useGetActivePoll,
  useListComments,
  useListSuggestions,
  useListAdminTestimonials,
  useCreateAdminSupportSubject,
  useListAdminSupportRequests,
  useListAdminSupportSubjects,
  useUpdateAdminTestimonial,
  useUpdateAdminSuggestion,
  useUpdateAdminTaxonomy,
  useUpdateAdminSiteMedia,
  useUpdateAdminUser,
  useUpdateAdminSupportRequest,
  useUpdateAdminSupportRequestRoadmap,
  useUpdateAdminSuggestionCategory,
  useUpdateAdminSupportSubject,
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
  type AdminSupportRequest,
  type SupportRequestStatus,
  type SupportRequestSubject,
  type SupportRequestCategory,
} from "@workspace/api-client-react";
import { AuthActionGate } from "@/components/auth-ui";
import { CreatePostForm, ImageUploadField } from "@/components/community-actions";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { formatDate, LoadingState, PageHeading, Surface } from "@/components/portal-ui";
import { translateText } from "@/lib/i18n";
import { ProfilePage } from "@/pages/profile-page";

type AdminSection = PostKind | "comments" | "users" | "suggestions" | "polls" | "taxonomy" | "media" | "testimonials" | "profile" | "requests";
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
    title: "Conteúdos",
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
      { key: "blog", label: "Conteúdos", icon: BookOpen },
      { key: "forum", label: "Comunidade", icon: MessageCircle },
      { key: "news", label: "Novidades", icon: Newspaper },
      { key: "help", label: "Central de Ajuda", icon: CircleHelp },
    ],
  },
  {
    title: "Gestão",
    items: [
      { key: "comments", label: "Comentários", icon: MessageSquare },
      { key: "requests", label: "Solicitações", icon: Headset },
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
  {
    title: "Conta",
    items: [{ key: "profile", label: "Meu perfil", icon: UserRound }],
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
        description="Gerencie o portal e acesse seu perfil de usuário."
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
  const [adminDrafts, setAdminDrafts] = useState<Record<string, string>>({});
  const [changeFeedback, setChangeFeedback] = useState<Record<string, string>>({});
  const dirtyKeys = Object.keys(adminDrafts);
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
  const supportRequests = useListAdminSupportRequests({
    query: {
      queryKey: getListAdminSupportRequestsQueryKey(),
      enabled: profile.data?.role === "admin",
      refetchInterval: 30_000,
    },
  });
  const supportSubjects = useListAdminSupportSubjects({
    query: {
      queryKey: getListAdminSupportSubjectsQueryKey(),
      enabled: profile.data?.role === "admin",
    },
  });
  const suggestionCategories = useListAdminSuggestionCategories({
    query: {
      queryKey: getListAdminSuggestionCategoriesQueryKey(),
      enabled: profile.data?.role === "admin",
    },
  });
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();

  useEffect(() => {
    if (!dirtyKeys.length) return;
    const currentUrl = window.location.href;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const confirmHistoryNavigation = (event: PopStateEvent) => {
      if (window.confirm(translateText("Há alterações não salvas. Se sair agora, você perderá essas alterações. Deseja sair mesmo assim?"))) {
        setAdminDrafts({});
        return;
      }
      event.stopImmediatePropagation();
      window.history.replaceState(window.history.state, "", currentUrl);
    };
    const confirmInternalNavigation = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank") return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.href === window.location.href) return;
      if (!window.confirm(translateText("Há alterações não salvas. Se sair agora, você perderá essas alterações. Deseja sair mesmo assim?"))) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      setAdminDrafts({});
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    window.addEventListener("popstate", confirmHistoryNavigation, true);
    document.addEventListener("click", confirmInternalNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      window.removeEventListener("popstate", confirmHistoryNavigation, true);
      document.removeEventListener("click", confirmInternalNavigation, true);
    };
  }, [dirtyKeys.length]);

  function stageAdminDraft(key: string, value: string, originalValue: string) {
    setAdminDrafts((current) => {
      if (value === originalValue) {
        if (!(key in current)) return current;
        const { [key]: _discarded, ...remaining } = current;
        return remaining;
      }
      if (current[key] === value) return current;
      return { ...current, [key]: value };
    });
    setChangeFeedback((current) => {
      if (!(key in current)) return current;
      const { [key]: _discarded, ...remaining } = current;
      return remaining;
    });
  }

  function clearAdminDraft(key: string) {
    setAdminDrafts((current) => {
      if (!(key in current)) return current;
      const { [key]: _discarded, ...remaining } = current;
      return remaining;
    });
  }

  function reportChange(key: string, message: string) {
    setChangeFeedback((current) => ({ ...current, [key]: message }));
  }

  function confirmDiscardChanges() {
    if (!dirtyKeys.length) return true;
    const confirmed = window.confirm(translateText("Há alterações não salvas. Se sair agora, você perderá essas alterações. Deseja sair mesmo assim?"));
    if (confirmed) setAdminDrafts({});
    return confirmed;
  }

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
    const key = `post:${post.id}:status`;
    try {
      await updatePost.mutateAsync({ postId: post.id, data: { status } });
      clearAdminDraft(key);
      setChangeFeedback((current) => ({ ...current, [key]: "Alterações salvas." }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: ["/api/posts"] }),
      ]);
    } catch {
      setChangeFeedback((current) => ({ ...current, [key]: "Não foi possível salvar." }));
    }
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
    if (section === "suggestions") {
      return supportRequests.data?.requests.filter((request) => request.requestType === "suggestion").length ?? "—";
    }
    if (section === "taxonomy") return taxonomy.data?.length ?? "—";
    if (section === "testimonials") return testimonials.data?.filter((item) => item.status === "pending").length ?? "—";
    if (section === "requests") return supportRequests.data?.counts.new ?? "—";
    return undefined;
  };

  return (
    <div className="mt-6 space-y-5">
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
                          if (!confirmDiscardChanges()) return;
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
                    {translateText(tab === "forum" ? "Comunidade" : tab === "blog" ? "Conteúdos" : tab === "news" ? "Atualizações" : "Suporte")}
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
                  onDirtyChange={(dirty) => dirty
                    ? stageAdminDraft("create-post", "dirty", "")
                    : clearAdminDraft("create-post")}
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
                          onChange={(event) => stageAdminDraft(`post:${post.id}:status`, event.target.value, post.status)}
                          value={adminDrafts[`post:${post.id}:status`] ?? post.status}
                        >
                          <option value="published">{translateText("Publicado")}</option>
                          <option value="draft">{translateText("Rascunho")}</option>
                          <option value="hidden">{translateText("Oculto")}</option>
                        </select>
                        {adminDrafts[`post:${post.id}:status`] !== undefined && (
                          <button
                            className="auth-header-primary !min-h-9 !px-3 !py-1.5 !text-sm"
                            disabled={updatePost.isPending}
                            onClick={() => void changePostStatus(post, adminDrafts[`post:${post.id}:status`] as PostStatus)}
                            type="button"
                          >
                            {translateText(updatePost.isPending ? "Salvando…" : "Salvar")}
                          </button>
                        )}
                        <button className="auth-header-link !border-[#233a59]/20 !text-[#233a59]" data-testid={`admin-post-edit-${post.id}`} onClick={() => {
                          if (editingPost === post.id) {
                            if (!confirmDiscardChanges()) return;
                            clearAdminDraft(`edit-post:${post.id}`);
                            setEditingPost(null);
                          } else {
                            if (!confirmDiscardChanges()) return;
                            setEditingPost(post.id);
                          }
                        }} type="button">
                          {translateText(editingPost === post.id ? "Fechar edição" : "Editar")}
                        </button>
                        <button className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" data-testid={`admin-post-delete-${post.id}`} disabled={deletePost.isPending} onClick={() => void removePost(post)} type="button">
                          {translateText("Excluir")}
                        </button>
                        <a className="inline-flex items-center gap-1 self-center text-sm font-semibold text-[#233a59] hover:underline" href={`/${post.kind === "forum" ? "community" : post.kind}/${post.id}`}>
                          Abrir <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      {changeFeedback[`post:${post.id}:status`] && (
                        <p className={`mt-2 text-sm ${changeFeedback[`post:${post.id}:status`] === "Alterações salvas." ? "text-emerald-700" : "text-red-700"}`} role="status">
                          {translateText(changeFeedback[`post:${post.id}:status`])}
                        </p>
                      )}
                      {editingPost === post.id && (
                        <EditPostForm
                          key={post.id}
                          post={post}
                          onDirtyChange={(dirty) => dirty
                            ? stageAdminDraft(`edit-post:${post.id}`, "dirty", "")
                            : clearAdminDraft(`edit-post:${post.id}`)}
                          onSaved={async () => {
                            clearAdminDraft(`edit-post:${post.id}`);
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
              onDirtyChange={(dirty) => dirty
                ? stageAdminDraft("taxonomy-form", "dirty", "")
                : clearAdminDraft("taxonomy-form")}
            />
          )}

          {tab === "media" && (
            <SiteMediaManager
              onDirtyChange={(slot, dirty) => dirty
                ? stageAdminDraft(`media:${slot}`, "dirty", "")
                : clearAdminDraft(`media:${slot}`)}
            />
          )}

          {tab === "profile" && (
            <div className="p-4 sm:p-6">
              <ProfilePage returnTo="/admin" />
            </div>
          )}

          {tab === "comments" && <AdminCommentModeration posts={posts.data ?? []} />}

          {tab === "requests" && (
            <SupportRequestsManager
              requests={supportRequests.data?.requests ?? []}
              counts={supportRequests.data?.counts ?? { new: 0, inProgress: 0, completed: 0 }}
              subjects={supportSubjects.data ?? []}
              isLoading={supportRequests.isLoading || supportSubjects.isLoading}
              isError={supportRequests.isError || supportSubjects.isError}
              retry={() => {
                void supportRequests.refetch();
                void supportSubjects.refetch();
              }}
            />
          )}

          {tab === "users" && (
            <div className="space-y-4 p-4 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.14em] text-[#233a59]/65">{translateText("Gestão de acessos")}</p>
                <h2 className="mt-1 font-display text-xl font-semibold text-[#012140]">{translateText("Contas e permissões")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{translateText("Altere papéis de acesso e suspenda ou reative contas.")}</p>
              </div>
              {!users.isLoading && !users.isError && (
                <div aria-label={translateText("Resumo de status das contas")} className="grid max-w-md grid-cols-2 gap-3">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-[#233a59]/10 bg-[#f7f8fa] px-4 py-3">
                    <span className="text-sm text-muted-foreground">{translateText("Ativas")}</span>
                    <strong className="font-display text-lg tabular-nums text-[#012140]">{users.data?.filter((user) => user.status === "active").length ?? 0}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-[#233a59]/10 bg-[#f7f8fa] px-4 py-3">
                    <span className="text-sm text-muted-foreground">{translateText("Suspensas")}</span>
                    <strong className="font-display text-lg tabular-nums text-[#012140]">{users.data?.filter((user) => user.status === "suspended").length ?? 0}</strong>
                  </div>
                </div>
              )}
              {users.isLoading ? <LoadingState rows={3} /> : users.isError ? (
                <p className="text-sm text-muted-foreground">{translateText("Não foi possível carregar as contas.")}</p>
              ) : (
                <UsersTable
                  users={users.data ?? []}
                  drafts={adminDrafts}
                  stageDraft={stageAdminDraft}
                  clearDraft={clearAdminDraft}
                  feedback={changeFeedback}
                  reportChange={reportChange}
                />
              )}
            </div>
          )}

          {tab === "suggestions" && (
            <AdminSuggestionsManager
              requests={supportRequests.data?.requests.filter((request) => request.requestType === "suggestion") ?? []}
              counts={supportRequests.data?.counts ?? { new: 0, inProgress: 0, completed: 0 }}
              requestsLoading={supportRequests.isLoading}
              requestsError={supportRequests.isError}
              retryRequests={() => void supportRequests.refetch()}
              categories={suggestionCategories.data ?? []}
              categoriesLoading={suggestionCategories.isLoading}
              categoriesError={suggestionCategories.isError}
              retryCategories={() => void suggestionCategories.refetch()}
              legacySuggestions={suggestions.data ?? []}
              legacyLoading={suggestions.isLoading}
              legacyError={suggestions.isError}
              retryLegacy={() => void suggestions.refetch()}
              drafts={adminDrafts}
              stageDraft={stageAdminDraft}
              clearDraft={clearAdminDraft}
              feedback={changeFeedback}
              reportChange={reportChange}
            />
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

const supportStatusLabel: Record<SupportRequestStatus, string> = {
  new: "Nova",
  in_progress: "Em andamento",
  completed: "Concluída",
};

function SupportRequestsManager({
  requests,
  counts,
  subjects,
  isLoading,
  isError,
  retry,
}: {
  requests: AdminSupportRequest[];
  counts: { new: number; inProgress: number; completed: number };
  subjects: SupportRequestSubject[];
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"requests" | "subjects">("requests");
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#233a59]/65">{translateText("Atendimento")}</p>
        <h2 className="mt-1 font-display text-xl font-semibold text-[#012140]">{translateText("Solicitações de suporte")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{translateText("Acompanhe as mensagens enviadas à equipe e mantenha os assuntos do formulário organizados.")}</p>
      </div>
      <div aria-label={translateText("Seções de atendimento")} className="flex flex-wrap gap-2 border-b border-[#233a59]/10 pb-3" role="tablist">
        <button
          aria-selected={activeTab === "requests"}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${activeTab === "requests" ? "bg-[#012140] text-white" : "text-[#233a59] hover:bg-[#f2f4f7]"}`}
          onClick={() => setActiveTab("requests")}
          role="tab"
          type="button"
        >
          {translateText("Solicitações")}
        </button>
        <button
          aria-selected={activeTab === "subjects"}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${activeTab === "subjects" ? "bg-[#012140] text-white" : "text-[#233a59] hover:bg-[#f2f4f7]"}`}
          onClick={() => setActiveTab("subjects")}
          role="tab"
          type="button"
        >
          {translateText("Assuntos do formulário")}
        </button>
      </div>
      {activeTab === "requests" ? (
        <SupportInbox
          requests={requests}
          counts={counts}
          isLoading={isLoading}
          isError={isError}
          retry={retry}
        />
      ) : (
        <SupportSubjectsManager subjects={subjects} />
      )}
    </div>
  );
}

function AdminSuggestionsManager({
  requests,
  counts,
  requestsLoading,
  requestsError,
  retryRequests,
  categories,
  categoriesLoading,
  categoriesError,
  retryCategories,
  legacySuggestions,
  legacyLoading,
  legacyError,
  retryLegacy,
  drafts,
  stageDraft,
  clearDraft,
  feedback,
  reportChange,
}: {
  requests: AdminSupportRequest[];
  counts: { new: number; inProgress: number; completed: number };
  requestsLoading: boolean;
  requestsError: boolean;
  retryRequests: () => void;
  categories: SupportRequestCategory[];
  categoriesLoading: boolean;
  categoriesError: boolean;
  retryCategories: () => void;
  legacySuggestions: Suggestion[];
  legacyLoading: boolean;
  legacyError: boolean;
  retryLegacy: () => void;
  drafts: Record<string, string>;
  stageDraft: (key: string, value: string, original: string) => void;
  clearDraft: (key: string) => void;
  feedback: Record<string, string>;
  reportChange: (key: string, message: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"inbox" | "categories" | "legacy">("inbox");
  const suggestionCounts = requests.reduce(
    (total, request) => {
      if (request.status === "new") total.new += 1;
      if (request.status === "in_progress") total.inProgress += 1;
      if (request.status === "completed") total.completed += 1;
      return total;
    },
    { new: 0, inProgress: 0, completed: 0 },
  );

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#233a59]/65">{translateText("Caixa de entrada privada")}</p>
        <h2 className="mt-1 font-display text-xl font-semibold text-[#012140]">{translateText("Sugestões")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{translateText("As novas sugestões são privadas: somente a pessoa que enviou e a equipe administrativa podem acessá-las.")}</p>
        <p className="mt-2 rounded-lg bg-[#f7f8fa] p-3 text-xs leading-5 text-[#233a59]">{translateText("Aprovar no roadmap publica o título, a categoria e a descrição para todos. Nome e dados da conta não são exibidos.")}</p>
      </div>
      <div aria-label={translateText("Seções de sugestões")} className="flex flex-wrap gap-2 border-b border-[#233a59]/10 pb-3" role="tablist">
        {([
          ["inbox", "Mensagens recebidas"],
          ["categories", "Categorias"],
          ["legacy", "Ideias anteriores"],
        ] as const).map(([key, label]) => (
          <button
            aria-selected={activeTab === key}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${activeTab === key ? "bg-[#012140] text-white" : "text-[#233a59] hover:bg-[#f2f4f7]"}`}
            key={key}
            onClick={() => setActiveTab(key)}
            role="tab"
            type="button"
          >
            {translateText(label)}
          </button>
        ))}
      </div>
      {activeTab === "inbox" ? (
        <SupportInbox
          requests={requests}
          counts={suggestionCounts}
          isLoading={requestsLoading}
          isError={requestsError}
          retry={retryRequests}
          emptyMessage="Ainda não há sugestões recebidas."
        />
      ) : activeTab === "categories" ? (
        <SuggestionCategoriesManager
          categories={categories}
          isLoading={categoriesLoading}
          isError={categoriesError}
          retry={retryCategories}
        />
      ) : legacyLoading ? (
        <LoadingState rows={3} />
      ) : legacyError ? (
        <p className="text-sm text-muted-foreground">
          {translateText("Não foi possível carregar as ideias anteriores.")}
          <button className="ml-2 font-semibold underline" onClick={retryLegacy} type="button">{translateText("Tentar novamente")}</button>
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{translateText("Registros do antigo mural público foram preservados. Novos envios entram somente pela caixa privada.")}</p>
          <SuggestionsTable
            suggestions={legacySuggestions}
            drafts={drafts}
            stageDraft={stageDraft}
            clearDraft={clearDraft}
            feedback={feedback}
            reportChange={reportChange}
          />
        </div>
      )}
    </div>
  );
}

function SupportInbox({
  requests,
  counts,
  isLoading,
  isError,
  retry,
  emptyMessage = "Ainda não há solicitações registradas.",
}: {
  requests: AdminSupportRequest[];
  counts: { new: number; inProgress: number; completed: number };
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
  emptyMessage?: string;
}) {
  const queryClient = useQueryClient();
  const updateRequest = useUpdateAdminSupportRequest();
  const updateRoadmap = useUpdateAdminSupportRequestRoadmap();
  const createComment = useCreateAdminSupportRequestComment();
  const [statusFilter, setStatusFilter] = useState<"all" | SupportRequestStatus>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [drafts, setDrafts] = useState<Record<number, SupportRequestStatus>>({});
  const [feedback, setFeedback] = useState<Record<number, string>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [commentFeedback, setCommentFeedback] = useState<Record<number, string>>({});
  const [roadmapFeedback, setRoadmapFeedback] = useState<Record<number, string>>({});

  const visibleRequests = requests
    .filter((request) => statusFilter === "all" || request.status === statusFilter)
    .sort((left, right) => {
      const difference =
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      return sortOrder === "oldest"
        ? difference || left.id - right.id
        : -difference || right.id - left.id;
    });

  async function saveStatus(request: AdminSupportRequest) {
    const status = drafts[request.id];
    if (!status || status === request.status) return;
    setFeedback((current) => ({ ...current, [request.id]: "" }));
    try {
      await updateRequest.mutateAsync({
        requestId: request.id,
        data: { status },
      });
      setDrafts((current) => {
        const { [request.id]: _saved, ...remaining } = current;
        return remaining;
      });
      setFeedback((current) => ({ ...current, [request.id]: "Alterações salvas." }));
      await queryClient.invalidateQueries({
        queryKey: getListAdminSupportRequestsQueryKey(),
      });
    } catch {
      setFeedback((current) => ({ ...current, [request.id]: "Não foi possível salvar." }));
    }
  }

  async function saveComment(request: AdminSupportRequest) {
    const message = commentDrafts[request.id]?.trim();
    if (!message) return;
    setCommentFeedback((current) => ({ ...current, [request.id]: "" }));
    try {
      await createComment.mutateAsync({
        requestId: request.id,
        data: { message },
      });
      setCommentDrafts((current) => ({ ...current, [request.id]: "" }));
      setCommentFeedback((current) => ({ ...current, [request.id]: "Atualização enviada." }));
      await queryClient.invalidateQueries({
        queryKey: getListAdminSupportRequestsQueryKey(),
      });
    } catch {
      setCommentFeedback((current) => ({ ...current, [request.id]: "Não foi possível enviar a atualização." }));
    }
  }

  async function updateRoadmapApproval(request: AdminSupportRequest) {
    const approved = request.approvedAt === null;
    if (
      approved &&
      !window.confirm(
        translateText("Ao aprovar, o título, a categoria e a descrição ficarão visíveis para todos. Deseja publicar?"),
      )
    ) {
      return;
    }
    setRoadmapFeedback((current) => ({ ...current, [request.id]: "" }));
    try {
      await updateRoadmap.mutateAsync({
        requestId: request.id,
        data: { approved },
      });
      setRoadmapFeedback((current) => ({ ...current, [request.id]: "A publicação do roadmap foi atualizada." }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAdminSupportRequestsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListPublicRoadmapSuggestionsQueryKey() }),
      ]);
    } catch {
      setRoadmapFeedback((current) => ({ ...current, [request.id]: "Não foi possível atualizar a publicação do roadmap." }));
    }
  }

  if (isLoading) return <LoadingState rows={3} />;
  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p>{translateText("Não foi possível carregar as solicitações.")}</p>
        <button className="mt-2 font-semibold underline" onClick={retry} type="button">
          {translateText("Tentar novamente")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div aria-label={translateText("Resumo de solicitações")} className="grid gap-2 sm:grid-cols-3">
        {[
          { label: "Novas", value: counts.new },
          { label: "Em andamento", value: counts.inProgress },
          { label: "Concluídas", value: counts.completed },
        ].map((count) => (
          <div className="flex items-center justify-between rounded-xl border border-[#233a59]/10 bg-[#f7f8fa] px-4 py-3" key={count.label}>
            <span className="text-sm text-muted-foreground">{translateText(count.label)}</span>
            <strong className="font-display text-lg tabular-nums text-[#012140]">{count.value}</strong>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#f7f8fa] p-3">
        <label className="text-xs font-semibold text-[#233a59]">
          {translateText("Filtrar por status")}
          <select
            className={`${inputClass} ml-2`}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            value={statusFilter}
          >
            <option value="all">{translateText("Todos")}</option>
            <option value="new">{translateText("Nova")}</option>
            <option value="in_progress">{translateText("Em andamento")}</option>
            <option value="completed">{translateText("Concluída")}</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-[#233a59]">
          {translateText("Ordenar por data")}
          <select
            className={`${inputClass} ml-2`}
            onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}
            value={sortOrder}
          >
            <option value="newest">{translateText("Mais recentes primeiro")}</option>
            <option value="oldest">{translateText("Mais antigas primeiro")}</option>
          </select>
        </label>
      </div>

      <div className="space-y-3">
        {visibleRequests.map((request) => {
          const selectedStatus = drafts[request.id] ?? request.status;
          const statusKey = `request:${request.id}`;
          return (
            <article className="rounded-xl border border-[#233a59]/15 p-4 sm:p-5" key={request.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-bold tracking-[.08em] text-[#233a59]">{request.protocol}</p>
                  <h3 className="mt-1 font-semibold text-[#012140]">{request.title || request.subjectName}</h3>
                  {request.title && <p className="mt-1 text-xs text-muted-foreground">{request.subjectName}{request.categoryName ? ` · ${request.categoryName}` : ""}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {request.requesterName} · <a className="underline" href={`mailto:${request.requesterEmail}`}>{request.requesterEmail}</a> · {formatDate(request.createdAt)}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${request.status === "new" ? "bg-amber-50 text-amber-800" : request.status === "completed" ? "bg-emerald-50 text-emerald-800" : "bg-blue-50 text-blue-800"}`}>
                  {translateText(supportStatusLabel[request.status])}
                </span>
              </div>
              <p className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-[#f7f8fa] p-3 text-sm leading-6 text-[#233a59]">{request.message}</p>
              {request.requestType === "suggestion" && (
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-[#233a59]/10 p-3">
                  <div className="min-w-52 flex-1 text-xs text-muted-foreground">
                    <p className="font-bold text-[#233a59]">{translateText("Roadmap público")}</p>
                    {request.approvedAt ? (
                      <p className="mt-1">{translateText("Aprovada em")} {formatDate(request.approvedAt)}</p>
                    ) : (
                      <p className="mt-1">{translateText("Ainda não aprovada para exibição pública.")}</p>
                    )}
                  </div>
                  <button
                    className={request.approvedAt ? "rounded-lg border border-[#233a59]/20 px-3 py-2 text-sm font-semibold text-[#233a59] hover:bg-[#f7f8fa]" : "auth-header-primary !min-h-9 !px-3 !py-1.5 !text-sm"}
                    disabled={updateRoadmap.isPending}
                    onClick={() => void updateRoadmapApproval(request)}
                    type="button"
                  >
                    {translateText(request.approvedAt ? "Retirar do roadmap" : "Aprovar e publicar")}
                  </button>
                  {roadmapFeedback[request.id] && (
                    <span className={roadmapFeedback[request.id] === "A publicação do roadmap foi atualizada." ? "text-xs text-emerald-700" : "text-xs text-red-700"} role="status">
                      {translateText(roadmapFeedback[request.id])}
                    </span>
                  )}
                </div>
              )}
              <section className="mt-4 rounded-xl border border-[#233a59]/10 p-3" data-testid={`support-request-updates-${request.id}`}>
                <h4 className="text-xs font-bold uppercase tracking-[.12em] text-[#233a59]/75">{translateText("Atualizações enviadas à pessoa solicitante")}</h4>
                {request.comments.length ? (
                  <div className="mt-2 space-y-2">
                    {request.comments.map((comment) => (
                      <div className="rounded-lg bg-[#f7f8fa] p-3" key={comment.id}>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                          <strong className="text-[#233a59]">{comment.authorName}</strong>
                          <time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#233a59]">{comment.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">{translateText("Nenhuma atualização enviada à pessoa solicitante.")}</p>
                )}
                <form className="mt-3 space-y-2" onSubmit={(event) => {
                  event.preventDefault();
                  void saveComment(request);
                }}>
                  <label className="block text-xs font-semibold text-[#233a59]">
                    {translateText("Adicionar atualização")}
                    <textarea
                      className={`${inputClass} mt-1 block min-h-20 w-full resize-y`}
                      maxLength={5000}
                      onChange={(event) => setCommentDrafts((current) => ({ ...current, [request.id]: event.target.value }))}
                      placeholder={translateText("Escreva uma atualização visível à pessoa solicitante.")}
                      value={commentDrafts[request.id] ?? ""}
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      className="auth-header-primary !min-h-9 !px-3 !py-1.5 !text-sm"
                      disabled={!commentDrafts[request.id]?.trim() || createComment.isPending}
                      type="submit"
                    >
                      {translateText(createComment.isPending ? "Enviando…" : "Enviar atualização")}
                    </button>
                    {commentFeedback[request.id] && (
                      <span className={commentFeedback[request.id] === "Atualização enviada." ? "text-xs text-emerald-700" : "text-xs text-red-700"} role="status">
                        {translateText(commentFeedback[request.id])}
                      </span>
                    )}
                  </div>
                </form>
              </section>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="text-xs font-semibold text-[#233a59]" htmlFor={`support-status-${request.id}`}>
                  {translateText("Atualizar status")}
                </label>
                <select
                  className={inputClass}
                  id={`support-status-${request.id}`}
                  onChange={(event) => {
                    const next = event.target.value as SupportRequestStatus;
                    setDrafts((current) => ({ ...current, [request.id]: next }));
                    setFeedback((current) => ({ ...current, [request.id]: "" }));
                  }}
                  value={selectedStatus}
                >
                  <option value="new">{translateText("Nova")}</option>
                  <option value="in_progress">{translateText("Em andamento")}</option>
                  <option value="completed">{translateText("Concluída")}</option>
                </select>
                {selectedStatus !== request.status && (
                  <button
                    className="auth-header-primary !min-h-9 !px-3 !py-1.5 !text-sm"
                    disabled={updateRequest.isPending}
                    onClick={() => void saveStatus(request)}
                    type="button"
                  >
                    {translateText(updateRequest.isPending ? "Salvando…" : "Salvar")}
                  </button>
                )}
                {feedback[request.id] && (
                  <span className={feedback[request.id] === "Alterações salvas." ? "text-xs text-emerald-700" : "text-xs text-red-700"} role="status">
                    {translateText(feedback[request.id])}
                  </span>
                )}
              </div>
              <span className="sr-only" data-testid={`${statusKey}-status`}>{request.status}</span>
            </article>
          );
        })}
        {!visibleRequests.length && (
          <div className="rounded-xl border border-dashed border-[#233a59]/20 p-8 text-center text-sm text-muted-foreground">
            {translateText(statusFilter === "all" ? emptyMessage : "Não há solicitações com este status.")}
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestionCategoriesManager({
  categories,
  isLoading,
  isError,
  retry,
}: {
  categories: SupportRequestCategory[];
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
}) {
  const queryClient = useQueryClient();
  const createCategory = useCreateAdminSuggestionCategory();
  const updateCategory = useUpdateAdminSuggestionCategory();
  const [newName, setNewName] = useState("");
  const [drafts, setDrafts] = useState<Record<number, { name: string; active: boolean }>>({});
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListAdminSuggestionCategoriesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListSuggestionCategoriesQueryKey() }),
    ]);
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFeedback("");
    try {
      await createCategory.mutateAsync({ data: { name: newName.trim() } });
      setNewName("");
      setFeedback(translateText("Categoria criada."));
      await refresh();
    } catch (mutationError) {
      setError(getApiResponseError(mutationError) ?? translateText("Não foi possível criar a categoria."));
    }
  }

  async function saveCategory(category: SupportRequestCategory) {
    const draft = drafts[category.id];
    if (!draft) return;
    setError("");
    setFeedback("");
    try {
      await updateCategory.mutateAsync({
        categoryId: category.id,
        data: { name: draft.name.trim(), active: draft.active },
      });
      setDrafts((current) => {
        const { [category.id]: _saved, ...remaining } = current;
        return remaining;
      });
      setFeedback(translateText("Categoria atualizada."));
      await refresh();
    } catch (mutationError) {
      setError(getApiResponseError(mutationError) ?? translateText("Não foi possível atualizar a categoria."));
    }
  }

  if (isLoading) return <LoadingState rows={3} />;
  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p>{translateText("Não foi possível carregar as categorias de sugestão.")}</p>
        <button className="mt-2 font-semibold underline" onClick={retry} type="button">{translateText("Tentar novamente")}</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-[#012140]">{translateText("Categorias do assunto Sugestão")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{translateText("Crie, edite ou inative categorias. Não é possível excluir opções, para preservar as mensagens já associadas.")}</p>
      </div>
      <form className="flex flex-wrap gap-2 rounded-xl bg-[#f7f8fa] p-3" onSubmit={(event) => void addCategory(event)}>
        <label className="min-w-[220px] flex-1 text-xs font-semibold text-[#233a59]">
          {translateText("Nova categoria")}
          <input
            className={`${inputClass} mt-1 block w-full`}
            maxLength={120}
            minLength={2}
            onChange={(event) => setNewName(event.target.value)}
            placeholder={translateText("Ex.: Acessibilidade")}
            required
            value={newName}
          />
        </label>
        <button className="auth-header-primary self-end" disabled={createCategory.isPending} type="submit">
          {translateText(createCategory.isPending ? "Salvando…" : "Adicionar categoria")}
        </button>
      </form>
      {feedback && <p className="text-sm text-emerald-700" role="status">{feedback}</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{translateText(error)}</p>}
      <div className="space-y-2">
        {categories.map((category) => {
          const draft = drafts[category.id] ?? { name: category.name, active: category.active };
          const isDirty = draft.name !== category.name || draft.active !== category.active;
          return (
            <article className="grid gap-3 rounded-xl border border-[#233a59]/15 p-3 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-end" key={category.id}>
              <label className="text-xs font-semibold text-[#233a59]">
                {translateText("Nome da categoria")}
                <input
                  className={`${inputClass} mt-1 block w-full`}
                  maxLength={120}
                  minLength={2}
                  onChange={(event) => setDrafts((current) => ({
                    ...current,
                    [category.id]: { ...draft, name: event.target.value },
                  }))}
                  value={draft.name}
                />
              </label>
              <label className="text-xs font-semibold text-[#233a59]">
                {translateText("Disponibilidade")}
                <select
                  className={`${inputClass} mt-1 block w-full`}
                  onChange={(event) => setDrafts((current) => ({
                    ...current,
                    [category.id]: { ...draft, active: event.target.value === "true" },
                  }))}
                  value={String(draft.active)}
                >
                  <option value="true">{translateText("Ativo")}</option>
                  <option value="false">{translateText("Inativo")}</option>
                </select>
              </label>
              {isDirty && (
                <button
                  className="auth-header-primary !min-h-9 !px-3 !py-1.5 !text-sm"
                  disabled={updateCategory.isPending}
                  onClick={() => void saveCategory(category)}
                  type="button"
                >
                  {translateText(updateCategory.isPending ? "Salvando…" : "Salvar")}
                </button>
              )}
            </article>
          );
        })}
        {!categories.length && (
          <p className="rounded-xl border border-dashed border-[#233a59]/20 p-6 text-center text-sm text-muted-foreground">
            {translateText("Nenhuma categoria foi criada ainda.")}
          </p>
        )}
      </div>
    </div>
  );
}

function SupportSubjectsManager({ subjects }: { subjects: SupportRequestSubject[] }) {
  const queryClient = useQueryClient();
  const createSubject = useCreateAdminSupportSubject();
  const updateSubject = useUpdateAdminSupportSubject();
  const [newName, setNewName] = useState("");
  const [drafts, setDrafts] = useState<Record<number, { name: string; active: boolean }>>({});
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function refreshSubjects() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListAdminSupportSubjectsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListSupportSubjectsQueryKey() }),
    ]);
  }

  async function addSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setError("");
    try {
      await createSubject.mutateAsync({ data: { name: newName.trim() } });
      setNewName("");
      setFeedback(translateText("Assunto criado."));
      await refreshSubjects();
    } catch (mutationError) {
      setError(getApiResponseError(mutationError) ?? translateText("Não foi possível criar o assunto."));
    }
  }

  async function saveSubject(subject: SupportRequestSubject) {
    const draft = drafts[subject.id];
    if (!draft) return;
    setFeedback("");
    setError("");
    try {
      await updateSubject.mutateAsync({
        subjectId: subject.id,
        data: { name: draft.name.trim(), active: draft.active },
      });
      setDrafts((current) => {
        const { [subject.id]: _saved, ...remaining } = current;
        return remaining;
      });
      setFeedback(translateText("Assunto atualizado."));
      await refreshSubjects();
    } catch (mutationError) {
      setError(getApiResponseError(mutationError) ?? translateText("Não foi possível atualizar o assunto."));
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-[#012140]">{translateText("Assuntos disponíveis no formulário")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{translateText("Assuntos não podem ser excluídos; somente inativados. As solicitações antigas permanecem registradas.")}</p>
      </div>
      <form className="flex flex-wrap gap-2 rounded-xl bg-[#f7f8fa] p-3" onSubmit={(event) => void addSubject(event)}>
        <label className="min-w-[220px] flex-1 text-xs font-semibold text-[#233a59]">
          {translateText("Novo assunto")}
          <input
            className={`${inputClass} mt-1 block w-full`}
            maxLength={120}
            minLength={2}
            onChange={(event) => setNewName(event.target.value)}
            placeholder={translateText("Ex.: Dúvida sobre o portal")}
            required
            value={newName}
          />
        </label>
        <button className="auth-header-primary self-end" disabled={createSubject.isPending} type="submit">
          {translateText(createSubject.isPending ? "Salvando…" : "Adicionar assunto")}
        </button>
      </form>
      {feedback && <p className="text-sm text-emerald-700" role="status">{feedback}</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      <div className="space-y-2">
        {subjects.map((subject) => {
          const draft = drafts[subject.id] ?? { name: subject.name, active: subject.active };
          const isDirty = draft.name !== subject.name || draft.active !== subject.active;
          return (
            <article className="grid gap-3 rounded-xl border border-[#233a59]/15 p-3 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-end" key={subject.id}>
              <label className="text-xs font-semibold text-[#233a59]">
                {translateText("Nome do assunto")}
                <input
                  className={`${inputClass} mt-1 block w-full`}
                  maxLength={120}
                  minLength={2}
                  onChange={(event) => setDrafts((current) => ({
                    ...current,
                    [subject.id]: { ...draft, name: event.target.value },
                  }))}
                  value={draft.name}
                />
              </label>
              <label className="text-xs font-semibold text-[#233a59]">
                {translateText("Disponibilidade")}
                <select
                  className={`${inputClass} mt-1 block w-full`}
                  onChange={(event) => setDrafts((current) => ({
                    ...current,
                    [subject.id]: { ...draft, active: event.target.value === "true" },
                  }))}
                  value={String(draft.active)}
                >
                  <option value="true">{translateText("Ativo")}</option>
                  <option value="false">{translateText("Inativo")}</option>
                </select>
              </label>
              {isDirty && (
                <button
                  className="auth-header-primary !min-h-9 !px-3 !py-1.5 !text-sm"
                  disabled={updateSubject.isPending}
                  onClick={() => void saveSubject(subject)}
                  type="button"
                >
                  {translateText(updateSubject.isPending ? "Salvando…" : "Salvar")}
                </button>
              )}
            </article>
          );
        })}
        {!subjects.length && (
          <p className="rounded-xl border border-dashed border-[#233a59]/20 p-6 text-center text-sm text-muted-foreground">
            {translateText("Nenhum assunto foi criado ainda. Adicione as opções que aparecerão no formulário.")}
          </p>
        )}
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

function SiteMediaManager({ onDirtyChange }: { onDirtyChange: (slot: SiteMediaSlot, dirty: boolean) => void }) {
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
                onDirtyChange={(dirty) => onDirtyChange(item.slot, dirty)}
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
  onDirtyChange,
}: {
  asset: SiteMediaAsset;
  description: string;
  extensions: SiteMediaAssetUpdateExtension[];
  folder: string;
  title: string;
  onDirtyChange: (dirty: boolean) => void;
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

  useEffect(() => {
    onDirtyChange(name !== (asset.name ?? "") || extension !== asset.extension);
  }, [asset.extension, asset.name, extension, name, onDirtyChange]);

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
      onDirtyChange(false);
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
  onDirtyChange,
}: {
  items: TaxonomyItem[];
  isLoading: boolean;
  isError: boolean;
  onDirtyChange: (dirty: boolean) => void;
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
  const editingItem = items.find((item) => item.id === editingId);

  useEffect(() => {
    onDirtyChange(Boolean(name.trim()) || Boolean(editingItem && editName !== editingItem.name));
  }, [editName, editingItem, name, onDirtyChange]);

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
      onDirtyChange(false);
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
      onDirtyChange(false);
      await refreshCatalog(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível editar esta opção.");
    }
  }

  const kindLabel: Record<PostKind, string> = {
    blog: "Conteúdos",
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
            <option value="blog">{translateText("Conteúdos")}</option>
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

function EditPostForm({
  post,
  onSaved,
  onDirtyChange,
}: {
  post: Post;
  onSaved: () => void | Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
}) {
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

  useEffect(() => {
    const dirty = title !== post.title
      || category !== post.category
      || JSON.stringify(tags) !== JSON.stringify(post.tags ?? [])
      || body !== post.body
      || imageUrl !== (post.coverImageUrl ?? "");
    onDirtyChange(dirty);
  }, [body, category, imageUrl, onDirtyChange, post, tags, title]);

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
      onDirtyChange(false);
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

function UsersTable({
  users,
  drafts,
  stageDraft,
  clearDraft,
  feedback,
  reportChange,
}: {
  users: UserProfile[];
  drafts: Record<string, string>;
  stageDraft: (key: string, value: string, originalValue: string) => void;
  clearDraft: (key: string) => void;
  feedback: Record<string, string>;
  reportChange: (key: string, message: string) => void;
}) {
  const queryClient = useQueryClient();
  const updateUser = useUpdateAdminUser();

  async function saveUserField(user: UserProfile, field: "role" | "status") {
    const key = `user:${user.id}:${field}`;
    const draft = drafts[key];
    if (!draft) return;
    try {
      await updateUser.mutateAsync({
        userId: user.id,
        data: field === "role" ? { role: draft as UserRole } : { status: draft as UserStatus },
      });
      clearDraft(key);
      reportChange(key, "Alterações salvas.");
      await queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
    } catch {
      reportChange(key, "Não foi possível salvar.");
    }
  }

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
            {(() => {
              const key = `user:${user.id}:role`;
              const value = drafts[key] ?? user.role;
              return (
                <>
            <select
              className={`${inputClass} mt-1 block w-full`}
              disabled={updateUser.isPending}
              onChange={(event) => stageDraft(key, event.target.value, user.role)}
              value={value}
            >
              <option value="member">{translateText("Membro")}</option>
              <option value="admin">{translateText("Administrador")}</option>
            </select>
                  {value !== user.role && <button className="auth-header-primary mt-2 !min-h-8 !px-3 !py-1 !text-xs" disabled={updateUser.isPending} onClick={() => void saveUserField(user, "role")} type="button">{translateText(updateUser.isPending ? "Salvando…" : "Salvar")}</button>}
                  {feedback[key] && <span className={`mt-1 block ${feedback[key] === "Alterações salvas." ? "text-emerald-700" : "text-red-700"}`} role="status">{translateText(feedback[key])}</span>}
                </>
              );
            })()}
          </label>
          <label className="text-xs font-semibold text-[#233a59]">
            {translateText("Conta")}
            {(() => {
              const key = `user:${user.id}:status`;
              const value = drafts[key] ?? user.status;
              return (
                <>
            <select
              className={`${inputClass} mt-1 block w-full`}
              disabled={updateUser.isPending}
              onChange={(event) => stageDraft(key, event.target.value, user.status)}
              value={value}
            >
              <option value="active">{translateText("Ativa")}</option>
              <option value="suspended">{translateText("Suspensa")}</option>
            </select>
                  {value !== user.status && <button className="auth-header-primary mt-2 !min-h-8 !px-3 !py-1 !text-xs" disabled={updateUser.isPending} onClick={() => void saveUserField(user, "status")} type="button">{translateText(updateUser.isPending ? "Salvando…" : "Salvar")}</button>}
                  {feedback[key] && <span className={`mt-1 block ${feedback[key] === "Alterações salvas." ? "text-emerald-700" : "text-red-700"}`} role="status">{translateText(feedback[key])}</span>}
                </>
              );
            })()}
          </label>
        </article>
      ))}
      {!users.length && <p className="text-sm text-muted-foreground">{translateText("Nenhuma conta cadastrada ainda.")}</p>}
    </div>
  );
}

function SuggestionsTable({
  suggestions,
  drafts,
  stageDraft,
  clearDraft,
  feedback,
  reportChange,
}: {
  suggestions: Suggestion[];
  drafts: Record<string, string>;
  stageDraft: (key: string, value: string, originalValue: string) => void;
  clearDraft: (key: string) => void;
  feedback: Record<string, string>;
  reportChange: (key: string, message: string) => void;
}) {
  const queryClient = useQueryClient();
  const updateSuggestion = useUpdateAdminSuggestion();

  async function saveSuggestion(suggestion: Suggestion) {
    const key = `suggestion:${suggestion.id}:status`;
    const draft = drafts[key];
    if (!draft) return;
    try {
      await updateSuggestion.mutateAsync({
        suggestionId: suggestion.id,
        data: { status: draft as SuggestionStatus },
      });
      clearDraft(key);
      reportChange(key, "Alterações salvas.");
      await queryClient.invalidateQueries({ queryKey: getListSuggestionsQueryKey() });
    } catch {
      reportChange(key, "Não foi possível salvar.");
    }
  }

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
            {(() => {
              const key = `suggestion:${suggestion.id}:status`;
              const value = drafts[key] ?? suggestion.status;
              return (
                <>
            <select
              className={`${inputClass} mt-1 block w-full`}
              disabled={updateSuggestion.isPending}
              onChange={(event) => stageDraft(key, event.target.value, suggestion.status)}
              value={value}
            >
              <option value="under_review">{translateText("Em análise")}</option>
              <option value="planned">{translateText("Planejada")}</option>
              <option value="in_progress">{translateText("Em andamento")}</option>
              <option value="completed">{translateText("Concluída")}</option>
            </select>
                  {value !== suggestion.status && <button className="auth-header-primary mt-2 !min-h-8 !px-3 !py-1 !text-xs" disabled={updateSuggestion.isPending} onClick={() => void saveSuggestion(suggestion)} type="button">{translateText(updateSuggestion.isPending ? "Salvando…" : "Salvar")}</button>}
                  {feedback[key] && <span className={`mt-1 block ${feedback[key] === "Alterações salvas." ? "text-emerald-700" : "text-red-700"}`} role="status">{translateText(feedback[key])}</span>}
                </>
              );
            })()}
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
                        {translateText(post.kind === "forum" ? "Comunidade" : post.kind === "blog" ? "Conteúdos" : post.kind === "news" ? "Novidades" : "Ajuda")}
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
