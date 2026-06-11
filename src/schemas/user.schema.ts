import { z } from "zod";

export const updateMeSchema = z
  .object({
    displayName: z.string().min(1).max(80).optional(),
    bio: z.string().max(500).nullable().optional(),
    avatarUrl: z.string().url("Ungültige URL.").nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Mindestens ein Feld muss angegeben werden.",
  });

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
