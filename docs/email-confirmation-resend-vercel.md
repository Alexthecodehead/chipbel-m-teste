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
MAIL_FROM=ChipBelem <no-reply@dominio-verificado.com>
APP_URL=https://chipbel-m-teste.vercel.app/
DATABASE_URL=postgresql://...
SESSION_SECRET=chave-aleatoria-com-no-minimo-32-caracteres
AUTH_TEST_MODE=false
```

`MAIL_FROM` precisa usar o dominio verificado. `APP_URL` precisa ser HTTPS em producao.
Nao configure `APP_URL` com uma URL do GitHub Pages, porque GitHub Pages nao executa `/api/auth/confirm`.
Tambem nao use URLs de deployment especifico da Vercel, como `chipbel-m-teste-xxxxx-alexandre-the-codehead.vercel.app`, porque os e-mails devem apontar para `https://chipbel-m-teste.vercel.app/`.

Depois de alterar variaveis, faca um novo deploy.

## Erros comuns

- `RESEND_API_KEY nao configurada`: crie a variavel em Production na Vercel e faca redeploy.
- `MAIL_FROM nao configurado`: crie a variavel usando o formato `ChipBelem <contato@seudominio.com>`.
- `MAIL_FROM invalido`: revise o e-mail do remetente e use um dominio real.
- Erro 403 do Resend: normalmente o dominio do `MAIL_FROM` nao esta verificado ou o remetente `resend.dev` esta tentando enviar para usuarios que nao sao o e-mail dono da conta.
- `MAIL_FROM nao pode usar resend.dev em producao`: configure um remetente do dominio verificado no Resend.

## Teste sem dominio proprio

Se voce ainda nao tem dominio verificado, configure temporariamente:

```text
AUTH_TEST_MODE=true
MAIL_FROM=ChipBelem <onboarding@resend.dev>
```

Com isso, o backend ainda cria usuario e token com seguranca, tenta enviar pelo Resend se possivel, mas retorna `devConfirmationUrl` no JSON quando o envio nao puder ser entregue. Abra esse link para validar a conta durante testes.

Desative antes de usar com usuarios reais:

```text
AUTH_TEST_MODE=false
MAIL_FROM=ChipBelem <no-reply@dominio-verificado.com>
```
- `APP_URL deve usar HTTPS`: em Production, use `https://...`.
- `APP_URL deve apontar para a Vercel ou dominio proprio`: troque URLs `github.io` pela URL real da Vercel/dominio proprio.

## Fluxo

1. O usuario envia nome, e-mail e senha para `/api/auth/register`.
2. A senha e transformada com scrypt, salt aleatorio e parametros fortes.
3. Um token aleatorio e criado; somente seu hash e salvo por 24 horas.
4. O Resend recebe a URL criada a partir de `APP_URL`.
5. `confirmar-email.html` envia o token para `/api/auth/confirm`.
6. O backend consome o token. Atletas sao ativados imediatamente; organizadores ainda dependem da aprovacao administrativa.
7. Um link novo pode ser solicitado por `/api/auth/resend`, com limite de tentativas.

O antigo endpoint `/api/send-confirmation` foi removido para impedir abuso da conta Resend e links de phishing controlados pelo cliente.
