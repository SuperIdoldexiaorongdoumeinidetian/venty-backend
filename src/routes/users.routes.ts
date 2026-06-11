import type { FastifyInstance } from "fastify";
import { parse } from "../lib/validate";
import { idParamSchema } from "../schemas/common.schema";
import { updateMeSchema } from "../schemas/user.schema";
import { userService } from "../services/user.service";

export async function usersRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get("/me", auth, async (req) => userService.getMe(req.userId));

  app.patch("/me", auth, async (req) => {
    const input = parse(updateMeSchema, req.body);
    return userService.updateMe(req.userId, input);
  });

  app.get("/me/events", auth, async (req) => userService.getMyEvents(req.userId));

  app.get("/me/favorites", auth, async (req) => userService.getMyFavorites(req.userId));

  app.get("/:id", async (req) => {
    const { id } = parse(idParamSchema, req.params);
    return userService.getPublicProfile(id);
  });
}
