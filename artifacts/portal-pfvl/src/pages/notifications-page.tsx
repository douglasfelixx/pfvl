import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Check, MessageCircle, Newspaper, Trash2, Lightbulb } from "lucide-react";
import {
  getListNotificationsQueryKey,
  useDeleteNotification,
  useListNotifications,
  useMarkNotificationRead,
  type Notification,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { AuthActionGate } from "@/components/auth-ui";
import { translateText } from "@/lib/i18n";
import {
  EmptyState,
  formatDate,
  LoadingState,
  PageHeading,
  QueryError,
} from "@/components/portal-ui";

const typeLabels: Record<Notification["type"], string> = {
  new_update: "Novidade",
  new_publication: "Publicação",
  comment_reply: "Comentário",
  new_suggestion: "Sugestão",
  suggestion_status: "Atualização de sugestão",
};

function typeIcon(type: Notification["type"]) {
  if (type === "comment_reply") return MessageCircle;
  if (type === "new_update" || type === "new_publication") return Newspaper;
  if (type === "new_suggestion" || type === "suggestion_status") return Lightbulb;
  return Bell;
}

export function NotificationsPage() {
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="Sua conta PFVL"
        title="Notificações."
        description="Acompanhe novidades, publicações, respostas e mudanças nas sugestões."
      />
      <div className="mt-6">
        <AuthActionGate returnTo="/notifications">
          <NotificationsList />
        </AuthActionGate>
      </div>
    </div>
  );
}

function NotificationsList() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const query = useListNotifications({
    query: {
      queryKey: getListNotificationsQueryKey(),
      refetchInterval: 30_000,
    },
  });
  const markRead = useMarkNotificationRead();
  const remove = useDeleteNotification();
  const [actionError, setActionError] = useState("");

  async function refreshList() {
    await queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
  }

  async function markAsRead(notificationId: number): Promise<boolean> {
    setActionError("");
    try {
      await markRead.mutateAsync({ notificationId });
      await refreshList();
      return true;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível atualizar a notificação.");
      return false;
    }
  }

  async function openNotification(notification: Notification) {
    if (!notification.isRead && !(await markAsRead(notification.id))) return;
    setLocation(notification.href);
  }

  async function deleteNotification(notificationId: number) {
    setActionError("");
    try {
      await remove.mutateAsync({ notificationId });
      await refreshList();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível excluir a notificação.");
    }
  }

  if (query.isLoading) return <LoadingState rows={4} />;
  if (query.isError) return <QueryError retry={() => void query.refetch()} />;
  const notifications = query.data?.notifications ?? [];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-[#012140]">
          {query.data?.unreadCount
            ? `${query.data.unreadCount} não lida${query.data.unreadCount === 1 ? "" : "s"}`
            : "Tudo em dia"}
        </h2>
      </div>
      {actionError && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{actionError}</p>}
      {notifications.length ? (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = typeIcon(notification.type);
            return (
              <article
                className={`grid gap-4 rounded-2xl border bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${
                  notification.isRead
                    ? "border-[#233a59]/10"
                    : "border-[#233a59]/35 shadow-sm"
                }`}
                key={notification.id}
              >
                <button
                  className="flex min-w-0 items-start gap-3 text-left"
                  onClick={() => void openNotification(notification)}
                  type="button"
                >
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#233a59]/8 text-[#233a59]">
                    <Icon aria-hidden="true" size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[#012140]">{notification.title}</span>
                      {!notification.isRead && <span className="h-2 w-2 rounded-full bg-[#286bd4]" aria-label={translateText('Não lida')} />}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-[#4b5563]">{notification.message}</span>
                    <span className="mt-2 block text-xs text-muted-foreground">
                      {typeLabels[notification.type]} · {formatDate(notification.createdAt)}
                    </span>
                  </span>
                </button>
                <div className="flex items-center gap-2 sm:justify-end">
                  {!notification.isRead && (
                    <button
                      aria-label={translateText('Marcar como lida')}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#233a59]/15 px-3 text-xs font-semibold text-[#233a59] hover:bg-[#233a59]/5 disabled:opacity-50"
                      disabled={markRead.isPending}
                      onClick={() => void markAsRead(notification.id)}
                      type="button"
                    >
                      <Check aria-hidden="true" size={15} />
                      <span>{translateText('Marcar como lida')}</span>
                    </button>
                  )}
                  <button
                    aria-label={translateText('Excluir notificação')}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#233a59]/15 text-[#233a59] hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                    disabled={remove.isPending}
                    onClick={() => void deleteNotification(notification.id)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Nenhuma notificação por enquanto"
          description="Avisaremos por aqui quando houver novidades, publicações, respostas ou mudanças nas sugestões."
        />
      )}
    </section>
  );
}
