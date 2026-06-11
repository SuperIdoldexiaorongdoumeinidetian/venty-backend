import { prisma } from "../lib/prisma";

export const refreshTokenRepo = {
  create: (userId: string, tokenHash: string, expiresAt: Date) =>
    prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } }),

  findByHash: (tokenHash: string) =>
    prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } }),

  revoke: (id: string) =>
    prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } }),
};
