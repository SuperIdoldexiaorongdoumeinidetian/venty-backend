import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import { prisma } from "../src/lib/prisma";
import {
  authHeader,
  createDraftEvent,
  createPublishedEvent,
  createTestApp,
  registerUser,
  registerVeranstalter,
  resetDb,
} from "./helpers";

describe("Teilnahme", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });
  beforeEach(resetDb);

  it("trägt einen User in ein veröffentlichtes Event ein", async () => {
    const owner = await registerVeranstalter(app);
    const gast = await registerUser(app);
    const event = await createPublishedEvent(app, owner.accessToken);

    const res = await request(app.server)
      .post(`/api/v1/events/${event.id}/teilnahme`)
      .set(authHeader(gast.accessToken));

    expect(res.status).toBe(201);
    expect(res.body.teilnehmerCount).toBe(1);

    const meine = await request(app.server)
      .get("/api/v1/users/me/events")
      .set(authHeader(gast.accessToken));
    expect(meine.body).toHaveLength(1);
    expect(meine.body[0].id).toBe(event.id);
  });

  it("lehnt doppeltes Eintragen ab (409 ALREADY_JOINED)", async () => {
    const owner = await registerVeranstalter(app);
    const gast = await registerUser(app);
    const event = await createPublishedEvent(app, owner.accessToken);

    await request(app.server)
      .post(`/api/v1/events/${event.id}/teilnahme`)
      .set(authHeader(gast.accessToken));
    const zweite = await request(app.server)
      .post(`/api/v1/events/${event.id}/teilnahme`)
      .set(authHeader(gast.accessToken));

    expect(zweite.status).toBe(409);
    expect(zweite.body.error.code).toBe("ALREADY_JOINED");
  });

  it("lehnt Eintragen in Drafts ab (409 EVENT_NOT_PUBLISHED)", async () => {
    const owner = await registerVeranstalter(app);
    const gast = await registerUser(app);
    const draft = await createDraftEvent(app, owner.accessToken);

    const res = await request(app.server)
      .post(`/api/v1/events/${draft.id}/teilnahme`)
      .set(authHeader(gast.accessToken));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EVENT_NOT_PUBLISHED");
  });

  it("respektiert maxTeilnehmer (409 EVENT_FULL)", async () => {
    const owner = await registerVeranstalter(app);
    const gast1 = await registerUser(app);
    const gast2 = await registerUser(app);
    const event = await createPublishedEvent(app, owner.accessToken, { maxTeilnehmer: 1 });

    const erste = await request(app.server)
      .post(`/api/v1/events/${event.id}/teilnahme`)
      .set(authHeader(gast1.accessToken));
    expect(erste.status).toBe(201);

    const zweite = await request(app.server)
      .post(`/api/v1/events/${event.id}/teilnahme`)
      .set(authHeader(gast2.accessToken));
    expect(zweite.status).toBe(409);
    expect(zweite.body.error.code).toBe("EVENT_FULL");
  });

  it("trägt wieder aus und listet Teilnehmer", async () => {
    const owner = await registerVeranstalter(app);
    const gast = await registerUser(app);
    const event = await createPublishedEvent(app, owner.accessToken);

    await request(app.server)
      .post(`/api/v1/events/${event.id}/teilnahme`)
      .set(authHeader(gast.accessToken));

    const liste = await request(app.server).get(`/api/v1/events/${event.id}/teilnehmer`);
    expect(liste.body).toHaveLength(1);
    expect(liste.body[0].id).toBe(gast.user.id);
    expect(liste.body[0].email).toBeUndefined(); // nur Public-Profil

    const austragen = await request(app.server)
      .delete(`/api/v1/events/${event.id}/teilnahme`)
      .set(authHeader(gast.accessToken));
    expect(austragen.status).toBe(200);
    expect(austragen.body.teilnehmerCount).toBe(0);

    const nochmal = await request(app.server)
      .delete(`/api/v1/events/${event.id}/teilnahme`)
      .set(authHeader(gast.accessToken));
    expect(nochmal.status).toBe(409);
    expect(nochmal.body.error.code).toBe("NOT_JOINED");
  });
});
