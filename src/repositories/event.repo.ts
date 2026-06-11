import { Prisma, EventStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

/** Event-Zeile inkl. Teilnehmerzahl (für DTOs). */
export type EventWithCount = Prisma.EventGetPayload<{
  include: { _count: { select: { teilnahmen: true } } };
}>;

const withCount = { _count: { select: { teilnahmen: true } } } as const;

/** Row-Shape der Nearby-Raw-Query (Spalten 1:1 aus "Event" + distanceM). */
export interface NearbyEventRow {
  id: string;
  veranstalterId: string;
  titel: string;
  beschreibung: string | null;
  ortName: string | null;
  adresse: string | null;
  latitude: number;
  longitude: number;
  startetAm: Date;
  endetAm: Date;
  maxTeilnehmer: number | null;
  status: EventStatus;
  publishedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  teilnehmerCount: bigint;
  distanceM: number;
}

export const eventRepo = {
  findById: (id: string) =>
    prisma.event.findUnique({ where: { id }, include: withCount }),

  create: (data: Prisma.EventUncheckedCreateInput) =>
    prisma.event.create({ data, include: withCount }),

  update: (id: string, data: Prisma.EventUpdateInput) =>
    prisma.event.update({ where: { id }, data, include: withCount }),

  delete: (id: string) => prisma.event.delete({ where: { id } }),

  /** Veröffentlichte, noch laufende Events – Cursor-Pagination über (startetAm, id). */
  listPublished: (params: { ab: Date; limit: number; cursor?: string | undefined }) =>
    prisma.event.findMany({
      where: { status: EventStatus.PUBLISHED, endetAm: { gt: params.ab } },
      orderBy: [{ startetAm: "asc" }, { id: "asc" }],
      take: params.limit + 1, // +1 → nextCursor-Erkennung
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: withCount,
    }),

  listByVeranstalter: (veranstalterId: string, includeNonPublished: boolean) =>
    prisma.event.findMany({
      where: {
        veranstalterId,
        ...(includeNonPublished ? {} : { status: EventStatus.PUBLISHED }),
      },
      orderBy: { startetAm: "asc" },
      include: withCount,
    }),

  /**
   * Umkreissuche über PostGIS: nutzt die Generated Column `location`
   * (geography(Point, 4326)) mit GiST-Index. Distanzen in Metern.
   */
  findNearby: (params: { lat: number; lng: number; radiusKm: number; limit: number }) => {
    const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography`;
    return prisma.$queryRaw<NearbyEventRow[]>`
      SELECT
        e."id", e."veranstalterId", e."titel", e."beschreibung", e."ortName", e."adresse",
        e."latitude", e."longitude", e."startetAm", e."endetAm", e."maxTeilnehmer",
        e."status", e."publishedAt", e."cancelledAt", e."createdAt", e."updatedAt",
        (SELECT count(*) FROM "Teilnahme" t WHERE t."eventId" = e."id") AS "teilnehmerCount",
        ST_Distance(e."location", ${point}) AS "distanceM"
      FROM "Event" e
      WHERE e."status" = 'PUBLISHED'
        AND e."endetAm" > now()
        AND ST_DWithin(e."location", ${point}, ${params.radiusKm * 1000})
      ORDER BY "distanceM" ASC
      LIMIT ${params.limit}
    `;
  },
};
