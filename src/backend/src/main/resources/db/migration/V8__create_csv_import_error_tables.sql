CREATE TABLE csv_import_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL,
  row_number INT NOT NULL,
  student_code VARCHAR(50) NULL,
  field_name VARCHAR(100) NULL,
  error_code VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT fk_csv_import_errors_batch FOREIGN KEY (batch_id) REFERENCES csv_import_batches(id)
);

CREATE INDEX idx_csv_import_errors_batch_id ON csv_import_errors(batch_id);
CREATE INDEX idx_csv_import_errors_batch_id_row_number ON csv_import_errors(batch_id, row_number);
CREATE INDEX idx_csv_import_errors_error_code ON csv_import_errors(error_code);
