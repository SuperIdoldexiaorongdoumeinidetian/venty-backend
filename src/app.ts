import Fastify from "fastify";
import { config } from "./config";
import { authPlugin } from "./plugins/auth";
import { corsPlugin } from "./plugins/cors";
import { errorHandlerPlugin } from "./plugins/error-handler";
import { rateLimitPlugin } from "./plugins/rate-limit";
import { authRoutes } from "./routes/auth.routes";
import { eventsRoutes } from "./routes/events.routes";
import { friendsRoutes } from "./routes/friends.routes";
import { usersRoutes } from "./routes/users.routes";
import { veranstalterRoutes } from "./routes/veranstalter.routes";

export async function buildApp() {
  const app = Fastify({
    logger:
      config.NODE_ENV === "test"
        ? false
        : { level: config.NODE_ENV === "production" ? "info" : "debug" },
  });

  await app.register(errorHandlerPlugin);
  await app.register(corsPlugin);
  await app.register(rateLimitPlugin);
  await app.register(authPlugin);

  app.get("/health", async () => ({ status: "ok" }));

  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(usersRoutes, { prefix: "/api/v1/users" });
  await app.register(veranstalterRoutes, { prefix: "/api/v1/veranstalter" });
  await app.register(eventsRoutes, { prefix: "/api/v1/events" });
  await app.register(friendsRoutes, { prefix: "/api/v1/friends" });

  return app;
}
