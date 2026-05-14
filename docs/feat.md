# UniHub Workshop — Feature Completion Status

Tài liệu này dùng để phân biệt feature nào đã hoàn thành, feature nào mới làm một phần, và feature nào chưa triển khai. Trạng thái được rà soát từ code hiện tại trong `src/backend`, `src/web`, `src/mobile`, migration database và blueprint.

Ngày rà soát: 2026-05-08.

## Quy ước trạng thái

| Trạng thái | Ý nghĩa |
| --- | --- |
| Done | Có backend/API hoặc UI chính hoạt động, có dữ liệu/schema cần thiết, có thể demo được luồng chính |
| Partial | Đã có một phần schema, API, service hoặc UI, nhưng chưa đủ để xem là feature hoàn chỉnh |
| Not started | Chưa thấy business logic/API/UI chính, hoặc chỉ có placeholder/auth-test |

## Tổng quan nhanh

| Feature | Backend | Web | Mobile | Database | Trạng thái tổng |
| --- | --- | --- | --- | --- | --- |
| Project foundation | Partial | Partial | Partial | Done | Partial |
| Auth/RBAC | Partial | Partial | Not started | Done | Partial |
| Workshop browsing | Done | Partial | N/A | Done | Partial |
| Admin workshop management | Partial | Partial | N/A | Done | Partial |
| Registration và QR | Not started | Not started | N/A | Partial | Not started |
| Payment | Not started | Not started | N/A | Partial | Not started |
| Notification | Not started | Not started | N/A | Partial | Not started |
| Check-in online/offline | Not started | N/A | Not started | Partial | Not started |
| CSV import | Not started | Not started | N/A | Partial | Not started |
| AI summary | Not started | Not started | N/A | Partial | Not started |
| Rate limiting/idempotency/circuit breaker | Not started | N/A | N/A | Partial | Not started |
| Tests | Not started | Not started | Not started | N/A | Not started |

## 1. Project foundation

Trạng thái: Partial.

Đã có:

- Cấu trúc repo gồm `blueprint/`, `src/backend`, `src/web`, `src/mobile`, `data/`.
- Docker Compose cho PostgreSQL, Redis và MinIO.
- Backend Spring Boot scaffold theo các package `presentation`, `application`, `domain`, `infrastructure`.
- Flyway migrations từ `V1` đến `V10`.
- Seed data demo cho role, user, student, room, workshop và session.
- `ApiResponse` và `GlobalExceptionHandler`.
- README root có hướng dẫn chạy cơ bản.

Còn thiếu hoặc cần hoàn thiện:

- README backend vẫn ghi scaffold, chưa phản ánh feature đã làm.
- Chưa có tài liệu API đầy đủ.
- Chưa có script reset/reseed dữ liệu demo.
- Chưa có test suite trong repo.
- Chưa thấy health check controller trong danh sách code hiện tại dù README có nhắc `/api/health`.

## 2. Auth/RBAC

Trạng thái: Partial.

Đã có ở backend:

- `POST /api/auth/login`.
- `POST /api/auth/refresh`.
- `POST /api/auth/logout`.
- `GET /api/auth/me`.
- JWT resource server bằng Spring Security.
- BCrypt password encoder.
- Refresh token được hash bằng SHA-256 trước khi lưu.
- Role guard:
  - `/api/admin/**` yêu cầu role organizer.
  - `/api/checkin/**` yêu cầu role checkin_staff.
  - `/api/registrations/**` yêu cầu role student.
- Chặn user `DISABLED` và `LOCKED`.
- Auth-test endpoint cho admin, registration và check-in.

Đã có ở web:

- Trang login gọi API `/api/auth/login`.
- Lưu access token và refresh token vào localStorage.
- `ensureAdminAuth()` gọi `/api/auth/me` và kiểm tra role organizer.
- Admin pages có guard cơ bản.

Còn thiếu hoặc cần sửa:

- `AuthController.login()` đang log email và password ra console, cần gỡ ngay trước khi demo hoặc nộp.
- Web token helper đang đặt tên theo `adminAccessToken`, nhưng login dùng chung cho nhiều role; cần tách hoặc đặt tên trung lập.
- Chưa có refresh token tự động ở web.
- Chưa có logout UI.
- Chưa có mobile login thật.
- Chưa có route guard đầy đủ cho student flow.

## 3. Workshop browsing

Trạng thái: Partial.

Đã có ở backend:

- `GET /api/workshops`.
- Filter theo `keyword`, `feeType`, `roomId`, `date`, `page`, `size`.
- `GET /api/workshops/{workshopId}`.
- Chỉ trả workshop `PUBLISHED` cho public API.
- Response có workshop, session, room, fee và seat fields.

Đã có ở web:

- Trang home có tab khám phá workshop và tab đã đăng ký.
- Có search/filter UI mẫu.
- Có workshop card và registered workshop card.
- Có trang detail workshop với layout hoàn chỉnh ở mức UI.

Còn thiếu hoặc cần sửa:

- Home page hiện dùng `SAMPLE` hardcoded, chưa gọi `/api/workshops`.
- Detail page hiện hardcoded nội dung, chưa gọi API theo `id`.
- Search/filter UI chưa nối với backend.
- Tab “Đã đăng ký” đang dùng sample, chưa có API registration thật.
- Chưa có loading/error/empty state từ API thật cho student browsing.

## 4. Admin workshop management

Trạng thái: Partial.

Đã có ở backend:

- `POST /api/admin/workshops`.
- `PATCH /api/admin/workshops/{workshopId}`.
- `POST /api/admin/workshops/{workshopId}/publish`.
- `POST /api/admin/workshops/{workshopId}/cancel`.
- `POST /api/admin/workshops/{workshopId}/sessions`.
- `PATCH /api/admin/sessions/{sessionId}`.
- `POST /api/admin/sessions/{sessionId}/cancel`.
- `GET /api/admin/rooms`.
- Validate title, speaker, description.
- Validate room active, room capacity, time range, fee rule.
- Check room schedule conflict.
- Không cho update/cancel sai trạng thái ở một số case.

Đã có ở web:

- Trang `/admin/workshops`.
- Trang `/admin/workshops/create`.
- Trang `/admin/workshops/[id]`.
- Form tạo workshop.
- Form thêm session khi tạo workshop.
- Form update workshop.
- Action publish/cancel workshop.
- Action create/update/cancel session ở UI.

Còn thiếu hoặc cần sửa:

- Backend chưa có `GET /api/admin/workshops` để admin xem tất cả workshop gồm draft/canceled.
- Backend chưa có `GET /api/admin/workshops/{id}` nhưng web detail đang gọi endpoint này.
- Trang admin list đang gọi public `/api/workshops?size=100`, nên chỉ thấy workshop published, không đúng yêu cầu admin.
- Quick Save session chưa có form chỉnh sửa đầy đủ, chủ yếu gửi lại dữ liệu đang có.
- Chưa có thống kê registration thật cho admin.
- Chưa có upload PDF/AI summary trong admin workshop detail.

## 5. Registration và QR ticket

Trạng thái: Not started.

Đã có:

- Migration tạo bảng `registrations`.
- Migration tạo bảng `qr_tickets`.
- Unique index ngăn registration active trùng theo student/session cho trạng thái `PENDING_PAYMENT` và `CONFIRMED`.
- Status constraint cho registration và QR ticket.
- Security guard `/api/registrations/**` yêu cầu role student.
- Endpoint `/api/registrations/auth-test` để kiểm tra role.

Chưa có:

- Domain model/service/repository cho registration.
- API đăng ký free session.
- API khởi tạo paid registration.
- API list my registrations.
- API get registration detail.
- API get QR ticket.
- Logic tăng `seats_confirmed` hoặc `seats_reserved`.
- Transaction/locking chống overbooking.
- QR token generation.
- Reservation expiration cleanup.
- Student UI đăng ký thật.
- Student UI xem QR thật.

## 6. Payment

Trạng thái: Not started.

Đã có:

- Migration tạo bảng `payment_intents`.
- Unique idempotency key.
- Unique gateway ref nếu không null.
- Status constraint cho payment.

Chưa có:

- Domain model/service/repository cho payment.
- Payment provider adapter hoặc mock gateway.
- API create payment intent.
- API get payment status.
- Webhook/callback endpoint.
- Idempotent callback handling.
- Payment timeout cleanup.
- Circuit breaker/graceful degradation.
- Web payment status page.

## 7. Notification

Trạng thái: Not started.

Đã có:

- Migration tạo bảng `notifications`.
- Constraint cho delivery status và channel.
- Index theo recipient, status/retry và event.

Chưa có:

- Domain model/service/repository cho notification.
- Provider adapter cho in-app/email.
- Worker retry.
- API list my notifications.
- API mark as read.
- Event phát notification sau registration/payment/workshop update.
- Web UI notification.

## 8. Check-in online/offline

Trạng thái: Not started.

Đã có:

- Migration tạo bảng `checkin_records`.
- Unique check-in theo registration.
- Unique `sync_event_id` khi không null.
- Source mode constraint `ONLINE`, `OFFLINE_SYNC`.
- Security guard `/api/checkin/**` yêu cầu role checkin_staff.
- Endpoint `/api/checkin/auth-test` để kiểm tra role.

Đã có ở mobile:

- `LoginScreen` placeholder.
- `CheckinSessionsScreen` placeholder.
- `QrScannerPlaceholderScreen` placeholder.
- `OfflineSyncScreen` placeholder.

Chưa có:

- Backend API load check-in sessions.
- Backend API validate QR online.
- Backend API sync offline events.
- Domain/service/repository cho check-in.
- QR payload validation.
- Duplicate/rejected/accepted sync result.
- Mobile login thật.
- Mobile QR scanner thật.
- Local storage/SQLite offline queue.
- Sync logic khi có mạng.

## 9. CSV import

Trạng thái: Not started.

Đã có:

- Migration tạo bảng `csv_import_batches`.
- Migration tạo bảng `csv_import_errors`.
- Unique checksum cho import batch.
- Status constraint cho CSV import.
- Seed data tạo một batch demo thành công.

Chưa có:

- CSV reader/import service.
- Scheduled nightly import.
- Row validation.
- Deduplication service.
- API list import batches.
- API get import batch detail.
- API get import errors.
- Admin UI xem import history/error.

## 10. AI summary

Trạng thái: Not started.

Đã có:

- Migration tạo bảng `workshop_documents`.
- Migration tạo bảng `ai_summaries`.
- Status constraint cho upload và AI summary.
- Package placeholder `presentation/aisummary`.

Chưa có:

- Upload PDF API.
- Object storage adapter.
- PDF validation.
- PDF text extraction worker.
- AI provider adapter hoặc mock adapter.
- API xem summary/status.
- Admin UI upload PDF.
- Student UI hiển thị summary từ API.

## 11. Rate limiting, idempotency và resilience

Trạng thái: Not started.

Đã có:

- Redis service trong Docker Compose.
- Database-level unique keys hỗ trợ một phần idempotency cho payment và check-in sync.

Chưa có:

- Redis-backed rate limiting middleware/filter.
- Per-user/per-IP limit cho registration/payment.
- HTTP 429 response chuẩn.
- Circuit breaker cho payment provider.
- Idempotency service dùng chung cho command quan trọng.
- Metric/log chuyên biệt cho rate-limit, provider failure và worker retry.

## 12. Testing

Trạng thái: Not started.

Đã có:

- Chưa thấy test của project trong `src/backend`, `src/web`, `src/mobile`.

Chưa có:

- Unit test backend.
- Integration test backend.
- Frontend test.
- Mobile test.
- Test concurrency/overbooking.
- Test payment idempotency.
- Test offline sync idempotency.

## 13. Demo hiện có thể làm

Các luồng có thể demo tương đối:

- Login backend bằng user seed:
  - `student1@unihub.local`
  - `organizer1@unihub.local`
  - `staff1@unihub.local`
  - password: `Password123!`
- Gọi `/api/auth/me` sau login.
- Kiểm tra role guard bằng các endpoint `auth-test`.
- Public API list/detail workshop published.
- Admin tạo workshop.
- Admin tạo session.
- Admin publish/cancel workshop.
- Admin update/cancel session.
- Admin list rooms.

Các luồng chưa thể demo end-to-end:

- Sinh viên đăng ký workshop.
- QR ticket.
- Paid registration/payment.
- Notification.
- Check-in online/offline.
- CSV import thật.
- AI summary.
- Rate limiting chống spike.

## 14. Việc nên ưu tiên tiếp theo

1. Sửa bảo mật auth: bỏ log password trong `AuthController`.
2. Thêm admin query API:
   - `GET /api/admin/workshops`
   - `GET /api/admin/workshops/{id}`
3. Nối student home/detail với API thật thay vì sample hardcoded.
4. Triển khai registration free trước:
   - domain/service/repository
   - transaction chống overbooking
   - QR ticket generation
   - web button đăng ký và trang QR
5. Sau khi registration free ổn, triển khai payment mock cho paid workshop.
6. Sau payment, triển khai check-in online rồi mới mở rộng offline sync.

