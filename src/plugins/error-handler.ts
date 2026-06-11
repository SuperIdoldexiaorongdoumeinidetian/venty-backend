import type { FastifyError, FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { Prisma } from "@prisma/client";
import { AppError } from "../lib/errors";

/**
 * Übersetzt alle Fehler in das einheitliche Format { error: { code, message } }.
 */
export const errorHandlerPlugin = fp(async (app: FastifyInstance) => {
  app.setErrorHandler((err: FastifyError | AppError, _req, reply) => {
    if (err instanceof AppError) {
      return reply
        .status(err.statusCode)
        .send({ error: { code: err.code, message: err.message } });
    }

    // @fastify/rate-limit
    if (err.statusCode === 429) {
      return reply.status(429).send({
        error: { code: "RATE_LIMITED", message: "Zu viele Anfragen. Bitte später erneut versuchen." },
      });
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique-Constraint-Verletzungen (z. B. E-Mail bereits vergeben)
      if (err.code === "P2002") {
        return reply.status(409).send({
          error: { code: "CONFLICT", message: "Ressource existiert bereits." },
        });
      }
      app.log.error(err);
      return reply.status(500).send({
        error: { code: "INTERNAL_ERROR", message: "Interner Serverfehler." },
      });
    }

    // Fastify-eigene Fehler mit Status < 500 (z. B. ungültiges JSON)
    if (err.statusCode && err.statusCode < 500) {
      return reply.status(err.statusCode).send({
        error: { code: err.code ?? "BAD_REQUEST", message: err.message },
      });
    }

    app.log.error(err);
    return reply.status(500).send({
      error: { code: "INTERNAL_ERROR", message: "Interner Serverfehler." },
    });
  });

  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({
      error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.url} existiert nicht.` },
    });
  });
});
