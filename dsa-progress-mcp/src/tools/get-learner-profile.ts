import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PrismaClient } from "../db/db.js";
import { withToolErrors } from "../utils/tool-error.js";
import { findLearner, learnerPreferences } from "./learner-id.js";
import { learnerProfileSchema } from "./schema.js";

export function registerGetLearnerProfile(
  server: McpServer,
  prisma: PrismaClient,
): void {
  server.registerTool(
    "get_learner_profile",
    {
      title: "Get learner profile",
      description:
        "Returns the signed-in learner's profile. Call it at the start of every session, before saying anything to the learner. " +
        "Fields: name; onboarded (true once every preference has been saved with save_learner_preferences); totalSolved; " +
        "revisitsDue (solved problems whose revisit date has arrived); and preferences " +
        "(preferredLanguage, languageComfort, dsaComfort, learningMode, currentTopic), where any preference not saved yet is null. " +
        "Takes no input.",
      outputSchema: learnerProfileSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    withToolErrors("get_learner_profile", async ({ authInfo }: { authInfo?: AuthInfo }) => {
      const learner = await findLearner(prisma, authInfo);
      const [totalSolved, revisitsDue] = await Promise.all([
        prisma.solvedProblem.count({ where: { learnerId: learner.id } }),
        prisma.solvedProblem.count({
          where: { learnerId: learner.id, revisit: true, revisitAt: { lte: new Date() } },
        }),
      ]);

      const profile = {
        name: learner.name,
        onboarded: learner.onboarded,
        totalSolved,
        revisitsDue,
        preferences: learnerPreferences(learner),
      };
      return {
        content: [{ type: "text", text: JSON.stringify(profile, null, 2) }],
        structuredContent: profile,
      };
    }),
  );
}
