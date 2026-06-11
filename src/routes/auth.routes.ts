import type { FastifyInstance } from "fastify";
import { parse } from "../lib/validate";
import { AUTH_RATE_LIMIT } from "../plugins/rate-limit";
import { loginSchema, refreshSchema, registerSchema } from "../schemas/auth.schema";
import { authService } from "../services/auth.service";

export async function authRoutes(app: FastifyInstance) {
  const rateLimited = { config: { rateLimit: AUTH_RATE_LIMIT } };

  app.post("/register", rateLimited, async (req, reply) => {
    const input = parse(registerSchema, req.body);
    const { user, refreshToken } = await authService.register(input);
    const accessToken = app.jwt.sign({ sub: user.id });
    return reply.status(201).send({ user, accessToken, refreshToken });
  });

  app.post("/login", rateLimited, async (req) => {
    const input = parse(loginSchema, req.body);
    const { user, refreshToken } = await authService.login(input);
    const accessToken = app.jwt.sign({ sub: user.id });
    return { user, accessToken, refreshToken };
  });

  app.post("/refresh", rateLimited, async (req) => {
    const { refreshToken: token } = parse(refreshSchema, req.body);
    const { userId, refreshToken } = await authService.refresh(token);
    const accessToken = app.jwt.sign({ sub: userId });
    return { accessToken, refreshToken };
  });

  app.post("/logout", rateLimited, async (req, reply) => {
    const { refreshToken } = parse(refreshSchema, req.body);
    await authService.logout(refreshToken);
    return reply.status(204).send();
  });
}
