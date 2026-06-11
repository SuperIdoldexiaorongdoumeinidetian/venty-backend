import type { User, Veranstalter } from "@prisma/client";
import type { EventWithCount, NearbyEventRow } from "../repositories/event.repo";

/**
 * Mapper von Prisma-Modellen auf API-Antworten. Hier wird zentral entschieden,
 * welche Felder nach außen gehen (z. B. nie passwordHash/email im Public-Profil).
 */

export function toUserMeDto(user: User & { veranstalter: { id: string } | null }) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    isVerified: user.isVerified,
    veranstalterId: user.veranstalter?.id ?? null,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

export function toPublicUserDto(
  user: Pick<User, "id" | "username" | "displayName" | "bio" | "avatarUrl" | "isVerified">,
) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    isVerified: user.isVerified,
  };
}

export function toVeranstalterDto(v: Veranstalter) {
  return {
    id: v.id,
    ownerId: v.ownerId,
    name: v.name,
    beschreibung: v.beschreibung,
    logoUrl: v.logoUrl,
    bannerUrl: v.bannerUrl,
    kontaktEmail: v.kontaktEmail,
    websiteUrl: v.websiteUrl,
    adresse: v.adresse,
    stadt: v.stadt,
    postleitzahl: v.postleitzahl,
    land: v.land,
    latitude: v.latitude,
    longitude: v.longitude,
    isVerified: v.isVerified,
    createdAt: v.createdAt.toISOString(),
  };
}

export function toEventDto(e: EventWithCount) {
  return {
    id: e.id,
    veranstalterId: e.veranstalterId,
    titel: e.titel,
    beschreibung: e.beschreibung,
    ortName: e.ortName,
    adresse: e.adresse,
    latitude: e.latitude,
    longitude: e.longitude,
    startetAm: e.startetAm.toISOString(),
    endetAm: e.endetAm.toISOString(),
    maxTeilnehmer: e.maxTeilnehmer,
    status: e.status,
    teilnehmerCount: e._count.teilnahmen,
    publishedAt: e.publishedAt?.toISOString() ?? null,
    cancelledAt: e.cancelledAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export function toNearbyEventDto(row: NearbyEventRow) {
  return {
    id: row.id,
    veranstalterId: row.veranstalterId,
    titel: row.titel,
    beschreibung: row.beschreibung,
    ortName: row.ortName,
    adresse: row.adresse,
    latitude: row.latitude,
    longitude: row.longitude,
    startetAm: row.startetAm.toISOString(),
    endetAm: row.endetAm.toISOString(),
    maxTeilnehmer: row.maxTeilnehmer,
    status: row.status,
    teilnehmerCount: Number(row.teilnehmerCount),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    /** Entfernung zum Suchpunkt in Metern. */
    distanceM: Math.round(row.distanceM),
  };
}

export type UserMeDto = ReturnType<typeof toUserMeDto>;
export type PublicUserDto = ReturnType<typeof toPublicUserDto>;
export type VeranstalterDto = ReturnType<typeof toVeranstalterDto>;
export type EventDto = ReturnType<typeof toEventDto>;
export type NearbyEventDto = ReturnType<typeof toNearbyEventDto>;
