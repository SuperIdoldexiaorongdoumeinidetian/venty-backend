import type { z } from "zod";
import { AppError } from "./errors";

/**
 * Validiert Request-Daten gegen ein Zod-Schema und wirft bei Fehlern
 * einen 400er im einheitlichen Fehlerformat.
 */
export function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues
      .map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message))
      .join("; ");
    throw new AppError(400, "VALIDATION_ERROR", message);
  }
  return result.data;
}
