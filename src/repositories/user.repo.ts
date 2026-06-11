import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const userRepo = {
  findById: (id: string) =>
    prisma.user.findUnique({ where: { id }, include: { veranstalter: { select: { id: true } } } }),

  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),

  findByUsername: (username: string) => prisma.user.findUnique({ where: { username } }),

  create: (data: Prisma.UserCreateInput) => prisma.user.create({ data }),

  update: (id: string, data: Prisma.UserUpdateInput) =>
    prisma.user.update({
      where: { id },
      data,
      include: { veranstalter: { select: { id: true } } },
    }),
};
