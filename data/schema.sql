-- UniHub Workshop PostgreSQL schema.
-- PostgreSQL is the durable source of truth. Redis and mobile SQLite are coordination/cache layers only.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  account_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
    CHECK (account_status IN ('ACTIVE', 'DISABLED', 'LOCKED')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_users_account_status ON users(account_status);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

CREATE TABLE student_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255) NOT NULL,
  checksum VARCHAR(255) UNIQUE,
  status VARCHAR(30) NOT NULL
    CHECK (status IN ('PROCESSING', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'MISSED')),
  total_rows INT NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
  success_count INT NOT NULL DEFAULT 0 CHECK (success_count >= 0),
  error_count INT NOT NULL DEFAULT 0 CHECK (error_count >= 0),
  duplicate_count INT NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
  failure_reason TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_imports_status ON student_imports(status);
CREATE INDEX idx_student_imports_started_at ON student_imports(started_at);

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  student_code VARCHAR(50) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  faculty VARCHAR(255),
  major VARCHAR(255),
  class_name VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'GRADUATED', 'SUSPENDED')),
  import_batch_id UUID REFERENCES student_imports(id) ON DELETE SET NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_students_updated_at BEFORE UPDATE ON students
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_import_batch_id ON students(import_batch_id);

CREATE TABLE student_import_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES student_imports(id) ON DELETE CASCADE,
  row_number INT NOT NULL CHECK (row_number > 0),
  student_code VARCHAR(50),
  field_name VARCHAR(100),
  error_code VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  raw_row JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_import_errors_import_id ON student_import_errors(import_id);
CREATE INDEX idx_student_import_errors_row ON student_import_errors(import_id, row_number);
CREATE INDEX idx_student_import_errors_code ON student_import_errors(error_code);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by_token_id UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked_at ON refresh_tokens(revoked_at);

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  building VARCHAR(100) NOT NULL,
  capacity INT NOT NULL CHECK (capacity > 0),
  map_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (building, name)
);

CREATE TRIGGER trg_rooms_updated_at BEFORE UPDATE ON rooms
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_rooms_status ON rooms(status);

CREATE TABLE workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  speaker_name VARCHAR(255) NOT NULL,
  speaker_title VARCHAR(255),
  description TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELED', 'ARCHIVED')),
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  published_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_workshops_updated_at BEFORE UPDATE ON workshops
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_workshops_status ON workshops(status);
CREATE INDEX idx_workshops_created_by ON workshops(created_by_user_id);
CREATE INDEX idx_workshops_title ON workshops(title);

CREATE TABLE workshop_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'CLOSED', 'CANCELED', 'FULL')),
  seat_capacity INT NOT NULL CHECK (seat_capacity > 0),
  seats_confirmed INT NOT NULL DEFAULT 0 CHECK (seats_confirmed >= 0),
  seats_reserved INT NOT NULL DEFAULT 0 CHECK (seats_reserved >= 0),
  fee_type VARCHAR(20) NOT NULL CHECK (fee_type IN ('FREE', 'PAID')),
  fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'VND',
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, workshop_id),
  CHECK (end_at > start_at),
  CHECK (seats_confirmed + seats_reserved <= seat_capacity),
  CHECK ((fee_type = 'FREE' AND fee_amount = 0) OR (fee_type = 'PAID' AND fee_amount > 0))
);

CREATE TRIGGER trg_workshop_sessions_updated_at BEFORE UPDATE ON workshop_sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_workshop_sessions_workshop_id ON workshop_sessions(workshop_id);
CREATE INDEX idx_workshop_sessions_room_id ON workshop_sessions(room_id);
CREATE INDEX idx_workshop_sessions_start_at ON workshop_sessions(start_at);
CREATE INDEX idx_workshop_sessions_status_start ON workshop_sessions(status, start_at);

ALTER TABLE workshop_sessions ADD CONSTRAINT ex_workshop_sessions_room_overlap
EXCLUDE USING gist (
  room_id WITH =,
  tstzrange(start_at, end_at, '[)') WITH &&
) WHERE (status <> 'CANCELED');

CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  session_id UUID NOT NULL,
  status VARCHAR(30) NOT NULL
    CHECK (status IN ('PENDING_PAYMENT', 'CONFIRMED', 'PAYMENT_FAILED', 'EXPIRED', 'CANCELED')),
  registration_type VARCHAR(20) NOT NULL CHECK (registration_type IN ('FREE', 'PAID')),
  registration_idempotency_key VARCHAR(255),
  qr_token_hash VARCHAR(255),
  expires_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (session_id, workshop_id) REFERENCES workshop_sessions(id, workshop_id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_registrations_updated_at BEFORE UPDATE ON registrations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_registrations_user_id ON registrations(user_id);
CREATE INDEX idx_registrations_student_id ON registrations(student_id);
CREATE INDEX idx_registrations_workshop_id ON registrations(workshop_id);
CREATE INDEX idx_registrations_session_id ON registrations(session_id);
CREATE INDEX idx_registrations_status ON registrations(status);
CREATE INDEX idx_registrations_expiring ON registrations(status, expires_at);
CREATE UNIQUE INDEX uq_registrations_active_workshop_user
  ON registrations(workshop_id, user_id)
  WHERE status IN ('PENDING_PAYMENT', 'CONFIRMED');
CREATE UNIQUE INDEX uq_registrations_active_session_student
  ON registrations(session_id, student_id)
  WHERE status IN ('PENDING_PAYMENT', 'CONFIRMED');
CREATE UNIQUE INDEX uq_registrations_idempotency
  ON registrations(registration_idempotency_key)
  WHERE registration_idempotency_key IS NOT NULL;

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider VARCHAR(50) NOT NULL DEFAULT 'mock_gateway',
  provider_payment_id VARCHAR(255),
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  request_hash VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'VND',
  status VARCHAR(30) NOT NULL CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELED')),
  failure_code VARCHAR(100),
  failure_message TEXT,
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_payments_registration_id ON payments(registration_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status_expires ON payments(status, expires_at);
CREATE UNIQUE INDEX uq_payments_provider_payment_id
  ON payments(provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;
CREATE UNIQUE INDEX uq_payments_active_registration
  ON payments(registration_id)
  WHERE status IN ('PENDING', 'SUCCESS');

CREATE TABLE qr_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL UNIQUE REFERENCES registrations(id) ON DELETE CASCADE,
  qr_token_hash VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_qr_tickets_updated_at BEFORE UPDATE ON qr_tickets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_qr_tickets_status ON qr_tickets(status);

CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES registrations(id) ON DELETE RESTRICT,
  session_id UUID NOT NULL REFERENCES workshop_sessions(id) ON DELETE RESTRICT,
  scanned_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  source_mode VARCHAR(30) NOT NULL CHECK (source_mode IN ('ONLINE', 'OFFLINE_SYNC')),
  sync_status VARCHAR(30) NOT NULL CHECK (sync_status IN ('PENDING_SYNC', 'SYNCED', 'ACCEPTED', 'DUPLICATE', 'REJECTED', 'SYNC_FAILED')),
  sync_event_id VARCHAR(255),
  offline_device_id VARCHAR(255),
  qr_token_hash VARCHAR(255),
  client_scanned_at TIMESTAMPTZ NOT NULL,
  server_received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ,
  rejection_code VARCHAR(100),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_checkins_updated_at BEFORE UPDATE ON checkins
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE UNIQUE INDEX uq_checkins_registration
  ON checkins(registration_id)
  WHERE registration_id IS NOT NULL AND sync_status IN ('SYNCED', 'ACCEPTED');
CREATE UNIQUE INDEX uq_checkins_sync_event_id
  ON checkins(sync_event_id)
  WHERE sync_event_id IS NOT NULL;
CREATE INDEX idx_checkins_session_id ON checkins(session_id);
CREATE INDEX idx_checkins_scanned_by ON checkins(scanned_by_user_id);
CREATE INDEX idx_checkins_sync_status ON checkins(sync_status);
CREATE INDEX idx_checkins_scanned_at ON checkins(client_scanned_at);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id VARCHAR(255),
  event_type VARCHAR(100) NOT NULL,
  channel VARCHAR(30) NOT NULL,
  template_key VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'RETRYING')),
  read_at TIMESTAMPTZ,
  retry_count INT NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  next_retry_at TIMESTAMPTZ,
  last_error_code VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id);
CREATE INDEX idx_notifications_status_retry ON notifications(status, next_retry_at);
CREATE INDEX idx_notifications_event_type_created ON notifications(event_type, created_at);
CREATE UNIQUE INDEX uq_notifications_event_recipient_channel
  ON notifications(event_id, recipient_user_id, channel)
  WHERE event_id IS NOT NULL;

CREATE TABLE workshop_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  uploaded_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  object_key TEXT NOT NULL UNIQUE,
  original_filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100) NOT NULL CHECK (content_type = 'application/pdf'),
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
  checksum VARCHAR(255),
  upload_status VARCHAR(30) NOT NULL CHECK (upload_status IN ('UPLOADED', 'FAILED')),
  summary_status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    CHECK (summary_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  summary_text TEXT,
  ai_model_name VARCHAR(100),
  summary_attempt_count INT NOT NULL DEFAULT 0 CHECK (summary_attempt_count >= 0),
  summary_error_code VARCHAR(100),
  summary_error_message TEXT,
  summary_started_at TIMESTAMPTZ,
  summary_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_workshop_materials_updated_at BEFORE UPDATE ON workshop_materials
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_workshop_materials_workshop_id ON workshop_materials(workshop_id);
CREATE INDEX idx_workshop_materials_uploaded_by ON workshop_materials(uploaded_by_user_id);
CREATE INDEX idx_workshop_materials_summary_status ON workshop_materials(summary_status, updated_at);

COMMENT ON TABLE workshop_sessions IS
'Registration must lock the target row with SELECT ... FOR UPDATE before changing seats_confirmed or seats_reserved.';

COMMENT ON TABLE registrations IS
'Active duplicate protection is enforced by uq_registrations_active_workshop_user and uq_registrations_active_session_student.';

COMMENT ON TABLE payments IS
'Payment retries must reuse idempotency_key. Same key with a different request_hash must be rejected by application logic.';

COMMENT ON TABLE checkins IS
'Offline mobile scans use sync_event_id for idempotent sync. Backend validation is final.';

-- Transaction shape for high-contention registration:
-- BEGIN;
-- SELECT * FROM workshop_sessions WHERE id = :session_id AND status = 'OPEN' FOR UPDATE;
-- Verify seats_confirmed + seats_reserved < seat_capacity.
-- INSERT INTO registrations(...), relying on unique indexes for duplicate protection.
-- UPDATE workshop_sessions SET seats_confirmed = seats_confirmed + 1 for free confirmed seats,
--   or seats_reserved = seats_reserved + 1 for paid pending reservations.
-- COMMIT;
