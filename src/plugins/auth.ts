import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import { config } from "../config";
import { unauthorized } from "../lib/errors";

export interface AccessTokenPayload {
  sub: string; // User-ID
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AccessTokenPayload;
    user: AccessTokenPayload;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    /** User-ID aus dem verifizierten Access-Token (nur nach `authenticate`). */
    userId: string;
  }
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  await app.register(jwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: config.ACCESS_TOKEN_TTL },
  });

  app.decorateRequest("userId", "");

  app.decorate("authenticate", async (req: FastifyRequest) => {
    try {
      await req.jwtVerify();
    } catch {
      throw unauthorized("Access-Token fehlt oder ist ungültig.");
    }
    req.userId = req.user.sub;
  });
});
