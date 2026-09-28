import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PrismaClient } from "../db/db.js";
import { ComfortLevel, LearningMode } from "../generated/prisma/enums.js";
import { learnerId } from "./learner-id.js";

const learnerProfileSchema = {
  name: z.string().nullable(),
  onboarded: z.boolean(),
  totalSolved: z.number().int(),
  /** Problems whose revisit date has arrived. */
  revisitsDue: z.number().int(),
  preferences: z.object({
    language: z.string().nullable(),
    languageComfort: z.enum(ComfortLevel).nullable(),
    dsaComfort: z.enum(ComfortLevel).nullable(),
    learningMode: z.enum(LearningMode).nullable(),
    currentTopic: z.string().nullable(),
  }),
};

export function registerGetLearnerProfile(server: McpServer, prisma: PrismaClient): void {
  server.registerTool(
    "get_learner_profile",
    {
      title: "Get learner profile",
      description:
        "Returns the signed-in learner's name, whether they have finished Stage 0 setup, how many problems they have solved, " +
        "how many problems are due for a revisit, and their saved preferences (language, comfort levels, learning mode, current topic).",
      outputSchema: learnerProfileSchema,
      annotations: { readOnlyHint: true },
    },
    async ({ authInfo }) => {
      const id = learnerId(authInfo);
      const [learner, totalSolved, revisitsDue] = await Promise.all([
        prisma.learner.findUniqueOrThrow({ where: { id } }),
        prisma.solvedProblem.count({ where: { learnerId: id } }),
        // A null revisitAt means no revisit is scheduled, and never matches `lte`.
        prisma.solvedProblem.count({ where: { learnerId: id, revisitAt: { lte: new Date() } } }),
      ]);

      const preferences = {
        language: learner.preferredLanguage,
        languageComfort: learner.languageComfort,
        dsaComfort: learner.dsaComfort,
        learningMode: learner.learningMode,
        currentTopic: learner.currentTopic,
      };
      const profile = {
        name: learner.name,
        // A learner counts as onboarded once any preference is saved.
        onboarded: Object.values(preferences).some((value) => value !== null),
        totalSolved,
        revisitsDue,
        preferences,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(profile, null, 2) }],
        structuredContent: profile,
      };
    },
  );
}
