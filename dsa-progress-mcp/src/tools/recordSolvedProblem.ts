import { DEFAULT_LEARNER_ID, type PrismaClient } from "../db/db.js";
import {
  toSlug,
  type RecordSolvedProblemInput,
  type RecordSolvedProblemOutput,
} from "../db/schemas.js";

/** Saves a solved problem. Re-recording the same title updates the existing row instead of duplicating it. */
export async function recordSolvedProblem(
  prisma: PrismaClient,
  input: RecordSolvedProblemInput,
  learnerId = DEFAULT_LEARNER_ID,
): Promise<RecordSolvedProblemOutput> {
  const slug = toSlug(input.title);
  const data = {
    title: input.title,
    topic: input.topic,
    difficulty: input.difficulty,
    language: input.language,
    platform: input.platform,
    platformRef: input.platformRef ?? null,
    result: input.result,
    timeComplexity: input.timeComplexity,
    spaceComplexity: input.spaceComplexity,
    documentationMd: input.documentationMd ?? null,
    solvedAt: input.solvedAt ? new Date(input.solvedAt) : new Date(),
  };
  const where = { learnerId_slug: { learnerId, slug } };

  return prisma.$transaction(async (tx: any) => {
    const existing = await tx.solvedProblem.findUnique({
      where,
      select: { id: true },
    });
    const row = await tx.solvedProblem.upsert({
      where,
      create: { learnerId, slug, ...data },
      update: data,
      select: { id: true, slug: true },
    });
    return { id: row.id, slug: row.slug, created: existing === null };
  });
}
