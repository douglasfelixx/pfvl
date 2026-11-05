import "./_group.css";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  MessageCircle,
  Newspaper,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Vote,
} from "lucide-react";

type Section =
  | "Blog"
  | "Comunidade"
  | "Novidades"
  | "Central de Ajuda"
  | "Comentários"
  | "Contas"
  | "Sugestões"
  | "Enquetes";
type CommentScope = "Todos" | "Comentários principais" | "Respostas";

type CommentItem = {
  id: number;
  author: string;
  initials: string;
  date: string;
  body: string;
  postId: number;
  parentAuthor?: string;
  parentBody?: string;
};

const publishedPosts = [
  { id: 101, title: "Como criar um planejamento financeiro?", kind: "Blog" },
  { id: 102, title: "Reserva de emergência: por onde começar", kind: "Comunidade" },
  { id: 103, title: "PFVL 2.8.0 disponível!", kind: "Novidades" },
  { id: 104, title: "Como organizar as finanças pessoais?", kind: "Blog" },
];

const initialComments: CommentItem[] = [
  {
    id: 2841,
    author: "Mariana Costa",
    initials: "MC",
    date: "29 out. 2026 · 09:42",
    body: "Comecei a separar as despesas fixas das variáveis e finalmente consegui entender para onde estava indo o meu dinheiro. A planilha ajudou muito.",
    postId: 101,
  },
  {
    id: 2838,
    author: "Rafael Mendes",
    initials: "RM",
    date: "29 out. 2026 · 08:16",
    body: "Uma dúvida: vocês recomendam montar a reserva de emergência antes de começar a investir, mesmo quando a renda varia bastante mês a mês?",
    postId: 102,
  },
  {
    id: 2837,
    author: "Ana Beatriz",
    initials: "AB",
    date: "29 out. 2026 · 08:32",
    body: "Eu comecei guardando o equivalente a um mês de despesas e fui aumentando aos poucos. Para mim, automatizar uma transferência pequena ajudou bastante.",
    postId: 102,
    parentAuthor: "Rafael Mendes",
    parentBody: "Uma dúvida: vocês recomendam montar a reserva de emergência antes de começar a investir?",
  },
  {
    id: 2834,
    author: "Lívia Nascimento",
    initials: "LN",
    date: "28 out. 2026 · 18:37",
    body: "O exemplo com renda de autônomo foi exatamente o que eu precisava. Seria ótimo ter mais conteúdos sobre organização financeira para quem é freelancer.",
    postId: 103,
  },
  {
    id: 2829,
    author: "Eduardo Lima",
    initials: "EL",
    date: "28 out. 2026 · 16:02",
    body: "Obrigado por compartilhar sua experiência, ajudou a tirar um pouco do peso de começar do zero.",
    postId: 104,
    parentAuthor: "Camila Rocha",
    parentBody: "Estou organizando as contas pela primeira vez. Qual foi o primeiro passo que funcionou para vocês?",
  },
];

const navigation: { label: Section; icon: typeof MessageCircle; count?: string }[] = [
  { label: "Blog", icon: BookOpen },
  { label: "Comunidade", icon: Users },
  { label: "Novidades", icon: Newspaper },
  { label: "Central de Ajuda", icon: LifeBuoy },
  { label: "Comentários", icon: MessageCircle, count: "12" },
  { label: "Contas", icon: Users },
  { label: "Sugestões", icon: CircleHelp, count: "12" },
  { label: "Enquetes", icon: Vote },
];

const inputClass =
  "h-10 rounded-lg border border-[#e8e8e8] bg-white px-3 text-[13px] text-[#1d1d1b] outline-none transition placeholder:text-[#85898d] focus:border-[#233a59] focus:ring-2 focus:ring-[#233a59]/10";

export function SidebarProposal() {
  const [section, setSection] = useState<Section>("Comentários");
  const [selectedPost, setSelectedPost] = useState("all");
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<CommentScope>("Todos");
  const [comments, setComments] = useState(initialComments);
  const [notice, setNotice] = useState("");

  const activePost = publishedPosts.find((post) => post.id === Number(selectedPost));
  const visibleComments = useMemo(
    () =>
      comments.filter((comment) => {
        const query = search.trim().toLocaleLowerCase("pt-BR");
        const matchesSearch =
          !query ||
          comment.author.toLocaleLowerCase("pt-BR").includes(query) ||
          comment.body.toLocaleLowerCase("pt-BR").includes(query);
        const matchesPost = selectedPost === "all" || comment.postId === Number(selectedPost);
        const isReply = Boolean(comment.parentAuthor);
        const matchesScope =
          scope === "Todos" ||
          (scope === "Respostas" && isReply) ||
          (scope === "Comentários principais" && !isReply);
        return matchesSearch && matchesPost && matchesScope;
      }),
    [comments, scope, search, selectedPost],
  );

  function deleteComment(comment: CommentItem) {
    if (!window.confirm(`Excluir o comentário de ${comment.author}? Esta ação não pode ser desfeita.`)) return;
    setComments((items) => items.filter((item) => item.id !== comment.id));
    setNotice("Comentário excluído.");
    window.setTimeout(() => setNotice(""), 2400);
  }

  const pageTitle = section === "Comentários" ? "Comentários" : section;

  return (
    <div className="min-h-[100dvh] bg-[#e8e8e8] text-[#1d1d1b]">
      <div className="flex min-h-[100dvh]">
        <aside className="hidden w-[252px] shrink-0 flex-col bg-[#012140] text-[#e8e8e8] md:flex">
          <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-6">
            <div className="grid h-9 w-9 place-items-center rounded-[11px] bg-[#e8e8e8] text-[#012140]">
              <span className="font-['Outfit'] text-[17px] font-extrabold tracking-[-.08em]">pf</span>
            </div>
            <div>
              <p className="font-['Outfit'] text-[16px] font-bold tracking-[-.03em] text-white">PFVL</p>
              <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#c3cbd1]">Área administrativa</p>
            </div>
          </div>

          <div className="px-4 pb-4 pt-7">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[.17em] text-[#bdc6cc]">Workspace</p>
            <button
              className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#e8e8e8] transition hover:bg-white/[.08]"
              onClick={() => setSection("Comentários")}
              type="button"
            >
              <LayoutDashboard size={17} strokeWidth={1.8} />
              Visão geral
              <ArrowUpRight className="ml-auto opacity-60" size={14} />
            </button>
          </div>

          <div className="px-4">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[.17em] text-[#bdc6cc]">Gestão do portal</p>
            <nav aria-label="Navegação administrativa" className="mt-3 space-y-1">
              {navigation.map(({ label, icon: Icon, count }) => {
                const active = section === label;
                return (
                  <button
                    aria-current={active ? "page" : undefined}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-[10px] text-left text-[12px] transition ${
                      active
                        ? "bg-[#e8e8e8] font-bold text-[#012140] shadow-[inset_3px_0_0_#233a59]"
                        : "font-medium text-[#e8e8e8] hover:bg-white/[.08]"
                    }`}
                    key={label}
                    onClick={() => setSection(label)}
                    type="button"
                  >
                    <Icon size={16} strokeWidth={1.8} />
                    <span>{label}</span>
                    {count && (
                      <span className={`ml-auto rounded-md px-1.5 py-0.5 font-mono text-[10px] ${active ? "bg-[#d3d8dc] text-[#233a59]" : "bg-white/10 text-[#e8e8e8]"}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mx-4 my-6 border-t border-white/10" />
          <div className="px-4">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[.17em] text-[#bdc6cc]">Publicações</p>
            <div className="mt-3 space-y-1">
              {(["Blog", "Comunidade"] as const).map((label) => {
                const Icon = label === "Blog" ? FileText : MessageCircle;
                return (
                  <button
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] text-[#e8e8e8] hover:bg-white/[.08]"
                    key={label}
                    onClick={() => setSection(label)}
                    type="button"
                  >
                    <Icon size={14} />
                    {label === "Blog" ? "Conteúdos do blog" : "Tópicos da comunidade"}
                    <span className="ml-auto text-[10px] text-[#c3cbd1]">{label === "Blog" ? "18" : "06"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-auto p-4">
            <div className="rounded-2xl border border-white/10 bg-[#233a59] p-3.5">
              <div className="flex items-center gap-2 text-[#e8e8e8]">
                <ShieldCheck size={16} />
                <span className="text-[11px] font-bold">Administração segura</span>
              </div>
              <p className="mt-2 text-[10px] leading-[1.55] text-[#e8e8e8]/75">Gerencie o conteúdo do portal e mantenha as conversas organizadas.</p>
            </div>
            <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#e8e8e8] text-[11px] font-bold text-[#012140]">AC</div>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-white">Ana Carvalho</p>
                <p className="text-[10px] text-[#e8e8e8]/70">Administradora</p>
              </div>
              <span className="ml-auto text-[9px] text-[#e8e8e8]/60">PFVL</span>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex h-[62px] items-center justify-between border-b border-[#d2d5d7] bg-[#e8e8e8]/95 px-4 backdrop-blur sm:px-7 lg:px-10">
            <div className="flex items-center gap-2 text-[12px] text-[#233a59]">
              <span className="font-medium">Administração PFVL</span>
              <ChevronRight size={13} />
              <span className="font-semibold text-[#012140]">{section}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-semibold text-[#233a59]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#233a59]" />
              Portal PFVL
            </div>
          </header>
          <nav aria-label="Secções administrativas" className="flex gap-1 overflow-x-auto border-b border-[#d2d5d7] bg-[#e8e8e8] px-3 py-2 md:hidden">
            {navigation.map(({ label, icon: Icon }) => (
              <button
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold ${section === label ? "bg-[#012140] text-[#e8e8e8]" : "text-[#233a59] hover:bg-white/60"}`}
                key={label}
                onClick={() => setSection(label)}
                type="button"
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </nav>

          <div className="mx-auto max-w-[1370px] px-4 pb-10 pt-7 sm:px-7 lg:px-10">
            <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#233a59]">
                  <span className="h-px w-5 bg-[#233a59]" /> Administração PFVL
                </div>
                <h1 className="font-['Outfit'] text-[30px] font-semibold leading-tight tracking-[-.045em] text-[#012140] sm:text-[35px]">
                  {section === "Comentários" ? "Moderação de comentários" : pageTitle}<span className="text-[#233a59]">.</span>
                </h1>
                <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-[#233a59]">
                  {section === "Comentários"
                    ? "Escolha uma publicação e revise os comentários com o contexto da conversa."
                    : section === "Blog" || section === "Comunidade" || section === "Novidades" || section === "Central de Ajuda"
                      ? "Conteúdos do portal, organizados por espaço de publicação."
                      : "Gerencie as áreas administrativas do portal PFVL."}
                </p>
              </div>
              {section !== "Comentários" && (
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg bg-[#012140] px-4 text-[12px] font-semibold text-[#e8e8e8] transition hover:bg-[#233a59] lg:self-auto"
                  onClick={() => setNotice("A criação de conteúdo continua disponível no painel administrativo.")}
                  type="button"
                >
                  {section === "Blog" || section === "Comunidade" || section === "Novidades" || section === "Central de Ajuda" ? "Nova publicação" : `Gerenciar ${section.toLocaleLowerCase("pt-BR")}`}
                </button>
              )}
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Publicações", value: "18", icon: FileText },
                { label: "Contas cadastradas", value: "284", icon: Users },
                { label: "Sugestões recebidas", value: "12", icon: CircleHelp },
              ].map(({ label, value, icon: Icon }) => (
                <div className="flex items-start justify-between rounded-xl border border-[#d2d5d7] bg-[#f2f2f2] p-4" key={label}>
                  <div>
                    <p className="text-[11px] font-semibold text-[#233a59]">{label}</p>
                    <p className="mt-2 font-['Outfit'] text-[25px] font-semibold tracking-[-.04em] text-[#012140]">{value}</p>
                  </div>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e8e8e8] text-[#233a59]"><Icon size={15} /></span>
                </div>
              ))}
            </div>

            {section === "Comentários" ? (
              <section className="overflow-hidden rounded-xl border border-[#d2d5d7] bg-[#f2f2f2]">
                <div className="flex flex-col justify-between gap-4 border-b border-[#d2d5d7] px-4 py-4 sm:px-5 md:flex-row md:items-center">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e8e8e8] text-[#233a59]"><MessageCircle size={17} /></span>
                    <div>
                      <h2 className="text-[14px] font-bold text-[#012140]">Comentários</h2>
                      <p className="mt-0.5 text-[11px] text-[#233a59]">Selecione uma publicação para revisar sua conversa.</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#233a59]">{comments.length} comentários de exemplo</span>
                </div>

                <div className="space-y-4 p-4 sm:p-5">
                  <div className="grid gap-2 sm:grid-cols-[minmax(240px,1.2fr)_minmax(220px,1fr)]">
                    <label className="block text-[10px] font-bold text-[#233a59]">
                      Publicação publicada
                      <span className="relative mt-1.5 block">
                        <FileText className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#233a59]" size={14} />
                        <select
                          aria-label="Selecionar publicação publicada"
                          className={`${inputClass} w-full appearance-none pl-9 pr-8`}
                          onChange={(event) => setSelectedPost(event.target.value)}
                          value={selectedPost}
                        >
                          <option value="all">Todas as publicações publicadas</option>
                          {publishedPosts.map((post) => (
                            <option key={post.id} value={post.id}>{post.title}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#233a59]" size={14} />
                      </span>
                    </label>
                    <label className="block text-[10px] font-bold text-[#233a59]">
                      Buscar comentário ou autor
                      <span className="relative mt-1.5 block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#233a59]" size={15} />
                        <input
                          aria-label="Buscar texto ou autor"
                          className={`${inputClass} w-full pl-9 pr-9`}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Digite um nome ou trecho do comentário"
                          value={search}
                        />
                        {search && (
                          <button aria-label="Limpar busca" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#233a59]" onClick={() => setSearch("")} type="button">×</button>
                        )}
                      </span>
                    </label>
                  </div>

                  <div className="flex flex-col justify-between gap-2 border-b border-[#d2d5d7] pb-3 sm:flex-row sm:items-center">
                    <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#e8e8e8] p-1">
                      {(["Todos", "Comentários principais", "Respostas"] as const).map((item) => (
                        <button
                          aria-pressed={scope === item}
                          className={`rounded-md px-3 py-1.5 text-[10px] font-semibold transition ${scope === item ? "bg-[#012140] text-[#e8e8e8]" : "text-[#233a59] hover:bg-white/70"}`}
                          key={item}
                          onClick={() => setScope(item)}
                          type="button"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    {activePost && (
                      <p className="text-[10px] text-[#233a59]">
                        Publicação: <span className="font-semibold text-[#012140]">{activePost.kind}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    {visibleComments.map((comment) => {
                      const post = publishedPosts.find((item) => item.id === comment.postId);
                      return (
                        <article className="rounded-xl border border-[#d2d5d7] bg-white p-4 sm:p-5" key={comment.id}>
                          <div className="flex items-start gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e8e8e8] text-[10px] font-bold text-[#233a59]">{comment.initials}</div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <h3 className="text-[12px] font-bold text-[#012140]">{comment.author}</h3>
                                <span className="text-[#233a59]">·</span>
                                <span className="text-[10px] text-[#233a59]">{comment.date}</span>
                                {comment.parentAuthor && <span className="ml-auto rounded-full bg-[#e8e8e8] px-2 py-1 text-[9px] font-semibold text-[#233a59]">Resposta</span>}
                              </div>
                              <p className="mt-2.5 whitespace-pre-wrap text-[12px] leading-[1.7] text-[#1d1d1b]">{comment.body}</p>

                              {comment.parentAuthor && (
                                <div className="mt-3 border-l-2 border-[#233a59] bg-[#e8e8e8]/60 px-3 py-2.5">
                                  <p className="text-[9px] font-bold uppercase tracking-[.08em] text-[#233a59]">Resposta a {comment.parentAuthor}</p>
                                  <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-[#1d1d1b]">{comment.parentBody}</p>
                                </div>
                              )}

                              <div className="mt-3 flex flex-col gap-2 rounded-lg bg-[#e8e8e8]/70 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="shrink-0 rounded bg-[#233a59] px-1.5 py-1 text-[8px] font-bold uppercase tracking-[.09em] text-[#e8e8e8]">{post?.kind ?? "Portal"}</span>
                                  <p className="truncate text-[10px] font-semibold text-[#012140]">{post?.title ?? "Publicação removida"}</p>
                                </div>
                                <button className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-[#233a59] hover:underline" onClick={() => setNotice(`Publicação: ${post?.title ?? "Publicação"}`)} type="button">
                                  Ver publicação <ArrowUpRight size={12} />
                                </button>
                              </div>

                              <div className="mt-3 flex items-center justify-between gap-3">
                                <span className="text-[9px] text-[#233a59]">Comentário #{comment.id}</span>
                                <button
                                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#233a59]/25 px-3 text-[10px] font-semibold text-[#233a59] transition hover:bg-[#e8e8e8]"
                                  onClick={() => deleteComment(comment)}
                                  type="button"
                                >
                                  <Trash2 size={13} /> Excluir comentário
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                    {visibleComments.length === 0 && (
                      <div className="rounded-xl border border-dashed border-[#233a59]/30 bg-white px-6 py-12 text-center">
                        <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[#e8e8e8] text-[#233a59]"><Search size={17} /></div>
                        <p className="mt-3 text-[13px] font-semibold text-[#012140]">Nenhum comentário encontrado</p>
                        <p className="mt-1 text-[11px] text-[#233a59]">Ajuste a publicação, o filtro ou o termo de busca.</p>
                        <button className="mt-4 text-[11px] font-bold text-[#233a59] hover:underline" onClick={() => { setSearch(""); setScope("Todos"); setSelectedPost("all"); }} type="button">Limpar filtros</button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-[#d2d5d7] pt-4 text-[10px] text-[#233a59]">
                    <span>Exibindo <strong className="font-semibold text-[#012140]">{visibleComments.length}</strong> comentário(s)</span>
                    <span>{selectedPost === "all" ? "Todas as publicações" : activePost?.title}</span>
                  </div>
                </div>
              </section>
            ) : (
              <SectionWorkspace section={section} onAction={setNotice} onOpenComments={() => setSection("Comentários")} />
            )}

            <footer className="mt-5 flex flex-wrap items-center justify-between gap-2 px-1 text-[9px] text-[#233a59]">
              <span>PFVL · Administração do portal</span>
              <span>Conteúdo e comunidade</span>
            </footer>
          </div>
        </main>
      </div>

      {notice && (
        <div className="fixed bottom-5 right-5 z-30 flex max-w-[min(360px,calc(100vw-2rem))] items-center gap-2 rounded-xl border border-[#233a59]/20 bg-[#e8e8e8] px-4 py-3 text-[12px] font-semibold text-[#012140] shadow-[0_8px_24px_rgba(1,33,64,.12)]" role="status">
          <span className="h-1.5 w-1.5 rounded-full bg-[#233a59]" /> {notice}
          <button aria-label="Fechar aviso" className="ml-2 text-[#233a59]" onClick={() => setNotice("")} type="button">×</button>
        </div>
      )}
    </div>
  );
}

function SectionWorkspace({
  section,
  onAction,
  onOpenComments,
}: {
  section: Exclude<Section, "Comentários">;
  onAction: (message: string) => void;
  onOpenComments: () => void;
}) {
  const editorialItems =
    section === "Blog"
      ? [
          ["PFVL 2.8.0 disponível!", "Veja as melhorias que chegaram para facilitar seu planejamento.", "Novidades · 29 out. 2026", "Publicado"],
          ["Como criar um planejamento financeiro?", "Um guia prático para organizar objetivos, gastos e próximos passos.", "Planejamento · 28 out. 2026", "Publicado"],
          ["Como organizar as finanças pessoais?", "Comece por um retrato simples da sua vida financeira.", "Organização · 26 out. 2026", "Rascunho"],
        ]
      : section === "Comunidade"
        ? [
            ["Reserva de emergência: por onde começar", "Como organizar uma reserva quando o valor recebido muda todo mês?", "Dúvidas · 31 out. 2026", "Comunidade"],
            ["Pequenas metas para começar novembro", "Uma conversa aberta sobre metas possíveis para o próximo mês.", "Conquistas · 27 out. 2026", "Comunidade"],
          ]
        : section === "Novidades"
          ? [["PFVL 2.8.0 disponível!", "Conheça os recursos e melhorias desta versão do portal.", "29 out. 2026", "Publicado"]]
          : section === "Central de Ajuda"
            ? [["Primeiros passos no PFVL", "Saiba como configurar seu perfil e começar um planejamento.", "Guias · 25 out. 2026", "Publicado"]]
            : section === "Contas"
              ? [["Contas cadastradas", "284 membros fazem parte da comunidade PFVL.", "Atualizado hoje", "Administração"]]
              : section === "Sugestões"
                ? [["Organização mensal de despesas", "Ideia enviada pela comunidade para facilitar o acompanhamento.", "por Mariana Costa · 30 out. 2026", "Em análise"]]
                : [["O que mais ajudaria no seu planejamento?", "Enquete publicada para receber avaliações da comunidade.", "Publicada em 24 out. 2026", "Ativa"]];

  const kind =
    section === "Blog" || section === "Novidades" || section === "Central de Ajuda"
      ? "Conteúdo do Blog"
      : section === "Comunidade"
        ? "Conteúdo da Comunidade"
        : section;

  return (
    <section className="overflow-hidden rounded-xl border border-[#d2d5d7] bg-[#f2f2f2]">
      <div className="border-b border-[#d2d5d7] px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-[#012140] px-2 py-1 text-[9px] font-bold uppercase tracking-[.1em] text-[#e8e8e8]">{kind}</span>
          {section === "Blog" && <span className="rounded bg-[#233a59] px-2 py-1 text-[9px] font-bold text-[#e8e8e8]">Novidades</span>}
        </div>
        <h2 className="mt-2 text-[14px] font-bold text-[#012140]">{section === "Blog" ? "Publicações editoriais" : section === "Comunidade" ? "Tópicos da comunidade" : section}</h2>
        <p className="mt-1 text-[11px] text-[#233a59]">
          {section === "Blog"
            ? "Conteúdos, novidades e central de ajuda do portal."
            : section === "Comunidade"
              ? "Tópicos publicados por membros e conversas em andamento."
              : section === "Contas"
                ? "Contas cadastradas no portal PFVL."
                : section === "Sugestões"
                  ? "Sugestões enviadas pela comunidade."
                  : section === "Enquetes"
                    ? "Enquetes da comunidade PFVL."
                    : "Publicações desta área do portal."}
        </p>
      </div>
      <div className="space-y-3 p-4 sm:p-5">
        {editorialItems.map(([title, description, metadata, status]) => (
          <article className="rounded-xl border border-[#d2d5d7] bg-white p-4 sm:p-5" key={title}>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[#012140]">{title}</p>
                <p className="mt-1.5 text-[11px] leading-[1.65] text-[#233a59]">{description}</p>
                <p className="mt-2 text-[9px] font-medium text-[#233a59]">{metadata}</p>
              </div>
              <span className="w-fit shrink-0 rounded-full bg-[#e8e8e8] px-2.5 py-1 text-[9px] font-bold text-[#233a59]">{status}</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e8e8e8] pt-3">
              <span className="text-[10px] text-[#233a59]">PFVL · {section}</span>
              <div className="flex flex-wrap gap-2">
                {section === "Comunidade" && (
                  <button className="rounded-lg border border-[#233a59]/25 px-3 py-2 text-[10px] font-semibold text-[#233a59] hover:bg-[#e8e8e8]" onClick={onOpenComments} type="button">Ver comentários</button>
                )}
                <button className="rounded-lg border border-[#233a59]/25 px-3 py-2 text-[10px] font-semibold text-[#233a59] hover:bg-[#e8e8e8]" onClick={() => onAction(`Abrindo “${title}”`)} type="button">Abrir</button>
              </div>
            </div>
          </article>
        ))}
        <div className="flex items-center justify-between border-t border-[#d2d5d7] pt-4 text-[10px] text-[#233a59]">
          <span>{editorialItems.length} itens nesta visualização</span>
          {section === "Comunidade" && <button className="font-semibold hover:underline" onClick={onOpenComments} type="button">Moderar comentários</button>}
        </div>
      </div>
    </section>
  );
}

export default SidebarProposal;
