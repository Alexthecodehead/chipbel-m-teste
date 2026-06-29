# Autenticacao e perfis

O projeto usa PostgreSQL, funcoes serverless da Vercel e cookie de sessao `HttpOnly`. Nao usa Supabase, Firebase ou Auth0.

## Fluxo de atleta

1. O cadastro envia `role: athlete` para `/api/auth/register`.
2. O backend grava o usuario inativo e envia um token de uso unico pelo Resend.
3. `confirmar-email.html` consome o token em `/api/auth/confirm`.
4. O usuario e ativado, recebe a sessao e segue para `minhas-inscricoes.html`.
5. O painel consulta somente as inscricoes e resultados do usuario da sessao.

## Fluxo de organizador

1. O cadastro envia `role: organizer`, nome e empresa.
2. O backend cria `users`, `organizer_profiles` e `organizer_requests` em uma transacao.
3. A confirmacao valida o e-mail, mas nao libera o painel.
4. O administrador base aprova o pedido em `admin-configuracoes.html`.
5. A conta so fica ativa quando `email_verified_at` existe e `account_status` e `approved`.

## Isolamento

- O navegador nunca informa qual organizador e dono da consulta.
- A API deriva `organizer_id` da sessao e filtra eventos, inscritos e financeiro.
- O administrador base pode consultar todos os organizadores; um organizador comum nao pode.
- O papel da sessao e conferido novamente no PostgreSQL em cada chamada protegida.

## Atualizacao de banco existente

Execute as migrations na ordem:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" "$env:DATABASE_URL" -f database/migrations/001_security_hardening.sql
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" "$env:DATABASE_URL" -f database/migrations/002_user_roles_and_results.sql
```

Depois, execute novamente `npm run create-admin` para garantir que a conta base tenha perfil administrativo de organizador.

## Vercel e Resend

Configure em `Settings > Environment Variables`, no ambiente Production:

```text
DATABASE_URL=postgresql://...
DATABASE_POOL_SIZE=5
SESSION_SECRET=valor aleatorio com pelo menos 32 caracteres
APP_URL=https://chipbel-m-teste.vercel.app/
VITE_AUTH_SITE_URL=https://chipbel-m-teste.vercel.app/
ADMIN_LOGIN=Admin
ADMIN_EMAIL=seu-email@dominio.com
ADMIN_NAME=Administrador
ADMIN_COMPANY=ChipBelem
RESEND_API_KEY=re_...
MAIL_FROM=ChipBelem <contato@dominio-verificado.com>
AUTH_TEST_MODE=false
DIAGNOSTICS_SECRET=opcional-apenas-para-diagnostico
```

No Resend, `MAIL_FROM` precisa pertencer a um dominio verificado. Evite `onboarding@resend.dev` ou `resend.dev` para usuarios reais; esse remetente e util apenas para testes limitados. Depois de alterar variaveis, faca um redeploy.

`APP_URL` e usado pelo backend para gerar o link `confirmar-email.html?token=...`. Em producao ele precisa ser HTTPS e apontar para a Vercel ou para o dominio proprio. Nao aponte `APP_URL` para GitHub Pages.

Tambem evite URLs de deployment especifico da Vercel, como `chipbel-m-teste-xxxxx-alexandre-the-codehead.vercel.app`, em e-mails e testes publicos. A URL publica correta do projeto e `https://chipbel-m-teste.vercel.app/`.

## AUTH_TEST_MODE

Enquanto nao houver dominio proprio no Resend, e possivel testar confirmacao com:

```text
AUTH_TEST_MODE=true
MAIL_FROM=ChipBelem <onboarding@resend.dev>
```

Nesse modo, `/api/auth/register` e `/api/auth/resend` podem retornar `devConfirmationUrl`. O link so e retornado quando `AUTH_TEST_MODE` e exatamente `"true"`. Em producao real, mantenha `AUTH_TEST_MODE=false` e use um remetente de dominio verificado.

## GitHub Pages

GitHub Pages nao executa `/api`, nao cria cookie `HttpOnly` e nao envia e-mail. O frontend detecta `github.io`, pula chamadas automaticas de API e mostra um aviso com link para `VITE_AUTH_SITE_URL`.

Use GitHub Pages apenas como vitrine estatica:

```text
GITHUB_PAGES=true
VITE_FRONTEND_ONLY=true
VITE_AUTH_SITE_URL=https://seu-projeto.vercel.app/
```

## Pontos de chamada auditados

- `src/App.jsx` centraliza chamadas em `apiRequest`.
- Cadastro chama `/api/auth/register`.
- Reenvio chama `/api/auth/resend`.
- Confirmacao chama `/api/auth/confirm`.
- Login de atleta e organizador chama `/api/auth/login`.
- Sessao inicial chama `/api/auth/session`.
- Cadastro legado de organizador chama `/api/organizer-requests`, que delega para `/api/auth/register` com `role: organizer`.

`apiRequest` usa `src/config.js` para manter a API relativa e bloquear chamadas reais quando o host for frontend estatico.

## Diagnostico interno

`/api/internal/diagnostics` retorna somente:

- `DATABASE_URL_CONFIGURED`
- `SESSION_SECRET_CONFIGURED`
- `APP_URL_CONFIGURED`
- `RESEND_API_KEY_CONFIGURED`
- `MAIL_FROM_CONFIGURED`
- `MAIL_FROM_USES_RESEND_DEV`
- `AUTH_TEST_MODE_ENABLED`
- `NODE_ENV`
- `VERCEL_ENV`

Em producao, a rota exige `DIAGNOSTICS_SECRET` e o header `x-diagnostics-secret`.

## Roteiro de teste

1. Cadastre um atleta e confirme que o login anterior ao clique no e-mail mostra a mensagem de e-mail pendente.
2. Use o link recebido e confirme que ele abre `confirmar-email.html?token=...` na URL de `APP_URL`.
3. Confirme o redirecionamento para a area do atleta.
4. Use "Reenviar e-mail de confirmacao" para uma conta ainda nao confirmada.
5. Cadastre um organizador e confirme o e-mail; o login ainda deve informar que a aprovacao esta pendente.
6. Entre como `Admin`, abra Configuracoes e aprove o pedido.
7. Entre como organizador, crie um evento, publique-o e confirme que aparece na pagina de eventos.
8. Tente abrir `admin.html` como atleta; o sistema deve voltar para a area do atleta.
9. Com dois organizadores, crie um evento em cada conta e confirme que nenhum deles enxerga eventos, inscritos ou financeiro do outro.
