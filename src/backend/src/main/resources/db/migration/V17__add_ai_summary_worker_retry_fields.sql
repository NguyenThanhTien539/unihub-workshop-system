ALTER TABLE ai_summaries
  ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP NULL;

UPDATE ai_summaries
SET processing_started_at = started_at
WHERE processing_started_at IS NULL
  AND status = 'PROCESSING'
  AND started_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_summaries_pending_retry
  ON ai_summaries(status, next_retry_at, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_summaries_processing_started
  ON ai_summaries(status, processing_started_at);
