/**
 * Zentrale Fehlerklasse. Der Error-Handler übersetzt sie in das
 * einheitliche Fehlerformat { error: { code, message } }.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string, code = "BAD_REQUEST") =>
  new AppError(400, code, message);

export const unauthorized = (message = "Nicht authentifiziert.") =>
  new AppError(401, "UNAUTHORIZED", message);

export const forbidden = (message = "Keine Berechtigung für diese Aktion.") =>
  new AppError(403, "FORBIDDEN", message);

export const notFound = (message = "Ressource nicht gefunden.") =>
  new AppError(404, "NOT_FOUND", message);

export const conflict = (message: string, code = "CONFLICT") =>
  new AppError(409, code, message);
