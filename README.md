# ChipBelem

Plataforma React/Vite para eventos esportivos, inscricoes, area do atleta, organizadores e painel administrativo.

## Arquitetura

- React + Vite no frontend
- Uma funcao serverless catch-all em `api/[...route].js`
- Handlers internos em `server/routes/`
- PostgreSQL para usuarios, perfis, aprovacoes, eventos, inscricoes e resultados
- Senhas com scrypt nativo do Node e salt aleatorio
- Sessao assinada em cookie `HttpOnly`, `Secure` e `SameSite=Strict`
- Resend para confirmacao de e-mail

Os eventos antigos de `src/data.js` continuam como catalogo demonstrativo. Novos eventos, inscricoes, perfis e operacoes administrativas usam API e PostgreSQL.

## API na Vercel Hobby

O plano Hobby da Vercel limita a quantidade de Serverless Functions por deploy. Por isso, as URLs publicas continuam as mesmas, mas todas passam por uma unica funcao:

```text
api/[...route].js
```

Exemplos que continuam funcionando:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/confirm
GET  /api/auth/session
GET  /api/health
```

Os handlers reais ficam em `server/routes/`. Nao adicione novos arquivos `.js` dentro de `api/`, senao a Vercel volta a contar mais funcoes serverless.

## Configuracao local

1. Instale as dependencias:

```bash
npm install
```

2. Crie `.env.local` a partir de `.env.example` e configure:

```text
DATABASE_URL=postgresql://...
DATABASE_POOL_SIZE=5
SESSION_SECRET=uma-chave-aleatoria-com-no-minimo-32-caracteres
APP_URL=http://127.0.0.1:3000/
VITE_AUTH_SITE_URL=http://127.0.0.1:3000/
VITE_FRONTEND_ONLY=false
ADMIN_LOGIN=Admin
ADMIN_EMAIL=seu-email@dominio.com
ADMIN_NAME=Administrador
ADMIN_COMPANY=ChipBelem
RESEND_API_KEY=re_...
MAIL_FROM=ChipBelem <no-reply@dominio-verificado.com>
AUTH_TEST_MODE=false
DIAGNOSTICS_SECRET=opcional-apenas-para-rota-interna
```

3. Aplique o banco:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" "$env:DATABASE_URL" -f database/schema.sql
```

Para um banco ja existente, aplique tambem `database/migrations/002_user_roles_and_results.sql`.

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
- `DATABASE_POOL_SIZE`
- `SESSION_SECRET` (minimo 32 caracteres, aleatorio)
- `APP_URL` (URL HTTPS final da Vercel ou dominio proprio; nao use GitHub Pages)
- `ADMIN_LOGIN`
- `ADMIN_EMAIL`
- `ADMIN_NAME`
- `ADMIN_COMPANY`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `AUTH_TEST_MODE` (`false` em producao real)
- `DIAGNOSTICS_SECRET` opcional, apenas para `/api/internal/diagnostics`
- `MERCADO_PAGO_ACCESS_TOKEN` quando a integracao estiver pronta

Nao configure `ADMIN_PASSWORD` na Vercel. A senha existe apenas como hash no PostgreSQL.

Depois das variaveis, faca um novo deploy.

Para este projeto em producao, use:

```text
APP_URL=https://chipbel-m-teste.vercel.app/
VITE_AUTH_SITE_URL=https://chipbel-m-teste.vercel.app/
```

Nao use URLs de deployment especifico da Vercel, como `chipbel-m-teste-xxxxx-alexandre-the-codehead.vercel.app`, em `APP_URL` ou testes publicos. Elas podem mudar e nao devem aparecer nos e-mails de confirmacao.

## Modo Teste Sem Dominio

Use somente enquanto nao houver dominio proprio verificado no Resend:

```text
AUTH_TEST_MODE=true
MAIL_FROM=ChipBelem <onboarding@resend.dev>
APP_URL=https://chipbel-m-teste.vercel.app/
```

Nesse modo, o cadastro cria usuario, token e URL normalmente. O backend tenta enviar e-mail quando `RESEND_API_KEY` e `MAIL_FROM` existem, mas se o Resend falhar ele retorna `devConfirmationUrl` no JSON para teste manual. Esse link tambem pode aparecer na tela de cadastro.

Nao use `AUTH_TEST_MODE=true` em producao real. Com `AUTH_TEST_MODE=false` ou ausente, o backend nunca retorna token nem link de confirmacao; se o e-mail falhar, a resposta continua segura com `email_delivery_failed`.

## Modo Producao Real

Para envio real a Gmail/Outlook de qualquer usuario, verifique um dominio no Resend e use:

```text
AUTH_TEST_MODE=false
MAIL_FROM=ChipBelem <no-reply@dominio-verificado.com>
APP_URL=https://chipbel-m-teste.vercel.app/
```

## Diagnostico seguro

Em producao, configure `DIAGNOSTICS_SECRET` com um valor aleatorio de pelo menos 24 caracteres. Depois acesse a rota interna enviando o header:

```bash
curl -H "x-diagnostics-secret: SEU_SEGREDO" https://chipbel-m-teste.vercel.app/api/internal/diagnostics
```

A resposta mostra apenas booleans como `APP_URL_CONFIGURED`, `RESEND_API_KEY_CONFIGURED`, `MAIL_FROM_CONFIGURED`, `NODE_ENV` e `VERCEL_ENV`. Nenhum secret e retornado.

## GitHub Pages

GitHub Pages publica somente arquivos estaticos. Ele pode exibir a interface e eventos demonstrativos, mas nao executa as funcoes em `api/`, nao envia e-mail, nao cria sessao `HttpOnly` e nao acessa o PostgreSQL. Para demonstrar login, cadastro, e-mail e painel protegido, use a URL da Vercel.

Se publicar uma versao estatica, configure variaveis publicas de build:

```text
GITHUB_PAGES=true
VITE_FRONTEND_ONLY=true
VITE_AUTH_SITE_URL=https://seu-projeto.vercel.app/
```

Nao coloque secrets em variaveis `VITE_*`. Elas aparecem no bundle do navegador. `VITE_AUTH_SITE_URL` serve apenas para mostrar o link "Abrir ambiente correto" quando alguem acessa pelo GitHub Pages. As chamadas reais de API devem continuar relativas, como `/api/auth/register`, no mesmo dominio da Vercel.

## Teste de autenticacao em producao

1. Acesse a URL da Vercel configurada em `APP_URL`.
2. Cadastre um atleta em `cadastro.html`; o backend deve criar o usuario inativo e enviar o e-mail pelo Resend.
3. Clique no link recebido; ele deve abrir `confirmar-email.html?token=...` na URL da Vercel e redirecionar para `minhas-inscricoes.html`.
4. Tente login antes da confirmacao; a tela deve informar que o e-mail precisa ser confirmado e permitir reenviar.
5. Cadastre um organizador; confirme o e-mail e tente login. A resposta correta antes da aprovacao e `approval_pending`.
6. Entre como `Admin`, abra `admin-configuracoes.html` e aprove o organizador.
7. Entre com o organizador aprovado e confirme acesso ao painel.

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
Consulte [docs/authentication-and-roles.md](docs/authentication-and-roles.md) para configuracao, perfis e roteiro de testes.
