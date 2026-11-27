import { useEffect } from 'react';
import { ArrowRight, Handshake, LifeBuoy, Mail, ShieldCheck } from 'lucide-react';
import DOMPurify from 'dompurify';
import { SiInstagram } from 'react-icons/si';
import { getGetSiteMediaQueryKey, useGetSiteMedia } from '@workspace/api-client-react';
import { Link } from 'wouter';
import privacyPolicyHtml from '@/content/privacy-policy.html?raw';
import privacyPolicyEnglishHtml from '@/content/privacy-policy.en.html?raw';
import legalTermsHtml from '@/content/legal-terms.html?raw';
import legalTermsEnglishHtml from '@/content/legal-terms.en.html?raw';
import { AuthActionGate } from '@/components/auth-ui';
import { ProductAppLink } from '@/components/homepage-composition';
import { PageHeading, Surface } from '@/components/portal-ui';
import { useI18n, translateText } from '@/lib/i18n';

export function PresentationPage() {
  const siteMedia = useGetSiteMedia({
    query: { queryKey: getGetSiteMediaQueryKey() },
  });
  const fallbackVideoUrl = import.meta.env.VITE_PFVL_PRESENTATION_VIDEO_URL?.trim();
  const videoUrl = siteMedia.data?.presentationVideoUrl ??
    (siteMedia.isError ? fallbackVideoUrl : undefined);

  return (
    <div className="page-enter institutional-page">
      <PageHeading
        eyebrow="Apresentação do PFVL"
        title={translateText("Um plano para conectar suas escolhas.")}
        description="Conheça o PFVL e veja como contas, compromissos e objetivos podem fazer parte do mesmo planejamento."
      />
      <Surface className="presentation-panel">
        {videoUrl ? (
          <video
            aria-label={translateText("Vídeo de apresentação do PFVL")}
            className="presentation-video"
            controls
            playsInline
            preload="metadata"
            src={videoUrl}
          >
            {translateText("Seu navegador não oferece suporte à reprodução deste vídeo.")}
          </video>
        ) : null}
        <div className="presentation-copy">
          <div>
            <h2>{translateText("Seu presente e seu futuro no mesmo plano.")}</h2>
            <p>{translateText("Organize suas finanças, acompanhe seus compromissos e planeje seus objetivos com o PFVL.")}</p>
          </div>
          <ProductAppLink className="institutional-primary-link" />
        </div>
      </Surface>
    </div>
  );
}

export function AboutPage() {
  return (
    <div className="page-enter institutional-page">
      <PageHeading
        eyebrow="Sobre"
        title={translateText("Conheça o PFVL.")}
        description={translateText("Organização para o presente, planejamento para o futuro.") + " " + translateText("Conheça o PFVL e a Orbefin Sistemas Financeiros, empresa responsável pelo produto.")}
      />
      <div className="institutional-content-grid">
        <Surface className="institutional-copy-card">
          <p className="eyebrow-pill">{translateText("O produto")}</p>
          <h2>{translateText("Suas finanças conectadas aos seus planos.")}</h2>
          <p>{translateText("O PFVL conecta a organização financeira do dia a dia ao futuro que você quer construir. Contas, cartões, receitas, despesas e compromissos fazem parte de um planejamento que considera sua realidade e seus objetivos.")}</p>
          <p>{translateText("Mais do que acompanhar movimentações, o PFVL ajuda você a entender como suas escolhas de hoje influenciam seus planos. Valores, prazos, aportes e projeções se conectam ao acompanhamento de investimentos, empréstimos e financiamentos.")}</p>
          <p>{translateText("Ao comparar o planejado com o realizado, você pode rever decisões, ajustar a rota e acompanhar seus objetivos conforme a vida acontece.")}</p>
        </Surface>
        <Surface className="institutional-copy-card company-card">
          <p className="eyebrow-pill">{translateText("A empresa responsável")}</p>
          <h2>{translateText("Orbefin Sistemas Financeiros")}</h2>
          <p>{translateText("A Orbefin Sistemas Financeiros é a empresa de tecnologia responsável pelo PFVL.")}</p>
          <p>{translateText("Nosso propósito é criar ferramentas que ajudem as pessoas a compreender sua vida financeira e transformar objetivos em planos que possam acompanhar e revisar.")}</p>
          <p>{translateText("Com o PFVL, aproximamos organização, planejamento e acompanhamento para apoiar decisões mais conscientes, respeitando o contexto e as escolhas de cada pessoa.")}</p>
          <a className="company-domain-link" href="https://www.orbefin.com.br" rel="noreferrer" target="_blank">
            {translateText("Conheça a Orbefin Sistemas Financeiros")} <ArrowRight size={15} />
          </a>
        </Surface>
      </div>
      <footer className="institutional-legal-footer">
        <p>{translateText("Razão social:")} <strong>ORBE SISTEMAS INTEGRADOS DE GESTAO FINANCEIRA LTDA</strong></p>
        <p>{translateText("CNPJ:")} <strong>69.815.402/0001-40</strong></p>
      </footer>
    </div>
  );
}

export function ContactPage() {
  return (
    <div className="page-enter institutional-page">
      <PageHeading
        eyebrow="Contato"
        title={translateText("Entre em contato")}
        description={translateText("Encontre o canal adequado para falar com a equipe da Orbefin Sistemas Financeiros sobre o PFVL.")}
      />
      <div className="mt-6 grid items-stretch gap-4 lg:grid-cols-3">
        <Surface className="institutional-copy-card flex h-full flex-col">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8e8e8] text-[#233a59]">
              <LifeBuoy aria-hidden="true" size={19} />
            </span>
            <h2 className="!mt-0">{translateText("Atendimento sobre o PFVL")}</h2>
          </div>
          <p>{translateText("Precisa de ajuda para acessar ou utilizar o sistema? Registre uma solicitação pela Central de Ajuda para que nossa equipe possa acompanhar sua necessidade.")}</p>
          <div className="mt-5">
            <AuthActionGate
              returnTo="/help/request"
              signedOutTitle="Entre na sua conta para registrar uma solicitação."
              signedOutDescription="Depois de entrar, você poderá registrar seu pedido pela Central de Ajuda."
            >
              <Link className="institutional-primary-link" href="/help/request">
                {translateText("Registrar uma solicitação")} <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </AuthActionGate>
          </div>
          <div className="mt-5 rounded-xl bg-[#f4f6f8] p-4">
            <p className="text-sm font-semibold text-[#012140]">{translateText("Acompanhe o PFVL no Instagram")}</p>
            <a
              aria-label={`${translateText("Acompanhe o PFVL no Instagram")} @pfvl.oficial`}
              className="mt-2 inline-flex min-h-10 items-center gap-2 font-semibold text-[#233a59] underline underline-offset-2"
              href="https://www.instagram.com/pfvl.oficial/"
              rel="noopener noreferrer"
              target="_blank"
            >
              <SiInstagram aria-hidden="true" size={18} />
              @pfvl.oficial <ArrowRight aria-hidden="true" size={14} />
            </a>
          </div>
          <div className="mt-auto border-t border-[#233a59]/10 pt-5">
            <h3 className="text-sm font-semibold text-[#012140]">{translateText("Não consegue acessar sua conta?")}</h3>
            <p className="!mt-1">{translateText("Entre em contato pelo e-mail")}{" "}
              <a className="font-semibold text-[#233a59] underline underline-offset-2" href="mailto:suporte@orbefin.com.br">suporte@orbefin.com.br</a>
            </p>
          </div>
        </Surface>

        <Surface className="institutional-copy-card flex h-full flex-col">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8e8e8] text-[#233a59]">
              <Handshake aria-hidden="true" size={19} />
            </span>
            <h2 className="!mt-0">{translateText("Parcerias")}</h2>
          </div>
          <p>{translateText("Quer apresentar uma proposta de parceria ou uma oportunidade de colaboração com a Orbefin Sistemas Financeiros? Entre em contato pelo e-mail")}{" "}
            <a className="font-semibold text-[#233a59] underline underline-offset-2" href="mailto:parcerias@orbefin.com.br">parcerias@orbefin.com.br</a>.
          </p>
          <a
            aria-label={translateText("Enviar e-mail para parcerias")}
            className="company-domain-link mt-auto"
            href="mailto:parcerias@orbefin.com.br"
          >
            <Mail aria-hidden="true" size={15} />
            {translateText("Falar sobre parcerias")}
            <ArrowRight aria-hidden="true" size={13} />
          </a>
        </Surface>

        <Surface className="institutional-copy-card flex h-full flex-col">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8e8e8] text-[#233a59]">
              <ShieldCheck aria-hidden="true" size={19} />
            </span>
            <h2 className="!mt-0">{translateText("Privacidade e dados pessoais")}</h2>
          </div>
          <p>{translateText("Para dúvidas ou solicitações sobre o tratamento dos seus dados pessoais no PFVL, entre em contato pelo e-mail")}{" "}
            <a className="font-semibold text-[#233a59] underline underline-offset-2" href="mailto:privacidade@orbefin.com.br">privacidade@orbefin.com.br</a>.
          </p>
          <a
            aria-label={translateText("Enviar e-mail sobre privacidade")}
            className="company-domain-link mt-auto"
            href="mailto:privacidade@orbefin.com.br"
          >
            <Mail aria-hidden="true" size={15} />
            {translateText("Falar sobre privacidade")}
            <ArrowRight aria-hidden="true" size={13} />
          </a>
        </Surface>
      </div>
    </div>
  );
}

export function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  if (kind === 'privacy') return <PrivacyPolicyPage />;

  return <TermsOfUsePage />;
}

function TermsOfUsePage() {
  return <LegalDocumentPage kind="terms" />;
}

function PrivacyPolicyPage() {
  return <LegalDocumentPage kind="privacy" />;
}

function LegalDocumentPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const { locale } = useI18n();
  const effectiveDate = '2026-11-22';
  const sourceHtml = kind === 'privacy'
    ? locale === 'en-US' ? privacyPolicyEnglishHtml : privacyPolicyHtml
    : locale === 'en-US' ? legalTermsEnglishHtml : legalTermsHtml;
  const oldSectionPrefix = kind === 'privacy' ? 'privacidade' : 'termos';
  const sectionPrefix = kind === 'privacy' ? 'privacy' : 'terms';
  const documentHtml = sourceHtml
    .replaceAll(`#${oldSectionPrefix}-`, `#${sectionPrefix}-`)
    .replaceAll(`id="${oldSectionPrefix}-`, `id="${sectionPrefix}-`)
    .replaceAll(
      `aria-labelledby="${oldSectionPrefix}-titulo"`,
      `aria-labelledby="${sectionPrefix}-titulo"`,
    )
    .replace(/<article(?=[\s>])/, '<article id="legal-document-top"')
    .replace(
      /<\/section>/g,
      `<p class="legal-section-return"><a href="#legal-document-top" data-legal-return-to-top>↑ ${translateText('Voltar ao topo')}</a></p></section>`,
    );

  useEffect(() => {
    const targetId = window.location.hash.slice(1);
    if (!targetId) {
      window.scrollTo(0, 0);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [kind, locale]);

  return (
    <div className="page-enter institutional-page legal-page">
      <div className="legal-page-meta">
        <p className="eyebrow-pill">{translateText("Informações legais")}</p>
        <p className="legal-effective-date">
          <strong>{translateText("Vigente desde")}:</strong>{' '}
          <time dateTime={effectiveDate}>
            {new Intl.DateTimeFormat(locale, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              timeZone: 'UTC',
            }).format(new Date(`${effectiveDate}T00:00:00Z`))}
          </time>
        </p>
      </div>
      <div
        className="legal-document"
        onClick={(event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;
          const returnLink = target.closest<HTMLAnchorElement>("[data-legal-return-to-top]");
          if (!returnLink) return;

          event.preventDefault();
          window.history.replaceState(
            window.history.state,
            "",
            `${window.location.pathname}${window.location.search}`,
          );
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(documentHtml, { USE_PROFILES: { html: true } }),
        }}
      />
    </div>
  );
}

