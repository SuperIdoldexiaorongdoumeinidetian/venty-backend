import { buildApp } from "./app";
import { config } from "./config";
import { prisma } from "./lib/prisma";

async function main() {
  const app = await buildApp();

  // Graceful Shutdown (Docker SIGTERM, Ctrl+C)
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, async () => {
      app.log.info(`${signal} empfangen, fahre herunter …`);
      await app.close();
      await prisma.$disconnect();
      process.exit(0);
    });
  }

  await app.listen({ port: config.PORT, host: config.HOST });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
