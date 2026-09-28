import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PrismaClient } from "./db/db.js";
import { registerTools } from "./tools/index.js";

export function createMcpServer(prisma: PrismaClient): McpServer {
  const server = new McpServer({ name: "dsa-progress", version: "1.0.0" });
  registerTools(server, prisma);
  return server;
}
