/**
 * Seed-Script mit realistischen Testdaten rund um München (Pasing, Erdweg, Innenstadt).
 * Alle Seed-User haben das Passwort `venty1234`.
 *
 * Ausführen: npm run db:seed (idempotent – räumt vorher auf)
 */
import { PrismaClient, EventStatus } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

const PASSWORT = "venty1234";

const inTagen = (tage: number, stunde = 19) => {
  const d = new Date();
  d.setDate(d.getDate() + tage);
  d.setHours(stunde, 0, 0, 0);
  return d;
};

async function main() {
  console.log("🌱 Seeding …");

  // --- Aufräumen (Reihenfolge wegen FKs egal dank Cascade über User/Event) ---
  await prisma.$transaction([
    prisma.teilnahme.deleteMany(),
    prisma.favorit.deleteMany(),
    prisma.friendship.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.event.deleteMany(),
    prisma.veranstalter.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await argon2.hash(PASSWORT);

  // --- Users ---
  const [anna, ben, clara, david, emre] = await Promise.all(
    [
      { email: "anna@example.com", username: "anna_p", displayName: "Anna Pasinger", bio: "Immer auf der Suche nach guten Konzerten 🎶" },
      { email: "ben@example.com", username: "ben.k", displayName: "Ben Kraus", bio: "Bouldern, Bier, Brettspiele." },
      { email: "clara@example.com", username: "clara_m", displayName: "Clara Maier", bio: null },
      { email: "david@example.com", username: "david_e", displayName: "David Erdweger", bio: "Erdweg represent 🚜" },
      { email: "emre@example.com", username: "emre95", displayName: "Emre Yilmaz", bio: "Fußball & Festivals" },
    ].map((u) => prisma.user.create({ data: { ...u, passwordHash, isVerified: u.username === "anna_p" } })),
  );

  // --- Veranstalter ---
  const kulturPasing = await prisma.veranstalter.create({
    data: {
      ownerId: anna!.id,
      name: "Kulturverein Pasing",
      beschreibung: "Konzerte, Lesungen und Stadtteilfeste im Münchner Westen.",
      kontaktEmail: "info@kultur-pasing.example",
      stadt: "München",
      adresse: "Pasinger Marienplatz 1",
      postleitzahl: "81241",
      land: "Deutschland",
      latitude: 48.1419,
      longitude: 11.4606,
      isVerified: true,
    },
  });

  const erdwegEvents = await prisma.veranstalter.create({
    data: {
      ownerId: david!.id,
      name: "Erdweg Events",
      beschreibung: "Dorffeste, Open Airs und Sportevents im Landkreis Dachau.",
      kontaktEmail: "hallo@erdweg-events.example",
      stadt: "Erdweg",
      land: "Deutschland",
      latitude: 48.3306,
      longitude: 11.3081,
    },
  });

  // --- Events ---
  const mk = (data: {
    veranstalterId: string;
    titel: string;
    beschreibung: string;
    ortName: string;
    adresse: string;
    lat: number;
    lng: number;
    startInTagen: number;
    dauerStunden?: number;
    maxTeilnehmer?: number | null;
    status?: EventStatus;
  }) => {
    const start = inTagen(data.startInTagen);
    const ende = new Date(start.getTime() + (data.dauerStunden ?? 4) * 60 * 60 * 1000);
    const published = (data.status ?? EventStatus.PUBLISHED) === EventStatus.PUBLISHED;
    return prisma.event.create({
      data: {
        veranstalterId: data.veranstalterId,
        titel: data.titel,
        beschreibung: data.beschreibung,
        ortName: data.ortName,
        adresse: data.adresse,
        latitude: data.lat,
        longitude: data.lng,
        startetAm: start,
        endetAm: ende,
        maxTeilnehmer: data.maxTeilnehmer ?? null,
        status: data.status ?? EventStatus.PUBLISHED,
        publishedAt: published ? new Date() : null,
      },
    });
  };

  const [sommerfest, jamSession, flohmarkt, openAir, dorffest, drachenboot] = await Promise.all([
    mk({
      veranstalterId: kulturPasing.id,
      titel: "Pasinger Sommerfest",
      beschreibung: "Livemusik, Essensstände und Kinderprogramm auf dem Pasinger Marienplatz.",
      ortName: "Pasinger Marienplatz",
      adresse: "Pasinger Marienplatz, 81241 München",
      lat: 48.1419, lng: 11.4606,
      startInTagen: 7, dauerStunden: 8, maxTeilnehmer: 500,
    }),
    mk({
      veranstalterId: kulturPasing.id,
      titel: "Jam Session im Ebenböckhaus",
      beschreibung: "Offene Bühne für alle Instrumente – Backline vorhanden.",
      ortName: "Ebenböckhaus",
      adresse: "Ebenböckstraße 11, 81241 München",
      lat: 48.1445, lng: 11.4561,
      startInTagen: 3, maxTeilnehmer: 40,
    }),
    mk({
      veranstalterId: kulturPasing.id,
      titel: "Nachtflohmarkt Westend",
      beschreibung: "Stöbern bis Mitternacht, DJ-Sets und Foodtrucks.",
      ortName: "Augustiner Trakt",
      adresse: "Landsberger Str. 234, 80687 München",
      lat: 48.1432, lng: 11.5118,
      startInTagen: 14, dauerStunden: 6,
    }),
    mk({
      veranstalterId: erdwegEvents.id,
      titel: "Open Air am Petersberg",
      beschreibung: "Regionale Bands unter freiem Himmel, Eintritt frei.",
      ortName: "Petersberg",
      adresse: "Petersberg, 85253 Erdweg",
      lat: 48.3266, lng: 11.3324,
      startInTagen: 10, dauerStunden: 7, maxTeilnehmer: 300,
    }),
    mk({
      veranstalterId: erdwegEvents.id,
      titel: "Dorffest Erdweg",
      beschreibung: "Traditionelles Dorffest mit Blaskapelle und Festzelt.",
      ortName: "Festwiese Erdweg",
      adresse: "Hauptstraße, 85253 Erdweg",
      lat: 48.3306, lng: 11.3081,
      startInTagen: 21, dauerStunden: 10,
    }),
    // Entwurf – taucht in öffentlichen Listen nicht auf
    mk({
      veranstalterId: erdwegEvents.id,
      titel: "Drachenboot-Rennen (Planung)",
      beschreibung: "Noch in Abstimmung mit der Gemeinde.",
      ortName: "Baggersee",
      adresse: "85253 Erdweg",
      lat: 48.3201, lng: 11.2987,
      startInTagen: 45, status: EventStatus.DRAFT,
    }),
  ]);

  // --- Teilnahmen ---
  await prisma.teilnahme.createMany({
    data: [
      { userId: ben!.id, eventId: sommerfest!.id },
      { userId: clara!.id, eventId: sommerfest!.id },
      { userId: emre!.id, eventId: sommerfest!.id },
      { userId: ben!.id, eventId: jamSession!.id },
      { userId: anna!.id, eventId: openAir!.id },
      { userId: emre!.id, eventId: openAir!.id },
      { userId: clara!.id, eventId: flohmarkt!.id },
      { userId: david!.id, eventId: dorffest!.id },
    ],
  });

  // --- Freundschaften (kanonische Ordnung: kleinere ID zuerst) ---
  const pair = (a: string, b: string) => (a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a });
  await prisma.friendship.createMany({
    data: [
      pair(anna!.id, ben!.id),
      pair(anna!.id, clara!.id),
      pair(ben!.id, emre!.id),
      pair(david!.id, emre!.id),
    ],
  });

  // --- Favoriten ---
  await prisma.favorit.createMany({
    data: [
      { userId: anna!.id, eventId: drachenboot!.id },
      { userId: ben!.id, eventId: openAir!.id },
      { userId: clara!.id, eventId: dorffest!.id },
      { userId: emre!.id, eventId: flohmarkt!.id },
    ],
  });

  console.log("✅ Seed fertig:");
  console.log("   5 User (Passwort: venty1234) – z. B. anna@example.com");
  console.log("   2 Veranstalter, 6 Events (1 Draft), 8 Teilnahmen, 4 Freundschaften, 4 Favoriten");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
