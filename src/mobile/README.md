# UniHub Workshop Mobile

Expo + React Native mobile demo for UniHub Workshop.

## Stack

- Location: `src/mobile`
- Runtime: Expo SDK 54
- Entry point: `index.ts` registers `App.tsx`
- Package manager: npm, because this folder has `package-lock.json`
- Native folders: none committed. Use Expo Go, Expo web, or Expo-managed emulator launch.
- Expo Router: not used.

## Prerequisites

- Node.js and npm. The repo does not pin a Node version with `.nvmrc`, `.node-version`, or `engines`; Node 20 LTS or newer is recommended. The app has been checked locally with Node 22.
- Expo Go on an Android/iOS phone if testing on a physical device.
- Android Studio with an Android Emulator if testing on an emulator.
- Java/JDK is only needed for Android emulator/tooling or future native builds. This Expo app does not currently include Gradle/Android native project files.
- Optional: a backend API running at the URL in `.env`. The current mobile UI uses mock data, so the backend is not required for the demo screens.

## Setup From Fresh Clone

```bash
git clone <repo-url>
cd unihub-workshop-system
cd src/mobile
npm install
```

Create a local environment file if you plan to connect to the backend later:

```bash
cp .env.example .env
```

Default value:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

## Run With Expo Go

```bash
cd src/mobile
npm run start
```

Then:

1. Install Expo Go on your phone.
2. Make sure the phone and computer are on the same network.
3. Scan the QR code shown by Expo.
4. If the QR connection has network issues, press `t` in the Expo terminal to switch tunnel/LAN mode.

## Run On Android Emulator

1. Install Android Studio.
2. Install an Android SDK and create an Android Virtual Device.
3. Start the emulator.
4. Run:

```bash
cd src/mobile
npm run android
```

This runs `expo start --android`. It does not require a committed `android/`
folder because the app is using Expo-managed development.

## Run In Browser Preview

```bash
cd src/mobile
npm run web
```

Open the local Expo URL printed in the terminal, usually:

```text
http://localhost:8081
```

## Useful Checks

Type-check the mobile app:

```bash
cd src/mobile
npx tsc --noEmit
```

If PowerShell blocks `npx` scripts on Windows, use:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
```

## Sample Accounts

- Student: `student@unihub.test` / `123456`
- Check-in Staff: `checkin@unihub.test` / `123456`
- Organizer/Admin: `organizer@unihub.test` / `123456`

The mobile UI validates these accounts locally for the demo. Real login should
replace this with `POST /api/auth/login`.

## Demo Screens

- Role entry / sample account login
- Demo register screen with validation and role selection
- Student workshop list
- Workshop detail with speaker, room, time, fee, seats, AI summary, and room map
- Student my registrations
- Free registration confirmation
- QR ticket display
- Paid workshop payment-unavailable state
- Student profile
- Check-in staff scanner
- Mock QR scanner with valid, already used, invalid, and offline saved states
- Offline check-in queue and mock sync status
- Check-in history
- Check-in staff profile
- Organizer dashboard
- Organizer workshop management list with search and status/free-paid filters
- Organizer workshop detail with registrations, check-ins, seats, and revenue
- Organizer create workshop form with validation
- Organizer edit workshop form with pre-filled data and discard confirmation
- Organizer cancel/delete confirmation flow
- Organizer registration statistics
- Organizer profile

## Backend Status

Backend calls are currently mocked in `src/services/mockApi.ts` with TODO
comments near each integration point:

- `GET /api/workshops`
- `POST /api/workshops/{id}/register` or registration endpoints
- `POST /api/checkins/verify`
- `POST /api/checkins/offline-sync`
- `GET /api/admin/workshops`
- `POST /api/admin/workshops`
- `PATCH /api/admin/workshops/{id}`
- `PATCH /api/admin/workshops/{id}/cancel`
- `DELETE /api/admin/workshops/{id}` for draft workshops with no registrations only

Offline check-in data is currently sample data. It should later be persisted in
SQLite for React Native, matching the blueprint offline check-in design.

Frontend role guards are for user experience only. Backend RBAC must remain the
real security boundary using JWT role claims.

## Organizer Flow

1. Log in with `organizer@unihub.test` / `123456`.
2. Open the `Workshops` tab.
3. Use search/status/fee filters to inspect workshop cards.
4. Tap `Create Workshop` to add a draft or published workshop to mock state.
5. Tap `View Detail` to inspect full information and revenue estimate.
6. Tap `Edit` to update workshop fields.
7. Tap `Cancel/Delete` to open a confirmation dialog.

Cancellation is modeled as a soft cancel when students are registered. Draft
workshops with zero registrations can be removed from the local mock list.
