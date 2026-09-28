import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PrismaClient } from "../db/db.js";
import { withToolErrors } from "../utils/tool-error.js";
import { findLearner, requireCurrentTopic } from "./learner-id.js";
import { solvedProblemsSchema } from "./schema.js";

export function registerListSolvedProblems(server: McpServer, prisma: PrismaClient): void {
  server.registerTool(
    "list_solved_problems",
    {
      title: "List solved problems",
      description:
        "Lists the problems the learner has already solved in their current topic (the currentTopic preference), " +
        "most recently solved first, in problems. solvedInOtherTopics lists (slug, title, topic) every problem filed " +
        "under a different topic; a problem keeps the topic it was first recorded under, so one that fits this topic " +
        "may be listed there. Call it before picking a new problem and give neither list's problems again. " +
        "Takes no input; it fails if no currentTopic is saved.",
      outputSchema: solvedProblemsSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    withToolErrors("list_solved_problems", async ({ authInfo }: { authInfo?: AuthInfo }) => {
      const learner = await findLearner(prisma, authInfo);
      const topic = requireCurrentTopic(learner);
      const [rows, others] = await Promise.all([
        prisma.solvedProblem.findMany({
          where: { learnerId: learner.id, topic: { equals: topic, mode: "insensitive" } },
          orderBy: { lastSolvedAt: "desc" },
        }),
        prisma.solvedProblem.findMany({
          where: { learnerId: learner.id, NOT: { topic: { equals: topic, mode: "insensitive" } } },
          select: { slug: true, title: true, topic: true },
          orderBy: [{ topic: "asc" }, { title: "asc" }],
        }),
      ]);

      const list = {
        topic,
        count: rows.length,
        problems: rows.map((row) => ({
          slug: row.slug,
          title: row.title,
          difficulty: row.difficulty,
          language: row.language,
          result: row.result,
          revisit: row.revisit,
          firstSolvedAt: row.firstSolvedAt.toISOString(),
          lastSolvedAt: row.lastSolvedAt.toISOString(),
        })),
        solvedInOtherTopics: others,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(list, null, 2) }],
        structuredContent: list,
      };
    }),
  );
}
