// Empties every table the server writes to: learners, solved problems and all OAuth state.
// The schema and the migration history stay, so the server runs again straight away (no migrate needed).
// Every MCP client has to sign in again afterwards. The dashboard's sign-in is a cookie, so it stays signed in and shows an empty journey.
//
//   npm run db:reset                    asks you to type the database name first
//   npm run db:reset -- --yes           skips the question (for scripts)
//   npm run db:reset -- --allow-remote  needed for any host other than localhost
import { createInterface } from "node:readline/promises";
import { createPrisma } from "../src/db/db.js";

const TABLES = ["solved_problems", "users", "oauth_clients", "pending_authorizations", "authorization_codes", "oauth_tokens"];
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

const args = new Set(process.argv.slice(2));
const url = process.env.DATABASE_URL ?? "postgres://dsa:dsa@localhost:5432/dsa_progress";

let target: URL;
try {
  target = new URL(url);
} catch {
  console.error("DATABASE_URL is not a valid URL.");
  process.exit(1);
}
const database = decodeURIComponent(target.pathname.slice(1));
// Never print the password.
const shown = `${target.hostname}${target.port ? `:${target.port}` : ""}/${database}`;

if (!LOCAL_HOSTS.has(target.hostname) && !args.has("--allow-remote")) {
  console.error(`Refusing to reset ${shown}: it isn't a local database. Pass --allow-remote if you really mean it.`);
  process.exit(1);
}

if (!args.has("--yes")) {
  if (!process.stdin.isTTY) {
    console.error("Not running in a terminal, so I can't ask for confirmation. Pass --yes to reset without asking.");
    process.exit(1);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`This deletes every learner, solved problem and token in ${shown}.\nType the database name (${database}) to continue: `);
  rl.close();
  if (answer.trim() !== database) {
    console.log("Name didn't match. Nothing was changed.");
    process.exit(1);
  }
}

const prisma = createPrisma(url, { maxConnections: 1 });
try {
  const before = await prisma.$queryRawUnsafe<{ users: bigint; solved: bigint }[]>(
    "SELECT (SELECT count(*) FROM users) AS users, (SELECT count(*) FROM solved_problems) AS solved",
  );
  await prisma.$executeRawUnsafe(`TRUNCATE ${TABLES.join(", ")} CASCADE`);
  const counts = before[0];
  console.log(`Reset ${shown}: removed ${counts?.users ?? 0} learners and ${counts?.solved ?? 0} solved problems, and cleared all OAuth state.`);
} catch (err) {
  console.error(`Reset failed; nothing was changed (TRUNCATE runs as one statement).\n${err instanceof Error ? err.message : err}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
