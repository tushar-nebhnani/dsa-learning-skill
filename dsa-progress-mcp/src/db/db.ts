import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

export type { PrismaClient };

/** Single-learner for now; the column exists so multiple learners can be added without a migration. */
export const DEFAULT_LEARNER_ID = "default";

export function createPrisma(connectionString: string, options: { maxConnections?: number } = {}): PrismaClient {
  const adapter = new PrismaPg({ connectionString, max: options.maxConnections });
  return new PrismaClient({ adapter });
}
