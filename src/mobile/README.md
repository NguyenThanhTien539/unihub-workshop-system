# UniHub Workshop Mobile

Expo + React Native mobile app for UniHub Workshop.

## Stack

- Location: `src/mobile`
- Runtime: Expo SDK 54
- Entry point: `index.ts` registers `App.tsx`
- Package manager: npm
- Expo Router: not used

## Configuration

Create a local environment file when connecting to a backend:

```bash
cp .env.example .env
```

Default value:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

Change this value for emulator, LAN, ngrok, or production API hosts.

## Setup

```bash
cd src/mobile
npm install
```

## Run

Expo Go:

```bash
npm run start
```

Android emulator:

```bash
npm run android
```

Browser:

```bash
npm run web
```

From the repository root, the same command is available through the root
package script:

```bash
npm run web
```

The browser URL is usually:

```text
http://localhost:8081
```

## Checks

Type-check the mobile app:

```bash
npx tsc --noEmit
```

If PowerShell blocks `npx` scripts on Windows:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
```

## Backend APIs

Demo accounts seeded by the backend migrations:

| Role | Email | Password |
| ---- | ----- | -------- |
| Student | `student1@university.edu.vn` | `Password123!` |
| Organizer | `organizer@university.edu.vn` | `Password123!` |
| Check-in staff | `checkin@university.edu.vn` | `Password123!` |

The app uses `EXPO_PUBLIC_API_BASE_URL` and calls:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/workshops`
- `GET /api/workshops/{id}`
- `GET /api/admin/rooms`
- `POST /api/admin/workshops`
- `PATCH /api/admin/workshops/{id}`
- `POST /api/admin/workshops/{id}/publish`
- `POST /api/admin/workshops/{id}/cancel`
- `POST /api/admin/workshops/{id}/sessions`
- `PATCH /api/admin/sessions/{id}`
- `GET /api/registrations`
- `POST /api/registrations`
- `GET /api/registrations/auth-test`
- `GET /api/checkin/auth-test`

QR verification, assigned check-in sessions, offline sync, check-in history,
and registration statistics require backend endpoints that are not currently
exposed. The mobile app shows empty or unavailable states for those areas
instead of local data.
