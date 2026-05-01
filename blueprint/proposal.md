# UniHub Workshop — Project Proposal

## 1. Problem Statement

University A organizes an annual “Skills and Career Week”. The event lasts 5 days, with 8–12 workshops running in parallel each day across different rooms. At the current scale, the organizing team manages workshop registration using Google Forms and sends confirmation emails manually.

This process is no longer suitable because thousands of students may try to register within a few minutes after registration opens. The current approach creates several operational and technical risks:

- Google Forms cannot reliably prevent seat conflicts when many students register at the same time.
- Manual confirmation emails are slow, error-prone, and difficult to track.
- Paid workshops require a safer registration and payment flow because payment timeouts, duplicated retries, or delayed confirmations can cause disputes.
- Check-in at room entrances is difficult without QR-based validation.
- Some check-in areas may have unstable network connectivity, so staff need to continue check-in even when offline.
- The university’s existing Student Management System has no API, so student identity data can only be imported from nightly CSV exports.
- Uploaded PDF documents for workshops need to be processed automatically to generate useful summaries for students.
- The notification mechanism should support future channels such as Telegram without requiring a large redesign.

Therefore, the project needs a system that digitizes the workshop lifecycle, from browsing and registration to payment, confirmation, notification, and check-in, while remaining realistic for a student course project.

---

## 2. Project Goals

The UniHub Workshop system aims to:

- Digitize workshop browsing, registration, confirmation, and attendance tracking.
- Support both free and paid workshops within one consistent registration flow.
- Prevent overbooking even when many students compete for a small number of seats.
- Handle a traffic spike of approximately 12,000 students in the first 10 minutes after registration opens, with most traffic concentrated in the first 3 minutes.
- Generate a QR code only after a registration is successfully confirmed.
- Support online and offline check-in for room entrance staff.
- Send registration and schedule notifications through email and in-app channels.
- Design the notification mechanism so future channels such as Telegram can be added without major redesign.
- Allow organizers to upload PDF workshop documents and generate AI-based summaries.
- Import student data from nightly CSV files exported by the legacy Student Management System.
- Apply strict access control for students, organizers, and check-in staff.
- Keep browsing and other non-payment features available even when the payment gateway is unstable.
- Provide clear status tracking and reports for important operations such as registration, payment, CSV import, notification delivery, and check-in synchronization.

---

## 3. Success Criteria

The project is considered successful if:

- Students can browse workshops and view workshop details, including speaker, room, schedule, fee, and remaining seats.
- Students can register for free workshops and receive a QR code after confirmation.
- Students can register for paid workshops through a safe payment flow.
- The system never confirms more registrations than the capacity of a workshop session.
- A student cannot register for the same workshop session more than once.
- The system can reduce backend overload during traffic spikes using request control mechanisms.
- Payment retries or duplicated payment callbacks do not create duplicated successful payments.
- If the payment gateway is unavailable, students can still browse workshops and view event information.
- Check-in staff can scan QR codes when online.
- Check-in staff can record check-ins while offline and synchronize them later without data loss.
- Invalid or duplicated CSV rows do not interrupt the running system.
- Students, organizers, and check-in staff can only access functions allowed by their roles.
- Organizers can upload PDF files and view generated AI summaries or processing status.
- Students receive confirmation notifications through in-app and email channels after successful registration.
- The notification design allows a future channel such as Telegram to be added through a new provider adapter without changing registration or payment business logic.
- The system includes enough seed data and documentation for evaluators to run and test the project.

---

## 4. User Groups and Needs

| User Group     | Main Needs                                                                                                                                                   | Important Quality Attributes                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Student        | Browse workshop schedule, view speaker and room details, register, pay if needed, receive QR code, receive confirmation notifications, check in at the event | Fast response time, fairness, accurate remaining seats, clear registration status, reliable confirmation |
| Organizer      | Create and update workshops, cancel sessions, view registration statistics, upload PDFs for AI summary, view CSV import reports                              | Strong access control, clear status tracking, reliable background processing, easy content management    |
| Check-in Staff | Scan QR codes at room entrances, verify attendance, continue working when network is unstable                                                                | Offline capability, fast validation, duplicate detection, reliable synchronization                       |

---

## 5. Scope

### 5.1 In Scope

The project includes the following features:

- Student login and authentication.
- Workshop listing, search, and filtering.
- Workshop detail page with speaker, room, room map, schedule, fee, and remaining seats.
- Free workshop registration.
- Paid workshop registration.
- QR code generation after successful registration confirmation.
- Email and in-app notification after registration.
- Notification design that supports adding future channels such as Telegram through a provider adapter.
- Organizer workshop management.
- Workshop creation, update, cancellation, and statistics viewing.
- Role-based access control for students, organizers, and check-in staff.
- Online QR check-in.
- Offline check-in and later synchronization.
- PDF upload by organizers.
- AI-generated workshop summary.
- Nightly CSV import from the legacy Student Management System.
- CSV import reports for organizers.
- Rate limiting or equivalent request control for spike protection.
- Payment failure isolation so that payment problems do not affect unrelated features.
- Idempotent handling for registration and payment-related retries.
- Overbooking protection.

### 5.2 Out of Scope / Simplified for Course Project

The following items are outside the scope or may be simplified:

- Public student self-registration is not required for the MVP. Student accounts may be prepared through seed data or controlled setup.
- Real production payment settlement may be replaced with a mock payment gateway or a sandbox provider.
- Real university Single Sign-On may be replaced with email/password login and JWT-based authentication.
- Production-grade cloud infrastructure is not required; the system may run locally using Docker services.
- AI provider integration may use either a real AI API or a local/mock AI adapter for course demonstration, but the upload flow, background processing, status tracking, and summary storage should be implemented as real application logic.
- Advanced analytics, recommendation, and personalization are not required.
- Real push notification infrastructure may be simplified to in-app notification records plus email.
- Telegram notification is not implemented in the MVP, but the notification design should support adding it later through a new provider adapter.
- Automatic refund settlement is not a primary requirement; cancellation of paid workshops may be represented by a simplified status update.
- A fully native production mobile application is not required if the team can demonstrate offline check-in behavior through a mobile app, PWA, or equivalent prototype.
- Full audit logging, manual payment override, manual check-in correction, and advanced admin tooling are not part of the MVP.

---

## 6. Assumptions

The proposal is based on the following assumptions:

- Each student has a unique student ID supplied by the nightly CSV import.
- Each student account is linked to an imported student profile for registration eligibility.
- Each workshop session has a fixed capacity.
- Each registration belongs to exactly one workshop session.
- A student cannot register for the same workshop session more than once.
- Some workshops are free and some are paid.
- The price of a paid workshop is fixed per session.
- Paid registration may temporarily reserve a seat while payment is pending.
- Temporary reservations have an expiration time.
- QR codes are generated only after a registration reaches the confirmed state.
- Check-in staff devices can preload required workshop/session metadata before the event starts.
- CSV files are exported by the legacy Student Management System once per night on a fixed schedule.
- The payment gateway supports callback/webhook confirmation or a mock equivalent.
- Internet connectivity for staff devices may be unstable, but device storage remains available.
- The system should prioritize correctness of registration and check-in data over showing perfectly real-time seat counts.
- The MVP notification implementation uses in-app and email channels, while the design remains open for future channels such as Telegram.

---

## 7. Risks and Constraints

| Risk / Constraint                      | Why It Matters                                                                                                        | Proposed Mitigation                                                                                                                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seat contention                        | Many students may try to take the last available seat at the same time, causing overbooking if not handled correctly. | Use transactional seat reservation and concurrency control to ensure confirmed registrations never exceed workshop capacity. Detailed mechanisms will be described in `design.md`. |
| Traffic spike                          | Around 12,000 students may access the system within the first 10 minutes, which can overload backend APIs.            | Use rate limiting, request throttling, caching for read-heavy pages, and lightweight registration endpoints.                                                                       |
| Unfair registration attempts           | Some clients may repeatedly send requests and gain an unfair advantage.                                               | Apply per-user and per-IP request limits, require authenticated registration, and return clear retry responses.                                                                    |
| Payment gateway instability            | Payment failures should not make the entire system unavailable.                                                       | Isolate payment-related logic, use graceful degradation, and allow non-payment features such as browsing to continue operating.                                                    |
| Double charging or duplicated payment  | Client retries or duplicated callbacks may accidentally create multiple successful payment records.                   | Use idempotency keys and duplicate-detection rules for payment attempts and callbacks.                                                                                             |
| Pending payment holding seats too long | A student may start payment but never complete it, blocking seats for others.                                         | Use temporary reservations with expiration and background cleanup.                                                                                                                 |
| Offline check-in data loss             | Staff must still check in students when the network is unavailable.                                                   | Store offline check-in events locally and synchronize them when connectivity returns.                                                                                              |
| Duplicate check-in                     | The same QR code may be scanned more than once or synced more than once.                                              | Use unique check-in event IDs and backend duplicate-detection rules.                                                                                                               |
| Invalid QR code                        | A student may show an invalid, expired, or tampered QR code.                                                          | Validate QR payloads against backend registration records and reject invalid or unauthorized check-ins.                                                                            |
| Invalid CSV file                       | A corrupt or wrong-format CSV file can break student validation if imported directly.                                 | Import through a staging process, validate rows, reject invalid files, and generate import reports.                                                                                |
| Duplicate student records              | Legacy CSV exports may contain repeated or conflicting student rows.                                                  | Apply deterministic deduplication and update rules based on student ID.                                                                                                            |
| AI summary timeout                     | AI summary generation may be slow or fail due to external dependency issues.                                          | Process AI summary generation asynchronously and show processing status to organizers.                                                                                             |
| Unauthorized admin access              | Organizer functions can modify important event data.                                                                  | Apply role-based access control, route guards, token validation, and backend permission checks.                                                                                    |
| Notification delivery failure          | Email or in-app notifications may fail or be delayed.                                                                 | Store notification status and allow worker retry without affecting the main registration result.                                                                                   |
| Notification channel expansion         | Future semesters may require Telegram or other channels.                                                              | Use a notification provider adapter interface so new channels can be added without changing registration, payment, or workshop business logic.                                     |
| Background worker failure              | Tasks such as email sending, AI summary, CSV import, and reservation cleanup may stop temporarily.                    | Keep source-of-truth data in the main database and allow failed jobs to be retried or resumed.                                                                                     |
| Database unavailability                | Core features such as registration and check-in depend on persistent data.                                            | Define degraded behavior and avoid treating temporary cache data as the source of truth.                                                                                           |

---

## 8. Initial Architectural Direction

At the proposal level, the system should be designed as a modular application with clearly separated responsibilities. The main backend should expose APIs for web and mobile clients, while long-running or failure-prone tasks should be handled asynchronously.

The major functional areas are expected to include:

- Authentication and authorization.
- Workshop management.
- Registration and seat reservation.
- Payment processing.
- QR generation and validation.
- Notification delivery.
- Check-in and offline synchronization.
- AI summary processing.
- CSV student data import.
- Status tracking and operation reports for key background processes.

The notification module should be designed around a provider adapter interface. The MVP implements in-app and email notifications, while future channels such as Telegram can be added by introducing a new provider adapter and templates without changing registration, payment, or workshop state transitions.

The detailed architectural style, database choice, worker mechanism, concurrency control strategy, notification extensibility design, and payment resilience design will be described in `design.md`.

---

## 9. Expected Deliverables

The final project should include:

- `blueprint/` folder containing proposal, technical design, feature specifications, diagrams, and architecture decision records.
- Source code for the implemented system.
- Database schema and seed data.
- README with clear setup and run instructions.
- Demo data for workshops, students, organizers, registrations, and check-in records.
- Demonstration video showing important technical flows:
  - registration with seat protection,
  - paid registration with idempotency,
  - payment failure handling,
  - offline check-in and synchronization,
  - CSV import,
  - AI summary processing,
  - notification delivery through in-app and email channels,
  - RBAC behavior for different user roles.

---

## 10. Summary

UniHub Workshop aims to replace the current Google Form and manual email process with a more reliable digital system for workshop registration and check-in. The main challenge is not only implementing basic CRUD features, but also designing the system to handle seat contention, traffic spikes, payment instability, offline check-in, CSV-based integration, notification delivery, future notification-channel extensibility, and strict role-based access control.

The project will remain realistic for a course implementation by simplifying production-only concerns such as real payment settlement, real university SSO, production cloud deployment, full audit logging, and advanced admin tooling, while still implementing the core technical mechanisms required by the problem.
