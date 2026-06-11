import { prisma } from "../lib/prisma";

export const teilnahmeRepo = {
  find: (userId: string, eventId: string) =>
    prisma.teilnahme.findUnique({ where: { userId_eventId: { userId, eventId } } }),

  delete: (userId: string, eventId: string) =>
    prisma.teilnahme.delete({ where: { userId_eventId: { userId, eventId } } }),

  listTeilnehmer: (eventId: string) =>
    prisma.teilnahme.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, bio: true, avatarUrl: true, isVerified: true },
        },
      },
    }),

  listEventsOfUser: (userId: string) =>
    prisma.teilnahme.findMany({
      where: { userId },
      orderBy: { event: { startetAm: "asc" } },
      include: { event: { include: { _count: { select: { teilnahmen: true } } } } },
    }),
};
