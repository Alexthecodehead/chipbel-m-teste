# Confirmacao de e-mail com Resend e Vercel

Este projeto envia confirmacao de conta pela funcao serverless `api/send-confirmation.js`.

## 1. Criar conta no Resend

1. Acesse `https://resend.com`.
2. Crie uma conta ou entre com sua conta.
3. Para teste rapido, voce pode usar o remetente `ChipBelem <onboarding@resend.dev>`.
4. Para enviar para clientes reais, adicione e verifique um dominio proprio em `Domains`.

Importante: `onboarding@resend.dev` e apenas para teste e normalmente so envia para o e-mail dono da conta Resend. Para enviar para qualquer usuario, use um dominio verificado.

## 2. Criar API key

1. No painel do Resend, abra `API Keys`.
2. Clique em `Create API Key`.
3. Nome sugerido: `chipbelem-vercel`.
4. Permissao sugerida: envio de e-mail.
5. Copie a chave gerada. Ela aparece uma unica vez.

Nunca coloque essa chave no React, no GitHub ou em arquivos versionados.

## 3. Configurar na Vercel

No projeto da Vercel:

1. Abra `Settings`.
2. Entre em `Environment Variables`.
3. Adicione:

```text
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
MAIL_FROM=ChipBelem <onboarding@resend.dev>
```

Para dominio verificado, troque o `MAIL_FROM`, por exemplo:

```text
MAIL_FROM=ChipBelem <noreply@seudominio.com>
```

Depois de criar ou alterar variaveis, faca um novo deploy. Variaveis novas nao entram em deploys antigos.

## 4. Testar

1. Abra o site publicado na Vercel.
2. Entre em `Cadastro`.
3. Cadastre um atleta com o e-mail permitido pelo Resend.
4. Confira a caixa de entrada e spam.
5. Clique em `Ativar minha conta`.
6. O site deve abrir `confirmar-email.html` e ativar a conta.

## 5. Arquivos envolvidos

- `api/send-confirmation.js`: envia o e-mail usando a API do Resend.
- `src/App.jsx`: cria conta pendente, chama a API e ativa pelo token.
- `confirmar-email.html`: pagina acessada pelo link do e-mail.
- `.env.example`: modelo das variaveis.

## 6. Limitacao atual

Enquanto o projeto nao estiver conectado a um banco real, contas e tokens ficam no navegador (`localStorage`). Isso e suficiente para demonstracao, mas a implementacao de producao deve salvar usuarios, senhas criptografadas e tokens no PostgreSQL.
