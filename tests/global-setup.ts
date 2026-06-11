import { execSync } from "node:child_process";
import { TEST_DATABASE_URL } from "../vitest.config";

/** Migriert die Test-Datenbank, bevor irgendein Test läuft. */
export default function setup() {
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "inherit",
  });
}
