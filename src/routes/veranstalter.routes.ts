import type { FastifyInstance, FastifyRequest } from "fastify";
import { parse } from "../lib/validate";
import { idParamSchema } from "../schemas/common.schema";
import {
  createVeranstalterSchema,
  updateVeranstalterSchema,
} from "../schemas/veranstalter.schema";
import { veranstalterService } from "../services/veranstalter.service";

/** Optionale Authentifizierung: User-ID, falls ein gültiges Token mitkommt. */
async function optionalUserId(req: FastifyRequest): Promise<string | null> {
  try {
    await req.jwtVerify();
    return req.user.sub;
  } catch {
    return null;
  }
}

export async function veranstalterRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.post("/", auth, async (req, reply) => {
    const input = parse(createVeranstalterSchema, req.body);
    const v = await veranstalterService.create(req.userId, input);
    return reply.status(201).send(v);
  });

  app.get("/:id", async (req) => {
    const { id } = parse(idParamSchema, req.params);
    return veranstalterService.getById(id);
  });

  app.patch("/:id", auth, async (req) => {
    const { id } = parse(idParamSchema, req.params);
    const input = parse(updateVeranstalterSchema, req.body);
    return veranstalterService.update(id, req.userId, input);
  });

  // Inhaber sieht auch Drafts/Cancelled → optionale Auth
  app.get("/:id/events", async (req) => {
    const { id } = parse(idParamSchema, req.params);
    const requesterId = await optionalUserId(req);
    return veranstalterService.listEvents(id, requesterId);
  });
}
