# UniHub Workshop System

UniHub Workshop is a multi-platform system for running workshops, managing
registrations, and supporting check-in operations. This repository currently
contains scaffolded projects only.

## Structure

```
blueprint/              # Architecture and requirements documentation
src/
  backend/              # Spring Boot API (Maven)
  web/                  # Next.js web app (TypeScript)
  mobile/               # Expo React Native app (TypeScript)
data/                   # Local sample data and seeds
```

## Prerequisites

- Node.js 20+
- Java 21 (or Java 17 if required)
- Maven 3.9+
- Docker Desktop
- Expo CLI (optional, for mobile development)

## Local infrastructure

Start PostgreSQL, Redis, and MinIO:

```
docker compose up -d
```

## Backend (Spring Boot)

```
cd src/backend
mvn spring-boot:run
```

Health check:

```
http://localhost:8080/api/health
```

### AI Summary From Workshop PDFs

The backend supports asynchronous AI summaries for uploaded workshop PDFs.
Organizers upload PDF documents, the backend stores the file in object storage,
creates a `PENDING` summary job, and a scheduled worker later extracts PDF text
and calls Gemini.

Endpoints:

```
POST /api/admin/workshops/{workshopId}/documents
GET  /api/workshops/{workshopId}/summary
GET  /api/admin/documents/{documentId}/summary-status
```

Required backend variables:

```
APP_AI_SUMMARY_ENABLED=true
APP_AI_SUMMARY_PROVIDER=gemini
APP_AI_SUMMARY_WORKER_ENABLED=true
APP_AI_SUMMARY_POLL_INTERVAL_MS=5000
APP_AI_SUMMARY_MAX_FILE_SIZE_MB=10
APP_AI_SUMMARY_MAX_INPUT_CHARS=20000
APP_AI_SUMMARY_TIMEOUT_SECONDS=30
APP_AI_SUMMARY_STORAGE_TYPE=local
APP_AI_SUMMARY_STORAGE_LOCAL_DIRECTORY=./data/object-storage/workshop-documents
APP_AI_SUMMARY_GEMINI_API_KEY=
APP_AI_SUMMARY_GEMINI_BASE_URL=https://generativelanguage.googleapis.com
APP_AI_SUMMARY_GEMINI_MODEL=gemini-2.5-flash-lite
```

For local demos, set `APP_AI_SUMMARY_GEMINI_API_KEY` only in your local `.env`.
Never commit real API keys. Uploaded PDFs are stored under the configured local
object storage directory; PostgreSQL stores only metadata and summary state.

Summary statuses are `PENDING`, `PROCESSING`, `COMPLETED`, and `FAILED`.
Failures are isolated from workshop browsing, registration, payment, and
check-in. A failed summary is returned as status `FAILED` with an error code
instead of breaking workshop detail.

Backend-only manual demo:

1. Start infrastructure and backend.
2. Login as an organizer and upload a small PDF with
   `POST /api/admin/workshops/{workshopId}/documents` using multipart field
   `file`.
3. Verify the response has `uploadStatus=UPLOADED` and
   `summaryStatus=PENDING`.
4. Poll `GET /api/admin/documents/{documentId}/summary-status` until the
   summary reaches `COMPLETED` or `FAILED`.
5. Call `GET /api/workshops/{workshopId}/summary` and verify completed
   summaries include `summaryText`.
6. Upload a non-PDF and a file larger than `APP_AI_SUMMARY_MAX_FILE_SIZE_MB`
   to verify the `400` and `413` validation paths.
7. Login as a student and verify admin document endpoints return `403`.
8. Break the Gemini key locally and verify summary processing becomes
   `FAILED` while workshop APIs continue to respond.

## Web (Next.js)

```
cd src/web
npm install
npm run dev
```

## Mobile (Expo)

```
cd src/mobile
npm install
npx expo start
```

## Environment variables

- Backend: copy `src/backend/.env.example` to `.env` and adjust as needed.
- Web: copy `src/web/.env.example` to `.env.local`.
- Mobile: copy `src/mobile/.env.example` to `.env`.

## Status

Scaffold only. Business features, authentication, payments, and check-in logic
are not implemented yet.
