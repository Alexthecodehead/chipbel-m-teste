CREATE EXTENSION IF NOT EXISTS citext;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  username CITEXT UNIQUE,
  email CITEXT NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'athlete'
    CHECK (role IN ('athlete', 'organizer', 'admin')),
  account_status VARCHAR(30) NOT NULL DEFAULT 'approved'
    CHECK (account_status IN ('pending', 'approved', 'rejected', 'suspended')),
  phone VARCHAR(30),
  city VARCHAR(120),
  state CHAR(2),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE email_verification_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verification_tokens_user ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_tokens_expiry ON email_verification_tokens(expires_at);

CREATE TABLE security_rate_limits (
  key_hash CHAR(64) PRIMARY KEY,
  action VARCHAR(60) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1 CHECK (attempts > 0),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_security_rate_limits_updated ON security_rate_limits(updated_at);

CREATE TABLE organizer_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(180) NOT NULL,
  document_number VARCHAR(30),
  contact_name VARCHAR(160) NOT NULL,
  contact_email CITEXT NOT NULL,
  contact_phone VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_organizer_profiles_updated_at
BEFORE UPDATE ON organizer_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE organizer_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(180) NOT NULL,
  contact_name VARCHAR(160) NOT NULL,
  contact_email CITEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizer_requests_status ON organizer_requests(status);
CREATE INDEX idx_organizer_requests_email ON organizer_requests(contact_email);
CREATE UNIQUE INDEX idx_organizer_requests_pending_email
ON organizer_requests(contact_email)
WHERE status = 'pending';

CREATE TRIGGER trg_organizer_requests_updated_at
BEFORE UPDATE ON organizer_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  organizer_id BIGINT NOT NULL REFERENCES organizer_profiles(id) ON DELETE RESTRICT,
  slug VARCHAR(180) NOT NULL UNIQUE,
  title VARCHAR(180) NOT NULL,
  summary VARCHAR(255),
  description TEXT,
  category VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'warning', 'closed', 'finished', 'cancelled')),
  registration_mode VARCHAR(30) NOT NULL DEFAULT 'native'
    CHECK (registration_mode IN ('native', 'external')),
  external_registration_url VARCHAR(500),
  banner_url VARCHAR(500),
  city VARCHAR(120) NOT NULL,
  state CHAR(2) NOT NULL,
  location VARCHAR(180),
  address VARCHAR(255),
  event_date DATE NOT NULL,
  start_time TIME,
  slots_limit INTEGER CHECK (slots_limit IS NULL OR slots_limit > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_status_date ON events(status, event_date);
CREATE INDEX idx_events_city_state ON events(city, state);
CREATE INDEX idx_events_organizer ON events(organizer_id);

CREATE TRIGGER trg_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE event_routes (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  distance_km NUMERIC(7,2),
  start_point VARCHAR(255),
  finish_point VARCHAR(255),
  start_lat NUMERIC(10,7),
  start_lng NUMERIC(10,7),
  finish_lat NUMERIC(10,7),
  finish_lng NUMERIC(10,7),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_routes_event ON event_routes(event_id);

CREATE TRIGGER trg_event_routes_updated_at
BEFORE UPDATE ON event_routes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE event_lots (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  quantity_limit INTEGER CHECK (quantity_limit IS NULL OR quantity_limit > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_lots_event ON event_lots(event_id);

CREATE TRIGGER trg_event_lots_updated_at
BEFORE UPDATE ON event_lots
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE event_payment_settings (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  provider VARCHAR(40) NOT NULL DEFAULT 'mercado_pago'
    CHECK (provider IN ('mercado_pago')),
  public_key VARCHAR(255),
  access_token_encrypted TEXT,
  webhook_url VARCHAR(500),
  allow_pix BOOLEAN NOT NULL DEFAULT TRUE,
  allow_credit_card BOOLEAN NOT NULL DEFAULT TRUE,
  allow_boleto BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_event_payment_settings_updated_at
BEFORE UPDATE ON event_payment_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE registrations (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  route_id BIGINT REFERENCES event_routes(id) ON DELETE SET NULL,
  athlete_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  registration_number VARCHAR(40) NOT NULL UNIQUE,
  cpf_hash CHAR(64),
  cpf_encrypted TEXT,
  cpf_last4 CHAR(4),
  birth_date DATE,
  gender VARCHAR(30),
  team VARCHAR(120),
  shirt_size VARCHAR(40),
  emergency_contact VARCHAR(180),
  amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(30) NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'paid', 'cancelled', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_registrations_event ON registrations(event_id);
CREATE INDEX idx_registrations_athlete ON registrations(athlete_id);
CREATE INDEX idx_registrations_status ON registrations(status);
CREATE UNIQUE INDEX idx_registrations_athlete_event ON registrations(event_id, athlete_id);
CREATE UNIQUE INDEX idx_registrations_cpf_event ON registrations(event_id, cpf_hash) WHERE cpf_hash IS NOT NULL;

CREATE TRIGGER trg_registrations_updated_at
BEFORE UPDATE ON registrations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  registration_id BIGINT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  provider VARCHAR(40) NOT NULL DEFAULT 'mercado_pago'
    CHECK (provider IN ('mercado_pago')),
  provider_payment_id VARCHAR(120),
  method VARCHAR(30)
    CHECK (method IS NULL OR method IN ('pix', 'credit_card', 'boleto', 'other')),
  amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),
  paid_at TIMESTAMPTZ,
  provider_status_detail VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_registration ON payments(registration_id);
CREATE INDEX idx_payments_provider_payment ON payments(provider_payment_id);
CREATE INDEX idx_payments_status ON payments(status);

CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE event_results (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  registration_id BIGINT NOT NULL UNIQUE REFERENCES registrations(id) ON DELETE CASCADE,
  athlete_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  bib_number VARCHAR(40),
  gross_time_seconds INTEGER CHECK (gross_time_seconds IS NULL OR gross_time_seconds >= 0),
  net_time_seconds INTEGER CHECK (net_time_seconds IS NULL OR net_time_seconds >= 0),
  overall_position INTEGER CHECK (overall_position IS NULL OR overall_position > 0),
  gender_position INTEGER CHECK (gender_position IS NULL OR gender_position > 0),
  category_position INTEGER CHECK (category_position IS NULL OR category_position > 0),
  pace_seconds_per_km INTEGER CHECK (pace_seconds_per_km IS NULL OR pace_seconds_per_km >= 0),
  status VARCHAR(30) NOT NULL DEFAULT 'finished'
    CHECK (status IN ('finished', 'dnf', 'dns', 'disqualified')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_results_athlete ON event_results(athlete_id);
CREATE INDEX idx_event_results_event ON event_results(event_id);

CREATE TRIGGER trg_event_results_updated_at
BEFORE UPDATE ON event_results
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
