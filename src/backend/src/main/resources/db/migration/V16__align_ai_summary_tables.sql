ALTER TABLE workshop_documents
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP;

UPDATE workshop_documents
SET uploaded_at = created_at
WHERE uploaded_at IS NULL;

ALTER TABLE workshop_documents
  ALTER COLUMN uploaded_at SET DEFAULT now(),
  ALTER COLUMN uploaded_at SET NOT NULL;

ALTER TABLE ai_summaries
  ADD COLUMN IF NOT EXISTS workshop_id UUID,
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS error_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS error_message TEXT;

UPDATE ai_summaries s
SET workshop_id = d.workshop_id
FROM workshop_documents d
WHERE s.document_id = d.id
  AND s.workshop_id IS NULL;

UPDATE ai_summaries
SET generated_at = completed_at
WHERE generated_at IS NULL
  AND status = 'COMPLETED';

UPDATE ai_summaries
SET error_code = last_error_code
WHERE error_code IS NULL
  AND last_error_code IS NOT NULL;

UPDATE ai_summaries
SET error_message = last_error_message
WHERE error_message IS NULL
  AND last_error_message IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_ai_summaries_workshop'
  ) THEN
    ALTER TABLE ai_summaries
      ADD CONSTRAINT fk_ai_summaries_workshop
      FOREIGN KEY (workshop_id) REFERENCES workshops(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_summaries_workshop_id
  ON ai_summaries(workshop_id);

CREATE INDEX IF NOT EXISTS idx_ai_summaries_document_status
  ON ai_summaries(document_id, status);
