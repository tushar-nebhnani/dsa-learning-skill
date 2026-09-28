import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

export type { PrismaClient };

export function createPrisma(connectionString: string, options: { maxConnections?: number } = {}): PrismaClient {
  const adapter = new PrismaPg({ connectionString, max: options.maxConnections });
  return new PrismaClient({ adapter });
}
