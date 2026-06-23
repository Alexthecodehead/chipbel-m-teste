BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS username CITEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ALTER COLUMN is_active SET DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique
ON users(username)
WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user
ON email_verification_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expiry
ON email_verification_tokens(expires_at);

CREATE TABLE IF NOT EXISTS security_rate_limits (
  key_hash CHAR(64) PRIMARY KEY,
  action VARCHAR(60) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1 CHECK (attempts > 0),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_rate_limits_updated
ON security_rate_limits(updated_at);

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS cpf_hash CHAR(64);
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS cpf_encrypted TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS cpf_last4 CHAR(4);

CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_cpf_event
ON registrations(event_id, cpf_hash)
WHERE cpf_hash IS NOT NULL;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_status_detail VARCHAR(120);

COMMIT;

-- Se houver dados em registrations.cpf ou payments.raw_payload, migre-os de
-- forma controlada e depois remova essas colunas. A migration nao apaga dados.
