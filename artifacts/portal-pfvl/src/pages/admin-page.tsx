import { Fragment, lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link } from "wouter";
import {
  ArrowUpRight,
  ArrowDownUp,
  BookOpen,
  ChevronDown,
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
import { useUnsavedChangesConfirm } from "@/components/unsaved-changes-confirm";
import { normalizeRichContent, richContentToPlainText } from "@/components/rich-text-content";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { formatDate, LoadingState, PageHeading, QueryError, Surface } from "@/components/portal-ui";
import { translateText } from "@/lib/i18n";
import { ProfilePage } from "@/pages/profile-page";
import { refreshPostQueries } from "@/lib/post-query-refresh";

const RichTextEditor = lazy(() => import("@/components/rich-text-editor").then((module) => ({ default: module.RichTextEditor })));

type AdminSection = PostKind | "comments" | "users" | "suggestions" | "polls" | "taxonomy" | "media" | "testimonials" | "profile" | "requests";
type PostListFilters = {
  status: "all" | PostStatus;
  category: string;
  tag: string;
};
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
      { key: "taxonomy", label: "Categorias / Marcadores", icon: Tags },
      { key: "testimonials", label: "Avaliações", icon: Star },
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

function normalizeFilterText(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");
}

function PaginationControls({
  page,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, pageCount);
  if (totalItems <= pageSize) return null;

  return (
    <nav aria-label={translateText("Paginação da lista")} className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {translateText("Mostrando")} {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, totalItems)} {translateText("de")} {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          className="min-h-9 rounded-lg border border-[#233a59]/20 px-3 text-sm font-semibold text-[#233a59] disabled:opacity-45"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          type="button"
        >
          {translateText("Anterior")}
        </button>
        <span className="text-xs tabular-nums text-muted-foreground">
          {safePage} / {pageCount}
        </span>
        <button
          className="min-h-9 rounded-lg border border-[#233a59]/20 px-3 text-sm font-semibold text-[#233a59] disabled:opacity-45"
          disabled={safePage >= pageCount}
          onClick={() => onPageChange(safePage + 1)}
          type="button"
        >
          {translateText("Próxima")}
        </button>
      </div>
    </nav>
  );
}

function SortSelect({
  label,
  value,
  onChange,
  options,
  testId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  testId?: string;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#233a59]">
      <span>{translateText(label)}</span>
      <span className="grid min-h-10 min-w-0 grid-cols-[18px_minmax(0,1fr)_16px] items-center gap-2 rounded-lg border border-[#233a59]/15 bg-white px-2.5 focus-within:border-[#233a59]">
        <ArrowDownUp aria-hidden="true" className="h-4 w-4 text-[#233a59]" />
        <select
          aria-label={translateText(label)}
          className="min-w-0 appearance-none bg-transparent py-2 text-sm font-normal text-[#012140] outline-none"
          data-testid={testId}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>{translateText(option.label)}</option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" className="h-4 w-4 text-[#233a59]" />
      </span>
    </label>
  );
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
  const { confirm: confirmUnsavedChanges, dialog: unsavedChangesDialog } = useUnsavedChangesConfirm();
  const [tab, setTab] = useState<AdminSection>("blog");
  const [createOpen, setCreateOpen] = useState(false);
  const [postDateOrder, setPostDateOrder] = useState<"createdAt" | "updatedAt">("createdAt");
  const [postSortDirection, setPostSortDirection] = useState<"newest" | "oldest">("newest");
  const [postFiltersByKind, setPostFiltersByKind] = useState<Record<PostKind, PostListFilters>>({
    blog: { status: "all", category: "all", tag: "all" },
    forum: { status: "all", category: "all", tag: "all" },
    news: { status: "all", category: "all", tag: "all" },
    help: { status: "all", category: "all", tag: "all" },
  });
  const [postPage, setPostPage] = useState(1);
  const [editingPost, setEditingPost] = useState<number | null>(null);
  const [adminDrafts, setAdminDrafts] = useState<Record<string, string>>({});
  const [changeFeedback, setChangeFeedback] = useState<Record<string, string>>({});
  const [adminActionFeedback, setAdminActionFeedback] = useState<{ message: string; kind: "success" | "error" } | null>(null);
  const dirtyKeys = Object.keys(adminDrafts);
  const profile = useGetCurrentUser({
    query: { queryKey: getGetCurrentUserQueryKey(), retry: false },
  });
  const posts = useListAdminPosts({
    query: {
      queryKey: getListAdminPostsQueryKey(),
      enabled: profile.data?.role === "admin",
      refetchOnWindowFocus: true,
    },
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
    let allowUnload = false;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowUnload) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const confirmHistoryNavigation = (event: PopStateEvent) => {
      event.stopImmediatePropagation();
      const destinationUrl = window.location.href;
      window.history.pushState(window.history.state, "", currentUrl);
      void confirmUnsavedChanges().then((confirmed) => {
        if (!confirmed) return;
        allowUnload = true;
        setAdminDrafts({});
        window.location.assign(destinationUrl);
      });
    };
    const confirmInternalNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.href === window.location.href) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void confirmUnsavedChanges().then((confirmed) => {
        if (!confirmed) return;
        allowUnload = true;
        setAdminDrafts({});
        window.location.assign(destination.href);
      });
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    window.addEventListener("popstate", confirmHistoryNavigation, true);
    document.addEventListener("click", confirmInternalNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      window.removeEventListener("popstate", confirmHistoryNavigation, true);
      document.removeEventListener("click", confirmInternalNavigation, true);
    };
  }, [confirmUnsavedChanges, dirtyKeys.length]);

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

  function clearAdminDrafts(keys: string[]) {
    if (!keys.length) return;
    const keysToClear = new Set(keys);
    setAdminDrafts((current) => {
      const remaining = Object.fromEntries(
        Object.entries(current).filter(([key]) => !keysToClear.has(key)),
      );
      return Object.keys(remaining).length === Object.keys(current).length ? current : remaining;
    });
  }

  function reportChange(key: string, message: string) {
    setChangeFeedback((current) => ({ ...current, [key]: message }));
  }

  async function confirmDiscardChanges(keys = dirtyKeys) {
    const pendingKeys = keys.filter((key) => key in adminDrafts);
    if (!pendingKeys.length) return true;
    const confirmed = await confirmUnsavedChanges();
    if (confirmed) clearAdminDrafts(pendingKeys);
    return confirmed;
  }

  async function closeCreatePost() {
    if (!await confirmDiscardChanges(["create-post"])) return;
    clearAdminDraft("create-post");
    setCreateOpen(false);
  }

  function currentSectionDraftKeys(section: AdminSection): string[] {
    const keys = Object.keys(adminDrafts);
    if (section in postSectionDetails) {
      const visiblePostKeys = new Set(visiblePosts.map((post) => `post:${post.id}:status`));
      return keys.filter((key) =>
        (createOpen && key === "create-post")
        || (editingPost !== null && key === `edit-post:${editingPost}`)
        || visiblePostKeys.has(key),
      );
    }
    if (section === "taxonomy") return keys.filter((key) => key === "taxonomy-form");
    if (section === "media") return keys.filter((key) => key.startsWith("media:"));
    if (section === "users") return keys.filter((key) => key.startsWith("user:"));
    if (section === "suggestions") return keys.filter((key) => key.startsWith("suggestion:"));
    return [];
  }

  async function openCreatePost() {
    if (editingPost !== null) {
      const key = `edit-post:${editingPost}`;
      if (!await confirmDiscardChanges([key])) return;
      clearAdminDraft(key);
      setEditingPost(null);
    }
    setCreateOpen(true);
  }

  async function toggleEditingPost(postId: number) {
    const currentEditKey = editingPost === null ? null : `edit-post:${editingPost}`;
    if (editingPost === postId) {
      if (!await confirmDiscardChanges([`edit-post:${postId}`])) return;
      clearAdminDraft(`edit-post:${postId}`);
      setEditingPost(null);
      return;
    }
    if (createOpen && !await confirmDiscardChanges(["create-post"])) return;
    if (currentEditKey && !await confirmDiscardChanges([currentEditKey])) return;
    if (createOpen) {
      clearAdminDraft("create-post");
      setCreateOpen(false);
    }
    if (currentEditKey) clearAdminDraft(currentEditKey);
    setEditingPost(postId);
  }

  if (profile.isLoading) return <LoadingState rows={3} />;
  const profileErrorStatus = (profile.error as { status?: number } | null)?.status;
  if (profile.isError && profileErrorStatus !== 401 && profileErrorStatus !== 403) {
    return <QueryError retry={() => void profile.refetch()} />;
  }
  if (profile.isError || profile.data?.role !== "admin") {
    return (
      <Surface className="p-6">
        <h2 className="font-display text-xl font-semibold text-[#012140]">{translateText("Acesso administrativo restrito")}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {translateText("Sua conta não tem acesso ao painel administrativo.")}
        </p>
        <Link className="auth-header-primary mt-4 inline-flex" href="/">{translateText("Voltar ao início")}</Link>
      </Surface>
    );
  }

  async function changePostStatus(post: Post, status: PostStatus) {
    const key = `post:${post.id}:status`;
    try {
      await updatePost.mutateAsync({ postId: post.id, data: { status } });
      clearAdminDraft(key);
      setChangeFeedback((current) => ({ ...current, [key]: "Alterações salvas." }));
      await refreshPostQueries(queryClient, post.id);
    } catch {
      setChangeFeedback((current) => ({ ...current, [key]: "Não foi possível salvar." }));
    }
  }

  async function removePost(post: Post) {
    const confirmed = await confirmUnsavedChanges({
      title: "Confirmar exclusão",
      description: translateText('Excluir permanentemente “{{title}}” e os comentários vinculados?')
        .replace("{{title}}", post.title),
      confirmLabel: "Excluir permanentemente",
      cancelLabel: "Cancelar",
      destructive: true,
    });
    if (!confirmed) return;
    if (editingPost === post.id && !await confirmDiscardChanges([`edit-post:${post.id}`])) return;
    setAdminActionFeedback(null);
    try {
      await deletePost.mutateAsync({ postId: post.id });
      if (editingPost === post.id) {
        clearAdminDraft(`edit-post:${post.id}`);
        setEditingPost(null);
      }
      await refreshPostQueries(queryClient, post.id);
      setAdminActionFeedback({ message: "Publicação excluída.", kind: "success" });
    } catch (error) {
      setAdminActionFeedback({
        message: getApiResponseError(error) ?? "Não foi possível excluir a publicação.",
        kind: "error",
      });
    }
  }

  const isPostSection = tab in postSectionDetails;
  const postFilters = postFiltersByKind[isPostSection ? tab as PostKind : "blog"];
  const visiblePosts = isPostSection
    ? (posts.data ?? []).filter((post) =>
        post.kind === tab
        && (postFilters.status === "all" || post.status === postFilters.status)
        && (postFilters.category === "all" || post.category === postFilters.category)
        && (postFilters.tag === "all" || post.tags.includes(postFilters.tag)),
      )
    : [];
  const orderedPosts = [...visiblePosts].sort((left, right) => {
    const difference =
      new Date(left[postDateOrder]).getTime() - new Date(right[postDateOrder]).getTime();
    const orderedDifference = postSortDirection === "oldest" ? difference : -difference;
    return orderedDifference || (postSortDirection === "oldest" ? left.id - right.id : right.id - left.id);
  });
  const postCategories = [...new Set((posts.data ?? []).filter((post) => post.kind === tab).map((post) => post.category))]
    .sort((left, right) => left.localeCompare(right, "pt-BR"));
  const postTags = [...new Set((posts.data ?? []).filter((post) => post.kind === tab).flatMap((post) => post.tags))]
    .sort((left, right) => left.localeCompare(right, "pt-BR"));
  const postPageSize = 10;
  const postPageCount = Math.max(1, Math.ceil(orderedPosts.length / postPageSize));
  const visiblePostPage = orderedPosts.slice(
    (Math.min(postPage, postPageCount) - 1) * postPageSize,
    Math.min(postPage, postPageCount) * postPageSize,
  );
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

  async function preparePostListChange() {
    if (editingPost === null) return true;
    const key = `edit-post:${editingPost}`;
    if (!await confirmDiscardChanges([key])) return false;
    clearAdminDraft(key);
    setEditingPost(null);
    return true;
  }

  function updateActivePostFilters(updates: Partial<PostListFilters>) {
    const kind = tab as PostKind;
    setPostFiltersByKind((current) => ({
      ...current,
      [kind]: { ...current[kind], ...updates },
    }));
  }

  return (
    <div className="mt-6 space-y-5">
      {unsavedChangesDialog}
      <div className="grid gap-4 lg:grid-cols-[296px_minmax(0,1fr)]">
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
                        onClick={async () => {
                          if (tab === item.key) return;
                          const pendingKeys = currentSectionDraftKeys(tab);
                          if (!await confirmDiscardChanges(pendingKeys)) return;
                          clearAdminDrafts(pendingKeys);
                          setTab(item.key);
                          setPostPage(1);
                          setCreateOpen(false);
                          setEditingPost(null);
                        }}
                        type="button"
                      >
                        <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${isActive ? "text-[#233a59]" : "text-white/65"}`} />
                        <span className="shrink-0 whitespace-nowrap">{translateText(item.label)}</span>
                        {count !== undefined && (
                          <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] tabular-nums ${isActive ? "bg-[#e8e8e8] text-[#012140]" : "bg-white/10 text-white/70"}`}>
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
          {adminActionFeedback && (
            <p
              className={`mx-4 mt-4 rounded-lg px-3 py-2 text-sm sm:mx-6 ${adminActionFeedback.kind === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}
              role={adminActionFeedback.kind === "success" ? "status" : "alert"}
            >
              {translateText(adminActionFeedback.message)}
            </p>
          )}
          {isPostSection && (
            <div className="space-y-4 p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
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
                <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:w-[760px] xl:grid-cols-3">
                  <SortSelect
                    label="Ordenar por data"
                    value={postDateOrder}
                    onChange={async (value) => {
                      if (!await preparePostListChange()) return;
                      setPostDateOrder(value as "createdAt" | "updatedAt");
                      setPostPage(1);
                    }}
                    options={[
                      { value: "createdAt", label: "Data de criação" },
                      { value: "updatedAt", label: "Última atualização" },
                    ]}
                    testId="admin-post-date-sort"
                  />
                  <SortSelect
                    label="Ordem dos resultados"
                    value={postSortDirection}
                    onChange={async (value) => {
                      if (!await preparePostListChange()) return;
                      setPostSortDirection(value as "newest" | "oldest");
                      setPostPage(1);
                    }}
                    options={[
                      { value: "newest", label: "Mais recentes primeiro" },
                      { value: "oldest", label: "Mais antigas primeiro" },
                    ]}
                    testId="admin-post-date-direction"
                  />
                  <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#233a59]">
                    <span>{translateText("Filtrar por status")}</span>
                    <select className={`${inputClass} min-h-10 w-full`} data-testid="admin-post-status-filter" onChange={async (event) => {
                      const value = event.currentTarget.value as "all" | PostStatus;
                      if (!await preparePostListChange()) return;
                      updateActivePostFilters({ status: value });
                      setPostPage(1);
                    }} value={postFilters.status}>
                      <option value="all">{translateText("Todos os status")}</option>
                      <option value="published">{translateText("Publicado")}</option>
                      <option value="draft">{translateText("Rascunho")}</option>
                      <option value="hidden">{translateText("Oculto")}</option>
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#233a59]">
                    <span>{translateText("Filtrar por categoria")}</span>
                    <select className={`${inputClass} min-h-10 w-full`} data-testid="admin-post-category-filter" onChange={async (event) => {
                      const value = event.currentTarget.value;
                      if (!await preparePostListChange()) return;
                      updateActivePostFilters({ category: value });
                      setPostPage(1);
                    }} value={postFilters.category}>
                      <option value="all">{translateText("Todas as categorias")}</option>
                      {postCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#233a59]">
                    <span>{translateText("Filtrar por marcador")}</span>
                    <select className={`${inputClass} min-h-10 w-full`} data-testid="admin-post-tag-filter" onChange={async (event) => {
                      const value = event.currentTarget.value;
                      if (!await preparePostListChange()) return;
                      updateActivePostFilters({ tag: value });
                      setPostPage(1);
                    }} value={postFilters.tag}>
                      <option value="all">{translateText("Todos os marcadores")}</option>
                      {postTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                    </select>
                  </label>
                  <button className="auth-header-primary w-full self-end" data-testid="admin-create-post" onClick={() => void (createOpen ? closeCreatePost() : openCreatePost())} type="button">
                    {translateText(createOpen ? "Fechar criação" : "Nova publicação")}
                  </button>
                </div>
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
                  onCreated={() => {
                    clearAdminDraft("create-post");
                    setCreateOpen(false);
                  }}
                />
              )}
              {posts.isLoading ? <LoadingState rows={3} /> : posts.isError ? (
                <p className="rounded-xl bg-[#e8e8e8] p-4 text-sm text-[#233a59]">{translateText("Não foi possível carregar as publicações.")}</p>
              ) : (
                <div className="space-y-3">
                  {visiblePostPage.map((post) => (
                    <article className="rounded-xl border border-[#233a59]/15 p-4" data-testid={`admin-post-${post.id}`} key={post.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 gap-3">
                          {post.coverImageUrl ? (
                            <img alt="" className="h-16 w-24 shrink-0 rounded-lg bg-[#e8e8e8] object-contain" src={post.coverImageUrl} />
                          ) : (
                            <div className="grid h-16 w-24 shrink-0 place-items-center rounded-lg bg-[#e8e8e8] text-[#233a59]">
                              <FileText aria-hidden="true" className="h-5 w-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="font-semibold text-[#012140]">{post.title}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {post.category} · {post.authorName} · {translateText(postDateOrder === "createdAt" ? "Data de criação" : "Última atualização")}: {formatDate(post[postDateOrder])}
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
                        <button className="auth-header-link !border-[#233a59]/20 !text-[#233a59]" data-testid={`admin-post-edit-${post.id}`} onClick={() => void toggleEditingPost(post.id)} type="button">
                          {translateText(editingPost === post.id ? "Fechar edição" : "Editar")}
                        </button>
                        <button className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" data-testid={`admin-post-delete-${post.id}`} disabled={deletePost.isPending} onClick={() => void removePost(post)} type="button">
                          {translateText("Excluir")}
                        </button>
                        {post.status === "published" ? (
                          <a
                            className="inline-flex items-center gap-1 self-center text-sm font-semibold text-[#233a59] hover:underline"
                            href={`/${post.kind === "forum" ? "community" : post.kind === "blog" ? "content" : post.kind}/${post.id}`}
                          >
                            {translateText("Abrir")} <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <span className="self-center text-xs text-muted-foreground">
                            {translateText(post.status === "draft" ? "Disponível ao público após a publicação." : "Esta publicação está oculta para o público.")}
                          </span>
                        )}
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
                            await refreshPostQueries(queryClient, post.id);
                          }}
                        />
                      )}
                    </article>
                  ))}
                  {!orderedPosts.length && (
                    <div className="rounded-xl border border-dashed border-[#233a59]/25 px-5 py-10 text-center">
                      <FileText aria-hidden="true" className="mx-auto h-7 w-7 text-[#233a59]/55" />
                      <p className="mt-3 font-semibold text-[#012140]">
                        {translateText(postFilters.status === "all" && postFilters.category === "all" && postFilters.tag === "all"
                          ? "Ainda não há publicações nesta seção."
                          : "Nenhuma publicação corresponde aos filtros.")}
                      </p>
                      {postFilters.status === "all" && postFilters.category === "all" && postFilters.tag === "all" && <p className="mt-1 text-sm text-muted-foreground">
                        {translateText("Crie a primeira para começar a organizar este espaço.")}
                      </p>}
                    </div>
                  )}
                  <PaginationControls
                    page={postPage}
                    pageSize={postPageSize}
                    totalItems={orderedPosts.length}
                    onPageChange={async (nextPage) => {
                      if (!await preparePostListChange()) return;
                      setPostPage(nextPage);
                    }}
                  />
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
  subjects,
  isLoading,
  isError,
  retry,
}: {
  requests: AdminSupportRequest[];
  subjects: SupportRequestSubject[];
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"requests" | "subjects">("requests");
  const [requestsPage, setRequestsPage] = useState(1);
  const visibleRequests = requests.filter((request) => request.requestType === "support");
  const visibleCounts = visibleRequests.reduce(
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
          requests={visibleRequests}
          counts={visibleCounts}
          classificationOptions={subjects.map((subject) => subject.name)}
          filterBy="subject"
          isLoading={isLoading}
          isError={isError}
          retry={retry}
          page={requestsPage}
          onPageChange={setRequestsPage}
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
  const [inboxPage, setInboxPage] = useState(1);
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
        <p className="mt-2 rounded-lg bg-[#f7f8fa] p-3 text-xs leading-5 text-[#233a59]">{translateText("O roadmap usa um título, uma descrição e um estágio próprios. A mensagem original, as respostas e os dados da conta não são publicados.")}</p>
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
          classificationOptions={categories.map((category) => category.name)}
          filterBy="category"
          isLoading={requestsLoading}
          isError={requestsError}
          retry={retryRequests}
          emptyMessage="Ainda não há sugestões recebidas."
          page={inboxPage}
          onPageChange={setInboxPage}
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
            emptyMessage="Nenhuma ideia anterior cadastrada."
          />
        </div>
      )}
    </div>
  );
}

function SupportInbox({
  requests,
  counts,
  classificationOptions,
  filterBy,
  isLoading,
  isError,
  retry,
  emptyMessage = "Ainda não há solicitações registradas.",
  page = 1,
  onPageChange,
}: {
  requests: AdminSupportRequest[];
  counts: { new: number; inProgress: number; completed: number };
  classificationOptions: string[];
  filterBy: "subject" | "category";
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
  emptyMessage?: string;
  page?: number;
  onPageChange?: (page: number) => void;
}) {
  const queryClient = useQueryClient();
  const updateRequest = useUpdateAdminSupportRequest();
  const updateRoadmap = useUpdateAdminSupportRequestRoadmap();
  const createComment = useCreateAdminSupportRequestComment();
  const [statusFilter, setStatusFilter] = useState<"all" | SupportRequestStatus>("all");
  const [classificationFilter, setClassificationFilter] = useState("all");
  const [dateField, setDateField] = useState<"createdAt" | "updatedAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const pageSize = 10;
  const [drafts, setDrafts] = useState<Record<number, SupportRequestStatus>>({});
  const [feedback, setFeedback] = useState<Record<number, string>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [commentFeedback, setCommentFeedback] = useState<Record<number, string>>({});
  const [roadmapFeedback, setRoadmapFeedback] = useState<Record<number, string>>({});
  const [expandedRequestId, setExpandedRequestId] = useState<number | null>(null);
  const [roadmapDrafts, setRoadmapDrafts] = useState<Record<number, {
    title: string;
    description: string;
    status: NonNullable<AdminSupportRequest["roadmapStatus"]>;
  }>>({});

  const visibleRequests = requests
    .filter((request) =>
      (statusFilter === "all" || request.status === statusFilter)
       && (classificationFilter === "all"
         || (filterBy === "subject" ? request.subjectName : request.categoryName ?? "") === classificationFilter),
    )
    .sort((left, right) => {
      const difference = new Date(left[dateField]).getTime() - new Date(right[dateField]).getTime();
      return sortOrder === "oldest"
        ? difference || left.id - right.id
        : -difference || right.id - left.id;
    });
  const availableClassifications = [...new Set([
    ...classificationOptions,
    ...requests.map((request) => filterBy === "subject" ? request.subjectName : request.categoryName).filter((name): name is string => Boolean(name)),
  ])].sort((left, right) => left.localeCompare(right, "pt-BR"));
  const pageCount = Math.max(1, Math.ceil(visibleRequests.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleRequestPage = visibleRequests.slice((safePage - 1) * pageSize, safePage * pageSize);

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
      setFeedback((current) => ({ ...current, [request.id]: "Não foi possível salvar as alterações. Tente novamente." }));
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

  function roadmapDraft(request: AdminSupportRequest) {
    return roadmapDrafts[request.id] ?? {
      title: request.roadmapTitle ?? "",
      description: request.roadmapDescription ?? "",
      status: request.roadmapStatus ?? "planned",
    };
  }

  function stageRoadmapDraft(
    request: AdminSupportRequest,
    field: "title" | "description" | "status",
    value: string,
  ) {
    const current = roadmapDraft(request);
    setRoadmapDrafts((drafts) => ({
      ...drafts,
      [request.id]: {
        ...current,
        [field]: field === "status"
          ? value as NonNullable<AdminSupportRequest["roadmapStatus"]>
          : value,
      },
    }));
    setRoadmapFeedback((currentFeedback) => ({
      ...currentFeedback,
      [request.id]: "",
    }));
  }

  async function saveRoadmap(request: AdminSupportRequest, approved: boolean) {
    const draft = roadmapDraft(request);
    const title = draft.title.trim();
    const description = draft.description.trim();
    if (title.length < 4 || description.length < 10) {
      setRoadmapFeedback((current) => ({
        ...current,
        [request.id]: "Informe um título público e uma descrição com pelo menos 10 caracteres.",
      }));
      return;
    }
    if (
      approved &&
      request.approvedAt === null &&
      !window.confirm(translateText("Ao publicar, somente o título e a descrição pública ficarão visíveis para todos. A mensagem original e as respostas continuam privadas. Deseja publicar?"))
    ) {
      return;
    }
    setRoadmapFeedback((current) => ({ ...current, [request.id]: "" }));
    try {
      await updateRoadmap.mutateAsync({
        requestId: request.id,
        data: {
          approved,
          roadmapTitle: title,
          roadmapDescription: description,
          roadmapStatus: draft.status,
        },
      });
      setRoadmapDrafts((current) => {
        const { [request.id]: _saved, ...remaining } = current;
        return remaining;
      });
      setRoadmapFeedback((current) => ({
        ...current,
        [request.id]: approved
          ? "Texto público salvo e publicado."
          : "Texto público salvo como rascunho.",
      }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAdminSupportRequestsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListPublicRoadmapSuggestionsQueryKey() }),
      ]);
    } catch (error) {
      setRoadmapFeedback((current) => ({
        ...current,
        [request.id]: getApiResponseError(error) ?? "Não foi possível atualizar a publicação do roadmap.",
      }));
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

      <div className="grid gap-3 rounded-xl bg-[#f7f8fa] p-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#233a59]">
          <span>{translateText("Filtrar por status")}</span>
          <select className={`${inputClass} min-h-10 w-full`} onChange={(event) => {
            setStatusFilter(event.target.value as typeof statusFilter);
            onPageChange?.(1);
          }} value={statusFilter}>
            <option value="all">{translateText("Todos")}</option>
            <option value="new">{translateText("Nova")}</option>
            <option value="in_progress">{translateText("Em andamento")}</option>
            <option value="completed">{translateText("Concluída")}</option>
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#233a59]">
          <span>{translateText(filterBy === "subject" ? "Filtrar por assunto" : "Filtrar por categoria")}</span>
          <select className={`${inputClass} min-h-10 w-full`} onChange={(event) => {
            setClassificationFilter(event.target.value);
            onPageChange?.(1);
          }} value={classificationFilter}>
            <option value="all">{translateText(filterBy === "subject" ? "Todos os assuntos" : "Todas as categorias")}</option>
            {availableClassifications.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <SortSelect
          label="Ordenar por data"
          value={dateField}
          onChange={(value) => {
            setDateField(value as "createdAt" | "updatedAt");
            onPageChange?.(1);
          }}
          options={[
            { value: "createdAt", label: "Data de criação" },
            { value: "updatedAt", label: "Última atualização" },
          ]}
        />
        <SortSelect
          label="Ordem dos resultados"
          value={sortOrder}
          onChange={(value) => {
            setSortOrder(value as typeof sortOrder);
            onPageChange?.(1);
          }}
          options={[
            { value: "newest", label: "Mais recentes primeiro" },
            { value: "oldest", label: "Mais antigas primeiro" },
          ]}
        />
      </div>

      <div className="support-request-table-wrap overflow-x-auto rounded-xl border border-[#233a59]/15">
        <table className="support-request-table w-full min-w-[760px] border-collapse text-left text-sm" data-testid={`table-${filterBy === "subject" ? "support-requests" : "suggestion-inbox"}`}>
          <thead className="bg-[#f7f8fa] text-xs uppercase tracking-wide text-[#233a59]/75">
            <tr>
              <th className="px-4 py-3">{translateText("Protocolo")}</th>
              <th className="px-4 py-3">{translateText("Título")}</th>
              <th className="px-4 py-3">{translateText(filterBy === "subject" ? "Assunto" : "Categoria")}</th>
              <th className="px-4 py-3">{translateText(filterBy === "subject" ? "Status" : "Status da sugestão")}</th>
              <th className="px-4 py-3">{translateText("Ação")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#233a59]/10">
        {visibleRequestPage.map((request) => {
          const selectedStatus = drafts[request.id] ?? request.status;
          const statusKey = `request:${request.id}`;
          return (
            <Fragment key={request.id}>
              <tr className={`support-request-summary-row ${expandedRequestId === request.id ? "is-expanded" : ""}`} data-testid={`support-request-${request.id}`}>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-[#233a59]" data-label={translateText("Protocolo")}>{request.protocol}</td>
                <td className="max-w-[320px] px-4 py-3 font-semibold text-[#012140]" data-label={translateText("Título")}>{request.title || request.subjectName}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground" data-label={translateText(filterBy === "subject" ? "Assunto" : "Categoria")}>{filterBy === "subject" ? request.subjectName : request.categoryName ?? "—"}</td>
                <td className="px-4 py-3" data-label={translateText(filterBy === "subject" ? "Status" : "Status da sugestão")}>
                  <span className={`support-request-status ${request.status === "new" ? "bg-amber-50 text-amber-800" : request.status === "completed" ? "bg-emerald-50 text-emerald-800" : "bg-blue-50 text-blue-800"}`}>
                    {translateText(supportStatusLabel[request.status])}
                  </span>
                </td>
                <td className="px-4 py-3" data-label={translateText("Ação")}>
                  <button
                    aria-controls={`support-request-detail-${request.id}`}
                    aria-expanded={expandedRequestId === request.id}
                    className="rounded-lg px-2 py-1 font-semibold text-[#233a59] underline underline-offset-2 hover:bg-[#f7f8fa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#315571]"
                    onClick={() => setExpandedRequestId((current) => current === request.id ? null : request.id)}
                    type="button"
                  >
                    {translateText(expandedRequestId === request.id ? "Fechar" : "Abrir")}
                  </button>
                </td>
              </tr>
              {expandedRequestId === request.id && (
              <tr className="support-request-detail-row">
                <td className="bg-[#fcfcfd] px-4 py-4" colSpan={5}>
              <div className="support-request-details" id={`support-request-detail-${request.id}`} data-testid={`support-request-details-${request.id}`}>
                <p className="text-xs text-muted-foreground">
                  {request.subjectName}{request.categoryName ? ` · ${request.categoryName}` : ""} · {request.requesterName} · <a className="underline" href={`mailto:${request.requesterEmail}`}>{request.requesterEmail}</a> · {formatDate(request.createdAt)}
                </p>
                <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-[#f7f8fa] p-3 text-sm leading-6 text-[#233a59]">{request.message}</p>
              {request.requestType === "suggestion" && (
                <div className="mt-3 space-y-3 rounded-xl border border-[#233a59]/10 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <div>
                      <p className="font-bold text-[#233a59]">{translateText("Texto próprio do roadmap público")}</p>
                      <p className="mt-1">{translateText("A mensagem original e as respostas permanecem privadas.")}</p>
                    </div>
                    {request.approvedAt && <span>{translateText("Publicada em")} {formatDate(request.approvedAt)}</span>}
                  </div>
                  {(() => {
                    const draft = roadmapDraft(request);
                    return (
                      <div className="grid gap-3">
                        <label className="block text-xs font-semibold text-[#233a59]">
                          {translateText("Título público")}
                          <input
                            className={`${inputClass} mt-1 block w-full`}
                            maxLength={220}
                            minLength={4}
                            onChange={(event) => stageRoadmapDraft(request, "title", event.target.value)}
                            value={draft.title}
                          />
                        </label>
                        <label className="block text-xs font-semibold text-[#233a59]">
                          {translateText("Descrição pública")}
                          <textarea
                            className={`${inputClass} mt-1 block min-h-24 w-full resize-y`}
                            maxLength={5000}
                            minLength={10}
                            onChange={(event) => stageRoadmapDraft(request, "description", event.target.value)}
                            value={draft.description}
                          />
                        </label>
                        <label className="block text-xs font-semibold text-[#233a59]">
                          {translateText("Estágio público")}
                          <select
                            className={`${inputClass} mt-1 block w-full sm:w-auto`}
                            onChange={(event) => stageRoadmapDraft(request, "status", event.target.value)}
                            value={draft.status}
                          >
                            <option value="planned">{translateText("Planejada")}</option>
                            <option value="in_progress">{translateText("Em desenvolvimento")}</option>
                            <option value="available">{translateText("Disponível")}</option>
                          </select>
                        </label>
                      </div>
                    );
                  })()}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="rounded-lg border border-[#233a59]/20 px-3 py-2 text-sm font-semibold text-[#233a59] hover:bg-[#f7f8fa]"
                      disabled={updateRoadmap.isPending}
                      onClick={() => void saveRoadmap(request, Boolean(request.approvedAt))}
                      type="button"
                    >
                      {translateText("Salvar texto público")}
                    </button>
                    <button
                      className={request.approvedAt ? "rounded-lg border border-[#233a59]/20 px-3 py-2 text-sm font-semibold text-[#233a59] hover:bg-[#f7f8fa]" : "auth-header-primary !min-h-9 !px-3 !py-1.5 !text-sm"}
                      disabled={updateRoadmap.isPending}
                      onClick={() => void saveRoadmap(request, !request.approvedAt)}
                      type="button"
                    >
                      {translateText(request.approvedAt ? "Retirar do roadmap" : "Salvar e publicar")}
                    </button>
                    {roadmapFeedback[request.id] && (
                      <span className={roadmapFeedback[request.id].startsWith("Texto público salvo") ? "text-xs text-emerald-700" : "text-xs text-red-700"} role="status">
                        {translateText(roadmapFeedback[request.id])}
                      </span>
                    )}
                  </div>
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
              </div>
                </td>
              </tr>
              )}
            </Fragment>
          );
        })}
        {!visibleRequests.length && (
          <tr className="support-request-empty-row"><td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={5}>
            {translateText(statusFilter === "all" && classificationFilter === "all"
              ? emptyMessage
              : filterBy === "subject"
                ? "Nenhuma solicitação encontrada com os filtros selecionados."
                : "Nenhuma sugestão encontrada com os filtros selecionados.")}
          </td></tr>
        )}
          </tbody>
        </table>
        {onPageChange && (
          <PaginationControls page={safePage} pageSize={pageSize} totalItems={visibleRequests.length} onPageChange={onPageChange} />
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
        <h3 className="font-semibold text-[#012140]">{translateText("Categorias de sugestões")}</h3>
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
  const [dateField, setDateField] = useState<"createdAt" | "updatedAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const orderedTestimonials = [...testimonials].sort((left, right) => {
    const pendingDifference = Number(right.status === "pending") - Number(left.status === "pending");
    if (pendingDifference) return pendingDifference;
    const difference = new Date(left[dateField]).getTime() - new Date(right[dateField]).getTime();
    return sortOrder === "oldest"
      ? difference || left.id - right.id
      : -difference || right.id - left.id;
  });
  const pageCount = Math.max(1, Math.ceil(orderedTestimonials.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleTestimonials = orderedTestimonials.slice((safePage - 1) * pageSize, safePage * pageSize);

  async function review(testimonialId: number, status: "approved" | "rejected") {
    setFeedback("");
    setFailure("");
    try {
      await updateTestimonial.mutateAsync({ testimonialId, data: { status } });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAdminTestimonialsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListTestimonialsQueryKey() }),
      ]);
      setFeedback(translateText(status === "approved" ? "Avaliação aprovada e publicada." : "Avaliação recusada."));
    } catch {
      setFailure(translateText("Não foi possível atualizar esta avaliação. Tente novamente."));
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#233a59]/65">{translateText("Voz da comunidade")}</p>
        <h2 className="mt-1 font-display text-xl font-semibold text-[#012140]">{translateText("Revisão de avaliações")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{translateText("Leia cada avaliação antes de aprová-la para a página inicial ou recusá-la.")}</p>
      </header>
      {feedback && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800" role="status">{feedback}</p>}
      {failure && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800" role="alert">{failure}</p>}
      {isLoading ? <LoadingState rows={3} /> : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <p>{translateText("Não foi possível carregar as avaliações.")}</p>
          <button className="mt-2 font-semibold underline" type="button" onClick={retry}>{translateText("Tentar novamente")}</button>
        </div>
      ) : testimonials.length ? (
        <div className="space-y-3">
          <div className="grid gap-3 rounded-xl bg-[#f7f8fa] p-3 sm:grid-cols-2">
            <SortSelect
              label="Ordenar por data"
              value={dateField}
              onChange={(value) => {
                setDateField(value as "createdAt" | "updatedAt");
                setPage(1);
              }}
              options={[
                { value: "createdAt", label: "Data de criação" },
                { value: "updatedAt", label: "Última atualização" },
              ]}
            />
            <SortSelect
              label="Ordem dos resultados"
              value={sortOrder}
              onChange={(value) => {
                setSortOrder(value as typeof sortOrder);
                setPage(1);
              }}
              options={[
                { value: "newest", label: "Mais recentes primeiro" },
                { value: "oldest", label: "Mais antigas primeiro" },
              ]}
            />
          </div>
          {visibleTestimonials.map((item) => (
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
                  <span className={`testimonial-status-chip status-${item.status}`}>{translateText(item.status === "pending" ? "Em análise" : item.status === "approved" ? "Aprovada" : "Recusada")}</span>
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
          <PaginationControls page={safePage} pageSize={pageSize} totalItems={orderedTestimonials.length} onPageChange={setPage} />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#233a59]/25 px-5 py-10 text-center">
          <Star className="mx-auto h-7 w-7 text-[#233a59]/55" />
          <p className="mt-3 font-semibold text-[#012140]">{translateText("Nenhuma avaliação enviada ainda.")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{translateText("As avaliações enviadas pelos membros aparecerão para revisão.")}</p>
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
      title: "Imagem principal da página inicial",
      description: "Imagem de fundo da página inicial. Esta configuração aponta para um arquivo no armazenamento configurado; ela não envia o arquivo.",
      extensions: ["jpg", "jpeg", "png", "webp"],
    },
    {
      slot: "presentation_video",
      folder: "videop",
      title: "Vídeo de apresentação",
      description: "Vídeo exibido na página de apresentação do PFVL. Esta configuração aponta para um arquivo no armazenamento configurado; ela não envia o arquivo.",
      extensions: ["mp4", "webm"],
    },
  ];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#233a59]/65">{translateText("Arquivos de mídia")}</p>
        <h2 className="mt-1 font-display text-xl font-semibold text-[#012140]">{translateText("Imagem / Vídeo")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {translateText("Informe o nome e a extensão exatos do arquivo já disponível no armazenamento configurado. A pasta exibida é fixa; para trocar a mídia, substitua o arquivo nesse armazenamento e atualize esta referência. Esta configuração informa o nome e a extensão do arquivo; ela não envia o arquivo.")}
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
        {translateText("Pasta configurada:")} <code className="font-semibold">{folder}/</code>
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
          <p className="mt-1 text-xs text-muted-foreground">{translateText("Informe somente o nome do arquivo, sem a extensão ou o caminho da pasta.")}</p>
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
        {translateText("O arquivo precisa estar no armazenamento configurado em")} <code>{folder}/{name.trim() || "nome"}.{extension}</code>.
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
  const { confirm: confirmAction, dialog: confirmationDialog } = useUnsavedChangesConfirm();
  const [type, setType] = useState<"category" | "tag">("category");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [nameError, setNameError] = useState("");
  const [editNameError, setEditNameError] = useState("");
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
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setNameError("Informe um nome com pelo menos 2 caracteres.");
      return;
    }
    setNameError("");
    try {
      await create.mutateAsync({ data: { type, name: cleanName } });
      setName("");
      setMessage("Opção cadastrada e disponível para novas publicações.");
      onDirtyChange(false);
      await refreshCatalog();
    } catch (error) {
      setMessage(getApiResponseError(error) ?? (error instanceof Error ? error.message : "Não foi possível cadastrar esta opção."));
    }
  }

  async function deleteItem(item: TaxonomyItem) {
    const confirmed = await confirmAction({
      title: "Confirmar exclusão",
      description: translateText(item.type === "category"
        ? 'Excluir a categoria “{{name}}”?'
        : 'Excluir o marcador “{{name}}”?').replace("{{name}}", item.name),
      confirmLabel: item.type === "category" ? "Excluir categoria" : "Excluir marcador",
      cancelLabel: "Cancelar",
      destructive: true,
    });
    if (!confirmed) return;
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
    const cleanName = editName.trim();
    if (cleanName.length < 2) {
      setEditNameError("Informe um nome com pelo menos 2 caracteres.");
      return;
    }
    setEditNameError("");
    try {
      await update.mutateAsync({ taxonomyId: item.id, data: { name: cleanName } });
      setEditingId(null);
      setEditName("");
      setMessage("Nome atualizado nas publicações existentes e no catálogo.");
      onDirtyChange(false);
      await refreshCatalog(true);
    } catch (error) {
      setMessage(getApiResponseError(error) ?? (error instanceof Error ? error.message : "Não foi possível editar esta opção."));
    }
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {confirmationDialog}
      <header>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#233a59]/65">{translateText("Organização do conteúdo")}</p>
        <h2 className="mt-1 font-display text-xl font-semibold text-[#012140]">{translateText("Categorias e marcadores")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {translateText("Cadastre categorias e marcadores compartilhados por todas as áreas. Ao editar um nome, todas as publicações existentes que o utilizam também serão atualizadas.")}
        </p>
      </header>

      <form className="grid gap-3 rounded-xl bg-[#f6f7f9] p-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end" noValidate onSubmit={submit}>
        <label className="block text-sm font-semibold text-[#012140]">
          {translateText("Tipo")}
          <select className={`${inputClass} mt-1.5 w-full`} onChange={(event) => { setType(event.target.value as "category" | "tag"); setNameError(""); }} value={type}>
            <option value="category">{translateText("Categoria")}</option>
            <option value="tag">{translateText("Marcador")}</option>
          </select>
        </label>
        <label className="block text-sm font-semibold text-[#012140]">
          {translateText("Nome")}
          <input
            aria-describedby={nameError ? "taxonomy-name-error" : undefined}
            aria-invalid={Boolean(nameError)}
            className={`${inputClass} mt-1.5 w-full`}
            maxLength={type === "tag" ? 40 : 100}
            minLength={2}
            onChange={(event) => { setName(event.target.value); if (event.target.value.trim().length >= 2) setNameError(""); }}
            required
            value={name}
          />
          {nameError && <span className="mt-1 block text-xs font-normal text-red-700" id="taxonomy-name-error" role="alert">{translateText(nameError)}</span>}
        </label>
        <button className="auth-header-primary" disabled={create.isPending} type="submit">
          {translateText(create.isPending ? "Salvando…" : "Adicionar")}
        </button>
      </form>
      {message && <p className="text-sm text-[#233a59]" role="status">{translateText(message)}</p>}

      {isLoading ? <LoadingState rows={3} /> : isError ? (
        <p className="rounded-xl bg-[#e8e8e8] p-4 text-sm text-[#233a59]">{translateText("Não foi possível carregar categorias e marcadores.")}</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {(["category", "tag"] as const).map((itemType) => {
            const group = items.filter((item) => item.type === itemType);
            return (
              <section className="rounded-xl border border-[#233a59]/15 p-4" key={itemType}>
                <h3 className="font-semibold text-[#012140]">
                  {translateText(itemType === "category" ? "Categorias" : "Marcadores")}
                </h3>
                    {group.length ? (
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {group.map((item) => (
                          <li className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#e8e8e8] px-3 py-1.5 text-sm text-[#012140]" key={item.id}>
                            {editingId === item.id ? (
                              <form className="flex flex-wrap items-center gap-2" noValidate onSubmit={(event) => void saveEdit(event, item)}>
                                <label className="sr-only" htmlFor={`taxonomy-edit-${item.id}`}>{translateText("Editar")} {item.name}</label>
                                <input
                                  aria-describedby={editNameError ? `taxonomy-edit-error-${item.id}` : undefined}
                                  aria-invalid={Boolean(editNameError)}
                                  autoFocus
                                  className="min-w-0 rounded-md border border-[#233a59]/20 bg-white px-2 py-1 text-sm"
                                  id={`taxonomy-edit-${item.id}`}
                                  maxLength={item.type === "tag" ? 40 : 100}
                                  minLength={2}
                                  onChange={(event) => { setEditName(event.target.value); if (event.target.value.trim().length >= 2) setEditNameError(""); }}
                                  required
                                  value={editName}
                                />
                                {editNameError && <span className="basis-full text-xs text-red-700" id={`taxonomy-edit-error-${item.id}`} role="alert">{translateText(editNameError)}</span>}
                                <button className="font-semibold text-[#012140] hover:underline disabled:opacity-50" disabled={update.isPending} type="submit">
                                  {translateText(update.isPending ? "Salvando…" : "Salvar")}
                                </button>
                                <button
                                  className="text-[#526171] hover:underline"
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditName("");
                                    setEditNameError("");
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
                                    setEditNameError("");
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
              </section>
            );
          })}
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
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");
  const [refreshMessage, setRefreshMessage] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const polls = useListAdminPolls({ query: { queryKey: getListAdminPollsQueryKey() } });
  const active = useGetActivePoll({ query: { queryKey: getGetActivePollQueryKey() } });
  const create = useCreateAdminPoll();
  const close = useCloseAdminPoll();
  const pageSize = 10;
  const orderedPolls = [...(polls.data ?? [])].sort((left, right) => {
    const difference = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    return sortOrder === "oldest"
      ? difference || left.id - right.id
      : -difference || right.id - left.id;
  });
  const pageCount = Math.max(1, Math.ceil(orderedPolls.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visiblePolls = orderedPolls.slice((safePage - 1) * pageSize, safePage * pageSize);

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
      setPage(1);
      setMessageKind("success");
      setMessage("Enquete publicada. A anterior, se ativa, foi encerrada.");
      await refreshPolls();
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error ? error.message : "Não foi possível criar a enquete.");
    }
  }

  async function closePoll(pollId: number) {
    if (!window.confirm("Encerrar esta enquete? Os votos ficam disponíveis no histórico.")) return;
    setMessage("");
    try {
      await close.mutateAsync({ pollId });
      setMessageKind("success");
      setMessage("Enquete encerrada.");
      await refreshPolls();
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error ? error.message : "Não foi possível encerrar a enquete.");
    }
  }

  async function refreshPollResults() {
    setRefreshMessage("");
    setRefreshError("");
    try {
      const [pollResult, activeResult] = await Promise.all([polls.refetch(), active.refetch()]);
      if (pollResult.isError || activeResult.isError) {
        throw new Error("Não foi possível atualizar os resultados. Tente novamente.");
      }
      setRefreshMessage(translateText("Resultados atualizados."));
    } catch {
      setRefreshError(translateText("Não foi possível atualizar os resultados. Tente novamente."));
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-[#012140]">{translateText("Enquetes da comunidade")}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{translateText("Publique uma pergunta para receber votos. Apenas uma enquete pode ficar ativa por vez.")}</p>
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
          {message && <p className={`text-sm ${messageKind === "success" ? "text-emerald-700" : "text-red-700"}`} role={messageKind === "success" ? "status" : "alert"}>{translateText(message)}</p>}
          <div>
            <button className="auth-header-primary" data-testid="button-poll-create" disabled={create.isPending || form.formState.isSubmitting} type="submit">
              {translateText(create.isPending ? "Publicando…" : "Publicar enquete")}
            </button>
          </div>
        </form>
      </Form>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3"><h3 className="font-display text-lg font-semibold text-[#012140]">{translateText("Histórico e resultados")}</h3><button className="auth-header-link !border-[#233a59]/20 !text-[#233a59]" disabled={polls.isFetching || active.isFetching} onClick={() => void refreshPollResults()} type="button">{translateText(polls.isFetching || active.isFetching ? "Atualizando…" : "Atualizar")}</button></div>
        {refreshMessage && <p className="text-sm text-emerald-700" role="status">{refreshMessage}</p>}
        {refreshError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{refreshError}</p>}
        <SortSelect
          label="Ordenar por data de criação"
          value={sortOrder}
          onChange={(value) => {
            setSortOrder(value as typeof sortOrder);
            setPage(1);
          }}
          options={[
            { value: "newest", label: "Mais recentes primeiro" },
            { value: "oldest", label: "Mais antigas primeiro" },
          ]}
        />
        {polls.isLoading ? <LoadingState rows={2} /> : polls.isError ? <p className="rounded-xl bg-[#e8e8e8] p-4 text-sm text-[#233a59]">{translateText("Não foi possível carregar as enquetes. Tente atualizar.")}</p> : (
          <div className="space-y-3">
            {visiblePolls.map((poll) => (
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
                  <div className="rounded-lg bg-[#e8e8e8] p-3"><span className="block text-xs text-[#233a59]">{poll.likeCount} {translateText(poll.likeCount === 1 ? "voto positivo" : "votos positivos")}</span></div>
                  <div className="rounded-lg bg-[#e8e8e8] p-3"><span className="block text-xs text-[#233a59]">{poll.dislikeCount} {translateText(poll.dislikeCount === 1 ? "voto negativo" : "votos negativos")}</span></div>
                </div>
              </article>
            ))}
            {!polls.data?.length && <p className="rounded-xl border border-dashed border-[#233a59]/25 p-6 text-center text-sm text-muted-foreground">{translateText("Nenhuma enquete publicada ainda.")}</p>}
            <PaginationControls page={safePage} pageSize={pageSize} totalItems={orderedPolls.length} onPageChange={setPage} />
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
  const taxonomy = useListTaxonomy({
    query: { queryKey: getListTaxonomyQueryKey() },
  });
  const [title, setTitle] = useState(post.title);
  const [category, setCategory] = useState(post.category);
  const [tags, setTags] = useState<string[]>(post.tags ?? []);
  const [body, setBody] = useState(post.body);
  const [imageUrl, setImageUrl] = useState(post.coverImageUrl ?? "");
  const [message, setMessage] = useState("");
  const [titleError, setTitleError] = useState("");
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
    const cleanTitle = title.trim();
    if (cleanTitle.length < 4) {
      setTitleError("Informe um título com pelo menos 4 caracteres.");
      return;
    }
    setTitleError("");
    if (cleanTitle.length > 220) {
      setMessage("O título deve ter no máximo 220 caracteres.");
      return;
    }
    if (!category.trim()) {
      setMessage("Selecione uma categoria para a publicação.");
      return;
    }
    if ((post.kind === "blog" || post.kind === "forum") && !imageUrl.trim()) {
      setMessage("Adicione uma imagem de capa antes de salvar.");
      return;
    }
    const safeBody = normalizeRichContent(body);
    if (richContentToPlainText(safeBody).length < 10) {
      setMessage("O conteúdo precisa ter pelo menos 10 caracteres.");
      return;
    }
    if (safeBody.length > 20000) {
      setMessage("O conteúdo formatado ultrapassa o limite de 20.000 caracteres.");
      return;
    }
    try {
      await updatePost.mutateAsync({
        postId: post.id,
        data: {
          title: cleanTitle,
          excerpt: richContentToPlainText(safeBody).slice(0, 220),
          category,
          tags,
          body: safeBody,
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
    <form className="mt-4 space-y-3 rounded-xl bg-[#f6f7f9] p-4" noValidate onSubmit={submit}>
      <label className="block text-sm font-semibold text-[#012140]">
        {translateText("Título")}
        <input aria-describedby={titleError ? `edit-post-title-error-${post.id}` : undefined} aria-invalid={Boolean(titleError)} className={`${inputClass} mt-1.5 w-full`} data-testid={`input-edit-post-title-${post.id}`} maxLength={220} minLength={4} onChange={(event) => { setTitle(event.target.value); setMessage(""); if (event.target.value.trim().length >= 4) setTitleError(""); }} required value={title} />
        {titleError && <span className="mt-1 block text-xs font-normal text-red-700" id={`edit-post-title-error-${post.id}`} role="alert">{translateText(titleError)}</span>}
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
      <div>
        <label className="block text-sm font-semibold text-[#012140]" htmlFor={`edit-post-content-${post.id}`}>{translateText("Conteúdo")}</label>
        <Suspense fallback={<div aria-busy="true" className={`${inputClass} mt-1.5 min-h-36 w-full`} />}>
          <RichTextEditor id={`edit-post-content-${post.id}`} value={body} onChange={(value) => { setBody(value); setMessage(""); }} surfaceClassName={`${inputClass} mt-1.5 min-h-36 w-full resize-y`} />
        </Suspense>
      </div>
      <ImageUploadField imageUrl={imageUrl} onImageUrlChange={(value) => { setImageUrl(value); setMessage(""); }} required={post.kind === "blog" || post.kind === "forum"} />
      {message && <p className="text-sm text-[#233a59]" role="alert">{translateText(message)}</p>}
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
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredUsers = users
    .filter((user) =>
      (statusFilter === "all" || user.status === statusFilter)
      && (roleFilter === "all" || user.role === roleFilter)
      && (!search.trim()
        || normalizeFilterText(user.displayName).includes(normalizeFilterText(search.trim()))
        || normalizeFilterText(user.email).includes(normalizeFilterText(search.trim()))),
    )
    .sort((left, right) => {
      const difference = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      return sortOrder === "oldest"
        ? difference || left.id - right.id
        : -difference || right.id - left.id;
    });
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleUsers = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);

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
      <div className="grid gap-3 rounded-xl bg-[#f7f8fa] p-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1 text-xs font-semibold text-[#233a59]">
          <span>{translateText("Buscar por nome de usuário ou e-mail")}</span>
          <input
            className={`${inputClass} min-h-10 w-full`}
            data-testid="admin-users-search"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={translateText("Digite um nome ou e-mail")}
            type="search"
            value={search}
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#233a59]">
          <span>{translateText("Filtrar por status")}</span>
          <select className={`${inputClass} min-h-10 w-full`} onChange={(event) => {
            setStatusFilter(event.target.value as "all" | UserStatus);
            setPage(1);
          }} value={statusFilter}>
            <option value="all">{translateText("Todas as contas")}</option>
            <option value="active">{translateText("Ativa")}</option>
            <option value="suspended">{translateText("Suspensa")}</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#233a59]">
          <span>{translateText("Filtrar por papel")}</span>
          <select className={`${inputClass} min-h-10 w-full`} onChange={(event) => {
            setRoleFilter(event.target.value as "all" | UserRole);
            setPage(1);
          }} value={roleFilter}>
            <option value="all">{translateText("Todos os papéis")}</option>
            <option value="member">{translateText("Membro")}</option>
            <option value="admin">{translateText("Administrador")}</option>
          </select>
        </label>
        <SortSelect
          label="Data de criação"
          value={sortOrder}
          onChange={(value) => {
            setSortOrder(value as typeof sortOrder);
            setPage(1);
          }}
          options={[
            { value: "newest", label: "Mais recentes primeiro" },
            { value: "oldest", label: "Mais antigas primeiro" },
          ]}
        />
      </div>
      {visibleUsers.map((user) => (
        <article className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[minmax(0,1fr)_150px_150px]" key={user.id}>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[#012140]">{user.displayName}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{user.email} · {translateText("conta criada em")} {formatDate(user.createdAt)}</p>
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
      {!filteredUsers.length && <p className="text-sm text-muted-foreground">{translateText(statusFilter === "all" && roleFilter === "all" && !search.trim() ? "Nenhuma conta cadastrada ainda." : "Nenhuma conta corresponde aos filtros.")}</p>}
      <PaginationControls page={safePage} pageSize={pageSize} totalItems={filteredUsers.length} onPageChange={setPage} />
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
  emptyMessage = "Nenhuma sugestão cadastrada.",
}: {
  suggestions: Suggestion[];
  drafts: Record<string, string>;
  stageDraft: (key: string, value: string, originalValue: string) => void;
  clearDraft: (key: string) => void;
  feedback: Record<string, string>;
  reportChange: (key: string, message: string) => void;
  emptyMessage?: string;
}) {
  const queryClient = useQueryClient();
  const updateSuggestion = useUpdateAdminSuggestion();
  const [statusFilter, setStatusFilter] = useState<"all" | SuggestionStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const categories = [...new Set(suggestions.map((suggestion) => suggestion.category))]
    .sort((left, right) => left.localeCompare(right, "pt-BR"));
  const filteredSuggestions = suggestions
    .filter((suggestion) =>
      (statusFilter === "all" || suggestion.status === statusFilter)
      && (categoryFilter === "all" || suggestion.category === categoryFilter),
    )
    .sort((left, right) => {
      const difference = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      return sortOrder === "oldest"
        ? difference || left.id - right.id
        : -difference || right.id - left.id;
    });
  const pageCount = Math.max(1, Math.ceil(filteredSuggestions.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleSuggestions = filteredSuggestions.slice((safePage - 1) * pageSize, safePage * pageSize);

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
      <div className="grid gap-3 rounded-xl bg-[#f7f8fa] p-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1 text-xs font-semibold text-[#233a59]">
          <span>{translateText("Filtrar por status")}</span>
          <select className={`${inputClass} min-h-10 w-full`} onChange={(event) => {
            setStatusFilter(event.target.value as "all" | SuggestionStatus);
            setPage(1);
          }} value={statusFilter}>
            <option value="all">{translateText("Todos os status")}</option>
            <option value="under_review">{translateText("Em análise")}</option>
            <option value="planned">{translateText("Planejada")}</option>
            <option value="in_progress">{translateText("Em andamento")}</option>
            <option value="completed">{translateText("Concluída")}</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#233a59]">
          <span>{translateText("Filtrar por categoria")}</span>
          <select className={`${inputClass} min-h-10 w-full`} onChange={(event) => {
            setCategoryFilter(event.target.value);
            setPage(1);
          }} value={categoryFilter}>
            <option value="all">{translateText("Todas as categorias")}</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <SortSelect
          label="Ordenar por data"
          value={sortOrder}
          onChange={(value) => {
            setSortOrder(value as typeof sortOrder);
            setPage(1);
          }}
          options={[
            { value: "newest", label: "Mais recentes primeiro" },
            { value: "oldest", label: "Mais antigas primeiro" },
          ]}
        />
      </div>
      {visibleSuggestions.map((suggestion) => (
        <article className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[minmax(0,1fr)_190px]" key={suggestion.id}>
          <div>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-semibold text-[#012140]">{suggestion.title}</p>
              <span className="text-xs text-muted-foreground">{formatDate(suggestion.createdAt)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{suggestion.authorName} · {suggestion.category}</p>
            <details className="mt-2">
              <summary className="w-fit cursor-pointer text-xs font-semibold text-[#233a59] hover:underline">{translateText("Ver detalhes")}</summary>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{suggestion.details}</p>
            </details>
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
      {!filteredSuggestions.length && <p className="text-sm text-muted-foreground">{translateText(statusFilter === "all" && categoryFilter === "all" ? emptyMessage : "Nenhuma sugestão corresponde aos filtros.")}</p>}
      <PaginationControls page={safePage} pageSize={pageSize} totalItems={filteredSuggestions.length} onPageChange={setPage} />
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
  const [commentSortOrder, setCommentSortOrder] = useState<"newest" | "oldest">("newest");
  const [commentPage, setCommentPage] = useState(1);
  const [moderationError, setModerationError] = useState("");
  const { confirm: confirmAction, dialog: confirmationDialog } = useUnsavedChangesConfirm();
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
  const filteredComments = (comments.data ?? []).filter((comment) => {
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
  const visibleComments = [...filteredComments].sort((left, right) => {
    const difference = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    return commentSortOrder === "oldest"
      ? difference || left.id - right.id
      : -difference || right.id - left.id;
  });
  const commentPageSize = 10;
  const commentPageCount = Math.max(1, Math.ceil(visibleComments.length / commentPageSize));
  const safeCommentPage = Math.min(commentPage, commentPageCount);
  const visibleCommentPage = visibleComments.slice(
    (safeCommentPage - 1) * commentPageSize,
    safeCommentPage * commentPageSize,
  );
  const replyCount = (comments.data ?? []).filter((comment) => comment.parentCommentId !== null).length;
  const topLevelCount = (comments.data ?? []).length - replyCount;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {confirmationDialog}
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
                    setCommentPage(1);
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
                    href={`/${selectedPost.kind === "forum" ? "community" : selectedPost.kind === "blog" ? "content" : selectedPost.kind}/${selectedPost.id}`}
                  >
                    {translateText(selectedPost.kind === "forum" ? "Abrir tópico" : "Abrir publicação")} <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-[#233a59]/15 p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-[#012140]">{translateText("Comentários")}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {comments.data?.length ?? 0} {translateText("no total ·")} {topLevelCount} {translateText(topLevelCount === 1 ? "comentário" : "comentários")} · {replyCount} {translateText(replyCount === 1 ? "resposta" : "respostas")}
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
                        onClick={() => {
                          setCommentFilter(filter);
                          setCommentPage(1);
                        }}
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
                    onChange={(event) => {
                      setSearchText(event.target.value);
                      setCommentPage(1);
                    }}
                    placeholder={translateText("Buscar por comentário ou autor")}
                    type="search"
                    value={searchText}
                  />
                </label>

                <div className="mt-3 max-w-xs">
                  <SortSelect
                    label="Ordenar por data"
                    value={commentSortOrder}
                    onChange={(value) => {
                      setCommentSortOrder(value as typeof commentSortOrder);
                      setCommentPage(1);
                    }}
                    options={[
                      { value: "newest", label: "Mais recentes primeiro" },
                      { value: "oldest", label: "Mais antigas primeiro" },
                    ]}
                  />
                </div>

                <div className="mt-3 space-y-2">
                  {postId === null ? <p className="text-sm text-muted-foreground">{translateText("Selecione uma publicação.")}</p> : comments.isLoading ? (
                    <LoadingState rows={3} />
                  ) : comments.isError ? (
                    <p className="rounded-lg bg-[#e8e8e8] p-3 text-sm text-[#233a59]">{translateText("Não foi possível carregar os comentários desta publicação.")}</p>
                  ) : (
                    visibleCommentPage.map((comment) => (
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
                              const confirmed = await confirmAction({
                                title: "Confirmar exclusão",
                                description: "Excluir este comentário e as respostas vinculadas?",
                                confirmLabel: "Excluir comentário",
                                cancelLabel: "Cancelar",
                                destructive: true,
                              });
                              if (!confirmed) return;
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
                  {!comments.isLoading && !comments.isError && (
                    <PaginationControls page={safeCommentPage} pageSize={commentPageSize} totalItems={visibleComments.length} onPageChange={setCommentPage} />
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
