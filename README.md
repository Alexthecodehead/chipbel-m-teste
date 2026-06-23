# ChipBelem

Plataforma React/Vite para eventos esportivos, inscricoes, area do atleta, organizadores e painel administrativo.

## Arquitetura

- React + Vite no frontend
- Funcoes serverless em `api/`
- PostgreSQL para usuarios, aprovacoes e tokens
- Senhas com scrypt nativo do Node e salt aleatorio
- Sessao assinada em cookie `HttpOnly`, `Secure` e `SameSite=Strict`
- Resend para confirmacao de e-mail

Rascunhos demonstrativos de eventos continuam no `localStorage`, mas nao contem senhas, sessoes, CPF ou tokens de pagamento. Dados pessoais e operacoes financeiras devem ser persistidos somente pela API/PostgreSQL.

## Configuracao local

1. Instale as dependencias:

```bash
npm install
```

2. Crie `.env.local` a partir de `.env.example` e configure:

```text
DATABASE_URL=postgresql://...
SESSION_SECRET=uma-chave-aleatoria-com-no-minimo-32-caracteres
APP_URL=http://127.0.0.1:3000/
ADMIN_LOGIN=Admin
ADMIN_EMAIL=seu-email@dominio.com
RESEND_API_KEY=re_...
MAIL_FROM=ChipBelem <contato@seudominio.com>
```

3. Aplique o banco:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" "$env:DATABASE_URL" -f database/schema.sql
```

4. Crie ou atualize o administrador sem gravar a senha no codigo:

```powershell
$env:ADMIN_EMAIL="seu-email@dominio.com"
$env:ADMIN_PASSWORD="uma-senha-forte-e-unica"
npm run create-admin
Remove-Item Env:ADMIN_PASSWORD
```

5. Para testar frontend e funcoes serverless juntos, use a Vercel CLI:

```bash
npx vercel dev
```

`npm run dev` inicia apenas o frontend Vite. Login, cadastro e confirmacao de e-mail dependem das funcoes em `/api`.

## Build

```bash
npm run build
```

## Publicacao na Vercel

Configure em `Project > Settings > Environment Variables`:

- `DATABASE_URL`
- `SESSION_SECRET` (minimo 32 caracteres, aleatorio)
- `APP_URL` (URL HTTPS final do projeto)
- `ADMIN_LOGIN`
- `ADMIN_EMAIL`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `MERCADO_PAGO_ACCESS_TOKEN` quando a integracao estiver pronta

Nao configure `ADMIN_PASSWORD` na Vercel. A senha existe apenas como hash no PostgreSQL.

Depois das variaveis, faca um novo deploy.

## GitHub Pages

GitHub Pages publica somente arquivos estaticos. Ele pode exibir a interface, mas nao executa as funcoes em `api/` nem fornece autenticacao segura. Para demonstrar login, cadastro, e-mail e painel protegido, use a URL da Vercel.

## Controles de seguranca

- Nenhuma senha administrativa no bundle React
- Senhas nunca salvas em texto puro; derivacao com scrypt e salt aleatorio
- Tokens de confirmacao armazenados apenas como hash e com expiracao
- Autorizacao de admin/organizador verificada no servidor
- Rate limiting persistente no PostgreSQL
- Validacao de origem para requisicoes que alteram estado
- CSP, HSTS, protecao contra iframe e politicas de permissao na Vercel
- Neutralizacao de formulas na exportacao CSV
- Upload de banner limitado a PNG/JPEG/WebP de ate 2 MB
- Access Token do Mercado Pago aceito apenas no servidor

Consulte [docs/security.md](docs/security.md) para riscos restantes e operacao segura.
