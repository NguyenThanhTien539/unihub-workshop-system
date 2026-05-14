# Kế hoạch Triển khai Ứng dụng Mobile (UniHub Check-in App)

Tài liệu này vạch ra lộ trình chi tiết để hoàn thiện ứng dụng mobile (hiện đang ở mức 10% - Skeleton) thành một ứng dụng check-in sinh viên hoàn chỉnh, hoạt động được trong môi trường không có mạng (Offline-first).

## Phạm vi và Mục tiêu

- **Công nghệ:** Expo, React Native, TypeScript.
- **Tính năng cốt lõi:** Đăng nhập cho Check-in Staff, tải danh sách session cần quản lý, quét mã QR sinh viên, lưu check-in (có hỗ trợ offline), đồng bộ dữ liệu khi có mạng.

---

## Các giai đoạn triển khai (Phases)

### Giai đoạn 1: Thiết lập nền tảng & Cấu trúc dự án (Infrastructure)

1. **Cài đặt thư viện thiết yếu:**
   - `expo-camera` (Quét QR).
   - `expo-sqlite` (Lưu trữ dữ liệu Offline).
   - `expo-secure-store` (Lưu trữ JWT Tokens an toàn).
   - `axios` (HTTP Client) hoặc sử dụng Fetch API mặc định.
   - Thư viện quản lý state (Ví dụ: Zustand hoặc React Context) để quản lý trạng thái mạng và Auth.
2. **Setup API Client:**
   - Tạo instance API với interceptors tự động đính kèm Access Token.
   - Xử lý logic tự động refresh token khi token hết hạn (gọi API `/api/auth/refresh`).
   - Xử lý lỗi báo mất kết nối mạng.

### Giai đoạn 2: Hoàn thiện Xác thực (Authentication)

1. **Cập nhật `LoginScreen.tsx`:**
   - Gọi API thực tế `/api/auth/login`.
   - Bắt lỗi thông tin đăng nhập sai và hiển thị cảnh báo.
2. **Lưu trữ phiên đăng nhập:**
   - Nếu đăng nhập thành công, lấy Access Token và Refresh Token lưu vào SecureStore.
   - Cập nhật Navigation: Điều hướng người dùng đã login vào màn hình chính, chưa login về màn hình Login.

### Giai đoạn 3: Tích hợp Database Cục bộ (Offline SQLite)

1. **Thiết kế Schema Cục bộ:**
   - Bảng `sessions`: Lưu thông tin các buổi workshop đang được giao (id, tên, thời gian, địa điểm).
   - Bảng `registrations`: (Tuỳ chọn) Lưu cache danh sách sinh viên đã đăng ký để kiểm tra hợp lệ offline.
   - Bảng `sync_queue` (Check-in Records): Lưu danh sách check-in offline cần đồng bộ (id tự tăng, qr_code_data, timestamp, status).
2. **Tạo Database Layer:**
   - Khởi tạo file DB trong storage của thiêt bị.
   - Viết các hàm CRUD (Data Access Object - DAO): `saveSession`, `getSessions`, `saveCheckinRequest`, `getPendingSyncs`, `markSyncComplete`.

### Giai đoạn 4: Danh sách Session & Lịch trình (Checkin Sessions)

1. **Cập nhật `CheckinSessionsScreen.tsx`:**
   - Khi có mạng: Fetch danh sách session từ Backend (API `/api/checkin/sessions` của Check-in Staff). Lưu cache (upsert) xuống SQLite.
   - Khi mất mạng: Load danh sách session từ SQLite.
2. **Giao diện:**
   - Hiển thị danh sách các buổi Workshop mà Staff đang trực. Cho phép bấm vào một buổi để vào màn hình quét QR tương ứng với khóa đó.

### Giai đoạn 5: Tích hợp Camera & Quét QR (QR Scanner)

1. **Cập nhật `QrScannerPlaceholderScreen.tsx`:**
   - Yêu cầu quyền truy cập Camera từ OS (Permissions tích hợp sẵn của Expo Camera).
   - Hiển thị Viewport của Camera để nhận diện QR Code.
2. **Logic xử lý QR Code:**
   - Khi quét thành công, extract dữ liệu payload (Registration ID hoặc thông tin mã).
   - Hiển thị Bottom Sheet hoặc Modal xác nhận: "Tên SV XYZ - Đăng ký hợp lệ -> Bấm Check-in".
   - Ngăn chặn quét liên tục (debounce) chống spam.

### Giai đoạn 6: Logic Check-in & Đồng bộ hóa Offline (Offline Sync)

1. **Xử lý ghi nhận Check-in:**
   - Thực thi Check-in vào Event chứa trong app (có thể so sánh mã nếu đã cache, hoặc lưu chuỗi QR).
   - **Thử gửi API online:** Gọi API Check-in (ví dụ `/api/checkin/validate`).
     - _Thành công:_ Ghi nhận đã check-in trên màn hình, lưu log lịch sử.
     - _Thất bại (do mất mạng):_ Lưu payload xuống bảng `sync_queue` của SQLite với trạng thái `PENDING`.
2. **Cập nhật `OfflineSyncScreen.tsx`:**
   - Load và hiển thị số lượng record đang chờ đồng bộ (`PENDING`).
   - Cung cấp nút "Đồng bộ ngay" (Manual Sync).
3. **Background/Foreground Sync logic:**
   - Viết tính năng đọc bảng `sync_queue`, lặp qua từng record để retry gọi backend API.
   - Khi backend trả về 200 OK -> cập nhật `sync_queue` thành `SYNCED` hoặc xóa record.
   - Cần bắt lỗi duplicate gracefully (nếu backend đã ghi nhận nhưng do chập chờn mạng nên mobile gửi lại).

---

## Thứ tự Ưu tiên (Priority)

1. **P0:** Auth (Xử lý JWT, Login liên thông Backend).
2. **P0:** Quét QR (UI Camera và decode QR).
3. **P1:** Bảng `sync_queue` SQLite để lưu nháp kết quả quét.
4. **P1:** Đồng bộ dữ liệu thủ công từ SQLite lên Backend (Fetch API với retry).
5. **P2:** Cache danh sách Session về bộ nhớ thiết bị.
