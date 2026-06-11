import { z } from "zod";

const veranstalterFields = {
  name: z.string().min(1).max(120),
  beschreibung: z.string().max(2000).nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  bannerUrl: z.string().url().nullable().optional(),
  kontaktEmail: z.string().email().nullable().optional(),
  websiteUrl: z.string().url().nullable().optional(),
  adresse: z.string().max(200).nullable().optional(),
  stadt: z.string().max(100).nullable().optional(),
  postleitzahl: z.string().max(10).nullable().optional(),
  land: z.string().max(100).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
};

export const createVeranstalterSchema = z.object(veranstalterFields);

export const updateVeranstalterSchema = z
  .object({ ...veranstalterFields, name: veranstalterFields.name.optional() })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Mindestens ein Feld muss angegeben werden.",
  });

export type CreateVeranstalterInput = z.infer<typeof createVeranstalterSchema>;
export type UpdateVeranstalterInput = z.infer<typeof updateVeranstalterSchema>;
