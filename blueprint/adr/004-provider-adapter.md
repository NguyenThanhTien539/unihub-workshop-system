# ADR-004: Use Adapter Pattern for External Providers

## Status

Accepted

## Context

UniHub Workshop integrates with several external providers:

- payment gateway for paid workshop registration,
- notification provider for email and in-app notification delivery,
- AI model provider for PDF-based workshop summary generation,
- object storage provider for uploaded PDF files.

These providers can fail, change APIs, have different response formats, or require different credentials and retry behavior. The core business modules should not depend directly on provider-specific SDKs or HTTP APIs.

For example, the Registration and Payment modules should understand concepts such as `PaymentIntent`, `PaymentStatus`, and `PaymentCallback`, not provider-specific payloads. The AI Summary module should request a summary from an abstract AI provider, not depend directly on one vendor’s API shape.

## Decision

Use the Adapter Pattern for external provider integrations.

The application or domain layer defines provider-facing interfaces, also called ports. The infrastructure layer implements these interfaces using provider-specific adapters.

Examples:

- `PaymentProvider` interface with implementations such as `MockPaymentProvider` or `SandboxPaymentProvider`.
- `NotificationProvider` interface with implementations such as `EmailNotificationProvider` or future `TelegramNotificationProvider`.
- `AiSummaryProvider` interface with implementations such as `MockAiSummaryProvider` or `ExternalLlmSummaryProvider`.
- `ObjectStorageProvider` interface with implementations such as `MinioStorageProvider` or `S3StorageProvider`.

Background workers invoke these adapters for slow or failure-prone tasks such as notification delivery, AI summary generation, payment reconciliation, and retry handling.

## Rationale

Adapters isolate provider-specific details from core business logic. This keeps the domain and application modules focused on business concepts rather than external API formats.

This approach provides several benefits:

- External providers can be replaced with minimal changes to core modules.
- Tests can use mock adapters without calling real payment, email, storage, or AI services.
- Provider-specific error handling, retries, credentials, and response mapping are kept in infrastructure.
- Future notification channels such as Telegram can be added without changing the Notification module’s core logic.
- Payment and AI failures can be isolated and handled without blocking unrelated features.

Using background workers together with adapters prevents slow or unreliable provider calls from blocking user-facing API requests.

## Consequences

Positive consequences:

- Core business logic stays independent from provider-specific APIs.
- External integrations become easier to test with mock implementations.
- Provider replacement or fallback becomes easier.
- Notification extensibility is improved.
- Payment, notification, AI, and storage integration failures are easier to isolate.

Trade-offs and risks:

- More abstraction code is required.
- Adapter interfaces must be designed carefully and kept stable.
- Overly generic interfaces can hide provider-specific capabilities.
- Developers must avoid leaking provider-specific DTOs into application or domain layers.
- Error mapping must be consistent so provider failures produce meaningful application-level errors.

## Alternatives Considered

### Direct integration inside core modules

Direct integration is simpler initially because application services can call provider SDKs or HTTP APIs directly. However, this couples business logic to provider-specific APIs, makes testing harder, and creates ripple changes when a provider changes.

### Provider-specific logic in controllers

This was rejected because controllers should only handle HTTP input/output. Putting provider logic in controllers would mix presentation concerns with integration and business concerns.

### Separate microservice for each provider

This could isolate integrations strongly, but it adds deployment, network, tracing, and operational complexity that is unnecessary for the course project.
