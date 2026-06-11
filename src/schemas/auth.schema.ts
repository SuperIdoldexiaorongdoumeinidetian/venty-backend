import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse."),
  username: z
    .string()
    .min(3, "Username muss mind. 3 Zeichen haben.")
    .max(30, "Username darf max. 30 Zeichen haben.")
    .regex(/^[a-zA-Z0-9_.]+$/, "Username darf nur Buchstaben, Zahlen, _ und . enthalten."),
  password: z.string().min(8, "Passwort muss mind. 8 Zeichen haben.").max(128),
  displayName: z.string().min(1).max(80),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
