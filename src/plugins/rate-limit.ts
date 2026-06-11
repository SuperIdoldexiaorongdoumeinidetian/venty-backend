import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import { config } from "../config";

/**
 * Global registriert, aber standardmäßig inaktiv (global: false).
 * Aktivierung pro Route über `config: { rateLimit: AUTH_RATE_LIMIT }`.
 */
export const rateLimitPlugin = fp(async (app: FastifyInstance) => {
  await app.register(rateLimit, { global: false });
});

/** Strenges Limit für Auth-Endpoints (Brute-Force-Schutz). */
export const AUTH_RATE_LIMIT = {
  max: config.AUTH_RATE_LIMIT_MAX,
  timeWindow: "1 minute",
} as const;
