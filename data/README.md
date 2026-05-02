# UniHub Workshop Database

This folder contains runnable PostgreSQL fixtures derived from the project blueprint:

- `schema.sql`: full schema, constraints, indexes, and concurrency notes.
- `seed.sql`: demo users, RBAC roles, students, rooms, workshops, registrations, payments, check-ins, notifications, imports, and AI material rows.
- `sample_students.csv`: CSV import sample with valid rows, duplicates, and invalid rows.

## Run Locally

Create a database and apply the schema:

```bash
createdb unihub_workshop
psql -d unihub_workshop -f data/schema.sql
```

Load demo data:

```bash
psql -d unihub_workshop -f data/seed.sql
```

If you use Docker:

```bash
docker run --name unihub-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=unihub_workshop -p 5432:5432 -d postgres:16
psql "postgres://postgres:postgres@localhost:5432/unihub_workshop" -f data/schema.sql
psql "postgres://postgres:postgres@localhost:5432/unihub_workshop" -f data/seed.sql
```

## Seat Booking Rule

For registration endpoints, wrap seat allocation in one transaction and lock the target `workshop_sessions` row:

```sql
BEGIN;
SELECT *
FROM workshop_sessions
WHERE id = :session_id AND status = 'OPEN'
FOR UPDATE;

-- Check seats_confirmed + seats_reserved < seat_capacity.
-- Insert registration.
-- Increment seats_confirmed for free registrations.
-- Increment seats_reserved for paid pending registrations.
COMMIT;
```

The schema also enforces:

- no active duplicate registration per `workshop_id + user_id`;
- no active duplicate registration per `session_id + student_id`;
- `seats_confirmed + seats_reserved <= seat_capacity`;
- unique payment `idempotency_key`;
- unique check-in per accepted registration;
- unique offline `sync_event_id`.

## CSV Import Flow

`sample_students.csv` matches the import columns:

```text
student_code,full_name,email,faculty,major,class_name,status
```

Expected worker behavior:

1. Create a `student_imports` row with `PROCESSING`.
2. Parse and validate required fields, email format, and allowed statuses.
3. Detect duplicate `student_code` values inside the same file.
4. Upsert valid rows into `students` by `student_code`.
5. Write invalid rows to `student_import_errors`.
6. Mark the batch `SUCCESS`, `PARTIAL_SUCCESS`, or `FAILED`.

Invalid rows must not delete or corrupt existing valid student records. If the newest nightly file fails, registration can continue using the latest valid student data.

## Offline Check-in

The mobile app stores provisional offline scans in local SQLite using a stable `sync_event_id`. On sync, the backend validates the QR ticket and registration, then writes to `checkins`. Retried sync calls reuse the same `sync_event_id`, so duplicates are returned safely instead of creating a second attendance record.
