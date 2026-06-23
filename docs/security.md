# Seguranca do projeto

## Dados protegidos

- Senhas: scrypt nativo do Node, salt aleatorio e parametros gravados com o hash.
- Sessao: cookie assinado, `HttpOnly`, `SameSite=Strict` e `Secure` em producao.
- Confirmacao de e-mail: token aleatorio; somente o hash fica no banco; validade de 24 horas.
- CPF: o schema reserva `cpf_hash`, `cpf_encrypted` e `cpf_last4`. A API de inscricoes deve criptografar o CPF antes de persistir.
- Mercado Pago: `MERCADO_PAGO_ACCESS_TOKEN` nunca deve entrar no React ou no `localStorage`.

## Operacao

1. Use uma senha administrativa nova, forte e exclusiva.
2. Gere `SESSION_SECRET` com alta entropia e nao reutilize outras chaves.
3. Restrinja o usuario PostgreSQL ao banco da aplicacao e exija TLS na conexao.
4. Mantenha backups criptografados e teste restauracao.
5. Ative MFA nas contas Vercel, GitHub, Resend, PostgreSQL e Mercado Pago.
6. Revogue imediatamente chaves que tenham aparecido em screenshots, commits ou mensagens.
7. Monitore respostas 401, 403, 429 e erros das funcoes da Vercel.

## Limitacoes atuais

- Eventos e inscricoes ainda nao possuem APIs completas de persistencia. A interface usa dados demonstrativos em memoria.
- Rascunhos de eventos ficam no `localStorage`, sem segredos. Eles nao devem ser tratados como registros oficiais.
- Aprovacao de organizadores deve incluir verificacao humana da empresa enquanto nao houver validacao documental.
- Recuperacao de senha ainda precisa de fluxo por token de uso unico.
- Para protecao adicional contra ataques distribuidos, configure WAF/rate limiting na Vercel alem do limite no PostgreSQL.

## Resposta a incidente

Se uma credencial for exposta: revogue-a no provedor, gere outra, atualize a Vercel, encerre sessoes trocando `SESSION_SECRET`, altere a senha afetada e revise logs/deploys.
