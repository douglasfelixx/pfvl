import { ArrowRight, Handshake, LifeBuoy, Mail, Play, ShieldCheck } from 'lucide-react';
import { getGetSiteMediaQueryKey, useGetSiteMedia } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { AuthActionGate } from '@/components/auth-ui';
import { ProductAppLink } from '@/components/homepage-composition';
import { PageHeading, Surface } from '@/components/portal-ui';
import { termsOfUseSections } from '@/content/terms-of-use';
import { translateText } from '@/lib/i18n';

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
        ) : (
          <div className="presentation-video-placeholder">
            <span className="presentation-play-icon"><Play size={25} fill="currentColor" /></span>
            <h2>{translateText("Apresentação em preparação")}</h2>
            <p>{translateText("O vídeo oficial será publicado aqui assim que estiver aprovado.")}</p>
          </div>
        )}
        <div className="presentation-copy">
          <div>
            <p className="eyebrow-pill">{translateText("Produto em desenvolvimento")}</p>
            <h2>{translateText("Seu presente e seu futuro no mesmo plano.")}</h2>
            <p>{translateText("O PFVL está sendo desenvolvido para ajudar você a organizar suas finanças, acompanhar compromissos e planejar objetivos com mais clareza.")}</p>
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
        description={translateText("Organização para o presente, planejamento para o futuro.") + " " + translateText("Conheça o PFVL e a Orbe Sistemas Financeiros, empresa responsável pelo produto.")}
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
          <h2>{translateText("Orbe Sistemas Financeiros")}</h2>
          <p>{translateText("A Orbe Sistemas Financeiros é a empresa de tecnologia responsável pelo PFVL.")}</p>
          <p>{translateText("Nosso propósito é criar ferramentas que ajudem as pessoas a compreender sua vida financeira e transformar objetivos em planos que possam acompanhar e revisar.")}</p>
          <p>{translateText("Com o PFVL, aproximamos organização, planejamento e acompanhamento para apoiar decisões mais conscientes, respeitando o contexto e as escolhas de cada pessoa.")}</p>
          <a className="company-domain-link" href="https://www.orbefin.com.br" rel="noreferrer" target="_blank">
            {translateText("Conheça a Orbe Sistemas Financeiros")} <ArrowRight size={15} />
          </a>
        </Surface>
      </div>
      <footer className="institutional-legal-footer">
        <p>{translateText("PFVL é um produto da Orbe Sistemas Financeiros.")}</p>
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
        description={translateText("Encontre o canal adequado para falar com a equipe da Orbe Sistemas Financeiros sobre o PFVL.")}
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
          <p>{translateText("Quer apresentar uma proposta de parceria ou uma oportunidade de colaboração com a Orbe Sistemas Financeiros? Entre em contato pelo e-mail")}{" "}
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
  return (
    <div className="page-enter institutional-page">
      <PageHeading
        eyebrow={translateText("Informações legais")}
        title={translateText("Termos de Uso.")}
        description={translateText("Conheça as condições para utilizar o site e a aplicação PFVL.")}
      />
      <Surface className="terms-update-card mt-6">
        <p>
          <strong>{translateText("Última atualização:")}</strong>{" "}
          {translateText("A definir após aprovação dos Termos de Uso.")}
        </p>
      </Surface>

      <div className="terms-document-layout mt-4">
        <Surface className="terms-index">
          <nav aria-label={translateText("Índice dos Termos de Uso")}>
            <h2>{translateText("Índice")}</h2>
            <ol>
              {termsOfUseSections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>
        </Surface>

        <article className="terms-document">
          {termsOfUseSections.map((section) => (
            <section className="terms-section" id={section.id} key={section.id}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}

function PrivacyPolicyPage() {
  return (
    <div className="page-enter institutional-page">
      <PageHeading
        eyebrow="Informações legais"
        title={translateText("Política de Privacidade")}
        description={translateText("Entenda como a Orbe Sistemas Financeiros trata seus dados pessoais no site e na aplicação PFVL, por que essas informações são utilizadas e como exercer seus direitos.")}
      />

      <div className="mt-6 space-y-4">
        <Surface className="privacy-summary-card border-[#233a59]/20">
          <h2 className="font-display text-xl font-bold text-[#012140]">
            {translateText("Dúvidas sobre seus dados pessoais?")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#536272]">
            {translateText("Entre em contato pelo e-mail")}{" "}
            <a className="font-semibold text-[#233a59] underline underline-offset-2" href="mailto:privacidade@orbefin.com.br">
              privacidade@orbefin.com.br
            </a>.
          </p>
          <p className="mt-2 text-sm leading-6 text-[#536272]">
            {translateText("Você não precisa estar conectado à sua conta para utilizar esse canal.")}
          </p>
          <p className="mt-5 border-t border-[#233a59]/10 pt-3 text-xs text-[#687687]">
            <strong>{translateText("Última atualização:")}</strong>{" "}
            {translateText("A definir após aprovação da política completa.")}
          </p>
        </Surface>

        <Surface className="privacy-tech-card">
          <h2 className="font-display text-xl font-bold text-[#012140]">
            {translateText("Tecnologias utilizadas, finalidades, duração e opções de gerenciamento")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#536272]">
            {translateText("Este resumo descreve as tecnologias identificadas no código do portal. Os prazos exatos de retenção ainda precisam ser confirmados nas configurações e condições de cada fornecedor antes da aprovação da política completa.")}
          </p>

          <dl className="privacy-tech-list mt-5">
            <div>
              <dt>{translateText("Autenticação — Clerk")}</dt>
              <dd>{translateText("Usada para criar e validar contas e sessões. O perfil PFVL recebe o identificador da conta e, na criação, o e-mail verificado e o nome de exibição.")}</dd>
            </div>
            <div>
              <dt>{translateText("Banco de dados — Neon")}</dt>
              <dd>{translateText("Armazena o perfil da conta, preferência de idioma e dados que a pessoa publica ou envia no portal, como publicações, comentários, solicitações de atendimento, sugestões privadas, votos, depoimentos e notificações.")}</dd>
            </div>
            <div>
              <dt>{translateText("Imagens e vídeos — Cloudflare R2")}</dt>
              <dd>{translateText("Armazena arquivos enviados para publicações e mídias do site. Mídias vinculadas a conteúdo publicado podem ser exibidas publicamente no portal.")}</dd>
            </div>
            <div>
              <dt>{translateText("Hospedagem da aplicação — Vercel")}</dt>
              <dd>{translateText("Hospeda a aplicação pública e a API. Os registros técnicos do aplicativo incluem identificador da requisição, método, caminho sem parâmetros e código de resposta; cookies e cabeçalhos de autorização são ocultados pelo logger da aplicação.")}</dd>
            </div>
            <div>
              <dt>{translateText("Fontes — Google Fonts")}</dt>
              <dd>{translateText("O navegador solicita arquivos de fonte aos domínios do Google Fonts. Essa conexão pode incluir dados técnicos normais da requisição, como endereço IP e informações do navegador; a função de tradução não envia dados para o Google.")}</dd>
            </div>
            <div>
              <dt>{translateText("Tradução da interface — dicionário local do aplicativo")}</dt>
              <dd>{translateText("Os textos fixos da interface em português e inglês usam um dicionário incluído no próprio aplicativo, processado no navegador; não há plugin ou serviço externo de tradução. A escolha de idioma fica no armazenamento local do navegador e, quando salva no perfil, também é vinculada à conta no banco. Publicações e comentários não são traduzidos.")}</dd>
            </div>
            <div>
              <dt>{translateText("Cookies, e-mail, análise e preferências")}</dt>
              <dd>{translateText("Os links de contato abrem o aplicativo de e-mail da pessoa; não há serviço de envio de e-mail nem ferramenta de análise ou publicidade no código. O Clerk usa cookies necessários para autenticação. O menu lateral do painel administrativo pode gravar um cookie próprio de preferência por até sete dias somente após a pessoa aceitar cookies. A escolha feita no aviso e o idioma ficam no armazenamento local do navegador. O aviso permite aceitar os cookies disponíveis ou continuar somente com os necessários; no momento, não há cookies opcionais de análise ou publicidade.")}</dd>
            </div>
          </dl>

          <div className="privacy-retention-note mt-5">
            <h3>{translateText("Retenção e gerenciamento")}</h3>
            <p>{translateText("O código não define exclusão automática por prazo. A duração dos dados da conta, cópias de segurança e registros das plataformas precisa ser confirmada com cada fornecedor. A pessoa pode alterar o idioma no perfil, sair da conta, limpar os dados do navegador e solicitar informações ou providências pelo canal de privacidade, sem fazer login.")}</p>
          </div>
        </Surface>

        <Surface className="institutional-notice">
          <h2>{translateText("Política completa")}</h2>
          <p>{translateText("O índice e as seções completas serão publicados depois que o texto final for revisado e aprovado.")}</p>
        </Surface>
      </div>
    </div>
  );
}

