# Feature Spec: Notification Delivery

## Description

This feature sends confirmation and update notifications through email and in-app channels. It must be extensible so future channels such as Telegram can be added without redesigning the registration core.

## Main Flow

1. A domain event occurs, such as `registration_confirmed`, `payment_succeeded`, `workshop_changed`, or `workshop_cancelled`.
2. Backend stores an outbox or queued notification job.
3. Notification worker loads the event and resolves channel templates.
4. Worker dispatches email and creates in-app notification records.
5. Delivery results are stored for audit and retry.

## Supported Notification Triggers

- Free registration confirmed
- Paid registration confirmed
- Workshop rescheduled
- Workshop room changed
- Workshop cancelled
- Payment result update

## Key Design Decisions

- **Choice:** Asynchronous notification worker with channel adapters.
  - **Why:** Notification sending is slow and failure-prone compared with core registration logic.
  - **Trade-offs / risks:** Delivery is eventually consistent rather than immediate within the same HTTP request.
  - **Alternatives not chosen:** Sending email inline during registration was rejected because it would make success depend on an external provider.

- **Choice:** Provider adapter abstraction.
  - **Why:** The brief explicitly asks for easy addition of future channels such as Telegram.
  - **Trade-offs / risks:** Slightly more code and testing effort up front.
  - **Alternatives not chosen:** Hard-coding one email service directly into business logic was rejected because it makes future extension expensive.

## Error Scenarios

- Email provider timeout: retry with backoff and keep registration confirmed.
- In-app notification insert fails temporarily: retry through the worker.
- Invalid email address: mark delivery failed, preserve the in-app notification, and expose the failure in admin logs if needed.
- Duplicate worker execution: deduplicate by notification job ID and recipient/channel pair.

## Constraints

- Notification failure must never roll back a confirmed registration.
- Templates should include workshop title, time, room, and QR access instructions where applicable.
- The system should keep per-channel delivery status for troubleshooting.
- Organizer-triggered mass updates should be processed in batches to avoid provider throttling.

## Acceptance Criteria

- Students receive confirmation after successful registration through both in-app and email channels.
- Workshop updates and cancellations trigger notifications to affected students.
- A notification provider outage delays delivery but does not break registration.
- The design allows a new channel adapter to be added without changing registration state logic.
