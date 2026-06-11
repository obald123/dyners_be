# Dyners API

Express 5 + TypeScript + Prisma (PostgreSQL) + Cloudinary REST API powering dyners.rw.

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT_ACCESS_SECRET, ADMIN_*, Cloudinary keys
npx prisma migrate deploy
npm run db:seed        # creates the admin user + seeds site content
npm run dev            # http://localhost:4000
```

`DATABASE_URL` works with any Postgres — Neon/Supabase free tiers are fine (keep `sslmode=require` in production).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | tsx watch dev server |
| `npm run build` / `npm start` | compile to `dist/` and run |
| `npm test` | vitest + supertest API tests |
| `npm run lint` | eslint |
| `npm run prisma:migrate` | apply migrations (`prisma migrate deploy`) |
| `npm run db:seed` | idempotent seed (admin + content) |

## API overview (`/api/v1`)

- **Public:** `GET /services?tab=`, `GET /menus?category=`, `GET /collection?category=`, `GET /gallery?category=`, `GET /testimonials`, `POST /contact`
- **Auth:** `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET|PATCH /auth/me`
- **Admin (Bearer token):** `*/all` listings + `POST|PATCH|DELETE` on testimonials/gallery/menus/collection/services, `GET /admin/stats`, `GET /admin/activity`, `GET|PATCH|DELETE /admin/messages`, `POST /admin/uploads?folder=` (multipart `file`)

## Security model

- argon2id password hashing; 5 failed logins → 15-minute account lock
- 15-min JWT access tokens + 30-day rotating refresh tokens (httpOnly/Secure/SameSite=strict cookie scoped to `/api/v1/auth`); refresh-token reuse revokes every session
- Rate limits: 300/15min global, 5/15min login, 5/hour contact, 60/15min uploads
- helmet headers, strict CORS allowlist (`CORS_ORIGINS`), 100kb JSON body cap
- All input crosses Zod schemas; Prisma parameterizes every query; DB CHECK constraints on rating/price
- Uploads: 5MB cap, decoded + re-encoded to WebP via sharp (rejects fakes, strips EXIF) before Cloudinary
- pino logs with auth/cookie redaction and request IDs; admin mutations recorded to ActivityLog
