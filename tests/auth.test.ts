import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import { prisma } from "../src/lib/prisma";
import { authHeader, createTestApp, registerUser, resetDb } from "./helpers";

describe("Auth", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });
  beforeEach(resetDb);

  it("registriert einen neuen User und liefert Tokens", async () => {
    const res = await request(app.server).post("/api/v1/auth/register").send({
      email: "anna@test.example",
      username: "anna",
      password: "passwort123",
      displayName: "Anna",
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      email: "anna@test.example",
      username: "anna",
      displayName: "Anna",
      veranstalterId: null,
    });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.accessToken).toBeTypeOf("string");
    expect(res.body.refreshToken).toBeTypeOf("string");
  });

  it("lehnt doppelte E-Mail mit 409 EMAIL_TAKEN ab", async () => {
    await registerUser(app, { email: "doppelt@test.example" });
    const res = await request(app.server).post("/api/v1/auth/register").send({
      email: "doppelt@test.example",
      username: "anderer_name",
      password: "passwort123",
      displayName: "Zweiter",
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("validiert den Request-Body (400 VALIDATION_ERROR)", async () => {
    const res = await request(app.server).post("/api/v1/auth/register").send({
      email: "keine-email",
      username: "x", // zu kurz
      password: "kurz",
      displayName: "",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("loggt mit korrekten Daten ein", async () => {
    const { user } = await registerUser(app, { email: "login@test.example" });
    const res = await request(app.server)
      .post("/api/v1/auth/login")
      .send({ email: "login@test.example", password: "passwort123" });

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
    expect(res.body.accessToken).toBeTypeOf("string");
    expect(res.body.user.lastLoginAt).not.toBeNull();
  });

  it("lehnt falsches Passwort mit 401 ab", async () => {
    await registerUser(app, { email: "login2@test.example" });
    const res = await request(app.server)
      .post("/api/v1/auth/login")
      .send({ email: "login2@test.example", password: "falsches-passwort" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("schützt /users/me (401 ohne / 200 mit Token)", async () => {
    const ohne = await request(app.server).get("/api/v1/users/me");
    expect(ohne.status).toBe(401);

    const { user, accessToken } = await registerUser(app);
    const mit = await request(app.server).get("/api/v1/users/me").set(authHeader(accessToken));
    expect(mit.status).toBe(200);
    expect(mit.body.id).toBe(user.id);
  });

  it("rotiert Refresh-Tokens (altes Token wird ungültig)", async () => {
    const { refreshToken } = await registerUser(app);

    const erste = await request(app.server).post("/api/v1/auth/refresh").send({ refreshToken });
    expect(erste.status).toBe(200);
    expect(erste.body.accessToken).toBeTypeOf("string");
    expect(erste.body.refreshToken).not.toBe(refreshToken);

    // Replay des alten Tokens muss fehlschlagen
    const replay = await request(app.server).post("/api/v1/auth/refresh").send({ refreshToken });
    expect(replay.status).toBe(401);

    // das neue funktioniert
    const zweite = await request(app.server)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: erste.body.refreshToken });
    expect(zweite.status).toBe(200);
  });

  it("logout revoked das Refresh-Token", async () => {
    const { refreshToken } = await registerUser(app);

    const logout = await request(app.server).post("/api/v1/auth/logout").send({ refreshToken });
    expect(logout.status).toBe(204);

    const refresh = await request(app.server).post("/api/v1/auth/refresh").send({ refreshToken });
    expect(refresh.status).toBe(401);
  });
});
