# Portal PFVL — implantação

## Componentes

O portal é uma aplicação React/Vite com API Express. A implantação Vercel inclui o portal estático e uma função Node para a API; os artigos, usuários e comentários ficam em PostgreSQL no Neon. O Clerk autentica as contas, e o Cloudflare R2 recebe imagens por URLs temporárias de envio.

## Vercel

1. Importe o repositório como um projeto Vercel usando a raiz do monorepo. O build e a pasta estática estão definidos em `vercel.json`; a pasta `api/` encaminha `/api/*` para o Express.
2. Configure estas variáveis no ambiente Vercel (Production e Preview):
   - `DATABASE_URL`: conexão PostgreSQL do Neon com SSL.
   - `CLERK_PUBLISHABLE_KEY` e `CLERK_SECRET_KEY`: chaves do projeto Clerk PFVL.
   - `PFVL_ADMIN_EMAIL`: e-mail inicial de administrador informado pelo responsável. O papel administrativo é aplicado quando essa conta entrar pela primeira vez com o e-mail confirmado.
   - `VITE_SITE_URL`: domínio final do portal.
   - `VITE_PFVL_APP_URL`: endereço do aplicativo PFVL. Configure valores diferentes nos ambientes Development, Preview e Production do Vercel; o botão da página inicial usa o valor do ambiente em que o portal foi compilado.
   - `VITE_PFVL_PRESENTATION_VIDEO_URL`: URL pública do vídeo MP4 de apresentação. O player do site não inicia automaticamente; deixe vazio até o vídeo estar pronto.
   - Para upload no R2: `CLOUDFLARE_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` e `R2_PUBLIC_BASE_URL`.

A imagem principal da Home e o vídeo são referências a objetos já existentes no R2. Configure o nome e a extensão no painel administrativo, em **Imagem / Vídeo**; a página não faz upload desses arquivos.
3. Crie primeiro o banco Neon de destino e confirme que a connection string está no ambiente correto. Depois execute `pnpm --filter @workspace/db run push` apontando explicitamente para esse Neon. Não execute a migração antes de confirmar o banco.
4. Se for necessário cadastrar o conteúdo demonstrativo inicial, execute `pnpm --filter @workspace/api-server run seed` uma vez, também apontando para o Neon de destino.
5. Configure `PFVL_INDICATORS_API_URL` somente quando a fonte real do PFVL estiver disponível; ela deve responder no formato `Indicator`.
6. Configure o domínio e os endereços de retorno do site no painel Clerk antes de liberar o cadastro em produção.

### Endereços por ambiente

No Vercel, abra **Settings → Environment Variables** e configure `VITE_PFVL_APP_URL` para Development, Preview e Production separadamente. Assim, o portal de desenvolvimento/homologação pode apontar para o sistema de teste e o portal publicado para o sistema de produção. Depois de alterar uma variável `VITE_`, gere um novo deploy para incorporá-la ao site. Para execução local, use `.env.local` e não versione esse arquivo.

O vídeo deve ser um MP4 acessível por HTTPS, como um objeto público do R2. O player usa controles nativos e não tem reprodução automática. Um vídeo do YouTube não garante que anúncios de terceiros não apareçam.

O endpoint de envio limita imagens a 5 MB e aceita JPG, PNG e WebP. Crie um bucket no Cloudflare R2, habilite um domínio público HTTPS para leitura, gere uma chave com acesso restrito ao bucket e configure a CORS do bucket para permitir `PUT` com `Content-Type` apenas a partir dos domínios do portal.

## Banco Neon

O aplicativo usa PostgreSQL e Drizzle. O banco da Vercel deve ser Neon; configure sua connection string somente na Vercel e aplique o esquema a esse destino antes do primeiro deploy com dados.

## Indicadores

Sem `PFVL_INDICATORS_API_URL`, a página usa números demonstrativos marcados como ilustrativos — não são cotações atuais nem dados internos do PFVL. Quando a API do PFVL estiver pronta, configure sua URL no ambiente da Vercel; ela deve responder com um array de indicadores contendo código, nome, valor, unidade, variação, data de atualização, fonte, sinalizador ilustrativo e histórico.

## Autenticação e permissões

O Clerk autentica usuários e a API guarda apenas o identificador Clerk, o e-mail verificado, o nome e o papel PFVL. Membros podem publicar tópicos com imagem no fórum e responder no fórum/blog; somente administradores podem criar e gerenciar conteúdo editorial, alterar permissões, suspender contas, moderar comentários e atualizar sugestões. A API valida essas permissões no servidor. Configure as chaves como variáveis seguras; nunca as coloque no código ou em arquivos versionados.
