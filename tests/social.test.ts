import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import { prisma } from "../src/lib/prisma";
import {
  authHeader,
  createPublishedEvent,
  createTestApp,
  registerUser,
  registerVeranstalter,
  resetDb,
} from "./helpers";

describe("Freunde & Favoriten", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });
  beforeEach(resetDb);

  it("fügt Freunde hinzu – sichtbar auf beiden Seiten", async () => {
    const anna = await registerUser(app);
    const ben = await registerUser(app);

    const res = await request(app.server)
      .post(`/api/v1/friends/${ben.user.id}`)
      .set(authHeader(anna.accessToken));
    expect(res.status).toBe(201);

    const annasFreunde = await request(app.server)
      .get("/api/v1/friends")
      .set(authHeader(anna.accessToken));
    expect(annasFreunde.body.map((f: { id: string }) => f.id)).toEqual([ben.user.id]);

    const bensFreunde = await request(app.server)
      .get("/api/v1/friends")
      .set(authHeader(ben.accessToken));
    expect(bensFreunde.body.map((f: { id: string }) => f.id)).toEqual([anna.user.id]);
  });

  it("verhindert Selbst-Freundschaft und Duplikate", async () => {
    const anna = await registerUser(app);
    const ben = await registerUser(app);

    const selbst = await request(app.server)
      .post(`/api/v1/friends/${anna.user.id}`)
      .set(authHeader(anna.accessToken));
    expect(selbst.status).toBe(400);

    await request(app.server)
      .post(`/api/v1/friends/${ben.user.id}`)
      .set(authHeader(anna.accessToken));
    // Duplikat – auch von der anderen Seite (kanonische Ordnung)
    const duplikat = await request(app.server)
      .post(`/api/v1/friends/${anna.user.id}`)
      .set(authHeader(ben.accessToken));
    expect(duplikat.status).toBe(409);
    expect(duplikat.body.error.code).toBe("ALREADY_FRIENDS");
  });

  it("entfernt Freunde", async () => {
    const anna = await registerUser(app);
    const ben = await registerUser(app);
    await request(app.server)
      .post(`/api/v1/friends/${ben.user.id}`)
      .set(authHeader(anna.accessToken));

    const remove = await request(app.server)
      .delete(`/api/v1/friends/${ben.user.id}`)
      .set(authHeader(anna.accessToken));
    expect(remove.status).toBe(204);

    const nochmal = await request(app.server)
      .delete(`/api/v1/friends/${ben.user.id}`)
      .set(authHeader(anna.accessToken));
    expect(nochmal.status).toBe(404);
  });

  it("setzt und entfernt Favoriten (idempotent)", async () => {
    const owner = await registerVeranstalter(app);
    const gast = await registerUser(app);
    const event = await createPublishedEvent(app, owner.accessToken);

    const erste = await request(app.server)
      .put(`/api/v1/events/${event.id}/favorit`)
      .set(authHeader(gast.accessToken));
    expect(erste.status).toBe(204);

    // idempotent: zweites PUT ist ebenfalls 204
    const zweite = await request(app.server)
      .put(`/api/v1/events/${event.id}/favorit`)
      .set(authHeader(gast.accessToken));
    expect(zweite.status).toBe(204);

    const favoriten = await request(app.server)
      .get("/api/v1/users/me/favorites")
      .set(authHeader(gast.accessToken));
    expect(favoriten.body).toHaveLength(1);
    expect(favoriten.body[0].id).toBe(event.id);

    const entfernen = await request(app.server)
      .delete(`/api/v1/events/${event.id}/favorit`)
      .set(authHeader(gast.accessToken));
    expect(entfernen.status).toBe(204);

    const leer = await request(app.server)
      .get("/api/v1/users/me/favorites")
      .set(authHeader(gast.accessToken));
    expect(leer.body).toHaveLength(0);
  });
});
