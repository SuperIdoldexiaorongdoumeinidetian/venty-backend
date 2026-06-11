import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { config } from "../config";
import { toUserMeDto } from "../lib/dto";
import { badRequest, conflict, unauthorized } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { refreshTokenRepo } from "../repositories/refresh-token.repo";
import { userRepo } from "../repositories/user.repo";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Opakes Refresh-Token erzeugen; in der DB liegt nur der SHA-256-Hash. */
async function issueRefreshToken(userId: string): Promise<string> {
  const token = randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await refreshTokenRepo.create(userId, hashToken(token), expiresAt);
  return token;
}

export const authService = {
  async register(input: RegisterInput) {
    if (await userRepo.findByEmail(input.email)) {
      throw conflict("E-Mail ist bereits registriert.", "EMAIL_TAKEN");
    }
    if (await userRepo.findByUsername(input.username)) {
      throw conflict("Username ist bereits vergeben.", "USERNAME_TAKEN");
    }

    const passwordHash = await argon2.hash(input.password);
    const user = await userRepo.create({
      email: input.email,
      username: input.username,
      passwordHash,
      displayName: input.displayName,
    });

    const refreshToken = await issueRefreshToken(user.id);
    return { user: toUserMeDto({ ...user, veranstalter: null }), refreshToken };
  },

  async login(input: LoginInput) {
    const user = await userRepo.findByEmail(input.email);
    // Bewusst dieselbe Fehlermeldung für „User existiert nicht" und „Passwort falsch"
    if (!user || !(await argon2.verify(user.passwordHash, input.password))) {
      throw unauthorized("E-Mail oder Passwort ist falsch.");
    }
    if (!user.isActive) throw unauthorized("Dieses Konto ist deaktiviert.");

    const updated = await userRepo.update(user.id, { lastLoginAt: new Date() });
    const refreshToken = await issueRefreshToken(user.id);
    return { user: toUserMeDto(updated), refreshToken };
  },

  /** Token-Rotation: altes Refresh-Token wird revoked, neues ausgestellt. */
  async refresh(token: string) {
    const stored = await refreshTokenRepo.findByHash(hashToken(token));
    if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
      throw unauthorized("Refresh-Token ist ungültig oder abgelaufen.");
    }
    if (!stored.user.isActive) throw unauthorized("Dieses Konto ist deaktiviert.");

    await refreshTokenRepo.revoke(stored.id);
    const refreshToken = await issueRefreshToken(stored.userId);
    return { userId: stored.userId, refreshToken };
  },

  async logout(token: string) {
    const stored = await refreshTokenRepo.findByHash(hashToken(token));
    if (!stored) throw badRequest("Unbekanntes Refresh-Token.", "INVALID_TOKEN");
    if (!stored.revokedAt) await refreshTokenRepo.revoke(stored.id);
  },

  /** Für Routen, die nach refresh() das User-DTO brauchen. */
  async getUserDto(userId: string) {
    const user = await userRepo.findById(userId);
    if (!user) throw unauthorized();
    return toUserMeDto(user);
  },

  /** Nur für Tests/Tools: alle Sessions eines Users beenden. */
  async revokeAllSessions(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};
