import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PrismaClient } from "../db/db.js";
import { BadRequestError } from "../utils/errors.js";
import { withToolErrors } from "../utils/tool-error.js";
import { findLearner, learnerPreferences, PREFERENCE_KEYS } from "./learner-id.js";
import { preferencesSchema, savedPreferencesSchema } from "./schema.js";

export function registerSaveLearnerPreferences(
  server: McpServer,
  prisma: PrismaClient,
): void {
  server.registerTool(
    "save_learner_preferences",
    {
      title: "Save learner preferences",
      description:
        "Saves the learner's preferences (preferredLanguage, languageComfort, dsaComfort, learningMode, currentTopic) " +
        "so later sessions reuse them instead of asking again. The learner is marked onboarded once all five are saved " +
        "(across one or more calls) and stays onboarded after that. " +
        "Use it for a new learner's Stage 0 answers, for any preference a returning learner changes, " +
        "and to change currentTopic when the learner asks or the roadmap moves on. " +
        "A currentTopic that matches an existing topic apart from case reuses that topic's spelling. " +
        "Only the fields passed are changed; pass at least one, and pass null to clear one. " +
        "Never clear currentTopic: list_solved_problems and record_solved_problem both fail without one. " +
        "Returns onboarded and the full preferences after saving.",
      inputSchema: preferencesSchema,
      outputSchema: savedPreferencesSchema,
      annotations: { idempotentHint: true, destructiveHint: false, openWorldHint: false },
    },
    withToolErrors(
      "save_learner_preferences",
      async (preferences, { authInfo }) => {
        if (Object.values(preferences).every((value) => value === undefined)) {
          throw new BadRequestError("Pass at least one preference to save.");
        }
        const current = await findLearner(prisma, authInfo);
        if (preferences.currentTopic) {
          // Reuse an existing topic's spelling, so "arrays" and "Arrays" stay one topic.
          const existing = await prisma.solvedProblem.findFirst({
            where: { learnerId: current.id, topic: { equals: preferences.currentTopic, mode: "insensitive" } },
            select: { topic: true },
          });
          if (existing) preferences.currentTopic = existing.topic;
        }
        // Onboarded once every preference has a value, counting both this call and earlier ones.
        const complete = PREFERENCE_KEYS.every(
          (key) => (preferences[key] === undefined ? current[key] : preferences[key]) !== null,
        );
        const learner = await prisma.learner.update({
          where: { id: current.id },
          data: { ...preferences, onboarded: current.onboarded || complete },
        });

        const saved = { onboarded: learner.onboarded, preferences: learnerPreferences(learner) };
        return {
          content: [{ type: "text", text: JSON.stringify(saved, null, 2) }],
          structuredContent: saved,
        };
      },
    ),
  );
}
