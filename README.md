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

Start PostgreSQL, Redis, the backend API, and the web app:

```
docker compose up -d
```

Compose supplies local development defaults for Postgres, Redis, JWT, mail, and
payment settings. Use a root `.env` file only when you need to override those
defaults for Docker.

## Backend (Spring Boot)

```
cd src/backend
mvn spring-boot:run
```

Health check:

```
http://localhost:8080/api/health
```

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

- Backend local run: copy `src/backend/.env.example` to `src/backend/.env` and adjust as needed.
- Web: copy `src/web/.env.example` to `.env.local`.
- Mobile: copy `src/mobile/.env.example` to `.env`.

## Status

Scaffold only. Business features, authentication, payments, and check-in logic
are not implemented yet.
