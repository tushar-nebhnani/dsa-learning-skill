import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { PrismaClient } from "../db/db.js";
import type { Learner } from "../generated/prisma/client.js";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../utils/errors.js";

/** The signed-in learner's id, set by DsaOAuthProvider.verifyAccessToken. */
export function learnerId(authInfo: AuthInfo | undefined): string {
  const userId = authInfo?.extra?.userId;
  if (typeof userId !== "string") throw new UnauthorizedError("Not signed in. Connect your DSA Progress account and try again.");
  return userId;
}

/** Loads the signed-in learner, or throws NotFoundError if their account no longer exists. */
export async function findLearner(prisma: PrismaClient, authInfo: AuthInfo | undefined) {
  const learner = await prisma.learner.findUnique({ where: { id: learnerId(authInfo) } });
  if (!learner) throw new NotFoundError("No learner account was found for this sign-in. Sign in again.");
  return learner;
}

/** The Stage 0 preferences, saved by save_learner_preferences. */
export const PREFERENCE_KEYS = [
  "preferredLanguage",
  "languageComfort",
  "dsaComfort",
  "learningMode",
  "currentTopic",
] as const satisfies readonly (keyof Learner)[];

export function learnerPreferences(learner: Learner) {
  return Object.fromEntries(PREFERENCE_KEYS.map((key) => [key, learner[key]])) as Pick<
    Learner,
    (typeof PREFERENCE_KEYS)[number]
  >;
}

/** The topic new problems are filed under, or throws BadRequestError if the learner hasn't set one. */
export function requireCurrentTopic(learner: Learner): string {
  if (!learner.currentTopic) {
    throw new BadRequestError("No current topic is set. Save one with save_learner_preferences first.");
  }
  return learner.currentTopic;
}
