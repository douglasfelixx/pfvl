import { Link } from 'wouter';
import { PageHeading, Surface } from '@/components/portal-ui';
import { translateText } from '@/lib/i18n';

export default function NotFound() {
  return (
    <div className="page-enter mx-auto max-w-2xl">
      <Surface className="p-6 sm:p-8">
        <PageHeading
          eyebrow="PFVL"
          title="Página não encontrada."
          description="O endereço pode ter mudado ou não estar disponível."
        />
        <Link className="auth-header-primary inline-flex" href="/">
          {translateText('Voltar ao início')}
        </Link>
      </Surface>
    </div>
  );
}
