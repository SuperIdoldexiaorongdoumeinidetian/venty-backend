import { prisma } from "../lib/prisma";

export const favoritRepo = {
  /** Idempotent: existiert der Favorit bereits, passiert nichts. */
  upsert: (userId: string, eventId: string) =>
    prisma.favorit.upsert({
      where: { userId_eventId: { userId, eventId } },
      create: { userId, eventId },
      update: {},
    }),

  delete: (userId: string, eventId: string) =>
    prisma.favorit.deleteMany({ where: { userId, eventId } }),

  listEventsOfUser: (userId: string) =>
    prisma.favorit.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { event: { include: { _count: { select: { teilnahmen: true } } } } },
    }),
};
