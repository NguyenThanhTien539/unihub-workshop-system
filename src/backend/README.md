# UniHub Backend

This folder contains the Spring Boot backend for UniHub Workshop.

- Java: 21 (fallback to 17 if your environment requires)
- Build tool: Maven
- Modules: presentation, application, domain, infrastructure

## Auth/RBAC demo accounts

The Flyway demo seed creates these accounts:

| Role | Email | Password |
| ---- | ----- | -------- |
| student | `student1@university.edu.vn` | `Password123!` |
| organizer | `organizer@university.edu.vn` | `Password123!` |
| checkin_staff | `checkin@university.edu.vn` | `Password123!` |

Passwords are stored as BCrypt hashes via PostgreSQL `crypt(..., gen_salt('bf'))`; plaintext passwords are not stored in the database.

## Auth endpoints

| Method | Endpoint | Access |
| ------ | -------- | ------ |
| `POST` | `/api/auth/login` | Public |
| `POST` | `/api/auth/refresh` | Public |
| `POST` | `/api/auth/logout` | Authenticated |
| `GET` | `/api/auth/me` | Authenticated |

Login returns a short-lived JWT access token and an opaque refresh token. Refresh tokens are hashed before persistence and are rotated on every successful refresh.

## Security notes

- JWT secret is read from `JWT_SECRET`; it must be at least 32 characters.
- CORS origins are configured with `CORS_ALLOWED_ORIGINS`, defaulting to `http://localhost:3000,http://localhost:8081`.
- The REST API uses Bearer tokens and refresh tokens in the JSON body, so CSRF is disabled for stateless API requests. Revisit CSRF if cookie-based auth is introduced.
- `/api/payments/webhook` is public at the Spring Security layer because the Payment module must verify gateway signatures/shared secrets itself.

## Running tests

```bash
mvn test
```

Focused Auth/RBAC tests:

```bash
mvn -Dtest=AuthCommandServiceTest,AuthControllerTest,RbacSecurityTest test
```
