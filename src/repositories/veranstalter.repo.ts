import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const veranstalterRepo = {
  findById: (id: string) => prisma.veranstalter.findUnique({ where: { id } }),

  findByOwnerId: (ownerId: string) => prisma.veranstalter.findUnique({ where: { ownerId } }),

  create: (ownerId: string, data: Omit<Prisma.VeranstalterUncheckedCreateInput, "ownerId">) =>
    prisma.veranstalter.create({ data: { ...data, ownerId } }),

  update: (id: string, data: Prisma.VeranstalterUpdateInput) =>
    prisma.veranstalter.update({ where: { id }, data }),
};
