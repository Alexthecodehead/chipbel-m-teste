BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_status VARCHAR(30) NOT NULL DEFAULT 'approved';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_status_check;
ALTER TABLE users
  ADD CONSTRAINT users_account_status_check
  CHECK (account_status IN ('pending', 'approved', 'rejected', 'suspended'));

UPDATE users
   SET account_status = CASE
     WHEN role = 'organizer' AND is_active = FALSE THEN 'pending'
     ELSE 'approved'
   END
 WHERE account_status IS NULL OR account_status = 'approved';

ALTER TABLE organizer_requests
  ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizer_requests_user
ON organizer_requests(user_id)
WHERE user_id IS NOT NULL;

ALTER TABLE organizer_requests
  ALTER COLUMN password_hash DROP NOT NULL;

CREATE TABLE IF NOT EXISTS event_results (
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

CREATE INDEX IF NOT EXISTS idx_event_results_athlete ON event_results(athlete_id);
CREATE INDEX IF NOT EXISTS idx_event_results_event ON event_results(event_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_athlete_event
ON registrations(event_id, athlete_id);

DROP TRIGGER IF EXISTS trg_event_results_updated_at ON event_results;
CREATE TRIGGER trg_event_results_updated_at
BEFORE UPDATE ON event_results
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
