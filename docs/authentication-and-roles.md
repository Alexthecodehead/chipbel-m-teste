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
APP_URL=https://seu-projeto.vercel.app/
ADMIN_LOGIN=Admin
ADMIN_EMAIL=seu-email@dominio.com
ADMIN_NAME=Administrador
ADMIN_COMPANY=ChipBelem
RESEND_API_KEY=re_...
MAIL_FROM=ChipBelem <contato@dominio-verificado.com>
```

No Resend, `MAIL_FROM` precisa pertencer a um dominio verificado. Depois de alterar variaveis, faca um redeploy.

## Roteiro de teste

1. Cadastre um atleta e confirme que o login anterior ao clique no e-mail mostra a mensagem de e-mail pendente.
2. Use o link recebido e confirme o redirecionamento para a area do atleta.
3. Cadastre um organizador e confirme o e-mail; o login ainda deve informar que a aprovacao esta pendente.
4. Entre como `Admin`, abra Configuracoes e aprove o pedido.
5. Entre como organizador, crie um evento, publique-o e confirme que aparece na pagina de eventos.
6. Tente abrir `admin.html` como atleta; o sistema deve voltar para a area do atleta.
7. Com dois organizadores, crie um evento em cada conta e confirme que nenhum deles enxerga eventos, inscritos ou financeiro do outro.
