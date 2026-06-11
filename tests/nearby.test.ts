import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import { prisma } from "../src/lib/prisma";
import {
  createDraftEvent,
  createPublishedEvent,
  createTestApp,
  registerVeranstalter,
  resetDb,
} from "./helpers";

// Pasing ↔ Erdweg sind ca. 23 km Luftlinie voneinander entfernt
const PASING = { latitude: 48.1419, longitude: 11.4606 };
const ERDWEG = { latitude: 48.3306, longitude: 11.3081 };

describe("GET /events/nearby (PostGIS)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });
  beforeEach(resetDb);

  it("findet nur Events im Radius, sortiert nach Distanz", async () => {
    const { accessToken } = await registerVeranstalter(app);
    const pasingEvent = await createPublishedEvent(app, accessToken, {
      titel: "Sommerfest Pasing",
      ...PASING,
    });
    const erdwegEvent = await createPublishedEvent(app, accessToken, {
      titel: "Dorffest Erdweg",
      ...ERDWEG,
    });

    // 5 km um Pasing → nur das Pasinger Event
    const eng = await request(app.server).get(
      `/api/v1/events/nearby?lat=${PASING.latitude}&lng=${PASING.longitude}&radiusKm=5`,
    );
    expect(eng.status).toBe(200);
    expect(eng.body).toHaveLength(1);
    expect(eng.body[0].id).toBe(pasingEvent.id);
    expect(eng.body[0].distanceM).toBeLessThan(100);

    // 50 km um Pasing → beide, nach Distanz aufsteigend
    const weit = await request(app.server).get(
      `/api/v1/events/nearby?lat=${PASING.latitude}&lng=${PASING.longitude}&radiusKm=50`,
    );
    expect(weit.body).toHaveLength(2);
    expect(weit.body.map((e: { id: string }) => e.id)).toEqual([pasingEvent.id, erdwegEvent.id]);
    // Plausibilität: Erdweg liegt 20–30 km entfernt
    expect(weit.body[1].distanceM).toBeGreaterThan(20_000);
    expect(weit.body[1].distanceM).toBeLessThan(30_000);
  });

  it("ignoriert Drafts und abgesagte Events", async () => {
    const { accessToken } = await registerVeranstalter(app);
    await createDraftEvent(app, accessToken, PASING);
    const cancelled = await createPublishedEvent(app, accessToken, PASING);
    await request(app.server)
      .post(`/api/v1/events/${cancelled.id}/cancel`)
      .set({ Authorization: `Bearer ${accessToken}` });

    const res = await request(app.server).get(
      `/api/v1/events/nearby?lat=${PASING.latitude}&lng=${PASING.longitude}&radiusKm=5`,
    );
    expect(res.body).toHaveLength(0);
  });

  it("validiert Query-Parameter (400)", async () => {
    const res = await request(app.server).get("/api/v1/events/nearby?lat=999&lng=11.46");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
