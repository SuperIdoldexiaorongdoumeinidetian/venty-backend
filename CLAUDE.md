# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`venty-backend` is the REST API for **Venty**, a social events app (Expo/React Native frontend): users discover events on a map, organizers ("Veranstalter") publish them, users join ("Teilnahme"), friend each other, and favorite events.

Stack: Fastify 5 + TypeScript (strict, CommonJS) · Prisma 6 + PostgreSQL/PostGIS · Zod for validation · JWT auth (access + rotating refresh tokens) · Vitest + Supertest integration tests.

## Commands

```bash
docker compose up -d db        # PostGIS-DB starten (legt auch venty_test an) – Voraussetzung für Tests/Dev
npm run dev                    # Dev-Server (tsx watch), Port 3000
npm run typecheck              # tsc über src UND tests/seed/api-client (tsconfig.test.json)
npm test                       # alle Integration-Tests (braucht laufende DB!)
npx vitest run tests/auth.test.ts   # einzelne Test-Datei
npm run db:migrate             # neue Migration erstellen (prisma migrate dev)
npm run db:seed                # Testdaten (idempotent; Seed-Passwort: venty1234)
```

A local `.env` (copy of `.env.example`) must exist — even `prisma validate`/`generate` fail without `DATABASE_URL`.

## Architecture

Request flow: **routes → services → repositories → Prisma**, strictly layered:

- [src/routes/](src/routes/) — thin handlers: parse params/body via `parse(schema, data)` ([src/lib/validate.ts](src/lib/validate.ts)), call a service, set status. Auth via `preHandler: [app.authenticate]` (sets `req.userId`).
- [src/services/](src/services/) — all business rules and ownership checks; throw `AppError` via helpers from [src/lib/errors.ts](src/lib/errors.ts) (`forbidden()`, `conflict("…", "EVENT_FULL")` …). Services return DTOs, never raw Prisma models.
- [src/repositories/](src/repositories/) — thin Prisma wrappers; the only layer touching `prisma`.
- [src/lib/dto.ts](src/lib/dto.ts) — central mapping Prisma model → API shape (decides what leaks out; e.g. `passwordHash`/`email` never appear in public profiles). Dates serialized as ISO strings.
- [src/plugins/](src/plugins/) — `fastify-plugin`-wrapped: error handler (translates everything to `{ error: { code, message } }`), JWT auth, CORS (allows localhost + private LAN IPs for Expo dev), per-route rate limit (`AUTH_RATE_LIMIT` on auth routes only).
- Config is zod-validated env in [src/config.ts](src/config.ts) — add new env vars there + `.env.example`.

### Domain invariants

- **Naming is mixed German/English** (carried over from the original C# domain model): German domain terms (`Veranstaltung`→`Event` model but fields `titel`, `startetAm`, `Teilnahme`, `Favorit`, routes `/teilnahme`, `/favorit`), English infrastructure (`createdAt`, `isActive`). Keep German for new domain vocabulary.
- **Event lifecycle** `DRAFT → PUBLISHED → CANCELLED`: only the owner may mutate; only `PUBLISHED`, non-ended events appear in public lists/nearby and can be joined. Cancelled events are immutable.
- **Join capacity is race-safe**: `eventService.join` runs in a transaction with `SELECT … FOR UPDATE` on the event row before counting/inserting — don't "simplify" this away.
- **Friendships are one canonical row** (`userAId < userBId`, enforced via `canonicalPair` in [friendship.repo.ts](src/repositories/friendship.repo.ts)) — no request/accept flow, mirrors the old `AddFriend` semantics.
- **One Veranstalter per user** (`ownerId` unique); creating events requires one.
- **Refresh tokens**: only SHA-256 hashes stored; rotation on every refresh (replay of an old token → 401).

### PostGIS specifics

`Event.location` is a **generated column** (`geography(Point,4326)` from `latitude`/`longitude`) with a GiST index — created in migration [20260611000001_add_postgis_location](prisma/migrations/20260611000001_add_postgis_location/migration.sql), intentionally absent from `schema.prisma`. The nearby search ([event.repo.ts](src/repositories/event.repo.ts) `findNearby`) is raw SQL using `ST_DWithin`/`ST_Distance` (meters). If you regenerate the schema or write geo queries, preserve this setup; new geo migrations must be hand-written SQL.

### Tests

Integration tests hit a real DB (`venty_test`, auto-created by [docker/init-test-db.sh](docker/init-test-db.sh)). [vitest.config.ts](vitest.config.ts) injects test env (incl. `AUTH_RATE_LIMIT_MAX=30` — the rate-limit test depends on that exact value); [tests/global-setup.ts](tests/global-setup.ts) runs `prisma migrate deploy`. Files run sequentially (`fileParallelism: false`) and truncate all tables in `beforeEach` via [tests/helpers.ts](tests/helpers.ts) `resetDb()`. Use the helpers (`registerUser`, `registerVeranstalter`, `createPublishedEvent`) instead of hand-rolling fixtures. Mind the per-file auth rate-limit budget of 30 register/login calls.

### Frontend contract

[api-client.ts](api-client.ts) (repo root, not in `src/`) is the typed client copied into the Expo app. It mirrors the DTO types from [src/lib/dto.ts](src/lib/dto.ts) by hand — **when changing DTOs or endpoints, update api-client.ts in the same commit.** It's typechecked by `npm run typecheck` (via tsconfig.test.json).
