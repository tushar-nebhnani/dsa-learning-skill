import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PrismaClient } from "../db/db.js";
import { withToolErrors } from "../utils/tool-error.js";
import { findLearner } from "./learner-id.js";
import { revisitsSchema } from "./schema.js";

export function registerListProblemsToRevisit(
  server: McpServer,
  prisma: PrismaClient,
): void {
  server.registerTool(
    "list_problems_to_revisit",
    {
      // retrieving all the revisit problems not based on topic as the topic might be over before the due date has arrived.
      title: "List problems to revisit",
      description:
        "Lists every solved problem marked for revisit, across all topics, earliest revisit date first. " +
        "Returns count (the number of problems listed) and problems. Each problem has: " +
        "slug (the problem's identifier), title, topic, difficulty, " +
        "result (accepted, partial or not_solved, from the last time it was solved), " +
        "revisitAt (the date the revisit becomes due, 7 days after the problem was recorded), " +
        "due (true once revisitAt has arrived; problems not yet due are included with due false), " +
        "and lastSolvedAt (when it was last recorded). " +
        "An empty list means no problem is marked for revisit. Takes no input.",
      outputSchema: revisitsSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    withToolErrors(
      "list_problems_to_revisit",
      async ({ authInfo }: { authInfo?: AuthInfo }) => {
        const learner = await findLearner(prisma, authInfo);
        const rows = await prisma.solvedProblem.findMany({
          where: { learnerId: learner.id, revisit: true },
          orderBy: [
            { revisitAt: { sort: "asc", nulls: "last" } },
            { lastSolvedAt: "asc" },
          ],
        });

        const now = Date.now();
        const list = {
          count: rows.length,
          problems: rows.map((row) => ({
            slug: row.slug,
            title: row.title,
            topic: row.topic,
            difficulty: row.difficulty,
            result: row.result,
            revisitAt: row.revisitAt?.toISOString() ?? null,
            due: row.revisitAt !== null && row.revisitAt.getTime() <= now,
            lastSolvedAt: row.lastSolvedAt.toISOString(),
          })),
        };
        return {
          content: [{ type: "text", text: JSON.stringify(list, null, 2) }],
          structuredContent: list,
        };
      },
    ),
  );
}
