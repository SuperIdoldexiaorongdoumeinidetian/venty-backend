import { z } from "zod";

// .env laden, falls vorhanden (in Docker/CI kommen die Variablen aus der Umgebung)
try {
  process.loadEnvFile();
} catch {
  /* keine .env – ok */
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL fehlt"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET muss mind. 16 Zeichen haben"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  CORS_EXTRA_ORIGINS: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Ungültige Umgebungsvariablen:\n${issues}`);
}

export const config = {
  ...parsed.data,
  corsExtraOrigins: parsed.data.CORS_EXTRA_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean),
};

export type Config = typeof config;
