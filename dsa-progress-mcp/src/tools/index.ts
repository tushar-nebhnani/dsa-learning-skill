import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PrismaClient } from "../db/db.js";
import { registerGetLearnerProfile } from "./get-learner-profile.js";

/** Registers every MCP tool. Each tool lives in its own file in this folder. */
export function registerTools(server: McpServer, prisma: PrismaClient): void {
  registerGetLearnerProfile(server, prisma);
}
