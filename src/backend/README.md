# UniHub Backend

This folder contains the Spring Boot backend for UniHub Workshop.

- Java: 21 (fallback to 17 if your environment requires)
- Build tool: Maven
- Modules: presentation, application, domain, infrastructure

## Auth/RBAC demo accounts

The Flyway demo seed creates these accounts:

| Role | Email | Password |
| ---- | ----- | -------- |
| student | `student1@university.edu.vn` | `Password123!` |
| organizer | `organizer@university.edu.vn` | `Password123!` |
| checkin_staff | `checkin@university.edu.vn` | `Password123!` |

Passwords are stored as BCrypt hashes via PostgreSQL `crypt(..., gen_salt('bf'))`; plaintext passwords are not stored in the database.

## Auth endpoints

| Method | Endpoint | Access |
| ------ | -------- | ------ |
| `POST` | `/api/auth/login` | Public |
| `POST` | `/api/auth/refresh` | Public |
| `POST` | `/api/auth/logout` | Authenticated |
| `GET` | `/api/auth/me` | Authenticated |

Login returns a short-lived JWT access token and an opaque refresh token. Refresh tokens are hashed before persistence and are rotated on every successful refresh.

## Security notes

- JWT secret is read from `JWT_SECRET`; it must be at least 32 characters.
- CORS origins are configured with `CORS_ALLOWED_ORIGINS`, defaulting to `http://localhost:3000,http://localhost:3001,http://localhost:8081`.
- The REST API uses Bearer tokens and refresh tokens in the JSON body, so CSRF is disabled for stateless API requests. Revisit CSRF if cookie-based auth is introduced.
- `/api/payments/webhook` is public at the Spring Security layer because the Payment module must verify gateway signatures/shared secrets itself.

## Running tests

```bash
mvn test
```

Focused Auth/RBAC tests:

```bash
mvn -Dtest=AuthCommandServiceTest,AuthControllerTest,RbacSecurityTest test
```

## Nightly student CSV import

The CSV import worker reads nightly roster exports from the legacy Student Management System
and updates the local `students` table. It records every attempt in `csv_import_batches` and
stores row-level validation issues in `csv_import_errors`.

Expected CSV columns:

```csv
student_id,full_name,email,faculty,major,class_name,status
S001,Nguyen An,an@example.com,Engineering,Software,SE-01,ACTIVE
```

Required columns are `student_id` (or `student_code`) and `full_name`. Optional columns are
`email`, `faculty`, `major`, `class_name`, and `status`. Missing `status` defaults to `ACTIVE`.
Allowed status values are `ACTIVE`, `INACTIVE`, `GRADUATED`, and `SUSPENDED`.

Configuration:

```env
APP_CSV_IMPORT_ENABLED=false
APP_CSV_IMPORT_INPUT_DIRECTORY=./data/import
APP_CSV_IMPORT_FILE_PATTERN=students-*.csv
APP_CSV_IMPORT_CRON=0 0 2 * * *
APP_CSV_IMPORT_TIMEZONE=Asia/Ho_Chi_Minh
APP_CSV_IMPORT_ENCODING=UTF-8
APP_CSV_IMPORT_DELIMITER=,
APP_CSV_IMPORT_BATCH_SIZE=500
APP_CSV_IMPORT_RECORD_MISSING_BATCH=false
```

Status meanings:

- `PROCESSING`: batch record was created and import is running.
- `SUCCESS`: file structure and all rows were valid.
- `PARTIAL_SUCCESS`: file structure was valid, but row errors or duplicate student IDs were recorded.
- `FAILED`: file structure was invalid, unreadable, or the import transaction failed.
- `MISSED`: scheduled import found no matching file and missing-batch recording was enabled.

Duplicate `student_id` rows are resolved by keeping the last valid row in the file and recording
`CSV_IMPORT_DUPLICATE_ROWS`. Structurally invalid files are rejected before `students` is updated,
so registration can continue using the last successful student dataset.

Organizer report APIs:

```http
GET /api/admin/csv-imports
GET /api/admin/csv-imports/{batchId}
GET /api/admin/csv-imports/{batchId}/errors
```

All three endpoints require the `organizer` role. Student and check-in staff tokens receive
`403 AUTH_FORBIDDEN`.

## AI Summary PDF storage with MinIO

Workshop PDFs for AI Summary are stored in object storage. PostgreSQL stores only metadata such as
`object_key`, filename, content type, file size, upload status, and summary status.

Local Docker Compose starts a MinIO console at:

```text
http://localhost:9001
```

Demo credentials:

```text
username: minioadmin
password: minioadmin123
```

Default local bucket: `unihub-documents`

Backend storage configuration:

```env
APP_AI_SUMMARY_STORAGE_TYPE=minio
APP_AI_SUMMARY_STORAGE_BUCKET=unihub-documents
APP_AI_SUMMARY_STORAGE_ENDPOINT=http://minio:9000
APP_AI_SUMMARY_STORAGE_REGION=ap-southeast-1
APP_AI_SUMMARY_STORAGE_ACCESS_KEY=minioadmin
APP_AI_SUMMARY_STORAGE_SECRET_KEY=minioadmin123
```

Worker retry configuration:

```env
APP_AI_SUMMARY_WORKER_MAX_RETRIES=3
APP_AI_SUMMARY_WORKER_RETRY_INITIAL_DELAY_MS=5000
APP_AI_SUMMARY_WORKER_RETRY_MULTIPLIER=3
APP_AI_SUMMARY_WORKER_PROCESSING_TIMEOUT_MS=120000
```

Use `POST /api/admin/workshops/{workshopId}/documents` to upload a PDF. The upload API writes the
PDF to MinIO before creating `workshop_documents` and `ai_summaries` rows. If storage is unavailable,
the API returns `AI_STORAGE_UNAVAILABLE` and does not create a fake successful document.

The worker reads the PDF from MinIO, extracts text, calls Gemini, and marks the summary as
`COMPLETED` or `FAILED`. Temporary MinIO read failures are retried with exponential backoff and
recorded in `retry_count` / `next_retry_at`; stuck `PROCESSING` jobs are recovered after the
configured timeout.

Do not use the demo MinIO credentials in production, and never commit real object storage secrets or
uploaded PDF files.
