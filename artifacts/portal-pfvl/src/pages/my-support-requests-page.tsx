import { useAuth } from "@clerk/react";
import { useListMySupportRequests, getListMySupportRequestsQueryKey, type MySupportRequest } from "@workspace/api-client-react";
import { ArrowUpRight, Check, Clock3, Headphones, MessageSquareText, RefreshCw, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { AuthActionGate } from "@/components/auth-ui";
import { EmptyState, formatDate, LoadingState, PageHeading } from "@/components/portal-ui";
import { translateText } from "@/lib/i18n";

const statusDetails = {
  new: {
    label: "Recebida",
    description: "Sua solicitação chegou à equipe.",
    icon: Clock3,
    tone: "border-amber-200 bg-amber-50 text-amber-800",
    marker: "bg-amber-500",
  },
  in_progress: {
    label: "Em andamento",
    description: "A equipe está cuidando do seu pedido.",
    icon: MessageSquareText,
    tone: "border-sky-200 bg-sky-50 text-sky-800",
    marker: "bg-sky-600",
  },
  completed: {
    label: "Concluída",
    description: "A equipe finalizou esta solicitação.",
    icon: Check,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    marker: "bg-emerald-600",
  },
} as const;

function RequestCard({ request }: { request: MySupportRequest }) {
  const status = statusDetails[request.status];
  const StatusIcon = status.icon;

  return (
    <article
      className="overflow-hidden rounded-[22px] border border-[#d9e2df] bg-[#fffefa] shadow-[0_8px_28px_rgba(24,55,50,0.045)] transition-transform duration-200 hover:-translate-y-0.5"
      data-testid={`card-support-request-${request.id}`}
    >
      <div className="border-b border-[#e7ece8] px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#58716a]">
                {translateText("Protocolo")}
              </span>
              <span
                className="rounded-md bg-[#eef2ed] px-2.5 py-1 font-mono text-xs font-bold tracking-[0.08em] text-[#23483e]"
                data-testid={`text-support-protocol-${request.id}`}
              >
                {request.protocol}
              </span>
            </div>
            <h2
              className="mt-3 break-words font-display text-[22px] font-semibold leading-tight tracking-[-0.03em] text-[#183a34] sm:text-[25px]"
              data-testid={`text-support-subject-${request.id}`}
            >
              {request.subjectName}
            </h2>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${status.tone}`}
              data-testid={`status-support-request-${request.id}`}
            >
              <StatusIcon aria-hidden="true" size={14} strokeWidth={2.2} />
              {translateText(status.label)}
            </span>
            <span className="text-xs leading-5 text-[#687a73]">{translateText(status.description)}</span>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[#e7ece8] pt-4 sm:flex sm:gap-8">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#758780]">{translateText("Enviada em")}</dt>
            <dd className="mt-1 text-xs font-semibold text-[#344f47]" data-testid={`text-support-created-${request.id}`}>
              <time dateTime={request.createdAt}>{formatDate(request.createdAt)}</time>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#758780]">{translateText("Última atualização")}</dt>
            <dd className="mt-1 text-xs font-semibold text-[#344f47]" data-testid={`text-support-updated-${request.id}`}>
              <time dateTime={request.updatedAt}>{formatDate(request.updatedAt)}</time>
            </dd>
          </div>
        </dl>
      </div>

      <div className="px-5 py-5 sm:px-7 sm:py-6">
        <section aria-labelledby={`request-message-${request.id}`}>
          <h3 id={`request-message-${request.id}`} className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#758780]">
            {translateText("Sua mensagem")}
          </h3>
          <p
            className="mt-2 whitespace-pre-wrap break-words text-[14px] leading-7 text-[#344f47]"
            data-testid={`text-support-message-${request.id}`}
          >
            {request.message}
          </p>
        </section>

        <section aria-labelledby={`team-updates-${request.id}`} className="mt-6 border-t border-[#e7ece8] pt-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#eaf0e9] text-[#315d50]">
              <MessageSquareText aria-hidden="true" size={15} />
            </span>
            <div>
              <h3 id={`team-updates-${request.id}`} className="text-sm font-bold text-[#23483e]">
                {translateText("Acompanhamento da equipe")}
              </h3>
              <p className="mt-0.5 text-xs text-[#718078]">
                {request.comments.length === 1
                  ? translateText("1 atualização")
                  : `${request.comments.length} ${translateText("atualizações")}`}
              </p>
            </div>
          </div>
          {request.comments.length ? (
            <ol className="ml-4 mt-4 space-y-0 border-l border-[#dce6df] pl-5">
              {request.comments.map((comment) => (
                <li
                  className="relative pb-5 last:pb-0"
                  key={comment.id}
                  data-testid={`comment-support-request-${comment.id}`}
                >
                  <span aria-hidden="true" className={`absolute -left-[25px] top-1.5 h-2 w-2 rounded-full ${status.marker}`} />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <strong className="text-xs font-bold text-[#315d50]" data-testid={`text-support-comment-author-${comment.id}`}>
                      {comment.authorName}
                    </strong>
                    <time className="text-[11px] text-[#78867f]" dateTime={comment.createdAt} data-testid={`text-support-comment-date-${comment.id}`}>
                      {formatDate(comment.createdAt)}
                    </time>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-[#465b53]" data-testid={`text-support-comment-${comment.id}`}>
                    {comment.message}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 rounded-xl bg-[#f4f6f1] px-4 py-3 text-sm leading-6 text-[#65766e]" data-testid={`text-no-support-comments-${request.id}`}>
              {translateText("Ainda não há atualizações da equipe. Quando houver novidades, elas aparecerão aqui.")}
            </p>
          )}
        </section>
      </div>
    </article>
  );
}

function SupportRequestsContent() {
  const { isSignedIn, userId } = useAuth();
  const requestsQuery = useListMySupportRequests({
    query: {
      queryKey: [...getListMySupportRequestsQueryKey(), userId],
      enabled: isSignedIn === true && Boolean(userId),
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchInterval: 30_000,
    },
  });
  const requests = requestsQuery.data ?? [];

  return (
    <div className="page-enter mx-auto max-w-5xl pb-10">
      <div className="mb-7 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#687d74]">
        <Headphones aria-hidden="true" size={15} />
        <span>{translateText("Atendimento PFVL")}</span>
        <span aria-hidden="true" className="h-px w-8 bg-[#cad8cf]" />
        <span>{translateText("Área do membro")}</span>
      </div>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_250px] lg:items-start">
        <main className="min-w-0">
          <PageHeading
            eyebrow="Suporte"
            title="Suas solicitações"
            description="Acompanhe o que você enviou e veja as atualizações da equipe, tudo em um só lugar."
          />

          {requestsQuery.isLoading ? (
            <LoadingState rows={2} />
          ) : requestsQuery.isError ? (
            <section className="rounded-[20px] border border-[#e6c7bf] bg-[#fbf1ed] p-5 text-[#713f35]" role="alert" data-testid="error-support-requests">
              <h2 className="font-semibold">{translateText("Não foi possível carregar suas solicitações.")}</h2>
              <p className="mt-1 text-sm leading-6 text-[#81574e]">{translateText("Confira sua conexão e tente novamente.")}</p>
              <button
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#cda79c] bg-[#fffaf7] px-3 text-sm font-bold text-[#713f35] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#713f35] focus-visible:ring-offset-2"
                data-testid="button-retry-support-requests"
                onClick={() => void requestsQuery.refetch()}
                type="button"
              >
                <RefreshCw aria-hidden="true" size={14} />
                {translateText("Tentar novamente")}
              </button>
            </section>
          ) : requests.length === 0 ? (
            <EmptyState
              title="Nenhuma solicitação por aqui"
              description="Quando você enviar uma solicitação de suporte, ela aparecerá nesta página com o protocolo e o andamento."
            />
          ) : (
            <div className="space-y-5" aria-label={translateText("Suas solicitações de suporte")} data-testid="list-support-requests">
              {requests.map((request) => <RequestCard key={request.id} request={request} />)}
            </div>
          )}
        </main>

        <aside className="space-y-4 lg:pt-1">
          <section className="relative overflow-hidden rounded-[22px] border border-[#d8e3da] bg-[#eaf1e9] p-5 sm:p-6">
            <span aria-hidden="true" className="absolute -right-7 -top-8 h-28 w-28 rounded-full border-[18px] border-[#dbe7dc]" />
            <div className="relative">
              <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#315d50] text-[#f5f4e9]">
                <ShieldCheck aria-hidden="true" size={19} />
              </span>
              <h2 className="mt-4 font-display text-lg font-semibold leading-snug tracking-[-0.025em] text-[#23483e]">
                {translateText("Seu atendimento, com contexto")}
              </h2>
              <p className="mt-2 text-xs leading-6 text-[#526d62]">
                {translateText("Esta área mostra somente as solicitações vinculadas à sua conta. As atualizações da equipe aparecem aqui automaticamente.")}
              </p>
              <div className="mt-4 flex items-center gap-2 border-t border-[#cfddd1] pt-3 text-[11px] font-semibold text-[#466257]">
                <RefreshCw aria-hidden="true" size={13} />
                {translateText("Atualização automática")}
              </div>
            </div>
          </section>

          <Link
            className="group flex items-center justify-between gap-3 rounded-[18px] border border-[#dce5df] bg-[#fffefa] px-4 py-4 text-sm font-semibold text-[#315d50] transition-colors hover:bg-[#f2f6f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315d50] focus-visible:ring-offset-2"
            data-testid="link-help-center"
            href="/help"
          >
            <span>{translateText("Voltar à Central de Ajuda")}</span>
            <ArrowUpRight aria-hidden="true" className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" size={17} />
          </Link>
        </aside>
      </div>
    </div>
  );
}

export function MySupportRequestsPage() {
  return (
    <AuthActionGate
      returnTo="/help/requests"
      signedOutTitle="Entre para acompanhar suas solicitações."
      signedOutDescription="O histórico de atendimento fica disponível somente na sua conta."
    >
      <SupportRequestsContent />
    </AuthActionGate>
  );
}
