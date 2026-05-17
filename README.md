# UniHub Workshop System

UniHub Workshop System là hệ thống quản lý workshop gồm backend API, web admin/student portal và mobile app cho sinh viên, organizer, check-in staff.

## Thành phần chính

| Thành phần | Công nghệ | Thư mục | Port mặc định |
| --- | --- | --- | --- |
| Backend API | Spring Boot, Java 21, Maven | `src/backend` | `8080` |
| Web app | Next.js | `src/web` | `3000` |
| Mobile app | Expo, React Native | `src/mobile` | `8081`, `19000-19002` |
| Redis | Redis 7 | Docker service | `6379` |
| Object storage | MinIO | Docker service | `9000`, `9001` |

## Yêu cầu cài đặt

Cách dễ nhất là chạy bằng Docker:

- Docker Desktop
- Docker Compose
- Git

Nếu muốn chạy từng app ở máy local:

- Java 21
- Maven
- Node.js 20+
- npm
- Expo Go trên điện thoại nếu chạy mobile bằng thiết bị thật

## Cấu hình môi trường

Backend dùng file `src/backend/.env`. Nếu chưa có, tạo từ file mẫu ở root:

```powershell
Copy-Item .env.example src/backend/.env
```

Sau đó chỉnh các biến cần thiết trong `src/backend/.env`, đặc biệt:

- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
- `JWT_SECRET`
- cấu hình mail nếu bật gửi email
- cấu hình ZaloPay nếu bật thanh toán
- `APP_AI_SUMMARY_GEMINI_API_KEY` nếu dùng AI summary

Không commit file `.env` chứa secret thật.

## Chạy backend và web bằng Docker

Từ thư mục root:

```powershell
docker compose up --build
```

Các URL sau khi chạy:

- Web app: `http://localhost:3000`
- Backend API: `http://localhost:8080`
- MinIO console: `http://localhost:9001`

Tài khoản MinIO mặc định:

```text
username: minioadmin
password: minioadmin123
```

Dừng hệ thống:

```powershell
docker compose down
```

Dừng và xóa volume Docker:

```powershell
docker compose down -v
```

## Chạy từng thành phần ở local

### Backend

```powershell
cd src/backend
mvn spring-boot:run
```

Backend cần PostgreSQL, Redis và các biến trong `.env`. Nếu chỉ muốn dùng Redis/MinIO từ Docker:

```powershell
docker compose up redis minio
```

Chạy test backend:

```powershell
cd src/backend
mvn test
```

## Flyway database migration

Backend dùng Flyway để quản lý schema và seed data cho PostgreSQL. Flyway được bật sẵn trong `src/backend/src/main/resources/application.yml`:

```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
```

Các file migration nằm tại:

```text
src/backend/src/main/resources/db/migration
```

Khi backend khởi động, Flyway tự kiểm tra bảng `flyway_schema_history` trong database và chạy những migration chưa được áp dụng.

Quy tắc thêm migration mới:

- Tạo file SQL mới trong `src/backend/src/main/resources/db/migration`
- Đặt tên theo format `V<number>__description.sql`
- Số version phải tăng dần, ví dụ migration tiếp theo sau `V17__add_ai_summary_worker_retry_fields.sql` là `V18__ten_thay_doi.sql`
- Không sửa nội dung migration đã chạy trên database chung hoặc database production
- Nếu cần thay đổi tiếp, tạo migration mới thay vì sửa file cũ

Chạy migration bằng cách khởi động backend:

```powershell
docker compose up --build unihub-backend
```

Hoặc chạy local:

```powershell
cd src/backend
mvn spring-boot:run
```

Nếu database local bị lệch schema trong quá trình phát triển, có thể reset database local rồi chạy lại backend để Flyway tạo lại schema. Chỉ làm việc này với database local/dev, không dùng cho production.

### Web

```powershell
cd src/web
npm install
npm run dev
```

Mở:

```text
http://localhost:3000
```

Web app mặc định gọi backend ở `http://localhost:8080`. Có thể đổi bằng biến:

```powershell
$env:NEXT_PUBLIC_API_URL="http://localhost:8080"
```

### Mobile

Mobile chạy bằng terminal để Expo hiển thị QR code trực tiếp và dễ kết nối với điện thoại thật.

```powershell
cd src/mobile
npm install
Copy-Item .env.example .env
```

Nếu chạy trên điện thoại thật, điện thoại và máy tính phải cùng mạng Wi-Fi/LAN. Lấy IP LAN của máy tính, ví dụ `192.168.1.10`, rồi chỉnh `src/mobile/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8080
```

Thay `192.168.1.10` bằng IP LAN của máy tính. Sau đó chạy Expo:

```powershell
npm run start -- --host lan
```

Mở Expo Go trên điện thoại và quét QR code hiển thị trong terminal.

Nếu không kết nối được từ điện thoại, kiểm tra:

- điện thoại và máy tính đang cùng mạng
- firewall cho phép port `8080`, `8081`, `19000`, `19001`, `19002`
- `EXPO_PUBLIC_API_BASE_URL` dùng IP LAN của máy tính, không phải `localhost`

Chạy mobile dạng web:

```powershell
cd src/mobile
npm run web
```

Type-check mobile:

```powershell
cd src/mobile
npx tsc --noEmit
```

Nếu PowerShell chặn `npx`:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
```

## Import CSV sinh viên

Backend đọc file CSV từ:

```text
data/import
```

Tên file mặc định:

```text
students-*.csv
```

Cột CSV mẫu:

```csv
student_id,full_name,email,faculty,major,class_name,status
S001,Nguyen An,an@example.com,Engineering,Software,SE-01,ACTIVE
```

## Tài khoản demo

Các tài khoản seed bởi migration:

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Student | `student1@university.edu.vn` | `Password123!` |
| Organizer | `organizer@university.edu.vn` | `Password123!` |
| Check-in staff | `checkin@university.edu.vn` | `Password123!` |

## Lệnh hữu ích

Kiểm tra Docker Compose:

```powershell
docker compose config
```

Build lại service cụ thể:

```powershell
docker compose up --build unihub-backend
docker compose up --build unihub-web
```

Xem log:

```powershell
docker compose logs -f unihub-backend
docker compose logs -f unihub-web
```
