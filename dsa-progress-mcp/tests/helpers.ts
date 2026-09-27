import { readdir, readFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { createPrisma, type PrismaClient } from "../src/db/db.js";
import type { RecordSolvedProblemInput } from "../src/db/schemas.js";

const MIGRATIONS_DIR = path.resolve(
  import.meta.dirname,
  "../prisma/migrations",
);

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address() as { port: number };
      srv.close(() => resolve(port));
    });
  });
}

export interface TestDb {
  prisma: PrismaClient;
  reset(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Starts an in-memory Postgres (PGlite) behind a wire-protocol socket, applies the real
 * Prisma migrations, and returns a PrismaClient connected to it. No Docker needed.
 */
export async function createTestDb(): Promise<TestDb> {
  const pglite = await PGlite.create();
  for (const dir of (
    await readdir(MIGRATIONS_DIR, { withFileTypes: true })
  ).filter((d) => d.isDirectory())) {
    await pglite.exec(
      await readFile(
        path.join(MIGRATIONS_DIR, dir.name, "migration.sql"),
        "utf8",
      ),
    );
  }

  const port = await freePort();
  const socketServer = new PGLiteSocketServer({
    db: pglite,
    port,
    host: "127.0.0.1",
  });
  await socketServer.start();

  // PGlite is single-connection, so keep the pool at one.
  const prisma = createPrisma(
    `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable`,
    {
      maxConnections: 1,
    },
  );

  return {
    prisma,
    reset: async () => {
      await prisma.$executeRawUnsafe("TRUNCATE solved_problems");
    },
    close: async () => {
      await prisma.$disconnect();
      await socketServer.stop();
      await pglite.close();
    },
  };
}

export function sampleProblem(
  overrides: Partial<RecordSolvedProblemInput> = {},
): RecordSolvedProblemInput {
  return {
    title: "Longest Substring Without Repeating Characters",
    topic: "Sliding Window",
    difficulty: "medium",
    language: "Python",
    platform: "LeetCode",
    platformRef: "#3",
    result: "accepted",
    timeComplexity: "O(n)",
    spaceComplexity: "O(min(n, k))",
    ...overrides,
  };
}
