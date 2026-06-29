# Backend PostgreSQL do ChipBelem

O PostgreSQL e a fonte confiavel para usuarios, autenticacao, confirmacao de e-mail e aprovacao de organizadores. O frontend nao deve autorizar perfis a partir do `localStorage`.

## Entidades principais

- `users`: atletas, organizadores e administradores.
- `organizer_profiles`: dados comerciais do organizador.
- `organizer_requests`: pedidos de novos organizadores aguardando aprovacao.
- `email_verification_tokens`: hashes de tokens com expiracao.
- `security_rate_limits`: bloqueio persistente de tentativas abusivas.
- `events`: dados públicos do evento.
- `event_routes`: percursos, largada, chegada e distância.
- `event_lots`: lotes/preços de inscrição.
- `event_payment_settings`: configuração do Mercado Pago por evento.
- `registrations`: inscrição do atleta no evento.
- `payments`: pagamentos e retornos do provedor.

## Como criar o banco

No `psql`, crie o banco:

```sql
CREATE DATABASE chipbelem;
```

Depois rode os scripts:

```bash
psql -U postgres -d chipbelem -f database/schema.sql
psql -U postgres -d chipbelem -f database/seed.sql
```

Se o banco ja existia antes da revisao de seguranca, aplique:

```bash
psql -U postgres -d chipbelem -f database/migrations/001_security_hardening.sql
```

## Comandos úteis

```bash
psql -U postgres -d chipbelem
```

Dentro do `psql`:

```sql
\dt
\d users
SELECT * FROM users;
SELECT * FROM events;
```

## APIs implementadas

Todas as URLs abaixo passam por `api/[...route].js`, a unica Serverless Function publica. Os handlers internos ficam em `server/routes/`.

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/confirm`
- `GET /api/auth/session`
- `POST /api/auth/logout`
- `POST /api/auth/profile`
- `GET|POST /api/organizer-requests`
- `POST /api/organizer-requests/approve`
- `POST /registrations`
- `GET /api/events`
- `GET|POST /api/organizer/events`
- `PATCH|DELETE /api/organizer/events/:id`
- `GET /api/organizer/dashboard`
- `GET /api/organizer/registrations`
- `GET /api/organizer/finance`
- `GET /api/athlete/dashboard`

## Proximas APIs

- `POST /api/payments/mercado-pago/webhook`

## Observações de segurança

- Nunca salve senha em texto puro. Use a funcao scrypt de `server/auth.js` para gerar `password_hash`.
- A conta base deve ter `role = 'admin'`; novos organizadores devem entrar como pedido pendente e so virar `role = 'organizer'` apos aprovacao.
- O `access_token` do Mercado Pago deve ser criptografado antes de gravar em `event_payment_settings.access_token_encrypted`.
- O painel administrativo deve validar `role = 'organizer'` ou `role = 'admin'`.
- Uploads de banner devem ir para storage ou pasta pública controlada; no banco fica apenas `banner_url`.
