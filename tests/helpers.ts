import type { FastifyInstance } from "fastify";
import request from "supertest";
import { buildApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp();
  await app.ready();
  return app;
}

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "User", "Veranstalter", "Event", "Teilnahme", "Favorit", "Friendship", "RefreshToken" CASCADE',
  );
}

export const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

export const inTagen = (tage: number, stunden = 0) =>
  new Date(Date.now() + tage * 24 * 60 * 60 * 1000 + stunden * 60 * 60 * 1000);

let counter = 0;

/** Registriert einen frischen User und gibt DTO + Tokens zurück. */
export async function registerUser(
  app: FastifyInstance,
  overrides: Record<string, unknown> = {},
) {
  counter += 1;
  const unique = `${Date.now()}${counter}`;
  const res = await request(app.server)
    .post("/api/v1/auth/register")
    .send({
      email: `user${unique}@test.example`,
      username: `user_${unique}`,
      password: "passwort123",
      displayName: `Test User ${counter}`,
      ...overrides,
    });
  if (res.status !== 201) {
    throw new Error(`Registrierung fehlgeschlagen: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body as {
    user: { id: string; email: string; username: string };
    accessToken: string;
    refreshToken: string;
  };
}

/** Registriert einen User und legt für ihn ein Veranstalter-Profil an. */
export async function registerVeranstalter(app: FastifyInstance) {
  const session = await registerUser(app);
  const res = await request(app.server)
    .post("/api/v1/veranstalter")
    .set(authHeader(session.accessToken))
    .send({ name: `Veranstalter ${counter}`, stadt: "München" });
  if (res.status !== 201) {
    throw new Error(`Veranstalter fehlgeschlagen: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { ...session, veranstalter: res.body as { id: string } };
}

export function validEventPayload(overrides: Record<string, unknown> = {}) {
  return {
    titel: "Pasinger Sommerfest",
    beschreibung: "Livemusik und Essensstände.",
    ortName: "Pasinger Marienplatz",
    latitude: 48.1419,
    longitude: 11.4606,
    startetAm: inTagen(7).toISOString(),
    endetAm: inTagen(7, 4).toISOString(),
    ...overrides,
  };
}

/** Erstellt ein Event (DRAFT) als der gegebene Veranstalter-User. */
export async function createDraftEvent(
  app: FastifyInstance,
  accessToken: string,
  overrides: Record<string, unknown> = {},
) {
  const res = await request(app.server)
    .post("/api/v1/events")
    .set(authHeader(accessToken))
    .send(validEventPayload(overrides));
  if (res.status !== 201) {
    throw new Error(`Event fehlgeschlagen: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body as { id: string; status: string };
}

/** Erstellt und veröffentlicht ein Event. */
export async function createPublishedEvent(
  app: FastifyInstance,
  accessToken: string,
  overrides: Record<string, unknown> = {},
) {
  const draft = await createDraftEvent(app, accessToken, overrides);
  const res = await request(app.server)
    .post(`/api/v1/events/${draft.id}/publish`)
    .set(authHeader(accessToken));
  if (res.status !== 200) {
    throw new Error(`Publish fehlgeschlagen: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body as { id: string; status: string };
}
