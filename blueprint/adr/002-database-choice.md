# ADR-002: Use PostgreSQL as the System of Record

## Status

Accepted

## Context

UniHub Workshop has several types of data with different consistency and storage requirements.

Transactional business data such as users, roles, workshops, workshop sessions, registrations, payments, QR tickets, check-in records, CSV import batches, and audit logs must be durable and consistent. The most critical correctness problem is seat allocation: the system must ensure that confirmed registrations never exceed the capacity of a workshop session, even when many students register at the same time.

The system also needs volatile coordination data for rate limiting, short-lived idempotency, optional caching, worker coordination, and retry management. In addition, organizer-uploaded PDF files for AI Summary are binary objects and should not be stored directly inside the relational database.

## Decision

Use PostgreSQL as the system of record for all transactional business data.

PostgreSQL stores:

- users, roles, and permissions,
- students imported from CSV,
- workshops and workshop sessions,
- registrations and seat reservation state,
- payment intents and payment status,
- QR tickets,
- check-in records,
- notification records,
- AI summary status and result,
- CSV import batches and row-level errors,
- audit logs.

Use Redis only for volatile coordination concerns such as:

- rate limiting,
- short-lived idempotency cache,
- optional caching,
- worker queue coordination,
- temporary locks or retry coordination.

Redis must not be treated as the source of truth for seat reservation, registration state, payment state, or check-in records.

Use object storage for organizer-uploaded PDF files. PostgreSQL stores only file metadata, such as object key, original filename, content type, file size, upload status, and processing status.

## Rationale

PostgreSQL is well-suited to UniHub Workshop because it supports transactions, row-level locking, unique constraints, indexes, and relational queries. These features are important for enforcing rules such as:

- a student cannot register for the same workshop session more than once,
- confirmed registrations must not exceed session capacity,
- a registration can have at most one QR ticket,
- a registration can have at most one successful check-in record,
- payment idempotency keys must be unique,
- import batches and row-level CSV errors must be auditable.

Redis is useful for low-latency coordination, but its data is temporary and reconstructable. Keeping PostgreSQL as the source of truth prevents inconsistent business state if Redis is cleared, restarted, or unavailable.

Object storage is more appropriate than PostgreSQL for PDF files because PDFs are binary objects that can be large. Storing files separately keeps the database smaller, simplifies backup strategy, and allows background workers to read files independently from the Backend API.

## Consequences

Positive consequences:

- Strong consistency can be enforced for registration, payment, and check-in data.
- Database constraints help protect important business rules.
- PostgreSQL queries support admin statistics, audit views, and reporting.
- Redis can absorb high-frequency coordination tasks without becoming the source of truth.
- Uploaded PDF files are stored separately from transactional data.
- Background workers can process PDFs through object storage without loading large files from the database.

Trade-offs and risks:

- Schema modeling requires more upfront design than document storage.
- Database migrations must be managed carefully.
- High-contention sessions may create row-level lock contention during registration spikes.
- Redis introduces an additional infrastructure dependency.
- Object storage introduces another storage component that must be configured and backed up.

## Alternatives Considered

### NoSQL-only storage

NoSQL-only storage was rejected because strong transactional seat allocation, uniqueness rules, and relational reporting are harder to guarantee. The system needs reliable constraints for registration, payment, and check-in correctness.

### Redis as the primary seat counter

Using Redis as the primary source of seat availability was rejected because Redis data is volatile and would require additional reconciliation with durable registration records. It may be useful for caching or coordination, but PostgreSQL must remain the source of truth.

### Store PDF files directly in PostgreSQL

Storing uploaded PDFs directly in PostgreSQL was rejected because it would increase database size, complicate backups, and make background file processing less flexible. Object storage is a better fit for binary files.

### Local filesystem storage only

Local filesystem storage was considered for simple local development, but it is less suitable as the main design because backend and worker processes may run separately. Object storage provides a cleaner abstraction and can be implemented locally with MinIO.
