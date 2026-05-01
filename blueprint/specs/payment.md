# Feature Spec: Paid Registration and Payment Processing

## Description

The Paid Registration and Payment Processing feature manages payment intent creation, external payment gateway interaction, callback/webhook reconciliation, timeout handling, and double-charge prevention for paid workshop registrations.

This feature is responsible for payment-related state transitions only. Seat reservation and registration creation are coordinated with the Registration feature. A paid registration starts in `PENDING_PAYMENT` state and becomes `CONFIRMED` only after a verified successful payment.

Payment processing must be resilient:

- Client retries must not create duplicated payment intents.
- Gateway callbacks may be duplicated and must be handled idempotently.
- Gateway timeout must not leave the system in an unrecoverable state.
- Payment gateway failure must not block workshop browsing or free registration.
- The database transaction must not stay open while calling the external payment gateway.

Actors involved:

| Actor               | Description                                                                        |
| ------------------- | ---------------------------------------------------------------------------------- |
| Student             | Initiates paid registration and completes payment through the gateway              |
| Backend API         | Creates local payment intents, enforces idempotency, and returns payment URL/token |
| Payment Gateway     | Processes the actual payment and sends callback/webhook events                     |
| Payment Worker      | Handles callbacks, reconciliation, retry, and timeout cleanup                      |
| PostgreSQL          | Stores payment intents, registration states, QR tickets, and audit logs            |
| Redis               | Supports short-lived idempotency cache and circuit breaker state if implemented    |
| Notification Worker | Sends confirmation or payment failure notifications asynchronously                 |
| System Operator     | Optional role for payment reconciliation and troubleshooting                       |

Data involved:

- `payment_intents`
- `registrations`
- `workshop_sessions`
- `qr_tickets`
- `notifications`
- `audit_logs`

Detailed schema, fields, constraints, and indexes are documented in [`../database.md`](../database.md).

---

## Main Flow

### Main Flow 1: Create Payment Intent for Pending Registration

1. Student starts paid registration from the web app.
2. Registration flow creates a local `PENDING_PAYMENT` registration and a local `payment_intents` record with status `PENDING_GATEWAY`.
3. Backend commits the database transaction before calling the external gateway.
4. Backend checks whether the payment circuit breaker is closed.
5. Backend calls the payment gateway through a `PaymentProvider` adapter.
6. Payment gateway returns a gateway reference and payment URL/token.
7. Backend updates the local `payment_intents` record with the gateway reference and status `PENDING_PAYMENT`.
8. Backend returns the payment URL/token to the student.

Important rule: the database transaction that creates the pending registration and local payment intent must not remain open while calling the external payment gateway.

```mermaid
sequenceDiagram
    participant S as Student
    participant API as Backend API
    participant DB as PostgreSQL
    participant Redis as Redis
    participant P as Payment Gateway

    S->>API: POST /api/registrations/paid + idempotencyKey
    API->>Redis: Check rate limit and idempotency
    API->>DB: Begin transaction
    API->>DB: Create registration=PENDING_PAYMENT
    API->>DB: Reserve seat
    API->>DB: Create payment_intent=PENDING_GATEWAY
    API->>DB: Commit transaction
    API->>Redis: Check payment circuit breaker
    API->>P: Create gateway payment intent
    P-->>API: gatewayRef + paymentUrl
    API->>DB: Update payment_intent=PENDING_PAYMENT
    API-->>S: paymentIntentId + paymentUrl
```

### Main Flow 2: Student Completes Payment

1. Student is redirected to the payment gateway or opens the gateway payment screen.
2. Student completes payment.
3. Payment gateway records payment success or failure.
4. Gateway sends callback/webhook to the backend.
5. The student may also return to the web app, but the backend must rely on verified callback/webhook or reconciliation for final state.

```mermaid
sequenceDiagram
    participant S as Student
    participant P as Payment Gateway
    participant Web as Web App
    participant API as Backend API

    S->>P: Complete payment
    P-->>API: Webhook/callback
    P-->>Web: Redirect user back to result page
    Web->>API: GET payment/registration status
    API-->>Web: Current verified status
```

### Main Flow 3: Payment Success Callback Confirms Registration

1. Payment gateway sends a success callback/webhook.
2. Backend or Payment Worker verifies callback signature or shared secret.
3. Worker finds the local `payment_intents` record by gateway reference.
4. Worker checks whether the callback was already processed.
5. Worker starts a database transaction.
6. Worker marks payment intent as `SUCCEEDED`.
7. Worker changes registration from `PENDING_PAYMENT` to `CONFIRMED`.
8. Worker converts the reserved seat into a confirmed seat.
9. Worker creates a QR ticket for the confirmed registration.
10. Worker commits the transaction.
11. Worker queues confirmation notifications asynchronously.
12. Worker writes audit log `PAYMENT_SUCCEEDED`.

```mermaid
sequenceDiagram
    participant P as Payment Gateway
    participant W as Payment Worker
    participant DB as PostgreSQL
    participant N as Notification Worker

    P->>W: Payment success webhook
    W->>W: Verify callback signature
    W->>DB: Find payment_intent by gatewayRef
    W->>DB: Begin transaction
    W->>DB: Deduplicate callback
    W->>DB: Mark payment_intent=SUCCEEDED
    W->>DB: Registration PENDING_PAYMENT -> CONFIRMED
    W->>DB: Convert reserved seat to confirmed seat
    W->>DB: Insert QR ticket
    W->>DB: Write PAYMENT_SUCCEEDED audit log
    W->>DB: Commit transaction
    W->>N: Queue confirmation notification
```

### Main Flow 4: Payment Failure Callback

1. Payment gateway sends a failure callback/webhook.
2. Backend or Payment Worker verifies callback signature.
3. Worker finds the local `payment_intents` record.
4. Worker starts a database transaction.
5. Worker marks payment intent as `FAILED`.
6. Worker marks registration as `PAYMENT_FAILED` or keeps it pending until expiration depending on policy.
7. Worker releases the reserved seat if the registration is finalized as failed.
8. Worker commits the transaction.
9. Worker queues failure notification if needed.
10. Worker writes audit log `PAYMENT_FAILED`.

```mermaid
sequenceDiagram
    participant P as Payment Gateway
    participant W as Payment Worker
    participant DB as PostgreSQL
    participant N as Notification Worker

    P->>W: Payment failure webhook
    W->>W: Verify callback signature
    W->>DB: Begin transaction
    W->>DB: Mark payment_intent=FAILED
    W->>DB: Mark registration=PAYMENT_FAILED
    W->>DB: Release reserved seat
    W->>DB: Write PAYMENT_FAILED audit log
    W->>DB: Commit transaction
    W->>N: Queue failure notification
```

### Main Flow 5: Gateway Timeout and Reconciliation

1. Backend calls the payment gateway to create a payment intent.
2. Gateway request times out before a gateway reference is returned.
3. Backend keeps the local `payment_intents` record as `PENDING_GATEWAY` or `PENDING_RECONCILIATION`.
4. Backend returns a pending response or temporary unavailable response depending on policy.
5. Payment Worker later attempts reconciliation by querying the gateway if possible.
6. If payment intent is found, worker updates gateway reference and status.
7. If no gateway intent exists and expiration passes, worker expires the registration and releases the reserved seat.

```mermaid
sequenceDiagram
    participant API as Backend API
    participant P as Payment Gateway
    participant W as Payment Worker
    participant DB as PostgreSQL

    API->>P: Create gateway payment intent
    P--xAPI: Timeout
    API->>DB: Mark payment_intent=PENDING_RECONCILIATION
    API-->>API: Return pending/unavailable response
    W->>P: Query gateway by idempotency/reference if available
    P-->>W: Found / not found
    W->>DB: Update payment intent or expire reservation
```

### Main Flow 6: Expired Payment Cleanup

1. Payment Worker periodically finds expired payment intents or registrations in `PENDING_PAYMENT`.
2. Worker starts a database transaction.
3. Worker locks related payment, registration, and session rows.
4. Worker marks payment intent as `EXPIRED`.
5. Worker marks registration as `EXPIRED`.
6. Worker releases the reserved seat.
7. Worker commits the transaction.
8. Worker writes audit log `PAYMENT_EXPIRED`.

```mermaid
sequenceDiagram
    participant W as Payment Worker
    participant DB as PostgreSQL

    W->>DB: Find expired payment intents
    W->>DB: Begin transaction
    W->>DB: Lock payment, registration, session rows
    W->>DB: Mark payment_intent=EXPIRED
    W->>DB: Mark registration=EXPIRED
    W->>DB: Release reserved seat
    W->>DB: Write PAYMENT_EXPIRED audit log
    W->>DB: Commit transaction
```

---

## API Contract

### Create Payment Intent

```http
POST /api/payments/intents
```

Required role: `student`.

Request body:

```json
{
  "registrationId": "r-002",
  "idempotencyKey": "pay-req-456"
}
```

Success response:

```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pi-001",
    "registrationId": "r-002",
    "status": "PENDING_PAYMENT",
    "gatewayRef": "gw-abc",
    "paymentUrl": "https://gateway.example/pay/abc",
    "expiresAt": "2026-05-01T12:30:00Z"
  }
}
```

Rules:

- Student can only create payment intent for their own pending paid registration.
- Request must include an idempotency key.
- Repeating the same request with the same idempotency key must return the same payment intent result.
- Reusing the same idempotency key with different request data must be rejected.
- If the registration already has a valid payment intent, the API should return the existing one instead of creating another.

### Get Payment Status

```http
GET /api/payments/{paymentIntentId}/status
```

Required role: `student`.

Success response:

```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pi-001",
    "registrationId": "r-002",
    "status": "SUCCEEDED",
    "registrationStatus": "CONFIRMED",
    "qrTicketId": "qr-001"
  }
}
```

Rules:

- Student can only view payment status for their own registration/payment.
- Confirmed payment status should reflect verified backend state, not only client redirect status.

### Payment Callback / Webhook

```http
POST /api/payments/webhook
```

Required role: Gateway signature or shared secret.

Request body example:

```json
{
  "gatewayRef": "gw-abc",
  "paymentStatus": "SUCCEEDED",
  "amount": 100000,
  "currency": "VND",
  "paidAt": "2026-05-01T12:15:00Z",
  "signature": "gateway-signature"
}
```

Success response:

```json
{
  "success": true,
  "data": {
    "received": true
  }
}
```

Rules:

- Callback must be authenticated using gateway signature, shared secret, or equivalent verification.
- Duplicate callback must be accepted safely and handled idempotently.
- Invalid callback signature must be rejected.
- Callback amount and currency must match the local payment intent.
- Callback must not trust client-side redirect as proof of payment.

### Reconcile Payment

```http
POST /api/admin/payments/{paymentIntentId}/reconcile
```

Required role: `system_operator`.

Success response:

```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pi-001",
    "status": "PENDING_RECONCILIATION",
    "message": "Payment reconciliation has been queued."
  }
}
```

Rules:

- This endpoint is optional.
- Only `system_operator` can manually trigger reconciliation.
- Reconciliation must use gateway verification, not user-provided proof.

---

## Authorization Rules

| Capability                                 | Student | Organizer | Check-in Staff | System Operator                        |
| ------------------------------------------ | ------- | --------- | -------------- | -------------------------------------- |
| Create payment intent for own registration | Yes     | No        | No             | No                                     |
| View own payment status                    | Yes     | No        | No             | No                                     |
| Receive gateway callback                   | No      | No        | No             | No, system-to-system only              |
| Manually reconcile payment                 | No      | No        | No             | Yes, if enabled                        |
| Override payment status                    | No      | No        | No             | Yes, if explicitly enabled and audited |

Example endpoint policies:

| Method | Endpoint                                          | Required role                   | Purpose                          |
| ------ | ------------------------------------------------- | ------------------------------- | -------------------------------- |
| POST   | `/api/payments/intents`                           | `student`                       | Create or reuse a payment intent |
| GET    | `/api/payments/{paymentIntentId}/status`          | `student`                       | View own payment status          |
| POST   | `/api/payments/webhook`                           | Gateway signature/shared secret | Receive gateway callback         |
| POST   | `/api/admin/payments/{paymentIntentId}/reconcile` | `system_operator`               | Optional manual reconciliation   |

---

## Error Scenarios

| Scenario                                        | System Behavior                                       | HTTP Status            | Error Code                           |
| ----------------------------------------------- | ----------------------------------------------------- | ---------------------- | ------------------------------------ |
| Missing or invalid access token                 | Reject request                                        | `401`                  | `AUTH_TOKEN_INVALID`                 |
| User does not have `student` role               | Reject request                                        | `403`                  | `AUTH_FORBIDDEN`                     |
| Registration not found                          | Reject request                                        | `404`                  | `PAYMENT_REGISTRATION_NOT_FOUND`     |
| Registration belongs to another student         | Reject request                                        | `403`                  | `PAYMENT_ACCESS_DENIED`              |
| Registration is not paid session                | Reject request                                        | `400`                  | `PAYMENT_NOT_REQUIRED`               |
| Registration is not `PENDING_PAYMENT`           | Reject or return current state                        | `409`                  | `PAYMENT_INVALID_REGISTRATION_STATE` |
| Missing idempotency key                         | Reject request                                        | `400`                  | `PAYMENT_IDEMPOTENCY_KEY_REQUIRED`   |
| Same idempotency key reused with same data      | Return existing payment intent                        | `200`                  | `PAYMENT_IDEMPOTENT_REPLAY`          |
| Same idempotency key reused with different data | Reject request                                        | `409`                  | `PAYMENT_IDEMPOTENCY_KEY_CONFLICT`   |
| Circuit breaker open                            | Reject new paid attempts quickly                      | `503`                  | `PAYMENT_GATEWAY_UNAVAILABLE`        |
| Gateway timeout before response                 | Keep registration pending and schedule reconciliation | `202`                  | `PAYMENT_PENDING_RECONCILIATION`     |
| Gateway returns failure during intent creation  | Mark intent failed or return error                    | `502`                  | `PAYMENT_GATEWAY_CREATE_FAILED`      |
| Invalid callback signature                      | Reject callback                                       | `401`                  | `PAYMENT_INVALID_SIGNATURE`          |
| Callback gateway reference not found            | Store for investigation or reject                     | `404`                  | `PAYMENT_GATEWAY_REF_NOT_FOUND`      |
| Callback amount mismatch                        | Reject or flag for reconciliation                     | `409`                  | `PAYMENT_AMOUNT_MISMATCH`            |
| Callback currency mismatch                      | Reject or flag for reconciliation                     | `409`                  | `PAYMENT_CURRENCY_MISMATCH`          |
| Duplicate callback                              | Return success and do not repeat state transition     | `200`                  | `PAYMENT_DUPLICATE_CALLBACK`         |
| Student closes browser before redirect          | Worker still finalizes via callback                   | `200` for status check | `PAYMENT_ASYNC_FINALIZED`            |
| Payment expires before completion               | Mark payment and registration expired, release seat   | `409`                  | `PAYMENT_EXPIRED`                    |
| Database failure during confirmation            | Retry safely; do not duplicate confirmation           | `500`                  | `PAYMENT_CONFIRMATION_FAILED`        |

---

## Constraints

### Business Constraints

- Paid registration must start as `PENDING_PAYMENT`.
- A registration becomes `CONFIRMED` only after verified successful payment.
- QR ticket must not be created before payment success.
- Failed or expired payment must not create a valid QR ticket.
- Payment gateway failure must not block workshop browsing or free registration.
- Student closing the browser must not prevent backend finalization if gateway callback arrives.
- Manual payment override, if implemented, must be restricted to `system_operator` and fully audited.

### Idempotency and Double-Charge Constraints

- Every payment intent creation request must include an idempotency key.
- `payment_intents.idempotency_key` must be unique.
- Same idempotency key with same request data must return the same payment intent.
- Same idempotency key with different request data must be rejected.
- Gateway callback processing must be idempotent.
- Duplicate callback must not create duplicate QR tickets.
- Duplicate callback must not increment confirmed seat count more than once.
- One successful payment must confirm at most one registration.

### Consistency Constraints

- PostgreSQL is the source of truth for payment and registration state.
- Payment success must atomically update payment intent, registration state, seat counters, and QR ticket.
- Payment failure or expiration must atomically update payment intent, registration state, and reserved seat availability.
- The database transaction must not stay open while calling the external payment gateway.
- External gateway status must be mapped to internal payment statuses consistently.
- Callback amount and currency must match the local payment intent.

### Resilience Constraints

- Payment provider calls must go through a `PaymentProvider` adapter.
- Circuit breaker should prevent repeated slow/failing calls to the gateway.
- Timeout during gateway intent creation should move the intent to pending reconciliation or failed state according to policy.
- Reconciliation should be performed by a worker.
- Payment provider outage should degrade only paid registration.
- Free registration and workshop browsing should continue during payment incidents.

### Data Constraints

- `payment_intents.registration_id` must reference a valid registration.
- `payment_intents.idempotency_key` must be unique.
- `payment_intents.gateway_ref` should be unique when present.
- `qr_tickets.registration_id` must be unique.
- Detailed schema and database constraints are documented in [`../database.md`](../database.md).

### Authorization Constraints

- Student can create payment intent only for their own pending paid registration.
- Webhook endpoint must be protected by gateway signature, shared secret, or equivalent verification.
- System operator reconciliation endpoints must be protected by backend RBAC.
- Organizer and check-in staff cannot create payment intents for students.
- Frontend payment result page must not be treated as proof of payment.

### Audit Constraints

The system should write audit logs for:

| Action                             | Notes                             |
| ---------------------------------- | --------------------------------- |
| `PAYMENT_INTENT_CREATED`           | Local payment intent created      |
| `PAYMENT_GATEWAY_INTENT_CREATED`   | Gateway reference created         |
| `PAYMENT_SUCCEEDED`                | Verified payment success          |
| `PAYMENT_FAILED`                   | Verified payment failure          |
| `PAYMENT_EXPIRED`                  | Payment expired and seat released |
| `PAYMENT_RECONCILIATION_STARTED`   | Reconciliation started            |
| `PAYMENT_RECONCILIATION_COMPLETED` | Reconciliation completed          |
| `PAYMENT_CALLBACK_REJECTED`        | Invalid callback rejected         |
| `PAYMENT_MANUAL_OVERRIDE`          | Manual correction, if enabled     |

Audit payload must not include raw payment secrets, gateway signing secrets, full card data, or sensitive credentials.

---

## Acceptance Criteria

### Payment Intent Creation

- Student can create a payment intent for their own pending paid registration.
- Creating a payment intent returns payment URL/token and expiration time.
- Repeating the same request with the same idempotency key returns the same payment intent.
- Reusing the same idempotency key with different request data is rejected.
- Payment gateway intent creation does not happen inside an open database transaction.

### Payment Success

- Verified payment success changes payment intent to `SUCCEEDED`.
- Verified payment success changes registration to `CONFIRMED`.
- Verified payment success creates one QR ticket.
- Verified payment success queues confirmation notification.
- Duplicate success callback does not duplicate QR ticket or confirmed seat count.

### Payment Failure and Expiration

- Payment failure marks payment intent as `FAILED`.
- Failed payment does not create a QR ticket.
- Expired payment marks registration as `EXPIRED`.
- Expired payment releases reserved seat.
- A student can start a new registration/payment flow after expiration if seats are available.

### Callback and Reconciliation

- Callback signature is verified before processing.
- Invalid callback signature is rejected.
- Amount and currency mismatch are rejected or flagged for reconciliation.
- Duplicate callback returns success but does not repeat state transition.
- Gateway timeout creates pending reconciliation or failed state according to policy.
- Worker can reconcile pending payments without user interaction.

### Failure Isolation

- Payment gateway outage does not break workshop browsing.
- Payment gateway outage does not break free registration.
- Circuit breaker rejects new paid attempts quickly during repeated gateway failures.
- Student closing browser does not prevent backend finalization if callback arrives.
- Notification failure does not roll back payment confirmation.

### Authorization and Audit

- Student cannot create payment intent for another student's registration.
- Organizer and check-in staff cannot create payment intents.
- Webhook endpoint accepts only verified gateway callbacks.
- Payment state changes are auditable.
- Manual reconciliation or override, if enabled, is restricted to `system_operator` and audited.

---

## Implementation Notes

Recommended Java package placement:

```text
src/main/java/com/unihub/
├── presentation/
│   └── controller/payment/
│       └── PaymentController.java
├── application/
│   └── payment/
│       ├── PaymentCommandService.java
│       ├── PaymentQueryService.java
│       ├── CreatePaymentIntentCommand.java
│       ├── HandlePaymentCallbackCommand.java
│       ├── ReconcilePaymentCommand.java
│       ├── PaymentProvider.java
│       └── PaymentEventPublisher.java
├── domain/
│   ├── payment/
│   │   ├── PaymentIntent.java
│   │   ├── PaymentStatus.java
│   │   ├── PaymentRepository.java
│   │   ├── PaymentPolicy.java
│   │   └── PaymentErrorCode.java
│   ├── registration/
│   │   ├── Registration.java
│   │   └── RegistrationRepository.java
│   └── qrticket/
│       ├── QrTicket.java
│       └── QrTicketGenerator.java
└── infrastructure/
    ├── persistence/
    │   ├── payment/
    │   │   └── PaymentJpaRepository.java
    │   ├── registration/
    │   │   └── RegistrationJpaRepository.java
    │   └── qrticket/
    │       └── QrTicketJpaRepository.java
    ├── payment/
    │   ├── MockPaymentProvider.java
    │   ├── SandboxPaymentProvider.java
    │   └── PaymentWebhookVerifier.java
    └── redis/
        ├── PaymentIdempotencyStore.java
        └── PaymentCircuitBreakerStore.java
```

Recommended payment statuses:

```text
PENDING_GATEWAY
PENDING_PAYMENT
PENDING_RECONCILIATION
SUCCEEDED
FAILED
EXPIRED
CANCELED
```

Recommended registration statuses relevant to payment:

```text
PENDING_PAYMENT
CONFIRMED
PAYMENT_FAILED
EXPIRED
CANCELED
```

Layering rules:

- Controller receives HTTP DTOs and maps them to application commands.
- Application service coordinates payment use cases, transaction boundaries, callback handling, and reconciliation.
- Domain model protects payment state transitions and idempotency-related invariants.
- Infrastructure implements payment gateway adapter, webhook verification, persistence, Redis idempotency, and circuit breaker state.
- Controllers must not call payment gateway SDKs directly.
- Domain logic must not depend on provider-specific payment APIs.
- The database transaction must not remain open while calling the external payment gateway.
- PostgreSQL remains the source of truth for payment and registration state.
