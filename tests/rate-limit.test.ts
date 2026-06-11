import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import { prisma } from "../src/lib/prisma";
import { createTestApp } from "./helpers";

// In den Tests gilt AUTH_RATE_LIMIT_MAX=30 (siehe vitest.config.ts).
const LIMIT = 30;

describe("Rate Limiting auf Auth-Endpoints", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("liefert 429 RATE_LIMITED nach zu vielen Login-Versuchen", async () => {
    let letzterStatus = 0;
    let letzterBody: { error?: { code: string } } = {};

    for (let i = 0; i < LIMIT + 1; i++) {
      const res = await request(app.server)
        .post("/api/v1/auth/login")
        .send({ email: "brute@force.example", password: "raten" });
      letzterStatus = res.status;
      letzterBody = res.body;
    }

    expect(letzterStatus).toBe(429);
    expect(letzterBody.error?.code).toBe("RATE_LIMITED");
  });
});
