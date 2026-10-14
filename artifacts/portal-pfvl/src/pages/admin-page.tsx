import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  getGetCurrentUserQueryKey,
  getListAdminPostsQueryKey,
  getListAdminUsersQueryKey,
  getListCommentsQueryKey,
  getGetActivePollQueryKey,
  getListAdminPollsQueryKey,
  getListSuggestionsQueryKey,
  useCloseAdminPoll,
  useCreateAdminPoll,
  useDeleteComment,
  useDeletePost,
  useGetCurrentUser,
  useListAdminPosts,
  useListAdminUsers,
  useListAdminPolls,
  useGetActivePoll,
  useListComments,
  useListSuggestions,
  useUpdateAdminSuggestion,
  useUpdateAdminUser,
  useUpdatePost,
  type Post,
  type PostStatus,
  type Suggestion,
  type SuggestionStatus,
  type UserRole,
  type UserProfile,
  type UserStatus,
} from "@workspace/api-client-react";
import { AuthActionGate } from "@/components/auth-ui";
import { CreatePostForm, ImageUploadField } from "@/components/community-actions";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { formatDate, LoadingState, PageHeading, Surface } from "@/components/portal-ui";

type AdminTab = "posts" | "comments" | "users" | "suggestions" | "polls";
const inputClass =
  "rounded-lg border border-[#233a59]/15 bg-white px-2.5 py-2 text-sm text-[#012140] outline-none focus:border-[#233a59]";

function statusLabel(status: PostStatus) {
  return status === "published" ? "Publicado" : status === "draft" ? "Rascunho" : "Oculto";
}

export function AdminPage() {
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="Administração PFVL"
        title="Painel de gestão."
        description="Gerencie publicações, comentários, sugestões e permissões de acesso."
      />
      <AuthActionGate>
        <AdminConsole />
      </AuthActionGate>
    </div>
  );
}

function AdminConsole() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AdminTab>("posts");
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
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();

  if (profile.isLoading) return <LoadingState rows={3} />;
  if (profile.isError || profile.data?.role !== "admin") {
    return (
      <Surface className="p-6">
        <h2 className="font-display text-xl font-semibold text-[#012140]">Acesso administrativo restrito</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Esta conta não tem permissão para administrar o portal. Se você acabou de criar a conta inicial, confirme o e-mail no Clerk e verifique a configuração do administrador.
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
    if (!window.confirm(`Excluir permanentemente “${post.title}” e os comentários vinculados?`)) return;
    await deletePost.mutateAsync({ postId: post.id });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] }),
    ]);
  }

  const tabItems: { key: AdminTab; label: string }[] = [
    { key: "posts", label: "Publicações" },
    { key: "comments", label: "Comentários" },
    { key: "users", label: "Contas" },
    { key: "suggestions", label: "Sugestões" },
    { key: "polls", label: "Enquetes" },
  ];

  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Publicações", value: posts.data?.length ?? "—" },
          { label: "Contas cadastradas", value: users.data?.length ?? "—" },
          { label: "Sugestões recebidas", value: suggestions.data?.length ?? "—" },
        ].map((item) => (
          <Surface className="p-4" key={item.label}>
            <p className="text-xs font-semibold text-muted-foreground">{item.label}</p>
            <p className="mt-2 font-display text-2xl font-semibold text-[#012140]">{item.value}</p>
          </Surface>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#233a59]/15 bg-white">
        <div className="flex gap-1 overflow-x-auto border-b border-border p-2" role="tablist" aria-label="Seções administrativas">
          {tabItems.map((item) => (
            <button
              aria-selected={tab === item.key}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === item.key ? "bg-[#012140] text-white" : "text-[#233a59] hover:bg-[#e8e8e8]"}`}
              key={item.key}
              onClick={() => setTab(item.key)}
              role="tab"
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "posts" && (
          <div className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#012140]">Conteúdo do portal</h2>
                <p className="mt-1 text-sm text-muted-foreground">Crie, edite, publique, oculte ou remova conteúdos.</p>
              </div>
              <button className="auth-header-primary" onClick={() => setCreateOpen((open) => !open)} type="button">
                {createOpen ? "Fechar criação" : "Nova publicação"}
              </button>
            </div>
            {createOpen && <CreatePostForm mode="admin" onCreated={() => setCreateOpen(false)} />}
            {posts.isLoading ? <LoadingState rows={3} /> : posts.isError ? (
              <p className="rounded-xl bg-[#e8e8e8] p-4 text-sm text-[#233a59]">Não foi possível carregar as publicações.</p>
            ) : (
              <div className="space-y-3">
                {posts.data?.map((post) => (
                  <article className="rounded-xl border border-border p-4" key={post.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        {post.coverImageUrl && (
                          <img alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" src={post.coverImageUrl} />
                        )}
                        <div className="min-w-0">
                          <h3 className="font-semibold text-[#012140]">{post.title}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {post.kind} · {post.category} · {post.authorName} · {formatDate(post.updatedAt)}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-[#e8e8e8] px-3 py-1 text-xs font-semibold text-[#233a59]">{statusLabel(post.status)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <label className="sr-only" htmlFor={`status-${post.id}`}>Situação de {post.title}</label>
                      <select
                        className={inputClass}
                        disabled={updatePost.isPending}
                        id={`status-${post.id}`}
                        onChange={(event) => void changePostStatus(post, event.target.value as PostStatus)}
                        value={post.status}
                      >
                        <option value="published">Publicado</option>
                        <option value="draft">Rascunho</option>
                        <option value="hidden">Oculto</option>
                      </select>
                      <button className="auth-header-link !border-[#233a59]/20 !text-[#233a59]" onClick={() => setEditingPost(editingPost === post.id ? null : post.id)} type="button">
                        {editingPost === post.id ? "Fechar edição" : "Editar"}
                      </button>
                      <button className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" disabled={deletePost.isPending} onClick={() => void removePost(post)} type="button">
                        Excluir
                      </button>
                      <a className="self-center text-sm font-semibold text-[#233a59] hover:underline" href={`/${post.kind === "forum" ? "community" : post.kind}/${post.id}`}>
                        Abrir
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
                {!posts.data?.length && <p className="text-sm text-muted-foreground">Ainda não há publicações cadastradas.</p>}
              </div>
            )}
          </div>
        )}

        {tab === "comments" && (
          <AdminCommentModeration posts={posts.data ?? []} />
        )}

        {tab === "users" && (
          <div className="space-y-4 p-4 sm:p-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#012140]">Contas e permissões</h2>
              <p className="mt-1 text-sm text-muted-foreground">Altere papéis de acesso e suspenda ou reative contas.</p>
            </div>
            {users.isLoading ? <LoadingState rows={3} /> : users.isError ? (
              <p className="text-sm text-muted-foreground">Não foi possível carregar as contas.</p>
            ) : (
              <UsersTable users={users.data ?? []} />
            )}
          </div>
        )}

        {tab === "suggestions" && (
          <div className="space-y-4 p-4 sm:p-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#012140]">Sugestões da comunidade</h2>
              <p className="mt-1 text-sm text-muted-foreground">Atualize o andamento das ideias recebidas.</p>
            </div>
            {suggestions.isLoading ? <LoadingState rows={3} /> : suggestions.isError ? (
              <p className="text-sm text-muted-foreground">Não foi possível carregar as sugestões.</p>
            ) : (
              <SuggestionsTable suggestions={suggestions.data ?? []} />
            )}
          </div>
        )}

        {tab === "polls" && <AdminPollManagement />}
      </section>
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
        <h2 className="font-display text-xl font-semibold text-[#012140]">Enquetes da comunidade</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">Publique uma pergunta para receber avaliações positivas ou negativas. Apenas uma enquete pode ficar ativa por vez.</p>
      </div>
      <Form {...form}>
        <form className="grid gap-3 rounded-xl border border-[#233a59]/15 bg-[#f6f7f9] p-4 sm:p-5" onSubmit={form.handleSubmit(submit)}>
          <FormField
            control={form.control}
            name="question"
            rules={{ validate: (value) => value.trim().length >= 5 || "Use pelo menos 5 caracteres." }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-[#012140]">Pergunta da enquete</FormLabel>
                <FormControl>
                  <input
                    {...field}
                    className={`${inputClass} mt-1.5 w-full`}
                    data-testid="input-poll-question"
                    maxLength={220}
                    minLength={5}
                    placeholder="Ex.: O que mais ajudaria no seu planejamento?"
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
                <FormLabel className="text-sm font-semibold text-[#012140]">Contexto (opcional)</FormLabel>
                <FormControl>
                  <textarea
                    {...field}
                    className={`${inputClass} mt-1.5 min-h-24 w-full resize-y`}
                    data-testid="input-poll-details"
                    maxLength={1200}
                    placeholder="Explique por que essa opinião é importante."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {message && <p className="text-sm text-[#233a59]" role="status">{message}</p>}
          <div>
            <button className="auth-header-primary" data-testid="button-poll-create" disabled={create.isPending || form.formState.isSubmitting} type="submit">
              {create.isPending ? "Publicando…" : "Publicar enquete"}
            </button>
          </div>
        </form>
      </Form>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3"><h3 className="font-display text-lg font-semibold text-[#012140]">Histórico e resultados</h3><button className="auth-header-link !border-[#233a59]/20 !text-[#233a59]" onClick={() => { void polls.refetch(); void active.refetch(); }} type="button">Atualizar</button></div>
        {polls.isLoading ? <LoadingState rows={2} /> : polls.isError ? <p className="rounded-xl bg-[#e8e8e8] p-4 text-sm text-[#233a59]">Não foi possível carregar as enquetes. Tente atualizar.</p> : (
          <div className="space-y-3">
            {(polls.data ?? []).map((poll) => (
              <article className="rounded-xl border border-[#233a59]/15 bg-white p-4 sm:p-5" key={poll.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2"><span className={poll.status === "active" ? "rounded-full bg-[#e4efe9] px-2.5 py-1 text-[11px] font-bold text-[#285b48]" : "rounded-full bg-[#e8e8e8] px-2.5 py-1 text-[11px] font-bold text-[#233a59]"}>{poll.status === "active" ? "Ativa" : "Encerrada"}</span><span className="text-xs text-muted-foreground">{formatDate(poll.createdAt)}</span></div>
                    <h4 className="font-semibold leading-6 text-[#012140]">{poll.question}</h4>
                    {poll.details && <p className="mt-1 text-sm leading-6 text-muted-foreground">{poll.details}</p>}
                  </div>
                  {poll.status === "active" && <button className="rounded-lg border border-[#233a59]/25 px-3 py-2 text-sm font-semibold text-[#233a59] hover:bg-[#e8e8e8]" disabled={close.isPending} onClick={() => void closePoll(poll.id)} type="button">{close.isPending ? "Encerrando…" : "Encerrar enquete"}</button>}
                </div>
                <div className="mt-4 grid max-w-sm grid-cols-2 gap-2">
                  <div className="rounded-lg bg-[#e8e8e8] p-3"><span className="block text-xs text-[#233a59]">Curtidas</span><strong className="mt-1 block text-xl text-[#012140]">{poll.likeCount}</strong></div>
                  <div className="rounded-lg bg-[#e8e8e8] p-3"><span className="block text-xs text-[#233a59]">Não curtidas</span><strong className="mt-1 block text-xl text-[#012140]">{poll.dislikeCount}</strong></div>
                </div>
              </article>
            ))}
            {!polls.data?.length && <p className="rounded-xl border border-dashed border-[#233a59]/25 p-6 text-center text-sm text-muted-foreground">Nenhuma enquete publicada ainda.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function EditPostForm({ post, onSaved }: { post: Post; onSaved: () => void | Promise<void> }) {
  const updatePost = useUpdatePost();
  const [title, setTitle] = useState(post.title);
  const [category, setCategory] = useState(post.category);
  const [body, setBody] = useState(post.body);
  const [imageUrl, setImageUrl] = useState(post.coverImageUrl ?? "");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await updatePost.mutateAsync({
        postId: post.id,
        data: {
          title: title.trim(),
          category: category.trim(),
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
        Título
        <input className={`${inputClass} mt-1.5 w-full`} maxLength={220} minLength={4} onChange={(event) => setTitle(event.target.value)} required value={title} />
      </label>
      <label className="block text-sm font-semibold text-[#012140]">
        Categoria
        <input className={`${inputClass} mt-1.5 w-full`} maxLength={100} minLength={2} onChange={(event) => setCategory(event.target.value)} required value={category} />
      </label>
      <label className="block text-sm font-semibold text-[#012140]">
        Conteúdo
        <textarea className={`${inputClass} mt-1.5 min-h-36 w-full resize-y`} maxLength={20000} minLength={10} onChange={(event) => setBody(event.target.value)} required value={body} />
      </label>
      <ImageUploadField imageUrl={imageUrl} onImageUrlChange={setImageUrl} required={post.kind === "blog" || post.kind === "forum"} />
      {message && <p className="text-sm text-[#233a59]" role="status">{message}</p>}
      <button className="auth-header-primary" disabled={updatePost.isPending} type="submit">
        {updatePost.isPending ? "Salvando…" : "Salvar alterações"}
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
            <p className="mt-1 truncate text-xs text-muted-foreground">{user.email} · entrou em {formatDate(user.createdAt)}</p>
          </div>
          <label className="text-xs font-semibold text-[#233a59]">
            Papel
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
              <option value="member">Membro</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-[#233a59]">
            Conta
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
              <option value="active">Ativa</option>
              <option value="suspended">Suspensa</option>
            </select>
          </label>
        </article>
      ))}
      {!users.length && <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada ainda.</p>}
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
            Andamento
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
              <option value="under_review">Em análise</option>
              <option value="planned">Planejada</option>
              <option value="in_progress">Em andamento</option>
              <option value="completed">Concluída</option>
            </select>
          </label>
        </article>
      ))}
      {!suggestions.length && <p className="text-sm text-muted-foreground">Nenhuma sugestão cadastrada.</p>}
    </div>
  );
}

function AdminCommentModeration({ posts }: { posts: Post[] }) {
  const [postId, setPostId] = useState<number | null>(
    posts.find((post) => post.status === "published")?.id ?? null,
  );
  useEffect(() => {
    if (postId === null) {
      setPostId(posts.find((post) => post.status === "published")?.id ?? null);
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

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-[#012140]">Moderação de comentários</h2>
        <p className="mt-1 text-sm text-muted-foreground">Escolha uma publicação para revisar e remover respostas.</p>
      </div>
      <label className="block max-w-xl text-sm font-semibold text-[#012140]">
        Publicação
        <select
          className={`${inputClass} mt-1.5 block w-full`}
          onChange={(event) => setPostId(event.target.value ? Number(event.target.value) : null)}
          value={postId ?? ""}
        >
          <option value="">Selecione uma publicação</option>
          {posts.filter((post) => post.status === "published").map((post) => (
            <option key={post.id} value={post.id}>{post.title}</option>
          ))}
        </select>
      </label>
      {postId === null ? <p className="text-sm text-muted-foreground">Não há publicação selecionada.</p> : comments.isLoading ? (
        <LoadingState rows={3} />
      ) : comments.isError ? (
        <p className="text-sm text-muted-foreground">Não foi possível carregar os comentários.</p>
      ) : (
        <div className="space-y-3">
          {comments.data?.map((comment) => (
            <article className="rounded-xl border border-border p-4" key={comment.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-[#012140]">{comment.authorName}</p>
                <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
              </div>
              {comment.parentCommentId && <p className="mt-1 text-xs text-muted-foreground">Resposta a comentário #{comment.parentCommentId}</p>}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{comment.body}</p>
              <button
                className="mt-3 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                disabled={deleteComment.isPending}
                onClick={async () => {
                  if (!window.confirm("Excluir este comentário e as respostas vinculadas?")) return;
                  await deleteComment.mutateAsync({ commentId: comment.id });
                  await Promise.all([
                    queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) }),
                    queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() }),
                  ]);
                }}
                type="button"
              >
                Excluir comentário
              </button>
            </article>
          ))}
          {!comments.data?.length && <p className="text-sm text-muted-foreground">Esta publicação ainda não tem comentários.</p>}
        </div>
      )}
    </div>
  );
}
