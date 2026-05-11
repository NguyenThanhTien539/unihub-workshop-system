# UniHub Backend

This folder contains the Spring Boot backend for UniHub Workshop.

- Java: 21
- Build tool: Maven
- Modules: presentation, application, domain, infrastructure

## Rate Limiting

The backend uses Redis-backed token-bucket rate limiting so limits still work
correctly across multiple backend instances. Redis is used only for volatile
coordination, not as the source of truth for registrations or check-ins.

Protected endpoints:

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/registrations/free`
- `POST /api/registrations/paid`
- `POST /api/payments/**` and `POST /api/payment/**`
- `POST /api/checkin/sync`

Default limits:

- Login: `10/minute` per IP
- Refresh: `30/minute` per authenticated user, fallback to IP
- Registration: `5/minute` per authenticated user, fallback to IP
- Payment: `10/minute` per authenticated user, fallback to IP
- Check-in sync: `30/minute` per authenticated user, fallback to IP
- Global API fallback: `120/minute` per IP

Useful environment variables:

```env
APP_RATE_LIMIT_ENABLED=true
APP_RATE_LIMIT_ALGORITHM=token-bucket
APP_RATE_LIMIT_TRUST_FORWARDED_FOR=false

APP_RATE_LIMIT_DEFAULT_IP_LIMIT=120
APP_RATE_LIMIT_DEFAULT_IP_REFILL_TOKENS=120
APP_RATE_LIMIT_DEFAULT_IP_REFILL_PERIOD_SECONDS=60

APP_RATE_LIMIT_LOGIN_CAPACITY=10
APP_RATE_LIMIT_LOGIN_REFILL_TOKENS=10
APP_RATE_LIMIT_LOGIN_REFILL_PERIOD_SECONDS=60

APP_RATE_LIMIT_AUTH_REFRESH_CAPACITY=30
APP_RATE_LIMIT_AUTH_REFRESH_REFILL_TOKENS=30
APP_RATE_LIMIT_AUTH_REFRESH_REFILL_PERIOD_SECONDS=60

APP_RATE_LIMIT_REGISTRATION_CAPACITY=5
APP_RATE_LIMIT_REGISTRATION_REFILL_TOKENS=5
APP_RATE_LIMIT_REGISTRATION_REFILL_PERIOD_SECONDS=60

APP_RATE_LIMIT_PAYMENT_CAPACITY=10
APP_RATE_LIMIT_PAYMENT_REFILL_TOKENS=10
APP_RATE_LIMIT_PAYMENT_REFILL_PERIOD_SECONDS=60

APP_RATE_LIMIT_CHECKIN_SYNC_CAPACITY=30
APP_RATE_LIMIT_CHECKIN_SYNC_REFILL_TOKENS=30
APP_RATE_LIMIT_CHECKIN_SYNC_REFILL_PERIOD_SECONDS=60
```

Notes:

- `OPTIONS` requests and `/api/health` are skipped.
- `GET /api/workshops/**` is skipped to avoid throttling read-heavy browsing.
- If Redis is temporarily unavailable, the limiter fails open so normal API
  traffic is not blocked by the coordination layer being down.

Quick test examples:

```bash
curl -i -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student1@unihub.local","password":"Password123!"}'
```

Repeat the login request more than 10 times inside one minute and expect:

- HTTP `429 Too Many Requests`
- body error code `RATE_LIMIT_EXCEEDED`
- `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and
  `X-RateLimit-Reset` headers
