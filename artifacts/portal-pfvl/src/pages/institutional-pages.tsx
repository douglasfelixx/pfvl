import { ArrowRight, Play } from 'lucide-react';
import { getGetSiteMediaQueryKey, useGetSiteMedia } from '@workspace/api-client-react';
import { ProductAppLink } from '@/components/homepage-composition';
import { PageHeading, Surface } from '@/components/portal-ui';
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
        title={translateText("Conheça o PFVL e a Orbe.")}
        description="O PFVL é um produto da Orbe Sistemas Financeiros, empresa responsável por seu desenvolvimento."
      />
      <div className="institutional-content-grid">
        <Surface className="institutional-copy-card">
          <p className="eyebrow-pill">{translateText("O produto")}</p>
          <h2>{translateText("Planejamento financeiro em um só lugar.")}</h2>
          <p>{translateText("O PFVL está sendo desenvolvido para pessoas que querem organizar contas e compromissos, acompanhar receitas e despesas e transformar objetivos em planos com valores, prazos e aportes.")}</p>
          <p>{translateText("O sistema também pretende reunir informações sobre investimentos, empréstimos, financiamentos e integrações disponíveis, ajudando cada pessoa a comparar o planejado com o realizado.")}</p>
          <span className="development-status">{translateText("O produto está em desenvolvimento.")}</span>
        </Surface>
        <Surface className="institutional-copy-card company-card">
          <p className="eyebrow-pill">{translateText("A empresa responsável")}</p>
          <h2>{translateText("Orbe Sistemas Financeiros.")}</h2>
          <p>{translateText("A Orbe Sistemas Financeiros é a empresa responsável pelo PFVL. As informações institucionais e os canais oficiais serão publicados após a validação dos dados da empresa.")}</p>
          <a className="company-domain-link" href="https://orbefin.com.br" rel="noreferrer" target="_blank">
            orbefin.com.br <ArrowRight size={15} />
          </a>
        </Surface>
      </div>
    </div>
  );
}

export function ContactPage() {
  return (
    <div className="page-enter institutional-page">
      <PageHeading
        eyebrow="Contato"
        title={translateText("Fale com a Orbe.")}
        description="Os canais oficiais e o formulário de contato serão publicados após a confirmação das informações da empresa."
      />
      <Surface className="institutional-notice">
        <h2>{translateText("Estamos preparando este canal.")}</h2>
        <p>{translateText("O formulário será ativado depois de definida a forma oficial de receber e responder às mensagens. O endereço institucional informado é orbefin.com.br.")}</p>
      </Surface>
    </div>
  );
}

export function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const privacy = kind === 'privacy';
  return (
    <div className="page-enter institutional-page">
      <PageHeading
        eyebrow="Informações legais"
        title={privacy ? 'Privacidade.' : 'Termos de uso.'}
        description={privacy ? 'Como as informações pessoais são tratadas no PFVL.' : 'Condições para uso do PFVL.'}
      />
      <Surface className="institutional-notice">
        <h2>{translateText("Documento em preparação.")}</h2>
        <p>{translateText("O texto oficial será publicado após revisão e confirmação dos dados da Orbe Sistemas Financeiros. Não estamos exibindo uma política ou termos provisórios como se fossem documentos válidos.")}</p>
      </Surface>
    </div>
  );
}

