import { EventStatus } from "@prisma/client";
import { toEventDto, toNearbyEventDto, toPublicUserDto } from "../lib/dto";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { eventRepo } from "../repositories/event.repo";
import { teilnahmeRepo } from "../repositories/teilnahme.repo";
import { favoritRepo } from "../repositories/favorit.repo";
import { veranstalterRepo } from "../repositories/veranstalter.repo";
import type {
  CreateEventInput,
  ListEventsQuery,
  NearbyQuery,
  UpdateEventInput,
} from "../schemas/event.schema";

/** Lädt das Event und stellt sicher, dass der Requester der Veranstalter-Inhaber ist. */
async function requireOwnedEvent(eventId: string, requesterId: string) {
  const event = await eventRepo.findById(eventId);
  if (!event) throw notFound("Event nicht gefunden.");
  const veranstalter = await veranstalterRepo.findById(event.veranstalterId);
  if (!veranstalter || veranstalter.ownerId !== requesterId) {
    throw forbidden("Nur der Veranstalter darf dieses Event bearbeiten.");
  }
  return event;
}

export const eventService = {
  async create(requesterId: string, input: CreateEventInput) {
    const veranstalter = await veranstalterRepo.findByOwnerId(requesterId);
    if (!veranstalter) {
      throw forbidden("Zum Erstellen von Events brauchst du ein Veranstalter-Profil.");
    }
    if (!veranstalter.isActive) throw forbidden("Veranstalter ist nicht aktiv.");

    const event = await eventRepo.create({ ...input, veranstalterId: veranstalter.id });
    return toEventDto(event);
  },

  async getById(id: string) {
    const event = await eventRepo.findById(id);
    if (!event) throw notFound("Event nicht gefunden.");
    return toEventDto(event);
  },

  async update(id: string, requesterId: string, input: UpdateEventInput) {
    const event = await requireOwnedEvent(id, requesterId);
    if (event.status === EventStatus.CANCELLED) {
      throw conflict("Abgesagte Events können nicht bearbeitet werden.", "EVENT_CANCELLED");
    }
    const startetAm = input.startetAm ?? event.startetAm;
    const endetAm = input.endetAm ?? event.endetAm;
    if (endetAm <= startetAm) throw badRequest("endetAm muss nach startetAm liegen.");

    const updated = await eventRepo.update(id, input);
    return toEventDto(updated);
  },

  async delete(id: string, requesterId: string) {
    await requireOwnedEvent(id, requesterId);
    await eventRepo.delete(id);
  },

  /** DRAFT → PUBLISHED (entspricht Veranstalter.PostVeranstaltung im alten C#-Modell). */
  async publish(id: string, requesterId: string) {
    const event = await requireOwnedEvent(id, requesterId);
    if (event.status !== EventStatus.DRAFT) {
      throw conflict("Nur Entwürfe können veröffentlicht werden.", "INVALID_STATUS");
    }
    if (event.endetAm <= new Date()) {
      throw conflict("Events in der Vergangenheit können nicht veröffentlicht werden.", "EVENT_ENDED");
    }
    const updated = await eventRepo.update(id, {
      status: EventStatus.PUBLISHED,
      publishedAt: new Date(),
    });
    return toEventDto(updated);
  },

  async cancel(id: string, requesterId: string) {
    const event = await requireOwnedEvent(id, requesterId);
    if (event.status === EventStatus.CANCELLED) {
      throw conflict("Event ist bereits abgesagt.", "EVENT_CANCELLED");
    }
    const updated = await eventRepo.update(id, {
      status: EventStatus.CANCELLED,
      cancelledAt: new Date(),
    });
    return toEventDto(updated);
  },

  async list(query: ListEventsQuery) {
    const events = await eventRepo.listPublished({
      ab: query.ab ?? new Date(),
      limit: query.limit,
      cursor: query.cursor,
    });
    const hasMore = events.length > query.limit;
    const page = hasMore ? events.slice(0, query.limit) : events;
    return {
      items: page.map(toEventDto),
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    };
  },

  async nearby(query: NearbyQuery) {
    const rows = await eventRepo.findNearby({
      lat: query.lat,
      lng: query.lng,
      radiusKm: query.radiusKm,
      limit: query.limit,
    });
    return rows.map(toNearbyEventDto);
  },

  /**
   * Eintragen – Regeln aus dem alten C#-Modell (User.Eintragen):
   * Event muss PUBLISHED und noch nicht vorbei sein, Kapazität wird geprüft.
   * Läuft transaktional mit Row-Lock gegen Races beim letzten freien Platz.
   */
  async join(eventId: string, userId: string) {
    await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { status: EventStatus; endetAm: Date; maxTeilnehmer: number | null }[]
      >`SELECT "status", "endetAm", "maxTeilnehmer" FROM "Event" WHERE "id" = ${eventId}::uuid FOR UPDATE`;
      const event = rows[0];
      if (!event) throw notFound("Event nicht gefunden.");
      if (event.status !== EventStatus.PUBLISHED) {
        throw conflict("Event ist nicht veröffentlicht.", "EVENT_NOT_PUBLISHED");
      }
      if (event.endetAm <= new Date()) {
        throw conflict("Event ist bereits vorbei.", "EVENT_ENDED");
      }

      const existing = await tx.teilnahme.findUnique({
        where: { userId_eventId: { userId, eventId } },
      });
      if (existing) throw conflict("Du bist bereits eingetragen.", "ALREADY_JOINED");

      if (event.maxTeilnehmer !== null) {
        const count = await tx.teilnahme.count({ where: { eventId } });
        if (count >= event.maxTeilnehmer) throw conflict("Event ist ausgebucht.", "EVENT_FULL");
      }

      await tx.teilnahme.create({ data: { userId, eventId } });
    });
    return this.getById(eventId);
  },

  async leave(eventId: string, userId: string) {
    const existing = await teilnahmeRepo.find(userId, eventId);
    if (!existing) throw conflict("Du bist nicht eingetragen.", "NOT_JOINED");
    await teilnahmeRepo.delete(userId, eventId);
    return this.getById(eventId);
  },

  async listTeilnehmer(eventId: string) {
    const event = await eventRepo.findById(eventId);
    if (!event) throw notFound("Event nicht gefunden.");
    const rows = await teilnahmeRepo.listTeilnehmer(eventId);
    return rows.map((r) => toPublicUserDto(r.user));
  },

  async favorite(eventId: string, userId: string) {
    const event = await eventRepo.findById(eventId);
    if (!event) throw notFound("Event nicht gefunden.");
    await favoritRepo.upsert(userId, eventId);
  },

  async unfavorite(eventId: string, userId: string) {
    await favoritRepo.delete(userId, eventId);
  },
};
