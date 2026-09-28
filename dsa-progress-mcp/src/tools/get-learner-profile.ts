import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PrismaClient } from "../db/db.js";
import { ComfortLevel, LearningMode } from "../generated/prisma/enums.js";
import { learnerId } from "./learner-id.js";

const learnerProfileSchema = {
  name: z.string().nullable(),
  onboarded: z.boolean(),
  totalSolved: z.number().int(),
  revisitsDue: z.number().int(),
  preferences: z.object({
    language: z.string().nullable(),
    languageComfort: z.enum(ComfortLevel).nullable(),
    dsaComfort: z.enum(ComfortLevel).nullable(),
    learningMode: z.enum(LearningMode).nullable(),
    currentTopic: z.string().nullable(),
  }),
};

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
        "Fields: name; onboarded (true once any preference has been saved); totalSolved; " +
        "revisitsDue (solved problems whose revisit date has arrived); and preferences " +
        "(language, languageComfort, dsaComfort, learningMode, currentTopic), where any preference not saved yet is null.",
      outputSchema: learnerProfileSchema,
      annotations: { readOnlyHint: true },
    },
    async ({ authInfo }) => {
      const id = learnerId(authInfo);
      const learner = await prisma.learner.findUnique({ where: { id } });
      if (!learner) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "No learner account was found for this sign-in. Sign in again.",
            },
          ],
        };
      }
      const [totalSolved, revisitsDue] = await Promise.all([
        prisma.solvedProblem.count({ where: { learnerId: id } }),
        prisma.solvedProblem.count({
          where: { learnerId: id, revisitAt: { lte: new Date() } },
        }),
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
