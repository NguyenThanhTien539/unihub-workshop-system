CREATE TABLE checkin_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL UNIQUE,
  session_id UUID NOT NULL,
  scanned_by_user_id UUID NOT NULL,
  sync_event_id VARCHAR(255) NULL,
  source_mode VARCHAR(30) NOT NULL,
  scanned_at TIMESTAMP NOT NULL,
  server_received_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT fk_checkin_records_registration FOREIGN KEY (registration_id) REFERENCES registrations(id),
  CONSTRAINT fk_checkin_records_session FOREIGN KEY (session_id) REFERENCES workshop_sessions(id),
  CONSTRAINT fk_checkin_records_scanned_by FOREIGN KEY (scanned_by_user_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX uq_checkin_records_sync_event_id_not_null
  ON checkin_records(sync_event_id)
  WHERE sync_event_id IS NOT NULL;

CREATE INDEX idx_checkin_records_session_id ON checkin_records(session_id);
CREATE INDEX idx_checkin_records_scanned_by_user_id ON checkin_records(scanned_by_user_id);
CREATE INDEX idx_checkin_records_scanned_at ON checkin_records(scanned_at);
