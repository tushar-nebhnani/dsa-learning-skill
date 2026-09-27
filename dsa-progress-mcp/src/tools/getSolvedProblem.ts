import { DEFAULT_LEARNER_ID, type PrismaClient } from "../db/db.js";
import {
  toSlug,
  type GetSolvedProblemInput,
  type SolvedProblemDetail,
} from "../db/schemas.js";

/** Returns the full record for one problem, or null if the learner hasn't solved it. */
export async function getSolvedProblem(
  prisma: PrismaClient,
  input: GetSolvedProblemInput,
  learnerId = DEFAULT_LEARNER_ID,
): Promise<SolvedProblemDetail | null> {
  const row = await prisma.solvedProblem.findUnique({
    where: { learnerId_slug: { learnerId, slug: toSlug(input.slug) } },
  });
  if (!row) return null;

  const {
    learnerId: _learnerId,
    solvedAt,
    createdAt,
    updatedAt,
    ...rest
  } = row;
  return {
    ...rest,
    solvedAt: solvedAt.toISOString(),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}
