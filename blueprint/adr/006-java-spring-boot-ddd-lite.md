# ADR-006: Use Java Spring Boot with DDD-lite Layered Architecture

## Status

Accepted

## Context

UniHub Workshop requires a single deployable backend that still keeps business rules maintainable and separated by domain. The system contains several business-critical flows, including seat allocation, paid registration, payment idempotency, QR issuance, offline check-in synchronization, CSV import validation, and AI summary processing.

The team needs a backend structure that supports transaction safety, clear module boundaries, and testable business logic without introducing the operational complexity of microservices.

## Decision

Use Java Spring Boot for the backend and organize it as a DDD-lite layered modular monolith.

The backend is divided into four main layers:

- `presentation/`: controllers, request/response DTOs, validation, and global exception handling.
- `application/`: use case orchestration, transaction boundaries, command/query services, and provider/repository ports.
- `domain/`: aggregate roots, value objects, business rules, domain policies, repository contracts, and domain exceptions.
- `infrastructure/`: database repositories, Redis integration, JWT implementation, payment adapter, notification adapter, object storage adapter, AI adapter, and CSV integration.

## Rationale

Java Spring Boot provides mature support for dependency injection, REST APIs, validation, transaction management, security, and relational database integration. These capabilities fit the project because registration and payment flows require reliable transaction boundaries and consistency.

DDD-lite helps keep business rules close to the domain concepts they belong to. For example:

- seat capacity rules belong to the Workshop/Registration domain,
- payment state transitions belong to the Payment domain,
- duplicate check-in prevention belongs to the Check-in domain,
- CSV validation and import status belong to the CSV Import domain.

This structure avoids placing too much business logic in controllers or procedural service classes while still remaining simpler than full enterprise DDD or microservices.

## Consequences

Positive consequences:

- Business rules become easier to locate and test.
- Domain modules have clearer ownership.
- The backend remains deployable as one application.
- Transaction consistency is easier to manage than in a distributed architecture.
- Infrastructure details are isolated behind interfaces/adapters.

Trade-offs and risks:

- Requires consistent layering discipline.
- Adds more structure than a flat controller-service-repository approach.
- Developers must avoid leaking framework, HTTP, or database details into the domain layer.
- If applied too rigidly, DDD-lite can slow down simple CRUD features.

## Alternatives Considered

### Flat controller-service-repository architecture

This is simpler and faster to start, but business rules may gradually accumulate in service classes. This makes complex flows such as seat allocation, payment idempotency, and offline sync harder to maintain.

### Node.js/NestJS backend

NestJS is viable for modular backend development, but the team chose Java Spring Boot for mature transaction support, strong typing, validation, and familiarity.

### ASP.NET Core backend

ASP.NET Core is also viable, but the team selected Java Spring Boot to align with the team’s experience and ecosystem preference.

### Microservices architecture

Microservices were rejected because they introduce deployment, service discovery, distributed tracing, network failure handling, and cross-service consistency complexity that is unnecessary for the course project.
