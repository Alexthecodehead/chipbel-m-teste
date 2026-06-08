# Backend PostgreSQL do ChipBelem

Este é o primeiro desenho de banco para substituir o `localStorage` atual por uma base PostgreSQL.

## Entidades principais

- `users`: atletas, organizadores e administradores.
- `organizer_profiles`: dados comerciais do organizador.
- `organizer_requests`: pedidos de novos organizadores aguardando aprovacao.
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

## Próximo passo recomendado

Criar uma API para o frontend consumir:

- `POST /auth/login`
- `POST /auth/register`
- `GET /events`
- `GET /events/:slug`
- `POST /organizer/events`
- `POST /organizer/requests`
- `PATCH /admin/organizer-requests/:id/approve`
- `GET /admin/dashboard`
- `GET /admin/events`
- `GET /admin/registrations`
- `GET /admin/finance`
- `POST /registrations`
- `POST /payments/mercado-pago/webhook`

## Observações de segurança

- Nunca salve senha em texto puro. Use `bcrypt` para gerar `password_hash`.
- A conta base deve ter `role = 'admin'`; novos organizadores devem entrar como pedido pendente e so virar `role = 'organizer'` apos aprovacao.
- O `access_token` do Mercado Pago deve ser criptografado antes de gravar em `event_payment_settings.access_token_encrypted`.
- O painel administrativo deve validar `role = 'organizer'` ou `role = 'admin'`.
- Uploads de banner devem ir para storage ou pasta pública controlada; no banco fica apenas `banner_url`.
