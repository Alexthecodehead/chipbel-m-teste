# Confirmacao de e-mail com Resend e Vercel

O cadastro chama `api/auth/register.js`. Essa funcao cria o usuario inativo no PostgreSQL, grava somente o hash do token e envia o link pelo Resend. O frontend nao escolhe a URL de confirmacao e nao recebe o token na resposta.

## Resend

1. Crie uma conta em `https://resend.com`.
2. Verifique um dominio em `Domains`.
3. Crie uma API Key com permissao apenas de envio.
4. Se uma chave apareceu em screenshot, commit ou mensagem, revogue-a e crie outra.

## Variaveis da Vercel

Configure em Production e Preview quando necessario:

```text
RESEND_API_KEY=re_xxxxxxxxx
MAIL_FROM=ChipBelem <contato@seudominio.com>
APP_URL=https://seu-projeto.vercel.app/
DATABASE_URL=postgresql://...
SESSION_SECRET=chave-aleatoria-com-no-minimo-32-caracteres
```

`MAIL_FROM` precisa usar o dominio verificado. `APP_URL` precisa ser HTTPS em producao.

Depois de alterar variaveis, faca um novo deploy.

## Fluxo

1. O usuario envia nome, e-mail e senha para `/api/auth/register`.
2. A senha e transformada em hash bcrypt.
3. Um token aleatorio e criado; somente seu hash e salvo por 24 horas.
4. O Resend recebe a URL criada a partir de `APP_URL`.
5. `confirmar-email.html` envia o token para `/api/auth/confirm`.
6. O backend consome o token, ativa a conta e cria a sessao segura.

O antigo endpoint `/api/send-confirmation` foi removido para impedir abuso da conta Resend e links de phishing controlados pelo cliente.
