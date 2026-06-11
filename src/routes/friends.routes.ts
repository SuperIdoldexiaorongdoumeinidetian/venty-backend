import type { FastifyInstance } from "fastify";
import { parse } from "../lib/validate";
import { userIdParamSchema } from "../schemas/common.schema";
import { friendService } from "../services/friend.service";

export async function friendsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get("/", auth, async (req) => friendService.list(req.userId));

  app.post("/:userId", auth, async (req, reply) => {
    const { userId: otherId } = parse(userIdParamSchema, req.params);
    await friendService.add(req.userId, otherId);
    return reply.status(201).send({ ok: true });
  });

  app.delete("/:userId", auth, async (req, reply) => {
    const { userId: otherId } = parse(userIdParamSchema, req.params);
    await friendService.remove(req.userId, otherId);
    return reply.status(204).send();
  });
}
