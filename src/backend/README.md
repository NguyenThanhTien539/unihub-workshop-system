# UniHub Backend (Scaffold)

This folder contains the Spring Boot backend scaffold for UniHub Workshop.

- Java: 21 (fallback to 17 if your environment requires)
- Build tool: Maven
- Modules: presentation, application, domain, infrastructure

## Local Database

The backend defaults to a local PostgreSQL database:

```text
jdbc:postgresql://localhost:55432/unihub
```

Start the local database from the repository root:

```bash
docker compose up -d unihub-postgres
```

The Docker container still uses PostgreSQL port `5432` internally, but it is
published on host port `55432` to avoid conflicts with any existing local
PostgreSQL installation.

The default local credentials are development-only and match
`src/backend/.env.example`.

## Run

From this directory:

```bash
mvn spring-boot:run
```

Flyway runs automatically on startup and seeds demo users from
`src/main/resources/db/migration/V9__seed_demo_data.sql`.
