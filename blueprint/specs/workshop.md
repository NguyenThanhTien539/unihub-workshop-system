# Feature Spec: Workshop Management and Browsing

## Description

This feature manages workshop data for students and organizers. It covers public browsing, workshop detail display, remaining seat visibility, and organizer administration actions such as create, update, reschedule, room change, and cancellation.

## Main Flow

### Student browsing

1. Student opens the workshop list.
2. Backend returns sessions grouped by day with speaker, room, map, fee, and remaining seats.
3. Student opens a workshop detail page.
4. Backend returns full workshop information, AI summary if available, and registration status for that student.

### Organizer administration

1. Organizer creates or edits a workshop and one or more sessions.
2. Backend validates room availability, time range, and seat capacity.
3. Backend saves the change and records an audit log.
4. If a session changes materially, notification jobs are queued for affected students.

## Key Design Decisions

- **Choice:** Separate `workshops` from `workshop_sessions`.
  - **Why:** One workshop concept can have one or more scheduled sessions, and seats belong to a specific session.
  - **Trade-offs / risks:** The data model is slightly more complex than one flat table.
  - **Alternatives not chosen:** A single table was rejected because rescheduling and per-session capacity become harder to model cleanly.

- **Choice:** Remaining seats displayed from transactional counters, with optional short cache for read endpoints.
  - **Why:** Students need near-real-time seat visibility, but the source of truth must stay in PostgreSQL.
  - **Trade-offs / risks:** Very short-lived cache can show small lag under heavy load.
  - **Alternatives not chosen:** Fully cached seat counts were rejected because stale values would mislead users during registration spikes.

## Error Scenarios

- Organizer schedules a session in a room/time slot that overlaps another session: reject with validation error.
- Organizer reduces capacity below already confirmed registrations: reject the change.
- Organizer cancels a workshop with confirmed attendees: mark session as cancelled, preserve history, and queue notifications.
- AI summary not ready: detail page shows `summary pending` instead of failing the whole page.

## Constraints

- Workshop browsing must remain available even if payment, AI, or notification providers are down.
- Seat counts must never become negative.
- Room changes and schedule updates must be auditable.
- Cancelled workshops should remain visible in admin history even if hidden from normal student listing.

## Acceptance Criteria

- Students can browse workshops by day and view speaker, room, map, fee, and remaining seats.
- Organizers can create, edit, reschedule, and cancel workshops.
- Schedule conflicts are rejected before data is saved.
- Students see a clear cancelled status if a registered workshop session is cancelled.
- Changes that affect registered students queue notifications automatically.
