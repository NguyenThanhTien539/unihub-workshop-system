CREATE TABLE workshop_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL,
  uploaded_by_user_id UUID NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  original_filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  checksum VARCHAR(255) NULL,
  upload_status VARCHAR(30) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT fk_workshop_documents_workshop FOREIGN KEY (workshop_id) REFERENCES workshops(id),
  CONSTRAINT fk_workshop_documents_uploaded_by FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
);

CREATE INDEX idx_workshop_documents_workshop_id ON workshop_documents(workshop_id);
CREATE INDEX idx_workshop_documents_uploaded_by_user_id ON workshop_documents(uploaded_by_user_id);

CREATE TABLE ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL,
  summary_text TEXT NULL,
  model_name VARCHAR(100) NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  last_error_code VARCHAR(100) NULL,
  last_error_message TEXT NULL,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT fk_ai_summaries_document FOREIGN KEY (document_id) REFERENCES workshop_documents(id)
);

CREATE INDEX idx_ai_summaries_status ON ai_summaries(status);
CREATE INDEX idx_ai_summaries_status_updated_at ON ai_summaries(status, updated_at);
