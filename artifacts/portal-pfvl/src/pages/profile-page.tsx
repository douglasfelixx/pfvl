import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { Link } from "wouter";
import { CalendarDays, MessageCircle, Star, UserRound } from "lucide-react";
import {
  getGetCurrentUserQueryKey,
  getGetMyTestimonialQueryKey,
  getListTestimonialsQueryKey,
  getListMyCommunityPostsQueryKey,
  useGetCurrentUser,
  useGetMyTestimonial,
  useListMyCommunityPosts,
  useUpsertMyTestimonial,
  useUpdateMyProfile,
} from "@workspace/api-client-react";
import { AuthActionGate } from "@/components/auth-ui";
import { CountryFlag } from "@/components/country-flag";
import { EmptyState, formatDate, LoadingState, QueryError } from "@/components/portal-ui";
import { useI18n, translateText } from "@/lib/i18n";

function ProfileContent() {
  const { isSignedIn } = useAuth();
  const { setLocale } = useI18n();
  const queryClient = useQueryClient();
  const profile = useGetCurrentUser({
    query: { enabled: isSignedIn === true, queryKey: getGetCurrentUserQueryKey() },
  });
  const posts = useListMyCommunityPosts({
    query: { enabled: isSignedIn === true, queryKey: getListMyCommunityPostsQueryKey() },
  });
  const testimonial = useGetMyTestimonial({
    query: { enabled: isSignedIn === true, queryKey: getGetMyTestimonialQueryKey() },
  });
  const updateProfile = useUpdateMyProfile();
  const upsertTestimonial = useUpsertMyTestimonial();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [body, setBody] = useState("");
  const [languageMessage, setLanguageMessage] = useState("");
  const [languageError, setLanguageError] = useState("");
  const [testimonialMessage, setTestimonialMessage] = useState("");
  const [testimonialError, setTestimonialError] = useState("");

  useEffect(() => {
    const current = testimonial.data?.testimonial;
    if (current) {
      setRating(current.rating);
      setBody(current.body);
    } else if (testimonial.data) {
      setRating(0);
      setBody("");
    }
  }, [testimonial.data?.testimonial?.id, testimonial.data?.testimonial?.updatedAt]);

  async function saveLanguage(next: "pt-BR" | "en-US") {
    setLanguageError("");
    setLanguageMessage("");
    try {
      await updateProfile.mutateAsync({ data: { preferredLanguage: next } });
      await queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      setLocale(next);
      setLanguageMessage(translateText("Idioma salvo com sucesso."));
    } catch {
      setLanguageError(translateText("Não foi possível salvar o idioma. Tente novamente."));
    }
  }

  async function submitTestimonial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTestimonialError("");
    setTestimonialMessage("");
    try {
      await upsertTestimonial.mutateAsync({ data: { rating, body: body.trim() } });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetMyTestimonialQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListTestimonialsQueryKey() }),
      ]);
      setTestimonialMessage(translateText("Depoimento enviado para revisão."));
    } catch {
      setTestimonialError(translateText("Não foi possível enviar seu depoimento. Tente novamente."));
    }
  }

  if (profile.isLoading) return <LoadingState rows={3} />;
  if (profile.isError) return <QueryError retry={() => void profile.refetch()} />;
  if (!profile.data) return null;

  const memberPosts = posts.data ?? [];
  const currentTestimonial = testimonial.data?.testimonial;
  const statusText = currentTestimonial?.status === "approved"
    ? "Aprovado"
    : currentTestimonial?.status === "rejected"
      ? "Não aprovado"
      : currentTestimonial ? "Em análise" : "";

  return (
    <div className="page-enter profile-page">
      <header className="profile-heading">
        <div>
          <p className="profile-eyebrow">{translateText("Área do membro")}</p>
          <h1>{translateText("Seu espaço PFVL.")}</h1>
          <p>{translateText("Gerencie sua conta, acompanhe suas publicações e compartilhe sua experiência.")}</p>
        </div>
        <span className="profile-avatar" aria-hidden="true">{profile.data.displayName.trim().slice(0, 1).toLocaleUpperCase()}</span>
      </header>

      <div className="profile-columns">
        <main className="profile-main-column">
          <section className="profile-panel profile-identity">
            <div className="profile-panel-heading">
              <span className="profile-icon"><UserRound size={19} /></span>
              <div><h2>{translateText("Dados da conta")}</h2><p>{translateText("Informações vinculadas ao seu acesso.")}</p></div>
            </div>
            <dl className="profile-details">
              <div><dt>{translateText("Nome")}</dt><dd data-testid="text-profile-name">{profile.data.displayName}</dd></div>
              <div><dt>{translateText("E-mail")}</dt><dd data-testid="text-profile-email">{profile.data.email}</dd></div>
              <div><dt>{translateText("Membro desde")}</dt><dd><CalendarDays size={14} />{formatDate(profile.data.createdAt)}</dd></div>
            </dl>
          </section>

          <section className="profile-panel">
            <div className="profile-section-title">
              <div><p className="profile-eyebrow">{translateText("Histórico da comunidade")}</p><h2>{translateText("Suas publicações")}</h2></div>
              <span className="profile-count">{posts.data?.length ?? "—"}</span>
            </div>
            {posts.isLoading ? <LoadingState rows={2} /> : posts.isError ? <QueryError retry={() => void posts.refetch()} /> : memberPosts.length ? (
              <div className="profile-post-list">
                {memberPosts.map((post) => (
                  <article className="profile-post" key={post.id} data-testid={`profile-post-${post.id}`}>
                    <div className="profile-post-meta"><span>{post.category}</span><time>{formatDate(post.createdAt)}</time></div>
                    <Link href={`/community/${post.id}`} className="profile-post-title">{post.title}</Link>
                    {post.excerpt && <p>{post.excerpt}</p>}
                    <span className="profile-post-comments"><MessageCircle size={14} />{post.commentCount} {translateText("respostas")}</span>
                  </article>
                ))}
              </div>
            ) : <EmptyState title={translateText("Você ainda não publicou na comunidade")} description={translateText("Quando você compartilhar uma conversa, ela aparecerá aqui.")} />}
          </section>
        </main>

        <aside className="profile-side-column">
          <section className="profile-panel language-panel">
            <p className="profile-eyebrow">{translateText("Preferências")}</p>
            <h2>{translateText("Idioma da interface")}</h2>
            <p className="profile-muted">{translateText("A escolha salva acompanha você em novos acessos.")}</p>
            <div className="profile-language-options" role="group" aria-label={translateText("Idioma da interface")}>
              <button type="button" aria-label={translateText("Português (Brasil)")} title={translateText("Português (Brasil)")} data-testid="button-language-pt" aria-pressed={profile.data.preferredLanguage === "pt-BR"} disabled={updateProfile.isPending} onClick={() => void saveLanguage("pt-BR")}>
                <CountryFlag country="BR" />
                <span>{translateText("Português (Brasil)")}</span>
              </button>
              <button type="button" aria-label={translateText("English (United States)")} title={translateText("English (United States)")} data-testid="button-language-en" aria-pressed={profile.data.preferredLanguage === "en-US"} disabled={updateProfile.isPending} onClick={() => void saveLanguage("en-US")}>
                <CountryFlag country="US" />
                <span>{translateText("English (United States)")}</span>
              </button>
            </div>
            {updateProfile.isPending && <p className="profile-feedback" role="status">{translateText("Salvando idioma…")}</p>}
            {languageMessage && <p className="profile-feedback" role="status">{languageMessage}</p>}
            {languageError && <p className="profile-error" role="alert">{languageError}</p>}
          </section>

          <section className="profile-panel testimonial-form-panel">
            <p className="profile-eyebrow">{translateText("Sua experiência")}</p>
            <h2>{translateText("Conte como o PFVL ajuda.")}</h2>
            <p className="profile-muted">{translateText("Seu depoimento será analisado antes de aparecer na página inicial.")}</p>
            {testimonial.isLoading ? <LoadingState rows={1} /> : testimonial.isError ? <QueryError retry={() => void testimonial.refetch()} /> : (
              <>
                {currentTestimonial && (
                  <div className={`testimonial-status status-${currentTestimonial.status}`} data-testid="status-my-testimonial">
                    <span>{translateText(statusText)}</span>
                    <p>{currentTestimonial.status === "pending" ? translateText("A equipe está revisando seu depoimento.") : currentTestimonial.status === "approved" ? translateText("Seu depoimento está publicado na página inicial.") : translateText("Você pode atualizar o texto e reenviar para revisão.")}</p>
                  </div>
                )}
                <form onSubmit={(event) => void submitTestimonial(event)} className="testimonial-form">
                  <fieldset>
                    <legend>{translateText("Sua avaliação")}</legend>
                    <div className="star-rating" role="group" aria-label={translateText("Avaliação de 1 a 5 estrelas")}>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <span className="rating-option" key={value} onMouseEnter={() => setHoverRating(value)} onMouseLeave={() => setHoverRating(0)}>
                          <input
                            aria-label={`${value} ${translateText(value === 1 ? "estrela" : "estrelas")}`}
                            checked={rating === value}
                            className="rating-native"
                            data-testid={`input-rating-${value}`}
                            id={`testimonial-rating-${value}`}
                            name="testimonial-rating"
                            onChange={() => setRating(value)}
                            type="radio"
                            value={value}
                          />
                          <label className="rating-star" htmlFor={`testimonial-rating-${value}`}>
                            <Star aria-hidden="true" size={27} fill={(hoverRating || rating) >= value ? "currentColor" : "none"} />
                          </label>
                        </span>
                      ))}
                    </div>
                  </fieldset>
                  <label htmlFor="testimonial-body">{translateText("Seu depoimento")}</label>
                  <textarea id="testimonial-body" data-testid="input-testimonial-body" value={body} onChange={(event) => setBody(event.target.value)} minLength={10} maxLength={1500} required rows={5} placeholder={translateText("Compartilhe sua experiência com suas próprias palavras.")} />
                  <div className="testimonial-form-foot"><span>{body.length}/1500</span><button className="auth-header-primary" type="submit" data-testid="button-submit-testimonial" disabled={upsertTestimonial.isPending || rating < 1 || body.trim().length < 10}>{upsertTestimonial.isPending ? translateText("Enviando…") : translateText(currentTestimonial ? "Atualizar depoimento" : "Enviar depoimento")}</button></div>
                </form>
              </>
            )}
            {testimonialError && <p className="profile-error" role="alert">{testimonialError}</p>}
            {testimonialMessage && <p className="profile-feedback" role="status">{testimonialMessage}</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}

export function ProfilePage({ returnTo = "/profile" }: { returnTo?: string }) {
  return <AuthActionGate returnTo={returnTo}><ProfileContent /></AuthActionGate>;
}
