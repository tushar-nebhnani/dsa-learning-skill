import { DEFAULT_LEARNER_ID, type PrismaClient } from "../db/db.js";
import type { Prisma } from "../generated/prisma/client.js";
import {
  listSolvedProblemsInput,
  type ListSolvedProblemsInput,
  type ListSolvedProblemsOutput,
} from "../db/schemas.js";

/** Lists solved problems (newest first) plus per-topic counts, so the agent can see coverage at a glance. */
export async function listSolvedProblems(
  prisma: PrismaClient,
  rawInput: ListSolvedProblemsInput,
  learnerId = DEFAULT_LEARNER_ID,
): Promise<ListSolvedProblemsOutput> {
  const input = listSolvedProblemsInput.parse(rawInput);
  const where: Prisma.SolvedProblemWhereInput = {
    learnerId,
    ...(input.topic && { topic: { equals: input.topic, mode: "insensitive" } }),
    ...(input.language && {
      language: { equals: input.language, mode: "insensitive" },
    }),
    ...(input.difficulty && { difficulty: input.difficulty }),
  };

  const [total, rows, groups] = await Promise.all([
    prisma.solvedProblem.count({ where }),
    prisma.solvedProblem.findMany({
      where,
      orderBy: [{ solvedAt: "desc" }, { slug: "asc" }],
      take: input.limit,
      skip: input.offset,
      select: {
        slug: true,
        title: true,
        topic: true,
        difficulty: true,
        language: true,
        result: true,
        solvedAt: true,
      },
    }),
    prisma.solvedProblem.groupBy({
      by: ["topic"],
      where: { learnerId },
      _count: { _all: true },
      orderBy: { topic: "asc" },
    }),
  ]);

  return {
    total,
    problems: rows.map((r: any) => ({
      ...r,
      solvedAt: r.solvedAt.toISOString(),
    })),
    topicCounts: groups.map((g: any) => ({
      topic: g.topic,
      count: g._count._all,
    })),
  };
}
