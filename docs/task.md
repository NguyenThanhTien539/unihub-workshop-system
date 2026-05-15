# UniHub Workshop — Implementation Tasks

Tài liệu này chuyển các nội dung trong `blueprint/proposal.md`, `blueprint/design.md`, `blueprint/database.md` và `blueprint/specs/` thành checklist triển khai. Mục tiêu là giúp nhóm chia việc theo module, theo dõi tiến độ, và bảo đảm phần cài đặt khớp với blueprint.

## 1. Nguyên tắc triển khai

- Backend dùng Java Spring Boot theo cấu trúc DDD-lite: `presentation`, `application`, `domain`, `infrastructure`.
- PostgreSQL là source of truth cho user, workshop, registration, payment, QR ticket, check-in, notification, AI summary và CSV import.
- Redis chỉ dùng cho dữ liệu tạm: rate limit, idempotency ngắn hạn, cache, lock tạm và worker coordination.
- Web app dùng Next.js cho sinh viên và ban tổ chức.
- Mobile app dùng React Native cho nhân sự check-in, có local storage để hỗ trợ offline.
- Mọi quyền truy cập quan trọng phải được kiểm tra ở backend, không chỉ ở frontend.
- Các luồng dễ lỗi như payment, notification, AI summary, CSV import và reservation cleanup phải được xử lý tách biệt khỏi luồng browse workshop.

## 2. Milestone tổng quan

| Milestone | Mục tiêu | Kết quả cần có |
| --- | --- | --- |
| M1 | Nền tảng chạy được | Docker services, migration, seed data, backend health check, web/mobile scaffold |
| M2 | Auth/RBAC và workshop | Đăng nhập, phân quyền, browse workshop, admin quản lý workshop/session |
| M3 | Registration và QR | Đăng ký free/paid, chống overbooking, reservation timeout, QR ticket |
| M4 | Payment và notification | Payment intent, callback idempotent, failure isolation, in-app/email notification |
| M5 | Check-in online/offline | Mobile session list, QR scan, offline queue, sync và duplicate detection |
| M6 | CSV import và AI summary | Nightly CSV import, import report, PDF upload, AI summary worker |
| M7 | Hoàn thiện demo | README, test case, seed data, script demo, video flow |

## 3. Foundation và hạ tầng

- [ ] Chuẩn hóa file `.env.example` cho root, backend, web và mobile.
- [ ] Cấu hình Docker Compose cho PostgreSQL, Redis và MinIO.
- [ ] Kiểm tra backend đọc được cấu hình database, Redis, MinIO và JWT secret.
- [ ] Thiết lập Flyway migration chạy tự động khi backend khởi động.
- [ ] Tạo seed data cho:
  - [ ] roles: `student`, `organizer`, `checkin_staff`
  - [ ] tài khoản demo cho từng role
  - [ ] sinh viên mẫu
  - [ ] phòng học mẫu
  - [ ] workshop và session mẫu gồm cả free và paid
- [ ] Thêm health check API cho backend.
- [ ] Cập nhật README với lệnh chạy backend, web, mobile và Docker services.
- [ ] Thêm hướng dẫn reset dữ liệu local khi cần demo lại từ đầu.

## 4. Backend architecture baseline

- [ ] Giữ cấu trúc package theo layer:
  - [ ] `presentation`
  - [ ] `application`
  - [ ] `domain`
  - [ ] `infrastructure`
- [ ] Mỗi module nghiệp vụ có domain model, repository interface, application service và controller riêng khi cần.
- [ ] Chuẩn hóa response envelope `ApiResponse`.
- [ ] Chuẩn hóa error code và global exception handler.
- [ ] Thêm validation cho request DTO bằng Jakarta Validation.
- [ ] Tạo pagination/filter convention dùng chung cho list API.
- [ ] Đảm bảo timestamp lưu theo UTC.
- [ ] Không để controller chứa business rule quan trọng.

## 5. Auth/RBAC

Nguồn spec: `blueprint/specs/auth.md`.

### Backend

- [ ] Cài đặt login bằng email/password.
- [ ] Hash password bằng thuật toán an toàn, không lưu plaintext.
- [ ] Phát hành access token JWT và refresh token.
- [ ] Lưu refresh token để có thể revoke khi logout.
- [ ] Cài đặt refresh token endpoint.
- [ ] Cài đặt logout endpoint.
- [ ] Cài đặt `/me` endpoint trả về user hiện tại, role và student profile nếu có.
- [ ] Cấu hình Spring Security để bảo vệ API theo role.
- [ ] Chặn tài khoản `DISABLED` và `LOCKED`.
- [ ] Trả lỗi rõ ràng cho token thiếu, token sai, token hết hạn và không đủ quyền.

### Web/Mobile

- [ ] Tạo màn hình login dùng chung cho các role.
- [ ] Lưu token an toàn theo khả năng của từng client.
- [ ] Tự động gắn Authorization header khi gọi API.
- [ ] Route guard cho trang admin.
- [ ] Route guard cho trang check-in mobile.
- [ ] Hiển thị trạng thái lỗi đăng nhập và hết phiên.

### Acceptance

- [ ] Sinh viên chỉ truy cập được chức năng sinh viên.
- [ ] Ban tổ chức truy cập được admin workshop.
- [ ] Nhân sự check-in chỉ truy cập được chức năng check-in.
- [ ] Logout làm refresh token không còn dùng được.

## 6. Workshop management và browsing

Nguồn spec: `blueprint/specs/workshop.md`.

### Backend

- [ ] Tạo domain model cho `Workshop`, `WorkshopSession`, `Room`.
- [ ] Cài đặt API list workshop có search/filter.
- [ ] Cài đặt API detail workshop gồm speaker, room, schedule, fee và remaining seats.
- [ ] Cài đặt admin API tạo workshop.
- [ ] Cài đặt admin API cập nhật workshop.
- [ ] Cài đặt admin API tạo session.
- [ ] Cài đặt admin API cập nhật session.
- [ ] Cài đặt admin API cancel session.
- [ ] Kiểm tra trùng lịch phòng khi tạo hoặc cập nhật session.
- [ ] Không cho sinh viên đăng ký session `CLOSED`, `CANCELED` hoặc workshop chưa `PUBLISHED`.
- [ ] Tính remaining seats dựa trên registration/reservation hợp lệ.

### Web

- [ ] Trang danh sách workshop cho sinh viên.
- [ ] Bộ lọc theo ngày, fee type, trạng thái còn chỗ và từ khóa.
- [ ] Trang chi tiết workshop.
- [ ] Hiển thị session, phòng, thời gian, phí, remaining seats và trạng thái đăng ký.
- [ ] Trang admin danh sách workshop.
- [ ] Form tạo workshop.
- [ ] Form chỉnh sửa workshop.
- [ ] UI tạo/cập nhật/cancel session.

### Acceptance

- [ ] Sinh viên xem được workshop published.
- [ ] Admin tạo, sửa, hủy được workshop/session.
- [ ] Session bị cancel không còn cho đăng ký mới.
- [ ] Remaining seats không hiển thị vượt quá capacity.

## 7. Registration và seat allocation

Nguồn spec: `blueprint/specs/registration.md`.

### Backend

- [ ] Tạo domain model cho `Registration` và `QrTicket`.
- [ ] Cài đặt API đăng ký free session.
- [ ] Cài đặt API khởi tạo đăng ký paid session ở trạng thái `PENDING_PAYMENT`.
- [ ] Bảo đảm một sinh viên không đăng ký trùng cùng session.
- [ ] Dùng database transaction và locking phù hợp để chống overbooking.
- [ ] Chỉ tạo QR ticket khi registration đạt `CONFIRMED`.
- [ ] Cài đặt API xem danh sách đăng ký của sinh viên.
- [ ] Cài đặt API xem detail registration.
- [ ] Cài đặt API lấy QR ticket của registration.
- [ ] Cài đặt cleanup job cho paid reservation hết hạn.
- [ ] Xử lý retry/idempotency cho registration request khi client gửi lại.
- [ ] Trả lỗi rõ ràng khi hết chỗ, session đóng, user không phải sinh viên hoặc đã đăng ký.

### Web

- [ ] Button đăng ký free session.
- [ ] Button đăng ký paid session chuyển sang payment flow.
- [ ] Trang hoặc modal hiển thị kết quả đăng ký.
- [ ] Trang danh sách workshop đã đăng ký.
- [ ] Trang QR ticket của sinh viên.
- [ ] Hiển thị trạng thái `PENDING_PAYMENT`, `CONFIRMED`, `PAYMENT_FAILED`, `EXPIRED`, `CANCELED`.

### Acceptance

- [ ] Không bao giờ có số registration confirmed vượt capacity.
- [ ] Đăng ký free thành công tạo QR ngay.
- [ ] Đăng ký paid chỉ tạo QR sau khi payment thành công.
- [ ] Reservation hết hạn giải phóng chỗ.

## 8. Payment

Nguồn spec: `blueprint/specs/payment.md`.

### Backend

- [ ] Tạo domain model cho `PaymentIntent`.
- [ ] Tạo payment provider port trong application layer.
- [ ] Cài đặt mock hoặc sandbox payment adapter.
- [ ] Cài đặt API tạo payment intent cho registration `PENDING_PAYMENT`.
- [ ] Cài đặt API xem payment status.
- [ ] Cài đặt payment callback/webhook.
- [ ] Dùng idempotency key để callback hoặc retry không tạo duplicated payment.
- [ ] Map trạng thái gateway sang `PENDING_GATEWAY`, `PENDING_PAYMENT`, `SUCCEEDED`, `FAILED`, `EXPIRED`, `CANCELED`.
- [ ] Khi payment success, confirm registration trong transaction an toàn.
- [ ] Khi payment failed hoặc expired, cập nhật registration tương ứng.
- [ ] Cài đặt timeout cleanup cho payment pending quá lâu.
- [ ] Cài đặt failure isolation để payment lỗi không làm hỏng workshop browsing.

### Web

- [ ] Tạo trang payment pending/status.
- [ ] Hiển thị retry hoặc hướng dẫn khi payment failed.
- [ ] Poll hoặc refresh payment status.
- [ ] Điều hướng về QR ticket khi payment success.

### Acceptance

- [ ] Callback lặp lại không tạo nhiều payment success.
- [ ] Payment gateway lỗi không làm list/detail workshop bị lỗi.
- [ ] Paid registration chỉ confirmed khi payment success.
- [ ] Timeout làm reservation hết hạn đúng trạng thái.

## 9. Notification

Nguồn spec: `blueprint/specs/notification.md`.

### Backend

- [ ] Tạo domain model cho `Notification`.
- [ ] Tạo notification provider adapter interface.
- [ ] Cài đặt in-app notification provider.
- [ ] Cài đặt email provider hoặc mock email provider.
- [ ] Phát notification khi registration confirmed.
- [ ] Phát notification khi workshop/session update quan trọng.
- [ ] Phát notification khi workshop/session canceled.
- [ ] Lưu trạng thái gửi: `PENDING`, `SENT`, `FAILED`, `RETRYING`.
- [ ] Cài đặt retry worker cho notification failed.
- [ ] Cài đặt API list my notifications.
- [ ] Cài đặt API mark notification as read.
- [ ] Thiết kế để thêm Telegram bằng provider adapter mới mà không đổi logic registration/payment.

### Web

- [ ] UI danh sách notification của sinh viên.
- [ ] Badge hoặc indicator notification chưa đọc.
- [ ] Mark as read.
- [ ] Hiển thị notification xác nhận đăng ký và thay đổi workshop.

### Acceptance

- [ ] Registration confirmed tạo in-app notification.
- [ ] Email lỗi không làm registration rollback.
- [ ] User chỉ xem được notification của chính mình.
- [ ] Provider mới có thể thêm bằng adapter mới.

## 10. Check-in online/offline

Nguồn spec: `blueprint/specs/checkin.md`.

### Backend

- [ ] Tạo domain model cho `CheckinRecord`.
- [ ] Cài đặt API load check-in sessions cho nhân sự check-in.
- [ ] Cài đặt API online QR validation.
- [ ] Xác thực QR ticket active, registration confirmed và đúng session.
- [ ] Chặn QR revoked, expired, invalid hoặc không thuộc session.
- [ ] Chặn duplicate check-in.
- [ ] Cài đặt API sync offline check-in events.
- [ ] Mỗi offline event có client event ID để idempotent sync.
- [ ] Trả kết quả sync theo từng event: accepted, duplicate, rejected.
- [ ] Lưu source mode: `ONLINE` hoặc `OFFLINE_SYNC`.

### Mobile

- [ ] Màn hình login cho check-in staff.
- [ ] Màn hình danh sách session được phép check-in.
- [ ] QR scanner hoặc scanner placeholder có thể demo bằng nhập mã.
- [ ] Online check-in khi có mạng.
- [ ] Lưu offline check-in event vào local storage khi mất mạng.
- [ ] Màn hình hàng đợi offline event chưa sync.
- [ ] Sync lại khi có mạng.
- [ ] Hiển thị accepted, duplicate và rejected sau khi sync.

### Acceptance

- [ ] Online QR hợp lệ được check-in thành công.
- [ ] QR sai hoặc không đúng session bị từ chối.
- [ ] Mất mạng vẫn ghi nhận được event local.
- [ ] Sync lại không tạo duplicate attendance.
- [ ] Staff không truy cập được chức năng admin hoặc student registration.

## 11. CSV import

Nguồn spec: `blueprint/specs/csv-import.md`.

### Backend

- [ ] Tạo domain model cho `CsvImportBatch` và `CsvImportError`.
- [ ] Tạo student import service đọc CSV từ thư mục cấu hình.
- [ ] Validate header và định dạng file.
- [ ] Validate từng row: student ID, email, full name, status.
- [ ] Deduplicate theo student ID.
- [ ] Cập nhật hoặc tạo student profile theo dữ liệu mới.
- [ ] Ghi nhận import status: `PROCESSING`, `SUCCESS`, `PARTIAL_SUCCESS`, `FAILED`, `MISSED`.
- [ ] Ghi lỗi từng dòng nhưng không làm hỏng toàn bộ batch nếu còn row hợp lệ.
- [ ] Cài đặt scheduled nightly import.
- [ ] Cài đặt API list import batches cho organizer.
- [ ] Cài đặt API xem detail batch.
- [ ] Cài đặt API xem lỗi import.

### Web

- [ ] Trang admin xem lịch sử import.
- [ ] Trang detail import batch.
- [ ] Bảng lỗi theo dòng CSV.
- [ ] Hiển thị số dòng thành công, thất bại, bỏ qua và trạng thái batch.

### Acceptance

- [ ] File hợp lệ cập nhật student data.
- [ ] File có một số dòng lỗi vẫn import được dòng hợp lệ.
- [ ] File sai format bị đánh dấu failed.
- [ ] Import lỗi không làm dừng hệ thống đang chạy.

## 12. AI summary

Nguồn spec: `blueprint/specs/ai-summary.md`.

### Backend

- [ ] Tạo domain model cho `WorkshopDocument` và `AiSummary`.
- [ ] Cài đặt object storage adapter cho PDF upload.
- [ ] Cài đặt API organizer upload PDF cho workshop.
- [ ] Validate file type, size và quyền truy cập.
- [ ] Tạo AI summary job sau khi upload thành công.
- [ ] Cài đặt worker extract text từ PDF.
- [ ] Cài đặt AI provider adapter hoặc mock adapter.
- [ ] Lưu summary và trạng thái `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`.
- [ ] Cài đặt API xem summary trên workshop detail.
- [ ] Cài đặt API organizer xem processing status.
- [ ] AI lỗi không làm workshop detail bị lỗi.

### Web

- [ ] UI upload PDF trong admin workshop detail.
- [ ] Hiển thị trạng thái xử lý summary.
- [ ] Hiển thị summary trên trang detail workshop cho sinh viên khi completed.
- [ ] Hiển thị fallback khi summary pending hoặc failed.

### Acceptance

- [ ] Organizer upload PDF hợp lệ thành công.
- [ ] Worker tạo summary hoặc ghi failed rõ ràng.
- [ ] Student xem được summary completed.
- [ ] File lỗi hoặc AI timeout không ảnh hưởng chức năng browse.

## 13. Rate limiting và cơ chế bảo vệ hệ thống

Nguồn thiết kế: `blueprint/design.md`.

- [ ] Cài đặt Redis-backed rate limiting cho API nhạy cảm.
- [ ] Tách giới hạn theo IP và theo user khi đã đăng nhập.
- [ ] Ưu tiên bảo vệ endpoint registration/payment.
- [ ] Trả HTTP 429 với response rõ ràng khi vượt giới hạn.
- [ ] Cài đặt idempotency cho registration và payment request/callback.
- [ ] Cài đặt circuit breaker hoặc graceful degradation cho payment provider.
- [ ] Không dùng Redis làm source of truth cho seat allocation.
- [ ] Thêm log hoặc metric cơ bản cho rate limit, payment failure, worker failure.

## 14. Database và migration

- [ ] Kiểm tra migration khớp với `blueprint/database.md`.
- [ ] Thêm constraint cho các enum/status quan trọng.
- [ ] Thêm unique constraint cho:
  - [ ] `users.email`
  - [ ] `roles.name`
  - [ ] student ID
  - [ ] một registration active/confirmed cho một student và session
  - [ ] payment idempotency key hoặc provider transaction ID
  - [ ] QR ticket token/hash
  - [ ] offline check-in client event ID
- [ ] Thêm index cho list/filter phổ biến:
  - [ ] workshop status/date
  - [ ] session workshop/date/status
  - [ ] registration student/session/status
  - [ ] payment registration/status
  - [ ] notification user/read status
  - [ ] check-in session/registration
- [ ] Seed đủ dữ liệu để demo toàn bộ flow.

## 15. Testing

### Backend

- [ ] Unit test domain rule cho registration overbooking.
- [ ] Unit test registration duplicate.
- [ ] Unit test payment idempotency.
- [ ] Unit test check-in duplicate.
- [ ] Unit test CSV row validation.
- [ ] Integration test auth protected endpoints.
- [ ] Integration test free registration flow.
- [ ] Integration test paid registration success callback.
- [ ] Integration test payment failed/expired.
- [ ] Integration test offline check-in sync idempotent.
- [ ] Integration test CSV partial success.

### Web/Mobile

- [ ] Test login và role-based routing.
- [ ] Test workshop list/detail render từ API.
- [ ] Test registration UI state.
- [ ] Test admin create/update/cancel workshop.
- [ ] Test notification list.
- [ ] Test mobile offline queue và sync result display.

### Manual demo checklist

- [ ] Student login.
- [ ] Browse workshop list.
- [ ] View workshop detail.
- [ ] Register free workshop và xem QR.
- [ ] Register paid workshop, payment success và xem QR.
- [ ] Payment duplicate callback không tạo duplicate.
- [ ] Organizer create/update/cancel workshop.
- [ ] Student nhận notification.
- [ ] Check-in online bằng QR.
- [ ] Check-in offline và sync lại.
- [ ] CSV import partial success.
- [ ] PDF upload và AI summary.

## 16. Documentation và demo deliverables

- [ ] README root mô tả đầy đủ cách chạy.
- [ ] README backend mô tả migration, env và API base URL.
- [ ] README web mô tả env và lệnh dev/build.
- [ ] README mobile mô tả cách chạy Expo và demo offline.
- [ ] Tài liệu tài khoản demo.
- [ ] Tài liệu demo flow cho người chấm.
- [ ] API collection hoặc danh sách endpoint chính.
- [ ] Video demo các flow bắt buộc:
  - [ ] registration có seat protection
  - [ ] paid registration có idempotency
  - [ ] payment failure handling
  - [ ] offline check-in và synchronization
  - [ ] CSV import
  - [ ] AI summary processing
  - [ ] notification in-app/email
  - [ ] RBAC theo từng role

## 17. Phân công gợi ý

| Nhóm việc | Vai trò phù hợp | Ghi chú |
| --- | --- | --- |
| Auth/RBAC + security | Backend | Là nền tảng cho mọi module khác |
| Workshop + admin web | Backend + Web | Có thể làm song song sau khi auth ổn |
| Registration + payment | Backend | Cần ưu tiên test concurrency/idempotency |
| Student web flow | Web | Phụ thuộc workshop, auth, registration API |
| Check-in mobile | Mobile + Backend | Cần thống nhất QR payload và sync contract sớm |
| CSV import | Backend | Có thể làm độc lập sau khi student schema ổn |
| AI summary | Backend + Web | Có thể dùng mock adapter cho demo ổn định |
| Notification | Backend + Web | Nên gắn với event từ registration/workshop |
| Documentation + demo | Cả nhóm | Cập nhật liên tục, không để cuối cùng |

## 18. Definition of Done

Một task chỉ được xem là xong khi:

- Code chạy được trong môi trường local theo README.
- API có validation, authorization và error response phù hợp.
- Dữ liệu được lưu đúng schema và không phá constraint.
- Có test tương ứng với rủi ro chính của task.
- UI xử lý được loading, success và error state.
- Không làm hỏng flow demo hiện có.
- README hoặc tài liệu liên quan được cập nhật nếu task thay đổi cách chạy hoặc cách demo.

