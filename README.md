# Venty Backend

Backend für **Venty** – die App, mit der Nutzer Events in ihrer Nähe auf einer Karte entdecken, eigene Events veranstalten und anderen Events beitreten können.

> Top 1 Soziale Medien Plattform Pasing · Top 1 Soziale Medien Plattform Erdweg

**Stack:** Node.js · TypeScript (strict) · Fastify · PostgreSQL + PostGIS · Prisma · Zod · JWT (Access + Refresh) · Vitest + Supertest

## Setup

Voraussetzungen: Node.js ≥ 22, Docker (für Postgres/PostGIS).

```bash
# 1. Env-Datei anlegen (Defaults passen für lokale Entwicklung)
cp .env.example .env

# 2. Datenbank starten (PostGIS; legt auch die Test-DB `venty_test` an)
docker compose up -d db

# 3. Abhängigkeiten installieren & Migrationen ausführen
npm install
npx prisma migrate deploy

# 4. Testdaten einspielen (optional – 5 User, 2 Veranstalter, 6 Events rund um München)
npm run db:seed

# 5. Dev-Server starten (http://localhost:3000, mit Watch-Mode)
npm run dev
```

Alle Seed-User haben das Passwort `venty1234`, z. B. `anna@example.com`.

Alternativ läuft auch alles in Docker: `docker compose up --build` (startet DB + API inkl. Migrationen).

## Tests

Integration-Tests (Vitest + Supertest) laufen gegen die Datenbank `venty_test`, die der Docker-Container beim ersten Start automatisch anlegt:

```bash
docker compose up -d db   # falls noch nicht gestartet
npm test                  # einmalig
npm run test:watch        # Watch-Mode
```

Einzelne Datei: `npx vitest run tests/auth.test.ts`

## Nützliche Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | Dev-Server mit Watch-Mode |
| `npm run build` / `npm start` | Produktions-Build / -Start |
| `npm run typecheck` | TypeScript-Check (src + tests + api-client) |
| `npm run db:migrate` | Neue Migration erstellen (`prisma migrate dev`) |
| `npm run db:seed` | Testdaten einspielen (idempotent) |
| `npm run db:studio` | Prisma Studio (DB-GUI) |

## API

REST unter `/api/v1`, Fehler immer als `{ "error": { "code", "message" } }`, Auth via `Authorization: Bearer <accessToken>`.

| Bereich | Endpoints |
|---|---|
| Auth | `POST /auth/register` · `/auth/login` · `/auth/refresh` · `/auth/logout` (rate-limited, Refresh-Token-Rotation) |
| Users | `GET/PATCH /users/me` · `GET /users/:id` · `GET /users/me/events` · `GET /users/me/favorites` |
| Veranstalter | `POST /veranstalter` · `GET/PATCH /veranstalter/:id` · `GET /veranstalter/:id/events` |
| Events | `POST/GET /events` · `GET /events/nearby?lat=&lng=&radiusKm=` · `GET/PATCH/DELETE /events/:id` · `POST /events/:id/publish` · `POST /events/:id/cancel` |
| Teilnahme | `POST/DELETE /events/:id/teilnahme` · `GET /events/:id/teilnehmer` |
| Favoriten | `PUT/DELETE /events/:id/favorit` |
| Freunde | `GET /friends` · `POST/DELETE /friends/:userId` |

Events durchlaufen `DRAFT → PUBLISHED → CANCELLED`; nur veröffentlichte, nicht beendete Events erscheinen in Liste/Umkreissuche und sind beitretbar. Die Umkreissuche nutzt PostGIS (`ST_DWithin` auf einer Generated Column mit GiST-Index) und liefert `distanceM` pro Event.

## Anbindung der Expo-App

[api-client.ts](api-client.ts) ist ein self-contained, typisierter Client für alle Endpoints – einfach in die Expo-App kopieren:

```ts
const api = new VentyClient({
  baseUrl: "http://192.168.x.x:3000", // LAN-IP des Dev-Rechners (Gerät) bzw. localhost (Simulator)
  onTokensChanged: (tokens) => {/* in SecureStore persistieren */},
});
await api.login({ email: "anna@example.com", password: "venty1234" });
const events = await api.nearbyEvents({ lat: 48.1419, lng: 11.4606, radiusKm: 10 });
```

Der Client refresht abgelaufene Access-Tokens automatisch. CORS erlaubt `localhost` und private LAN-IPs (Expo Dev) ohne weitere Konfiguration; zusätzliche Origins über `CORS_EXTRA_ORIGINS`.
