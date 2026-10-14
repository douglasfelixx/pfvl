import { and, eq } from "drizzle-orm";
import { db, commentsTable, postsTable, suggestionsTable } from "@workspace/db";

const posts = [
  {
    title: "Como organizar suas finanças pessoais em 7 passos",
    excerpt:
      "Um método simples para entender sua renda, definir prioridades e começar a investir.",
    body:
      "Organizar a vida financeira começa com um retrato claro da renda e dos gastos. Registre entradas e despesas, separe custos fixos dos variáveis, escolha metas com prazo definido e acompanhe seu progresso todos os meses. Reserve uma parte para emergências antes de assumir novos compromissos.",
    kind: "blog",
    category: "Planejamento financeiro",
    tags: ["planejamento", "organização"],
    authorName: "Equipe PFVL",
  },
  {
    title: "PFVL 2.8.0 disponível",
    excerpt:
      "Conheça as melhorias de planejamento, gráficos e relatórios desta versão.",
    body:
      "A versão 2.8.0 traz um novo fluxo de planejamento, gráficos de evolução patrimonial e melhorias de desempenho nos relatórios. A atualização já está disponível para os usuários.",
    kind: "news",
    category: "Novidades",
    tags: ["versão 2.8.0"],
    authorName: "Equipe PFVL",
  },
  {
    title: "Novo fluxo de planejamento",
    excerpt:
      "Novo fluxo simplificado para criação de planejamentos financeiros.",
    body:
      "O PFVL apresenta um fluxo simplificado para criar planejamentos financeiros, definir prioridades e acompanhar as próximas etapas.",
    kind: "news",
    category: "Novidades",
    tags: ["planejamento"],
    authorName: "Equipe PFVL",
  },
  {
    title: "Novo gráfico",
    excerpt: "Gráfico de evolução patrimonial com projeções.",
    body:
      "Acompanhe a evolução patrimonial com novos gráficos e projeções para facilitar a visualização dos seus objetivos.",
    kind: "news",
    category: "Novidades",
    tags: ["gráficos", "planejamento"],
    authorName: "Equipe PFVL",
  },
  {
    title: "Melhorias de desempenho",
    excerpt: "Aumento geral de performance em relatórios pesados.",
    body:
      "Os relatórios do PFVL receberam melhorias de desempenho para deixar a consulta mais rápida.",
    kind: "news",
    category: "Novidades",
    tags: ["atualização"],
    authorName: "Equipe PFVL",
  },
  {
    title: "Como criar um planejamento financeiro de médio prazo?",
    excerpt:
      "Quero organizar uma meta para os próximos anos. Como vocês dividem esse planejamento?",
    body:
      "Estou começando a organizar minhas metas para os próximos três anos. Vocês preferem separar cada objetivo em uma conta ou acompanhar tudo em um único planejamento?",
    kind: "forum",
    category: "Planejamento financeiro",
    tags: ["metas", "planejamento"],
    authorName: "Camila R.",
  },
  {
    title: "Importação de dados via Open Finance",
    excerpt:
      "Veja como conectar suas instituições financeiras e importar suas movimentações.",
    body:
      "Acesse a área de Open Finance, escolha sua instituição e confirme a conexão no ambiente seguro do banco. Depois de autorizar, volte ao PFVL para revisar as contas e movimentações importadas.",
    kind: "help",
    category: "Open Finance",
    tags: ["primeiros passos", "open finance"],
    authorName: "Equipe PFVL",
  },
  {
    title: "Investimentos para iniciantes: por onde começar",
    excerpt:
      "Entenda reserva de emergência, perfil de risco e os primeiros passos para investir.",
    body:
      "Antes de escolher um investimento, organize as dívidas, monte uma reserva de emergência e entenda seu prazo e sua tolerância a oscilações. Compare liquidez, riscos, custos e tributação.",
    kind: "blog",
    category: "Investimentos",
    tags: ["investimentos", "educação financeira"],
    authorName: "Equipe PFVL",
  },
];

async function seed(): Promise<void> {
  for (const post of posts) {
    const [existing] = await db
      .select({ id: postsTable.id })
      .from(postsTable)
      .where(eq(postsTable.title, post.title))
      .limit(1);
    if (existing) continue;

    const [created] = await db
      .insert(postsTable)
      .values({
        ...post,
        status: "published",
      })
      .returning({ id: postsTable.id });

    if (post.kind === "forum") {
      await db.insert(commentsTable).values([
        {
          postId: created.id,
          authorName: "Roberto T.",
          body:
            "Eu começo definindo a meta e o prazo, depois acompanho o valor mensal necessário em uma categoria separada.",
        },
        {
          postId: created.id,
          authorName: "Juliana M.",
          body:
            "Separar por objetivo ajuda bastante. Assim fica mais fácil ver o que já foi alcançado.",
        },
      ]);
      await db
        .update(postsTable)
        .set({ commentCount: 2 })
        .where(eq(postsTable.id, created.id));
    }
  }

  const suggestions = [
    {
      title: "Adicionar metas financeiras compartilhadas",
      details:
        "Permitir que duas pessoas acompanhem o progresso de um mesmo objetivo.",
      category: "Planejamento",
      status: "under_review",
      authorName: "Mariana S.",
      voteCount: 12,
    },
    {
      title: "Comparativo anual de gastos",
      details:
        "Visualizar categorias lado a lado entre o ano atual e o anterior.",
      category: "Relatórios",
      status: "planned",
      authorName: "Rafael P.",
      voteCount: 8,
    },
    {
      title: "Mais bancos na conexão Open Finance",
      details:
        "Ampliar a lista de instituições disponíveis para sincronização.",
      category: "Open Finance",
      status: "in_progress",
      authorName: "Camila R.",
      voteCount: 21,
    },
    {
      title: "Exportação de relatórios em PDF",
      details:
        "Gerar uma versão em PDF dos relatórios mensais para compartilhar.",
      category: "Relatórios",
      status: "completed",
      authorName: "Ana L.",
      voteCount: 17,
    },
  ];

  for (const suggestion of suggestions) {
    const [existing] = await db
      .select({ id: suggestionsTable.id })
      .from(suggestionsTable)
      .where(
        and(
          eq(suggestionsTable.title, suggestion.title),
          eq(suggestionsTable.category, suggestion.category),
        ),
      )
      .limit(1);
    if (existing) continue;
    await db.insert(suggestionsTable).values(suggestion);
  }
}

await seed();
await db.$client.end();
