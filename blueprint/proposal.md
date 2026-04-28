# UniHub Workshop - Project Proposal

## 1. Problem Statement

University A currently manages "Skills and Career Week" workshop registration with Google Forms and manual email notifications. That process is no longer suitable for a 5-day event where 8-12 workshops run in parallel each day and thousands of students try to register within minutes after registration opens.

The current approach creates several operational risks:

- Google Forms cannot reliably prevent seat conflicts when many students submit at the same time.
- Manual confirmation emails are slow, error-prone, and hard to extend to new channels.
- Paid workshops need a safer flow than manual confirmation because payment timeouts and duplicate retries can cause disputes.
- Check-in at room entrances is difficult without QR-based validation and offline support.
- The university's Student Management System has no API, so student identity validation depends on nightly CSV exports.

The project therefore needs a system that digitizes the full workshop lifecycle while staying realistic for a student implementation.

## 2. Project Goals

The UniHub Workshop system aims to:

- Digitize workshop browsing, registration, confirmation, and attendance tracking.
- Support both free and paid workshops within one consistent registration flow.
- Prevent overbooking even when hundreds of students compete for a small number of seats.
- Handle a traffic spike of approximately 12,000 students in the first 10 minutes, with heavy concentration in the first 3 minutes.
- Generate a QR code only after registration is confirmed.
- Support both online and offline check-in for room entrance staff.
- Send registration and schedule notifications through email and in-app channels.
- Keep the notification design extensible so that future channels such as Telegram can be added without major redesign.
- Generate AI summaries from organizer-uploaded PDF workshop documents.
- Import student data from nightly CSV files exported by the legacy student system.
- Apply strict access control for students, organizers, and check-in staff.
- Keep browsing and other non-payment features available even when the payment gateway is unstable.

## 3. User Groups and Needs

| User group | Main needs | Important quality attributes |
| --- | --- | --- |
| Student | Browse workshop schedule, view speaker and room details, register, pay if needed, receive QR, check in | Fast response time, fairness, accuracy of remaining seats, clear status updates |
| Organizer | Create and update workshops, cancel sessions, see registration statistics, upload PDFs for AI summary | Strong access control, auditability, reliable background processing, easy content updates |
| Check-in Staff | Scan QR codes at room entrances, verify attendance quickly, continue working when the network is unstable | Offline capability, fast validation, duplicate detection, reliable sync |

## 4. Scope

### In Scope

- Workshop listing and search/filtering
- Workshop detail page with speaker, room, map, schedule, fee, and remaining seats
- Real-time or near-real-time remaining seat display
- Free registration
- Paid registration
- QR generation after confirmed registration
- Email and in-app notifications
- Organizer workshop management
- Role-based access control
- Online QR check-in
- Offline check-in and synchronization
- PDF upload by organizers
- AI-generated workshop summary
- Nightly CSV import from the legacy student system
- Rate limiting for spike protection
- Circuit breaker for payment gateway isolation
- Idempotency keys for payment and registration safety
- Overbooking protection
- Audit logs for security-sensitive operations

### Out of Scope / Simplified for Course Project

- Real production payment settlement may be replaced with a mock payment gateway or sandbox provider.
- Real university SSO may be replaced with email/password login and JWT tokens.
- Production cloud infrastructure may be represented by local Docker services.
- AI provider integration may use an adapter with a mock implementation if no real API key is available.
- Advanced analytics, recommendation, and personalization are not required.
- Real push notification infrastructure may be simplified to in-app notification records plus email.
- Automatic refund settlement is not a primary requirement; cancellation of paid workshops may be represented by a simplified manual or mocked refund flow.

## 5. Assumptions

- Each student has a unique student ID supplied by the nightly CSV import.
- Each registration belongs to exactly one workshop session.
- A student cannot register for the same workshop session more than once.
- Some workshops are free and some are paid; pricing is fixed per session.
- Paid registration may reserve a seat temporarily while payment is pending.
- QR codes are generated only after registration reaches the confirmed state.
- Check-in staff devices can preload workshop/session metadata before the event starts.
- CSV files are exported by the legacy student system once per night on a fixed schedule.
- The payment gateway supports either callback/webhook confirmation or a mock equivalent.
- Internet connectivity for staff devices may be unstable but device storage remains available.

## 6. Risks and Constraints

| Risk / constraint | Why it matters | Proposed mitigation |
| --- | --- | --- |
| Seat contention | Concurrent registration can oversell small workshops | Use SQL transaction boundaries, row-level locking on seat inventory, and temporary reservations for paid flows |
| Traffic spike | 12,000 students in 10 minutes can overload the API | Rate limiting in Redis, endpoint prioritization, caching for read-heavy browsing, and short request paths |
| Payment gateway instability | Payment failures must not break the whole system | Circuit breaker, async reconciliation, and graceful degradation that keeps browsing available |
| Double charging | Retries can accidentally create duplicate payment attempts | Idempotency keys, unique payment intent records, and webhook deduplication |
| Offline check-in data loss | Staff must still check in students during network loss | Local mobile database, durable sync queue, and conflict-safe event replay |
| Duplicate check-in | The same QR could be scanned twice or synced twice | Unique check-in constraints and idempotent sync event IDs |
| Invalid CSV file | Corrupt or wrong-format files can break student validation | Staging import, schema validation, quarantine invalid files, and operator-visible import reports |
| Duplicate student records | Legacy exports may contain repeated rows | Deterministic deduplication and upsert rules keyed by student ID |
| AI model timeout | Summary generation is slow and externally dependent | Background worker, retry policy, and organizer-visible status with manual re-run |
| Unauthorized admin access | Admin functions can modify workshops and statistics | RBAC, route guards, audit logs, and token expiration |
| Redis failure | Rate limiting, idempotency, and worker coordination depend on Redis | Fail closed on write-heavy endpoints when needed, keep reads available, and persist source-of-truth data in PostgreSQL |
| Database failure | Core registration and attendance data would be unavailable | Backups, transactional design, health monitoring, and clear degraded-mode behavior |
