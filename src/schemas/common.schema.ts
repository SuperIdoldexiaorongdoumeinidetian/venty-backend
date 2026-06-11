import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().uuid("Ungültige ID."),
});

export const userIdParamSchema = z.object({
  userId: z.string().uuid("Ungültige User-ID."),
});

export const cursorPaginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
