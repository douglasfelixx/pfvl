# Portal PFVL

Portal PFVL com interface React/Vite, API Express, PostgreSQL no Neon, autenticação Clerk e imagens no Cloudflare R2.

## Enviar ao GitHub

Extraia este pacote e envie o conteúdo da pasta pfvl-github-export para um repositório GitHub. Pelo terminal, a partir desta pasta:

    git init
    git add .
    git commit -m "Initial PFVL portal"
    git branch -M main
    git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
    git push -u origin main

## Importar na Vercel

Importe o repositório no painel da Vercel com a raiz do repositório como Root Directory. O build está definido em vercel.json; ele compila o portal e publica api/[...path].ts como função Express.

Configure em Production e Preview, conforme necessário:

- DATABASE_URL: connection string do Neon com SSL.
- CLERK_PUBLISHABLE_KEY e CLERK_SECRET_KEY: chaves de produção do Clerk.
- PFVL_ADMIN_EMAIL: e-mail do administrador inicial.
- VITE_SITE_URL: URL pública final do portal.
- CLOUDFLARE_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_PUBLIC_BASE_URL: configuração do armazenamento de imagens.

Não envie arquivos .env nem credenciais ao GitHub. Use .env.example apenas como referência de nomes. Consulte DEPLOYMENT.md para mais detalhes.
