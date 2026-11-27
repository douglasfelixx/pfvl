import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import {
  getGetActivePollQueryKey,
  getListAdminPollsQueryKey,
  useGetActivePoll,
  useVotePoll,
} from "@workspace/api-client-react";
import { AuthActionGate } from "@/components/auth-ui";
import { formatDate, LoadingState } from "@/components/portal-ui";
import { translateText } from "@/lib/i18n";

function voteLabel(count: number, vote: "positive" | "negative") {
  const plural = count !== 1;
  const word = vote === "positive"
    ? plural ? "votos positivos" : "voto positivo"
    : plural ? "votos negativos" : "voto negativo";
  return `${count} ${translateText(word)}`;
}

export function CommunityPoll() {
  const client = useQueryClient();
  const query = useGetActivePoll({ query: { queryKey: getGetActivePollQueryKey() } });
  const vote = useVotePoll();
  const poll = query.data?.poll;
  const [voteMessage, setVoteMessage] = useState("");

  async function castVote(value: "like" | "dislike") {
    if (!poll) return;
    setVoteMessage("");
    try {
      await vote.mutateAsync({ pollId: poll.id, data: { vote: value } });
      await Promise.all([
        client.invalidateQueries({ queryKey: getGetActivePollQueryKey() }),
        client.invalidateQueries({ queryKey: getListAdminPollsQueryKey() }),
      ]);
    } catch {
      setVoteMessage("Não foi possível registrar seu voto. Tente novamente.");
      await client.invalidateQueries({ queryKey: getGetActivePollQueryKey() });
    }
  }

  return (
    <aside className="community-poll" aria-labelledby="community-poll-title" data-testid="panel-active-poll">
      <div className="community-poll-topline">
        <span className="community-poll-kicker"><span aria-hidden="true" /> {translateText("Enquete da comunidade")}</span>
        <span className={poll ? "community-poll-live" : "community-poll-live community-poll-unavailable"}>
          {translateText(poll ? "Ativa" : query.isError ? "Indisponível" : "Votação")}
        </span>
      </div>
      {query.isLoading ? <LoadingState rows={1} /> : query.isError ? (
        <div className="community-poll-message" role="alert">
          <p>{translateText("Não foi possível carregar a enquete.")}</p>
          <button onClick={() => void query.refetch()} type="button">{translateText("Tentar novamente")}</button>
        </div>
      ) : poll ? (
        <>
          <h2 id="community-poll-title">{poll.question}</h2>
          {poll.details && <p className="community-poll-details">{poll.details}</p>}
          <div className="community-poll-votes" aria-label={`${voteLabel(poll.likeCount, "positive")} ${translateText("e")} ${voteLabel(poll.dislikeCount, "negative")}`}>
            <span><ThumbsUp size={15} /> <small>{voteLabel(poll.likeCount, "positive")}</small></span>
            <span><ThumbsDown size={15} /> <small>{voteLabel(poll.dislikeCount, "negative")}</small></span>
          </div>
          <AuthActionGate
            returnTo="/community"
            signedOutTitle="Entre para votar na enquete."
            signedOutDescription="Entre ou crie uma conta para registrar seu voto."
          >
            <div className="community-poll-actions">
              <button
                aria-pressed={poll.userVote === "like"}
                className={poll.userVote === "like" ? "community-vote-button selected" : "community-vote-button"}
                data-testid="button-poll-like"
                disabled={vote.isPending}
                onClick={() => void castVote("like")}
                type="button"
              ><ThumbsUp size={16} /> {translateText(poll.userVote === "like" ? "Você votou a favor" : "Votar a favor")}</button>
              <button
                aria-pressed={poll.userVote === "dislike"}
                className={poll.userVote === "dislike" ? "community-vote-button selected" : "community-vote-button"}
                data-testid="button-poll-dislike"
                disabled={vote.isPending}
                onClick={() => void castVote("dislike")}
                type="button"
              ><ThumbsDown size={16} /> {translateText(poll.userVote === "dislike" ? "Você votou contra" : "Votar contra")}</button>
            </div>
          </AuthActionGate>
          {voteMessage && <p className="community-poll-message" role="alert">{voteMessage}</p>}
          {vote.isPending && <p className="community-poll-note" role="status">{translateText("Registrando sua avaliação…")}</p>}
          <p className="community-poll-note">{translateText("Enquete publicada em")} {formatDate(poll.createdAt)}{translateText(". Você pode alterar seu voto.")}</p>
        </>
      ) : (
        <div className="community-poll-empty">
          <h2 id="community-poll-title">{translateText("Nenhuma enquete ativa no momento.")}</h2>
          <p>{translateText("Quando a equipe publicar uma nova enquete, você poderá participar por aqui.")}</p>
        </div>
      )}
    </aside>
  );
}
