import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PrismaClient } from "../db/db.js";
import { registerGetLearnerProfile } from "./get-learner-profile.js";
import { registerListProblemsToRevisit } from "./list-problems-to-revisit.js";
import { registerListSolvedProblems } from "./list-solved-problems.js";
import { registerRecordSolvedProblem } from "./record-solved-problem.js";
import { registerSaveLearnerPreferences } from "./save-learner-preferences.js";

/** Registers every MCP tool. Each tool lives in its own file in this folder. */
export function registerTools(server: McpServer, prisma: PrismaClient): void {
  registerGetLearnerProfile(server, prisma);
  registerSaveLearnerPreferences(server, prisma);
  registerListSolvedProblems(server, prisma);
  registerRecordSolvedProblem(server, prisma);
  registerListProblemsToRevisit(server, prisma);
}
