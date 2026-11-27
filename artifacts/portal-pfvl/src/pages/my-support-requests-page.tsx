import { Fragment, useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { useListMySupportRequests, getListMySupportRequestsQueryKey, type MySupportRequest } from "@workspace/api-client-react";
import { ArrowUpRight, Check, Clock3, Headphones, MessageSquareText, RefreshCw, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { AuthActionGate } from "@/components/auth-ui";
import { EmptyState, formatDate, LoadingState, PageHeading } from "@/components/portal-ui";
import { translateText } from "@/lib/i18n";
import { getPrivateStatusLabelFromRequest } from "@/lib/private-status-label";

function getStatusAppearance(status: string) {
  if (status === "completed") {
    return {
      icon: Check,
      tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
      marker: "bg-emerald-600",
    };
  }
  if (status === "new") {
    return {
      icon: Clock3,
      tone: "border-amber-200 bg-amber-50 text-amber-800",
      marker: "bg-amber-500",
    };
  }
  return {
    icon: MessageSquareText,
    tone: "border-sky-200 bg-sky-50 text-sky-800",
    marker: "bg-sky-600",
  };
}

function RequestDetails({ request }: { request: MySupportRequest }) {
  const status = getStatusAppearance(request.status);

  return (
    <div className="my-support-request-details" data-testid={`details-support-request-${request.id}`}>
      <dl className="mb-5 grid grid-cols-2 gap-3 sm:flex sm:gap-8">
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
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#758780]">{translateText("Andamento")}</dt>
          <dd className="mt-1 text-xs font-semibold text-[#344f47]">{getPrivateStatusLabelFromRequest(request)}</dd>
        </div>
      </dl>
      <section aria-labelledby={`request-message-${request.id}`}>
        <h3 id={`request-message-${request.id}`} className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#758780]">
          {translateText("Sua mensagem")}
        </h3>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#344f47]" data-testid={`text-support-message-${request.id}`}>
          {request.message}
        </p>
      </section>
      <section aria-labelledby={`team-updates-${request.id}`} className="mt-5 border-t border-[#e7ece8] pt-4">
        <div className="flex items-center gap-2.5">
          <MessageSquareText aria-hidden="true" className="text-[#315d50]" size={16} />
          <h3 id={`team-updates-${request.id}`} className="text-sm font-bold text-[#23483e]">
            {translateText("Acompanhamento da equipe")}
            <span className="ml-2 text-xs font-medium text-[#718078]">
              {request.comments.length === 1
                ? translateText("1 atualização")
                : `${request.comments.length} ${translateText("atualizações")}`}
            </span>
          </h3>
        </div>
        {request.comments.length ? (
          <ol className="ml-2 mt-4 space-y-0 border-l border-[#dce6df] pl-5">
            {request.comments.map((comment) => (
              <li className="relative pb-5 last:pb-0" key={comment.id} data-testid={`comment-support-request-${comment.id}`}>
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
          <p className="mt-3 rounded-xl bg-[#f4f6f1] px-4 py-3 text-sm leading-6 text-[#65766e]" data-testid={`text-no-support-comments-${request.id}`}>
            {translateText("Ainda não há atualizações da equipe. Quando houver novidades, elas aparecerão aqui.")}
          </p>
        )}
      </section>
    </div>
  );
}

function SupportRequestsContent() {
  const { isSignedIn, userId } = useAuth();
  const [expandedRequestId, setExpandedRequestId] = useState<number | null>(null);
  const requestsQuery = useListMySupportRequests({
    query: {
      queryKey: [...getListMySupportRequestsQueryKey(), userId],
      enabled: isSignedIn === true && Boolean(userId),
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchInterval: 30_000,
    },
  });
  useEffect(() => {
    const targetId = window.location.hash.slice(1);
    const match = /^support-request-(\d+)$/.exec(targetId);
    if (!requestsQuery.data || !match) return;
    const requestId = Number(match[1]);
    if (requestsQuery.data.some((request) => request.id === requestId)) {
      setExpandedRequestId(requestId);
    }
  }, [requestsQuery.data]);
  useEffect(() => {
    if (expandedRequestId === null) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`support-request-${expandedRequestId}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [expandedRequestId]);
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
            <div className="my-support-requests-table-wrap overflow-hidden rounded-2xl border border-[#d9e2df] bg-white" data-testid="list-support-requests">
              <table aria-label={translateText("Suas solicitações de suporte")} className="my-support-requests-table w-full border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <th scope="col">{translateText("Protocolo")}</th>
                    <th scope="col">{translateText("Assunto")}</th>
                    <th scope="col">{translateText("Data de envio")}</th>
                    <th scope="col">{translateText("Status")}</th>
                    <th scope="col">{translateText("Ação")}</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => {
                    const status = getStatusAppearance(request.status);
                    const StatusIcon = status.icon;
                    const expanded = expandedRequestId === request.id;
                    const detailId = `support-request-details-${request.id}`;
                    return (
                      <Fragment key={request.id}>
                        <tr
                          className={`my-support-request-row ${expanded ? "is-expanded" : ""}`}
                          id={`support-request-${request.id}`}
                          style={{ scrollMarginTop: "6rem" }}
                          data-testid={`row-support-request-${request.id}`}
                        >
                          <td data-label={translateText("Protocolo")}>
                            <span className="font-mono text-xs font-bold text-[#23483e]" data-testid={`text-support-protocol-${request.id}`}>{request.protocol}</span>
                          </td>
                          <td data-label={translateText("Assunto")}>
                            <span className="font-semibold text-[#183a34]" data-testid={`text-support-subject-${request.id}`}>{request.subjectName}</span>
                          </td>
                          <td data-label={translateText("Data de envio")}>
                            <time className="text-xs text-[#687a73]" dateTime={request.createdAt}>{formatDate(request.createdAt)}</time>
                          </td>
                          <td data-label={translateText("Status")}>
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${status.tone}`} data-testid={`status-support-request-${request.id}`}>
                              <StatusIcon aria-hidden="true" size={13} strokeWidth={2.2} />
                              {getPrivateStatusLabelFromRequest(request)}
                            </span>
                          </td>
                          <td data-label={translateText("Ação")}>
                            <button
                              aria-controls={detailId}
                              aria-expanded={expanded}
                              className="my-support-request-toggle"
                              data-testid={`button-open-support-request-${request.id}`}
                              onClick={() => setExpandedRequestId((current) => current === request.id ? null : request.id)}
                              type="button"
                            >
                              {translateText(expanded ? "Fechar" : "Abrir")}
                            </button>
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="my-support-request-detail-row">
                            <td colSpan={5}>
                              <RequestDetails request={request} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
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
