DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_users_account_status') THEN
    ALTER TABLE users
      ADD CONSTRAINT ck_users_account_status
      CHECK (account_status IN ('ACTIVE', 'DISABLED', 'LOCKED'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_students_status') THEN
    ALTER TABLE students
      ADD CONSTRAINT ck_students_status
      CHECK (status IN ('ACTIVE', 'INACTIVE', 'GRADUATED', 'SUSPENDED'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_rooms_status') THEN
    ALTER TABLE rooms
      ADD CONSTRAINT ck_rooms_status
      CHECK (status IN ('ACTIVE', 'INACTIVE'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_workshops_status') THEN
    ALTER TABLE workshops
      ADD CONSTRAINT ck_workshops_status
      CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELED', 'ARCHIVED'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_workshop_sessions_status') THEN
    ALTER TABLE workshop_sessions
      ADD CONSTRAINT ck_workshop_sessions_status
      CHECK (status IN ('OPEN', 'CLOSED', 'CANCELED', 'FULL'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_registrations_status') THEN
    ALTER TABLE registrations
      ADD CONSTRAINT ck_registrations_status
      CHECK (status IN ('PENDING_PAYMENT', 'CONFIRMED', 'PAYMENT_FAILED', 'EXPIRED', 'CANCELED'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_registrations_type') THEN
    ALTER TABLE registrations
      ADD CONSTRAINT ck_registrations_type
      CHECK (registration_type IN ('FREE', 'PAID'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_payment_intents_status') THEN
    ALTER TABLE payment_intents
      ADD CONSTRAINT ck_payment_intents_status
      CHECK (status IN ('PENDING_GATEWAY', 'PENDING_PAYMENT', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'CANCELED'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_qr_tickets_status') THEN
    ALTER TABLE qr_tickets
      ADD CONSTRAINT ck_qr_tickets_status
      CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_checkin_records_source_mode') THEN
    ALTER TABLE checkin_records
      ADD CONSTRAINT ck_checkin_records_source_mode
      CHECK (source_mode IN ('ONLINE', 'OFFLINE_SYNC'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_notifications_channel') THEN
    ALTER TABLE notifications
      ADD CONSTRAINT ck_notifications_channel
      CHECK (channel IN ('IN_APP', 'EMAIL'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_workshop_documents_upload_status') THEN
    ALTER TABLE workshop_documents
      ADD CONSTRAINT ck_workshop_documents_upload_status
      CHECK (upload_status IN ('UPLOADED', 'FAILED'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_ai_summaries_status') THEN
    ALTER TABLE ai_summaries
      ADD CONSTRAINT ck_ai_summaries_status
      CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_csv_import_batches_status') THEN
    ALTER TABLE csv_import_batches
      ADD CONSTRAINT ck_csv_import_batches_status
      CHECK (status IN ('PROCESSING', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'MISSED'));
  END IF;
END $$;
