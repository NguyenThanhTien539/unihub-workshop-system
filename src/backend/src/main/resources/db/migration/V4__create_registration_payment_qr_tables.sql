CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  session_id UUID NOT NULL,
  status VARCHAR(30) NOT NULL,
  registration_type VARCHAR(20) NOT NULL,
  reserved_at TIMESTAMP NULL,
  confirmed_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  canceled_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT fk_registrations_student FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_registrations_session FOREIGN KEY (session_id) REFERENCES workshop_sessions(id)
);

CREATE INDEX idx_registrations_student_id ON registrations(student_id);
CREATE INDEX idx_registrations_session_id ON registrations(session_id);
CREATE INDEX idx_registrations_status ON registrations(status);
CREATE INDEX idx_registrations_status_expires_at ON registrations(status, expires_at);
CREATE UNIQUE INDEX uq_active_registration_student_session
  ON registrations(student_id, session_id)
  WHERE status IN ('PENDING_PAYMENT', 'CONFIRMED');

CREATE TABLE payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL UNIQUE,
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  gateway_ref VARCHAR(255) NULL,
  status VARCHAR(40) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'VND',
  payment_url TEXT NULL,
  expires_at TIMESTAMP NOT NULL,
  paid_at TIMESTAMP NULL,
  failure_reason TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT fk_payment_intents_registration FOREIGN KEY (registration_id) REFERENCES registrations(id)
);

CREATE UNIQUE INDEX uq_payment_intents_gateway_ref_not_null
  ON payment_intents(gateway_ref)
  WHERE gateway_ref IS NOT NULL;

CREATE INDEX idx_payment_intents_status_expires_at ON payment_intents(status, expires_at);

CREATE TABLE qr_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL UNIQUE,
  qr_token_hash VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL,
  issued_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NULL,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT fk_qr_tickets_registration FOREIGN KEY (registration_id) REFERENCES registrations(id)
);

CREATE INDEX idx_qr_tickets_status ON qr_tickets(status);
