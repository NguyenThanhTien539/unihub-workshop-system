UPDATE payment_intents
SET status = 'SUCCEEDED'
WHERE status = 'SUCCESS';

ALTER TABLE payment_intents
  DROP CONSTRAINT IF EXISTS ck_payment_intents_status;

ALTER TABLE payment_intents
  ADD CONSTRAINT ck_payment_intents_status
  CHECK (status IN ('PENDING_GATEWAY', 'PENDING_PAYMENT', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'CANCELED'));
