import { z } from "zod";
import { cursorPaginationSchema } from "./common.schema";

const eventCore = z.object({
  titel: z.string().min(1).max(140),
  beschreibung: z.string().max(5000).nullable().optional(),
  ortName: z.string().max(140).nullable().optional(),
  adresse: z.string().max(200).nullable().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  startetAm: z.coerce.date(),
  endetAm: z.coerce.date(),
  maxTeilnehmer: z.number().int().min(1).nullable().optional(),
});

export const createEventSchema = eventCore.refine((e) => e.endetAm > e.startetAm, {
  message: "endetAm muss nach startetAm liegen.",
  path: ["endetAm"],
});

export const updateEventSchema = eventCore
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Mindestens ein Feld muss angegeben werden.",
  })
  .refine((e) => !e.startetAm || !e.endetAm || e.endetAm > e.startetAm, {
    message: "endetAm muss nach startetAm liegen.",
    path: ["endetAm"],
  });

export const listEventsQuerySchema = cursorPaginationSchema.extend({
  /** Nur Events, die ab diesem Zeitpunkt noch laufen (Default: jetzt). */
  ab: z.coerce.date().optional(),
});

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(500).default(10),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;
