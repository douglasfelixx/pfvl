import "./_group.css";

const currentPosts = [
  {
    title: "PFVL 2.8.0 disponível!",
    type: "Novidades",
    status: "Publicado",
    date: "29 out. 2026",
    image: "bg-gradient-to-br from-blue-100 to-slate-200",
  },
  {
    title: "Como criar um planejamento financeiro?",
    type: "Comunidade",
    status: "Publicado",
    date: "28 out. 2026",
    image: "bg-gradient-to-br from-emerald-100 to-teal-200",
  },
  {
    title: "Como organizar as finanças pessoais?",
    type: "Conteúdos",
    status: "Rascunho",
    date: "26 out. 2026",
    image: "bg-gradient-to-br from-amber-100 to-orange-200",
  },
];

export function Current() {
  return (
    <div className="min-h-screen bg-[#e8e8e8] p-5 text-[#1d1d1b] sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#233a59]">
            Administração PFVL
          </p>
          <h1 className="mt-2 font-['Outfit'] text-4xl font-bold tracking-tight text-[#012140]">
            Painel de gestão.
          </h1>
          <p className="mt-2 text-sm text-[#233a59]">
            Gerencie publicações, comentários, contas, sugestões e enquetes.
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          {[
            ["Publicações", "18"],
            ["Contas cadastradas", "284"],
            ["Sugestões recebidas", "12"],
          ].map(([label, value]) => (
            <div className="rounded-2xl border border-[#233a59]/15 bg-white p-4" key={label}>
              <p className="text-xs font-semibold text-[#233a59]/70">{label}</p>
              <p className="mt-2 font-['Outfit'] text-2xl font-semibold text-[#012140]">{value}</p>
            </div>
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#233a59]/15 bg-white">
          <div className="flex gap-1 overflow-x-auto border-b border-[#233a59]/15 p-2" role="tablist" aria-label="Seções administrativas">
            {["Publicações", "Comentários", "Contas", "Sugestões", "Enquetes"].map((label, index) => (
              <button
                aria-selected={index === 0}
                className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${index === 0 ? "bg-[#012140] text-white" : "text-[#233a59] hover:bg-[#e8e8e8]"}`}
                key={label}
                role="tab"
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-['Outfit'] text-xl font-semibold text-[#012140]">Conteúdo do portal</h2>
                <p className="mt-1 text-sm text-[#233a59]/70">Publicações do site e da comunidade aparecem nesta lista.</p>
              </div>
              <button className="rounded-xl bg-[#012140] px-4 py-2.5 text-sm font-semibold text-white" type="button">
                Nova publicação
              </button>
            </div>
            <div className="space-y-3">
              {currentPosts.map((post) => (
                <article className="rounded-xl border border-[#233a59]/15 p-4" key={post.title}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <div className={`h-16 w-24 shrink-0 rounded-lg ${post.image}`} />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[#012140]">{post.title}</h3>
                        <p className="mt-1 text-xs text-[#233a59]/70">{post.type} · PFVL · {post.date}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-[#e8e8e8] px-3 py-1 text-xs font-semibold text-[#233a59]">{post.status}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="rounded-lg border border-[#233a59]/20 px-3 py-2 text-sm font-semibold text-[#233a59]" type="button">Editar</button>
                    <button className="rounded-lg border border-[#233a59]/20 px-3 py-2 text-sm font-semibold text-[#233a59]" type="button">Abrir</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
