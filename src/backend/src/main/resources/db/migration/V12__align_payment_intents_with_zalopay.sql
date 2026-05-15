ALTER TABLE payment_intents
  ADD COLUMN IF NOT EXISTS provider VARCHAR(30);

UPDATE payment_intents
SET provider = 'ZALOPAY'
WHERE provider IS NULL;

ALTER TABLE payment_intents
  ALTER COLUMN provider SET NOT NULL;

ALTER TABLE payment_intents
  ADD COLUMN IF NOT EXISTS provider_transaction_id VARCHAR(255);

UPDATE payment_intents
SET provider_transaction_id = gateway_ref
WHERE provider_transaction_id IS NULL
  AND gateway_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_intents_provider_transaction_id
  ON payment_intents(provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

UPDATE payment_intents
SET status = 'SUCCESS'
WHERE status = 'SUCCEEDED';

ALTER TABLE payment_intents
  DROP CONSTRAINT IF EXISTS ck_payment_intents_status;

ALTER TABLE payment_intents
  ADD CONSTRAINT ck_payment_intents_status
  CHECK (status IN ('PENDING_GATEWAY', 'PENDING_PAYMENT', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELED'));
