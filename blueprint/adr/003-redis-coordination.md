# ADR-003: Use Redis for Volatile Coordination, Not as Primary Truth

## Status

Accepted

## Context

UniHub Workshop needs several low-latency coordination mechanisms:

- rate limiting during registration traffic spikes,
- short-lived idempotency state for repeated client requests,
- optional caching for read-heavy data,
- worker queue coordination,
- temporary locks or retry coordination for background jobs.

These mechanisms are important for performance and resilience, but they should not replace durable business records. Core business data such as seat reservations, registrations, payments, QR tickets, and check-in records must remain consistent and recoverable.

## Decision

Use Redis for volatile coordination only.

Redis is used for:

- token bucket or sliding-window rate limiting,
- short-lived idempotency cache,
- optional read caching,
- worker queue coordination,
- temporary job locks,
- retry counters,
- short-lived processing state.

PostgreSQL remains the source of truth for:

- users and roles,
- students,
- workshops and sessions,
- seat reservation and registration state,
- payment intents and payment status,
- QR tickets,
- check-in records,
- notification records,
- CSV import batches,
- AI summary status and result,
- audit logs.

Redis must not be used as the primary store for confirmed registrations, available seats, payment state, or check-in records.

## Rationale

Redis is well-suited for fast, ephemeral coordination. It can handle high-frequency operations such as rate limit checks and idempotency lookups with lower latency than a relational database.

This is useful during traffic spikes, especially when many students try to access registration endpoints at the same time. Redis can absorb coordination traffic without adding unnecessary write pressure to PostgreSQL.

However, Redis data is volatile and may be evicted, expired, restarted, or cleared. Therefore, any data that defines the real business state must be stored in PostgreSQL. This separation allows Redis to improve performance without risking the correctness of seat allocation, payment, or check-in data.

## Consequences

Positive consequences:

- Rate limiting can be performed with low latency.
- Short-lived idempotency checks can reduce duplicated work during client retries.
- Read-heavy endpoints can optionally use cache to reduce database load.
- Background workers can coordinate jobs, retries, and temporary locks more efficiently.
- PostgreSQL is protected from some high-frequency coordination writes.

Trade-offs and risks:

- Redis adds another infrastructure dependency.
- Redis must be monitored and configured carefully.
- If Redis is unavailable, rate limiting, caching, idempotency cache, and worker coordination may degrade.
- The system must define fallback behavior when Redis fails.
- Developers must avoid storing durable business state only in Redis.

## Failure and Degraded Behavior

If Redis becomes unavailable:

- Browsing should continue by reading directly from PostgreSQL.
- Registration endpoints may fail closed or use stricter fallback limits to protect seat allocation.
- Short-lived idempotency cache may be unavailable, but PostgreSQL uniqueness constraints must still prevent duplicate payment intents and registrations.
- Background jobs may pause or retry later until Redis is restored.
- No confirmed registration, payment, or check-in data should be lost because durable state is stored in PostgreSQL.

## Alternatives Considered

### PostgreSQL-only coordination

Using only PostgreSQL would simplify the infrastructure stack. However, rate limiting, short-lived idempotency checks, caching, and high-frequency worker coordination would create unnecessary load and contention on PostgreSQL, especially during registration spikes.

### Redis as the primary store

Using Redis as the primary store was rejected because Redis is not appropriate as the only source of truth for seat allocation, payment status, or check-in records. Losing Redis data could result in inconsistent or unrecoverable business state.

### In-process memory

In-process memory was rejected because it does not work correctly across multiple backend instances or worker processes. Rate limits, idempotency state, and job coordination must be shared across the system, not isolated inside one process.
