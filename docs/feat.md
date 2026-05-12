# Báo cáo technical review - UniHub Workshop

## Phạm vi review

Đã scan source hiện tại trong repo `unihub-workshop-system`: `blueprint/specs`, migrations, backend Spring Boot, web Next.js, mobile Expo và test files.

Không chạy được backend test/build vì môi trường không có `mvn` và repo không có `mvnw`. Web/mobile cũng chưa có `node_modules`, nên phần build runtime ghi là "chưa đủ bằng chứng", không đoán.

## 1. Tổng quan mức độ hoàn thiện

| Module / Feature | Trạng thái | Mức hoàn thiện % | Bằng chứng trong code | Thiếu gì / Vấn đề |
| ---------------- | ---------: | ---------------: | --------------------- | ----------------- |
| Auth/RBAC | PARTIAL | 70% | `AuthController` có `/login`, `/refresh`, `/logout`, `/me`; `AuthCommandService` login/refresh/logout; `SecurityConfig` enforce role path-level; `V2`, `V9` có users/roles/refresh_tokens | Có lỗi P0: log plaintext password ở login; chưa có test; refresh rotation chưa có row lock chống race; CORS wildcard + credentials rủi ro |
| Workshop Management and Browsing | PARTIAL | 70% | `WorkshopController` list/detail; `AdminWorkshopController` create/update/publish/cancel/session; `WorkshopCommandService` validate capacity/room conflict; `V3` có exclusion constraint chống trùng phòng | Admin thiếu `GET /api/admin/workshops/{id}` và list admin thật; UI public đang hard-code sample; chưa có registration/notification integration; thiếu tests |
| Registration and Seat Allocation | SKELETON | 20% | `V4__create_registration_payment_qr_tables.sql` có `registrations`, unique active registration; `RegistrationAuthTestController` chỉ có `/auth-test` | Không có API `/free`, `/paid`, `/me`, QR; không có service transaction/lock/seat counter/cleanup; không đảm bảo overbooking |
| Payment Processing | SKELETON | 20% | `V4` có `payment_intents`, `idempotency_key` unique, `gateway_ref` unique | Không có controller/service/provider/webhook/signature/idempotency logic/callback atomics |
| QR Check-in and Offline Sync | SKELETON | 20% | `V5` có `checkin_records`, unique `registration_id`, unique `sync_event_id`; `CheckinAuthTestController` chỉ có `/auth-test`; mobile có placeholder screens | Không có `/sessions`, `/validate`, `/sync`; không validate QR; mobile không có SQLite/camera/offline queue |
| Notification Delivery | SKELETON | 20% | `V6` có `notifications`, status `PENDING/SENT/FAILED/RETRYING`, unique event-recipient-channel | Không có entity/service/provider/worker/endpoints; chưa có in-app/email/mock delivery |
| Nightly Student CSV Import | SKELETON | 20% | `V2` có `csv_import_batches`; `V8` có `csv_import_errors`; seed demo batch trong `V9` | Không có worker/import service/checksum processing/header/row validation/API reports |
| AI Summary from PDFs | SKELETON | 20% | `V7` có `workshop_documents`, `ai_summaries`; `presentation/aisummary/.gitkeep` | Không có upload endpoint, object storage adapter, PDF validation/extract/chunk/provider/worker |
| Database/schema | PARTIAL | 80% | Migrations `V2`-`V8`, status constraints `V10` bao phủ hầu hết bảng và unique constraints chính | Schema tốt hơn logic, nhưng thiếu một số DB checks như payment amount positive/currency enum; mobile SQLite schema không có trong app |
| Web app | PARTIAL | 35% | Login/admin/workshop pages tồn tại; admin gọi API bằng `fetchWithAuth` | Public browsing/detail dùng sample hard-code; admin gọi endpoint backend chưa có; nhiều text bị mojibake encoding |
| Mobile app | SKELETON | 10% | `App.tsx` render placeholder login/check-in/QR/offline sync | Không có auth thật, SQLite, camera, sync, retry, persistence |

## 2. Kiểm tra chi tiết từng module

### Auth/RBAC

Đã có login email/password. `POST /api/auth/login` nằm trong `src/backend/src/main/java/com/unihub/presentation/controller/auth/AuthController.java`, method `login`. Method này gọi `AuthCommandService.login`, normalize email, tìm user, check trạng thái account và dùng `passwordEncoder.matches`.

Đã có hash password. `SecurityConfig.passwordEncoder()` trả về `BCryptPasswordEncoder`. Seed demo trong `src/backend/src/main/resources/db/migration/V9__seed_demo_data.sql` dùng `crypt('Password123!', gen_salt('bf'))`. DB column là `users.password_hash` trong `V2__create_auth_rbac_and_student_tables.sql`.

Đã có JWT access token. `JwtTokenProvider.issueTokenPair` tạo JWT HS256 với claims `email`, `roles`, `token_type`, `jti`. `SecurityConfig` cấu hình OAuth2 resource server JWT.

Đã có refresh token và lưu hash. `/api/auth/refresh` nằm trong `AuthController.refresh`. `AuthCommandService.hashRefreshToken` dùng SHA-256. Table `refresh_tokens.token_hash` unique trong `V2__create_auth_rbac_and_student_tables.sql`.

Đã có rotate/revoke refresh token. Khi refresh, `AuthCommandService.refresh` tạo refresh token mới, revoke token cũ và set `replaced_by_token_id`. Logout revoke refresh token trong `AuthCommandService.logout`.

Đã có roles `student`, `organizer`, `checkin_staff` trong `V9__seed_demo_data.sql`. Backend enforce role ở `SecurityConfig`: `/api/admin/**` cần `ORGANIZER`, `/api/checkin/**` cần `CHECKIN_STAFF`, `/api/registrations/**` cần `STUDENT`. `UserPrincipalConverter` map role claim sang `ROLE_*`.

UI route guard chỉ là hỗ trợ. Web admin dùng `ensureAdminAuth()` trong `src/web/src/lib/adminAuth.ts`, gọi `/api/auth/me` và check role `organizer`, nhưng backend vẫn enforce trong `SecurityConfig`.

Kết luận demo Auth: đủ demo login/RBAC cơ bản, nhưng chưa nên xem là an toàn hoàn chỉnh vì `AuthController.login` đang log plaintext password bằng `System.out.println("Login attempt: " + request.email() + " / " + request.password())`. Đây là lỗ hổng security nghiêm trọng.

### Workshop Management and Browsing

Có API list/detail public. `GET /api/workshops` và `GET /api/workshops/{workshopId}` nằm trong `WorkshopController`. `WorkshopQueryService.getPublishedWorkshopDetail` chỉ trả workshop `PUBLISHED`, còn status khác trả 404.

Có filter/search theo `keyword`, `feeType`, `roomId`, `date`, `page`, `size` ở `WorkshopController.listWorkshops`. SQL builder nằm trong `JpaWorkshopRepository.buildPublishedQuery`. Không có request param `status` cho public list; status bị hard-code `w.status = 'PUBLISHED'`.

Có organizer CRUD-ish workshop/session. `AdminWorkshopController` có:

| Endpoint | Method/class |
| -------- | ------------ |
| `POST /api/admin/workshops` | `AdminWorkshopController.createWorkshop` |
| `PATCH /api/admin/workshops/{workshopId}` | `AdminWorkshopController.updateWorkshop` |
| `POST /api/admin/workshops/{workshopId}/publish` | `AdminWorkshopController.publishWorkshop` |
| `POST /api/admin/workshops/{workshopId}/cancel` | `AdminWorkshopController.cancelWorkshop` |
| `POST /api/admin/workshops/{workshopId}/sessions` | `AdminWorkshopController.createSession` |
| `PATCH /api/admin/sessions/{sessionId}` | `AdminWorkshopController.updateSession` |
| `POST /api/admin/sessions/{sessionId}/cancel` | `AdminWorkshopController.cancelSession` |

Thiếu admin list/detail endpoint thật. Web admin gọi `GET /api/admin/workshops/{id}` trong `src/web/src/app/admin/workshops/[id]/page.tsx`, nhưng backend không có mapping này.

Có kiểm tra room conflict. Application check `workshopRepository.existsRoomConflict` trong `WorkshopCommandService.createSession` và `WorkshopCommandService.updateSession`. DB cũng có exclusion constraint `ex_workshop_sessions_room_overlap` trong `V3__create_workshop_tables.sql`.

Có capacity rules. `WorkshopCommandService.validateCapacity` chặn `seatCapacity <= 0`. `updateSession` chặn capacity thấp hơn `seatsConfirmed + seatsReserved`. DB có check `ck_workshop_sessions_total_seats`.

Có remaining seats không âm. `WorkshopMapper.remainingSeats` trả `Math.max(remaining, 0)`.

Browsing hiện độc lập payment/AI/notification provider vì workshop code không inject các provider đó. Tuy nhiên, chưa đủ bằng chứng về failure isolation thật khi các module kia được thêm vào.

### Registration and Seat Allocation

Hiện chưa có implementation nghiệp vụ đáng kể.

Bằng chứng:

- `src/backend/src/main/java/com/unihub/presentation/controller/registration/RegistrationAuthTestController.java` chỉ có `GET /api/registrations/auth-test`.
- Không có package `application.registration`.
- Không có package `domain.registration`.
- Không có registration repository/service/DTO nghiệp vụ.
- Không có endpoints `/api/registrations/free`, `/api/registrations/paid`, `/api/registrations/me`, `/api/registrations/{registrationId}`, `/api/registrations/{registrationId}/qr`.

Schema có nền tảng trong `V4__create_registration_payment_qr_tables.sql`:

- Table `registrations`.
- Unique active registration `(student_id, session_id)` với status `PENDING_PAYMENT`, `CONFIRMED`.
- Table `payment_intents`.
- Table `qr_tickets`.

Thiếu logic chính:

- Không có kiểm tra role student ngoài path rule trong `SecurityConfig`.
- Không có kiểm tra student profile `ACTIVE`.
- Không có duplicate registration logic ở service.
- Không có transaction register.
- Không có lock session row hoặc atomic update seat counter.
- Không cập nhật `seats_confirmed` / `seats_reserved`.
- Không tạo QR sau free registration.
- Không tạo `PENDING_PAYMENT` và giữ chỗ tạm cho paid registration.
- Không có cleanup expired reservation.
- Không có notification isolation.

Race condition 100 request / 1 seat: không đảm bảo. DB có check `seats_confirmed + seats_reserved <= seat_capacity`, nhưng không có registration service nào lock/update seat counters.

### Payment Processing

Chỉ có schema.

Bằng chứng trong `V4__create_registration_payment_qr_tables.sql`:

- Table `payment_intents`.
- `registration_id UUID NOT NULL UNIQUE`.
- `idempotency_key VARCHAR(255) NOT NULL UNIQUE`.
- Partial unique index `uq_payment_intents_gateway_ref_not_null`.
- Index `idx_payment_intents_status_expires_at`.

Không tìm thấy:

- Payment controller.
- `PaymentProvider` adapter.
- Webhook/callback endpoint.
- Signature/shared secret verification.
- Amount/currency verification.
- Idempotency behavior khi reuse same key với request khác data.
- Atomic callback update payment, registration, seat counters, QR ticket.
- Timeout/expiration worker.
- Reconciliation hoặc retry handling.

### QR Check-in and Offline Sync

Chỉ có schema và placeholder.

Bằng chứng:

- `V5__create_checkin_tables.sql` có `checkin_records`.
- `registration_id UUID NOT NULL UNIQUE` chống duplicate check-in.
- Partial unique index `sync_event_id` chống duplicate offline sync event.
- Backend chỉ có `CheckinAuthTestController` với `GET /api/checkin/auth-test`.

Mobile:

- `src/mobile/src/screens/QrScannerPlaceholderScreen.tsx` có TODO thay bằng Expo Camera.
- `src/mobile/src/screens/OfflineSyncScreen.tsx` có TODO thêm SQLite offline storage và sync queue.
- `src/mobile/package.json` chỉ có `expo`, `react`, `react-native`, `expo-status-bar`; không có SQLite/camera dependency.

Không có:

- `GET /api/checkin/sessions`.
- `POST /api/checkin/validate`.
- `POST /api/checkin/sync`.
- Validate QR token.
- Check registration `CONFIRMED`.
- Check QR đúng session.
- Per-event result `ACCEPTED`, `DUPLICATE`, `REJECTED`, `ALREADY_SYNCED`.
- Mobile SQLite/local persistent queue.
- Retry an toàn qua app restart.

### Notification Delivery

Schema có nền tảng.

Bằng chứng trong `V6__create_notification_tables.sql`:

- Table `notifications`.
- Field `recipient_user_id`, `event_id`, `event_type`, `channel`, `template_key`, `title`, `message`.
- Status `PENDING`, `SENT`, `FAILED`, `RETRYING`.
- `read_at`, `retry_count`, `next_retry_at`, `last_error_code`.
- Unique index `(event_id, recipient_user_id, channel)` khi `event_id IS NOT NULL`.

Không có:

- Notification entity/domain/service.
- NotificationProvider adapter.
- Email/mock provider.
- Worker/background processing.
- Endpoint `GET /api/notifications/me`.
- Endpoint `PATCH /api/notifications/{notificationId}/read`.
- Logic đảm bảo user chỉ xem notification của chính mình.
- Logic failure isolation với registration/payment/workshop update.
- Thiết kế code cụ thể để thêm Telegram channel.

### CSV Import

Schema có nền tảng.

Bằng chứng:

- `csv_import_batches` trong `V2__create_auth_rbac_and_student_tables.sql`.
- Unique checksum partial index `uq_csv_import_batches_checksum`.
- `csv_import_errors` trong `V8__create_csv_import_error_tables.sql`.
- Seed demo import batch trong `V9__seed_demo_data.sql`.

Không có:

- Worker/import service đọc CSV.
- Header/encoding/required columns validation.
- Row-level validation.
- Deterministic deduplication theo student ID.
- Upsert valid students.
- Invalid file isolation/no overwrite behavior.
- API `GET /api/admin/csv-imports`.
- API `GET /api/admin/csv-imports/{batchId}`.
- API `GET /api/admin/csv-imports/{batchId}/errors`.

### AI Summary from PDFs

Schema có nền tảng.

Bằng chứng:

- `workshop_documents` trong `V7__create_document_ai_summary_tables.sql`.
- `ai_summaries` trong `V7__create_document_ai_summary_tables.sql`.
- `presentation/aisummary/.gitkeep` tồn tại nhưng không có class.

Không có:

- Organizer upload PDF endpoint.
- Role validation riêng cho upload ngoài path rule chưa tồn tại.
- Validate content type PDF/file size.
- Object storage adapter.
- Lưu metadata bằng service.
- Tạo `ai_summaries` status `PENDING`.
- Background worker.
- PDF text extraction.
- Clean/chunk text.
- AiSummaryProvider adapter/mock.
- Workshop detail summary endpoint hoặc summary display.
- Failure isolation logic.

## 3. Kiểm tra database/schema

| Yêu cầu schema | Kết quả | Bằng chứng | Ghi chú |
| -------------- | ------- | ---------- | ------- |
| `users`, `roles`, `user_roles`, `students`, `refresh_tokens` | Có | `V2__create_auth_rbac_and_student_tables.sql` | Có FK, unique email/role/student_code/token_hash |
| `rooms`, `workshops`, `workshop_sessions` | Có | `V3__create_workshop_tables.sql` | Có check capacity/time/fee/total seats và exclusion room overlap |
| `registrations`, `payment_intents`, `qr_tickets` | Có | `V4__create_registration_payment_qr_tables.sql` | Có active duplicate registration unique, payment idempotency unique, QR token hash unique |
| `checkin_records` | Có | `V5__create_checkin_tables.sql` | Có unique check-in per registration và sync event id |
| `notifications` | Có | `V6__create_notification_tables.sql` | Có status, retry, read_at, duplicate event unique |
| `workshop_documents`, `ai_summaries` | Có | `V7__create_document_ai_summary_tables.sql` | Có unique object_key và one summary per document |
| `csv_import_batches`, `csv_import_errors` | Có | `V2__create_auth_rbac_and_student_tables.sql`, `V8__create_csv_import_error_tables.sql` | Có checksum unique partial và row errors |
| Status constraints | Có phần lớn | `V10__add_status_constraints.sql` | Có users/students/workshops/sessions/registrations/payment/QR/checkin/notification/AI/CSV |
| Raw secret/token/password plaintext | Có vấn đề runtime | DB dùng `password_hash`, `token_hash`, `qr_token_hash`; nhưng `AuthController.login` log raw password | Đây là P0 security |

Nhận xét schema:

- Có đủ bảng chính theo checklist.
- Có foreign keys ở các bảng chính.
- Có unique constraints quan trọng: active registration, payment idempotency key, QR token hash, check-in per registration, sync event id, notification event-recipient-channel, CSV checksum.
- Có check constraint cho seat capacity và tổng seat trong `workshop_sessions`.
- Chưa thấy DB check amount positive ở `payment_intents.amount`.
- Chưa thấy mobile SQLite schema trong mobile app.

## 4. Kiểm tra API contract

| Endpoint expected | Có trong code? | Method đúng? | Auth/Role đúng? | Response gần đúng spec? | Ghi chú |
| ----------------- | -------------- | ------------ | --------------- | ----------------------- | ------- |
| `POST /api/auth/login` | Có | Có | Public | Gần đúng | Trả access/refresh/expires/roles; có log password P0 |
| `POST /api/auth/refresh` | Có | Có | Public | Gần đúng | Có rotate/revoke; chưa chống refresh race bằng lock |
| `POST /api/auth/logout` | Có | Có | Authenticated | Gần đúng | Revoke refresh token |
| `GET /api/auth/me` | Có | Có | Authenticated | Gần đúng | Trả user + roles + student profile |
| `GET /api/workshops` | Có | Có | Public | Gần đúng | Chỉ `PUBLISHED`; có keyword/fee/room/date |
| `GET /api/workshops/{workshopId}` | Có | Có | Public | Gần đúng | 404 nếu không PUBLISHED |
| `POST /api/admin/workshops` | Có | Có | organizer | Gần đúng | Tạo DRAFT |
| `PATCH /api/admin/workshops/{workshopId}` | Có | Có | organizer | Gần đúng | Update title/speaker/description |
| `POST /api/admin/workshops/{workshopId}/sessions` | Có | Có | organizer | Gần đúng | Validate room/time/capacity/fee |
| `PATCH /api/admin/sessions/{sessionId}` | Có | Có | organizer | Gần đúng | Validate room conflict/capacity |
| `POST /api/admin/sessions/{sessionId}/cancel` | Có | Có | organizer | Gần đúng | Set CANCELED |
| `POST /api/registrations/free` | Không | Không | Rule path có student nếu tồn tại | Không | Chỉ có `/api/registrations/auth-test` |
| `POST /api/registrations/paid` | Không | Không | Rule path có student nếu tồn tại | Không | Không có registration logic |
| `GET /api/registrations/me` | Không | Không | Rule path có student nếu tồn tại | Không | Không có |
| `GET /api/registrations/{registrationId}` | Không | Không | Rule path có student nếu tồn tại | Không | Không có |
| `GET /api/registrations/{registrationId}/qr` | Không | Không | Rule path có student nếu tồn tại | Không | Không có |
| `POST /api/payments/intents` | Không | Không | Chưa có rule riêng | Không | Không có payment controller |
| `GET /api/payments/{paymentIntentId}/status` | Không | Không | Chưa có rule riêng | Không | Không có |
| `POST /api/payments/webhook` | Không | Không | Không | Không | Không có webhook/signature |
| `GET /api/checkin/sessions` | Không | Không | Rule path có checkin_staff nếu tồn tại | Không | Chỉ có `/api/checkin/auth-test` |
| `POST /api/checkin/validate` | Không | Không | Rule path có checkin_staff nếu tồn tại | Không | Không có |
| `POST /api/checkin/sync` | Không | Không | Rule path có checkin_staff nếu tồn tại | Không | Không có |
| `GET /api/notifications/me` | Không | Không | Không | Không | Không có notification controller |
| `PATCH /api/notifications/{notificationId}/read` | Không | Không | Không | Không | Không có |
| `POST /api/admin/workshops/{workshopId}/documents` | Không | Không | `/api/admin/**` would protect if added | Không | Không có upload |
| `GET /api/workshops/{workshopId}/summary` | Không | Không | Public expected | Không | Không có |
| `GET /api/admin/documents/{documentId}/summary-status` | Không | Không | `/api/admin/**` would protect if added | Không | Không có |
| `GET /api/admin/csv-imports` | Không | Không | `/api/admin/**` would protect if added | Không | Không có |
| `GET /api/admin/csv-imports/{batchId}` | Không | Không | `/api/admin/**` would protect if added | Không | Không có |
| `GET /api/admin/csv-imports/{batchId}/errors` | Không | Không | `/api/admin/**` would protect if added | Không | Không có |

## 5. Kiểm tra test coverage

Không có backend `src/test` directory. `rg` chỉ tìm thấy blueprint spec files và các controller tên `*AuthTestController`, không phải automated tests. Web/mobile cũng không có `*.test.*`, `*.spec.*`, `__tests__`.

| Feature | Có unit test? | Có integration test? | Có concurrency/idempotency test? | Test còn thiếu |
| ------- | ------------- | -------------------- | -------------------------------- | -------------- |
| overbooking prevention | Không | Không | Không | 100 concurrent registrations / 1 seat, row lock, seat counter invariant |
| duplicate registration | Không | Không | Không | Unique active registration + service behavior |
| payment idempotency | Không | Không | Không | Same key same payload vs different payload |
| duplicate payment callback | Không | Không | Không | Idempotent webhook, amount/currency validation |
| expired reservation cleanup | Không | Không | Không | Worker expiration and seat release |
| duplicate check-in | Không | Không | Không | Unique registration, duplicate QR, duplicate syncEventId |
| offline sync retry | Không | Không | Không | Retry idempotency, app restart persistence |
| auth role enforcement | Không | Không | Không | student/admin/checkin_staff access matrix |
| CSV invalid file handling | Không | Không | Không | Header/encoding/required columns/no overwrite |
| notification failure isolation | Không | Không | Không | Registration/payment not rolled back |
| AI summary failure isolation | Không | Không | Không | Workshop detail unaffected by failed summary |

## 6. Phân loại mức độ hoàn thiện

| Feature | Điểm | Lý do |
| ------- | ---: | ----- |
| Auth/RBAC | 70% | Flow chính có, JWT/refresh/hash/RBAC có, nhưng có log plaintext password, thiếu tests và còn rủi ro refresh race/CORS |
| Workshop Management and Browsing | 70% | API public/admin flow chính có, DB constraints tốt, nhưng thiếu admin read APIs, UI chưa wire đầy đủ, thiếu tests |
| Registration and Seat Allocation | 20% | Có schema/controller placeholder, chưa có nghiệp vụ đăng ký |
| Payment Processing | 20% | Có schema payment intent/idempotency, chưa có API/provider/webhook |
| QR Check-in and Offline Sync | 20% | Có schema duplicate/idempotency, backend/mobile chỉ placeholder |
| Notification Delivery | 20% | Có schema tốt, chưa có service/provider/worker/API |
| CSV Import | 20% | Có batch/error schema, chưa có worker/import/API |
| AI Summary from PDFs | 20% | Có document/summary schema, chưa có upload/worker/provider |
| Database Design | 80% | Đủ bảng/constraints chính, nhưng logic chưa dùng và còn thiếu một số checks |
| Web UI | 35% | Có login/admin/workshop screens, nhưng nhiều hard-code và endpoint mismatch |
| Mobile App | 10% | Chỉ scaffold/placeholder |

Không có feature nào đạt 100%. Không có đủ bằng chứng để gán `DONE`.

## 7. Kết luận ưu tiên sửa

### P0 - Bắt buộc sửa trước khi demo

1. Xóa log plaintext password trong `AuthController.login`.
2. Không demo registration/payment/check-in như flow thật hiện tại. Các endpoint nghiệp vụ chính không tồn tại, nên hệ thống chưa thể đảm bảo chống overbooking, double charge, QR issuance hay mất dữ liệu check-in.
3. Implement Registration service trước Payment: transaction boundary, row lock hoặc atomic conditional update trên `workshop_sessions`, duplicate registration handling, seat counters, QR generation cho free registration.
4. Implement Payment webhook/idempotency trước khi demo paid workshop: provider adapter, signature/shared secret verification, amount/currency validation, idempotent callback, atomic payment-registration-seat-QR transition.
5. Implement Check-in validate/sync trước khi demo mobile: QR token hash validation, confirmed registration check, correct session check, duplicate registration handling, `syncEventId` idempotency.

### P1 - Nên sửa để đạt đúng spec

1. Thêm admin workshop read APIs thật: `GET /api/admin/workshops`, `GET /api/admin/workshops/{id}`. Web admin hiện gọi endpoint chưa có và list bằng public `/api/workshops`, nên không thấy DRAFT/CANCELED.
2. Wire public web browsing/detail vào API thật. Home page đang dùng `SAMPLE` hard-code trong `src/web/src/app/(main)/(home)/page.tsx`; detail page cũng hard-code workshop AI/ML trong `src/web/src/app/(main)/workshop/[id]/page.tsx`.
3. Implement Notification module: table đã có nhưng cần service/provider/worker/list own/mark read và đảm bảo notification failure không rollback nghiệp vụ.
4. Implement CSV import worker/API: checksum idempotency, header/row validation, deterministic upsert, row errors, organizer reports.
5. Implement AI summary upload/worker: PDF validation, object storage adapter, metadata insert, `PENDING/PROCESSING/COMPLETED/FAILED`, failure isolation.
6. Hardening Auth: tránh refresh-token race bằng row lock/conditional revoke; cân nhắc revoke token family on reuse; siết CORS thay vì `allowedOriginPatterns("*")` + credentials trong `SecurityConfig`.

### P2 - Cải thiện sau

1. Thêm automated tests theo bảng coverage, ưu tiên concurrency/idempotency/security.
2. Thêm Maven wrapper hoặc tài liệu build rõ. Hiện `mvn -q test` không chạy được vì máy không có `mvn`, repo cũng không có `mvnw`.
3. Thêm health endpoint hoặc sửa README. README nói `GET /api/health`, nhưng source chỉ permit route trong `SecurityConfig`, không thấy controller health.
4. Sửa mojibake tiếng Việt trong web/mobile source, ví dụ login page text bị lỗi encoding ở `src/web/src/app/auth/login/page.tsx`.
5. Bổ sung logging/observability có kiểm soát, API docs/OpenAPI, và cleanup README "scaffold only" vì Auth/Workshop đã có một phần implementation.

