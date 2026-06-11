import { prisma } from "../lib/prisma";

/** Kanonische Ordnung erzwingen: genau eine Zeile pro Freundschaft. */
export function canonicalPair(a: string, b: string): { userAId: string; userBId: string } {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

export const friendshipRepo = {
  find: (a: string, b: string) =>
    prisma.friendship.findUnique({ where: { userAId_userBId: canonicalPair(a, b) } }),

  create: (a: string, b: string) =>
    prisma.friendship.create({ data: canonicalPair(a, b) }),

  delete: (a: string, b: string) =>
    prisma.friendship.deleteMany({ where: canonicalPair(a, b) }),

  /** Alle Freunde eines Users (beide Seiten der kanonischen Ordnung). */
  listFriendsOf: async (userId: string) => {
    const select = {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      isVerified: true,
    } as const;
    const rows = await prisma.friendship.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      include: { userA: { select }, userB: { select } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => (r.userAId === userId ? r.userB : r.userA));
  },
};
