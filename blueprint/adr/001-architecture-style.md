# ADR-001: Use Modular Monolith with Background Workers

## Status

Accepted

## Context

UniHub Workshop includes multiple functional areas: authentication and RBAC, workshop management, registration, payment, notification, check-in, AI summary, CSV import, and audit logging.

The system must support reliable seat allocation, payment failure handling, offline check-in synchronization, and background processing while remaining realistic for a student course project. The team needs a backend architecture that is easy to build, test, deploy, and explain, without introducing unnecessary distributed-system complexity.

## Decision

Use one backend codebase and one deployable Java Spring Boot API application, internally split into domain modules. Long-running or failure-prone tasks are processed by background workers through asynchronous jobs.

The backend remains a modular monolith, while workers handle tasks such as:

- email and in-app notification delivery,
- AI summary generation from uploaded PDFs,
- nightly CSV import,
- payment reconciliation,
- expired reservation cleanup,
- offline check-in sync retry.

## Rationale

A modular monolith preserves separation of responsibilities without adding network-level complexity between internal modules. It allows the team to keep important transactional boundaries inside one process and one primary database, which is especially useful for seat allocation and registration consistency.

Background workers keep slow or unreliable operations outside the main request-response path. This improves responsiveness and prevents external dependencies such as payment gateways, email providers, AI providers, or CSV processing from directly blocking user-facing requests.

This approach is simpler to implement and operate than microservices, while still demonstrating clear module boundaries, asynchronous processing, and resilience patterns.

## Consequences

Positive consequences:

- The backend is easier to build, run, test, and deploy as one application.
- Transactional consistency is easier to manage than in a distributed microservice architecture.
- Domain modules keep responsibilities separated inside the codebase.
- Background workers isolate slow and failure-prone tasks from user-facing API requests.
- The architecture is easier to explain and demonstrate in a course project.

Trade-offs and risks:

- Clear module boundaries are required to avoid a tangled monolith.
- Independent scaling of individual modules is limited compared to microservices.
- If the backend application is down, many core features are unavailable.
- The team must avoid direct cross-module data access that bypasses application/domain boundaries.

## Alternatives Considered

### Microservices

Microservices allow independent deployment and scaling of services. However, they are too costly for this course project because they introduce service discovery, distributed tracing, deployment complexity, inter-service network failures, and cross-service consistency problems.

### Single-layer monolith without modules

A single-layer monolith is faster to start, but it becomes difficult to reason about access control, domain rules, payment state transitions, registration consistency, and future maintenance.

### Serverless-only architecture

A serverless-only architecture is attractive for burst traffic, but it is less suitable for this project because reliable seat allocation requires strong transactional consistency, local development should remain simple, and offline check-in synchronization still needs coordinated backend logic.
  