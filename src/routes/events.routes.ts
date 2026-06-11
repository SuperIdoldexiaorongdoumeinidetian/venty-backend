import type { FastifyInstance } from "fastify";
import { parse } from "../lib/validate";
import { idParamSchema } from "../schemas/common.schema";
import {
  createEventSchema,
  listEventsQuerySchema,
  nearbyQuerySchema,
  updateEventSchema,
} from "../schemas/event.schema";
import { eventService } from "../services/event.service";

export async function eventsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // --- CRUD ---

  app.post("/", auth, async (req, reply) => {
    const input = parse(createEventSchema, req.body);
    const event = await eventService.create(req.userId, input);
    return reply.status(201).send(event);
  });

  app.get("/", async (req) => {
    const query = parse(listEventsQuerySchema, req.query);
    return eventService.list(query);
  });

  // Umkreissuche für die Kartenansicht (react-native-maps)
  app.get("/nearby", async (req) => {
    const query = parse(nearbyQuerySchema, req.query);
    return eventService.nearby(query);
  });

  app.get("/:id", async (req) => {
    const { id } = parse(idParamSchema, req.params);
    return eventService.getById(id);
  });

  app.patch("/:id", auth, async (req) => {
    const { id } = parse(idParamSchema, req.params);
    const input = parse(updateEventSchema, req.body);
    return eventService.update(id, req.userId, input);
  });

  app.delete("/:id", auth, async (req, reply) => {
    const { id } = parse(idParamSchema, req.params);
    await eventService.delete(id, req.userId);
    return reply.status(204).send();
  });

  // --- Status-Übergänge ---

  app.post("/:id/publish", auth, async (req) => {
    const { id } = parse(idParamSchema, req.params);
    return eventService.publish(id, req.userId);
  });

  app.post("/:id/cancel", auth, async (req) => {
    const { id } = parse(idParamSchema, req.params);
    return eventService.cancel(id, req.userId);
  });

  // --- Teilnahme ---

  app.post("/:id/teilnahme", auth, async (req, reply) => {
    const { id } = parse(idParamSchema, req.params);
    const event = await eventService.join(id, req.userId);
    return reply.status(201).send(event);
  });

  app.delete("/:id/teilnahme", auth, async (req) => {
    const { id } = parse(idParamSchema, req.params);
    return eventService.leave(id, req.userId);
  });

  app.get("/:id/teilnehmer", async (req) => {
    const { id } = parse(idParamSchema, req.params);
    return eventService.listTeilnehmer(id);
  });

  // --- Favoriten (idempotent) ---

  app.put("/:id/favorit", auth, async (req, reply) => {
    const { id } = parse(idParamSchema, req.params);
    await eventService.favorite(id, req.userId);
    return reply.status(204).send();
  });

  app.delete("/:id/favorit", auth, async (req, reply) => {
    const { id } = parse(idParamSchema, req.params);
    await eventService.unfavorite(id, req.userId);
    return reply.status(204).send();
  });
}
