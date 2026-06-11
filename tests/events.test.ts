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
  validEventPayload,
} from "./helpers";

describe("Events", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });
  beforeEach(resetDb);

  it("verlangt ein Veranstalter-Profil zum Erstellen (403)", async () => {
    const { accessToken } = await registerUser(app);
    const res = await request(app.server)
      .post("/api/v1/events")
      .set(authHeader(accessToken))
      .send(validEventPayload());

    expect(res.status).toBe(403);
  });

  it("erstellt ein Event als DRAFT", async () => {
    const { accessToken, veranstalter } = await registerVeranstalter(app);
    const res = await request(app.server)
      .post("/api/v1/events")
      .set(authHeader(accessToken))
      .send(validEventPayload());

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("DRAFT");
    expect(res.body.veranstalterId).toBe(veranstalter.id);
    expect(res.body.teilnehmerCount).toBe(0);
  });

  it("lehnt endetAm vor startetAm ab (400)", async () => {
    const { accessToken } = await registerVeranstalter(app);
    const res = await request(app.server)
      .post("/api/v1/events")
      .set(authHeader(accessToken))
      .send(
        validEventPayload({
          startetAm: new Date(Date.now() + 86_400_000).toISOString(),
          endetAm: new Date(Date.now() + 3_600_000).toISOString(),
        }),
      );

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("veröffentlicht ein Draft-Event", async () => {
    const { accessToken } = await registerVeranstalter(app);
    const draft = await createDraftEvent(app, accessToken);

    const res = await request(app.server)
      .post(`/api/v1/events/${draft.id}/publish`)
      .set(authHeader(accessToken));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("PUBLISHED");
    expect(res.body.publishedAt).not.toBeNull();
  });

  it("zeigt nur PUBLISHED Events in der öffentlichen Liste", async () => {
    const { accessToken } = await registerVeranstalter(app);
    await createDraftEvent(app, accessToken, { titel: "Geheimer Entwurf" });
    const published = await createPublishedEvent(app, accessToken, { titel: "Sichtbares Event" });

    const res = await request(app.server).get("/api/v1/events");

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].id).toBe(published.id);
    expect(res.body.nextCursor).toBeNull();
  });

  it("paginiert per Cursor", async () => {
    const { accessToken } = await registerVeranstalter(app);
    for (let i = 1; i <= 3; i++) {
      await createPublishedEvent(app, accessToken, {
        titel: `Event ${i}`,
        startetAm: new Date(Date.now() + i * 86_400_000).toISOString(),
        endetAm: new Date(Date.now() + i * 86_400_000 + 3_600_000).toISOString(),
      });
    }

    const erste = await request(app.server).get("/api/v1/events?limit=2");
    expect(erste.body.items).toHaveLength(2);
    expect(erste.body.nextCursor).not.toBeNull();

    const zweite = await request(app.server).get(
      `/api/v1/events?limit=2&cursor=${erste.body.nextCursor}`,
    );
    expect(zweite.body.items).toHaveLength(1);
    expect(zweite.body.nextCursor).toBeNull();

    const titel = [...erste.body.items, ...zweite.body.items].map((e: { titel: string }) => e.titel);
    expect(titel).toEqual(["Event 1", "Event 2", "Event 3"]);
  });

  it("nur der Veranstalter darf bearbeiten/löschen", async () => {
    const owner = await registerVeranstalter(app);
    const fremder = await registerUser(app);
    const event = await createPublishedEvent(app, owner.accessToken);

    const fremdUpdate = await request(app.server)
      .patch(`/api/v1/events/${event.id}`)
      .set(authHeader(fremder.accessToken))
      .send({ titel: "Gekapert" });
    expect(fremdUpdate.status).toBe(403);

    const ownerUpdate = await request(app.server)
      .patch(`/api/v1/events/${event.id}`)
      .set(authHeader(owner.accessToken))
      .send({ titel: "Neuer Titel" });
    expect(ownerUpdate.status).toBe(200);
    expect(ownerUpdate.body.titel).toBe("Neuer Titel");

    const fremdDelete = await request(app.server)
      .delete(`/api/v1/events/${event.id}`)
      .set(authHeader(fremder.accessToken));
    expect(fremdDelete.status).toBe(403);

    const ownerDelete = await request(app.server)
      .delete(`/api/v1/events/${event.id}`)
      .set(authHeader(owner.accessToken));
    expect(ownerDelete.status).toBe(204);

    const nachher = await request(app.server).get(`/api/v1/events/${event.id}`);
    expect(nachher.status).toBe(404);
  });

  it("sagt ein Event ab (CANCELLED)", async () => {
    const { accessToken } = await registerVeranstalter(app);
    const event = await createPublishedEvent(app, accessToken);

    const res = await request(app.server)
      .post(`/api/v1/events/${event.id}/cancel`)
      .set(authHeader(accessToken));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("CANCELLED");
    expect(res.body.cancelledAt).not.toBeNull();
  });

  it("zeigt dem Inhaber auch Drafts unter /veranstalter/:id/events", async () => {
    const owner = await registerVeranstalter(app);
    await createDraftEvent(app, owner.accessToken);
    await createPublishedEvent(app, owner.accessToken);

    const alsOwner = await request(app.server)
      .get(`/api/v1/veranstalter/${owner.veranstalter.id}/events`)
      .set(authHeader(owner.accessToken));
    expect(alsOwner.body).toHaveLength(2);

    const anonym = await request(app.server).get(
      `/api/v1/veranstalter/${owner.veranstalter.id}/events`,
    );
    expect(anonym.body).toHaveLength(1);
  });
});
