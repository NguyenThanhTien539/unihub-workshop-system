CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  account_status VARCHAR(30) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  last_login_at TIMESTAMP NULL
);

CREATE INDEX idx_users_account_status ON users(account_status);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255) NULL
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL,
  role_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT pk_user_roles PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

CREATE TABLE csv_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255) NOT NULL,
  checksum VARCHAR(255) NULL,
  status VARCHAR(30) NOT NULL,
  total_rows INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  duplicate_count INT NOT NULL DEFAULT 0,
  failure_reason TEXT NULL,
  started_at TIMESTAMP NOT NULL,
  finished_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_csv_import_batches_checksum
  ON csv_import_batches(checksum)
  WHERE checksum IS NOT NULL;

CREATE INDEX idx_csv_import_batches_status ON csv_import_batches(status);
CREATE INDEX idx_csv_import_batches_started_at ON csv_import_batches(started_at);

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  student_code VARCHAR(50) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  faculty VARCHAR(255) NULL,
  major VARCHAR(255) NULL,
  class_name VARCHAR(100) NULL,
  status VARCHAR(30) NOT NULL,
  import_batch_id UUID NULL,
  imported_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT uq_students_student_code UNIQUE (student_code),
  CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_students_import_batch FOREIGN KEY (import_batch_id) REFERENCES csv_import_batches(id)
);

CREATE UNIQUE INDEX uq_students_user_id_not_null
  ON students(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_import_batch_id ON students(import_batch_id);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  replaced_by_token_id UUID NULL,
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_refresh_tokens_replaced_by FOREIGN KEY (replaced_by_token_id) REFERENCES refresh_tokens(id)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked_at ON refresh_tokens(revoked_at);
