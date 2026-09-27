import { z } from "zod";

export function toSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const nonEmpty = (max: number) => z.string().trim().min(1).max(max);

export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export const resultSchema = z.enum(["accepted", "partial"]);

export const recordSolvedProblemInput = z.object({
  title: nonEmpty(200)
    .refine(
      (t) => toSlug(t).length > 0,
      "title must contain at least one letter or digit",
    )
    .describe(
      "Problem title, e.g. 'Longest Substring Without Repeating Characters'",
    ),
  topic: nonEmpty(100).describe(
    "Pattern/topic, e.g. 'Sliding Window'. Reuse the exact names already recorded.",
  ),
  difficulty: difficultySchema,
  language: nonEmpty(50).describe(
    "Language the learner solved it in, e.g. 'Python'",
  ),
  platform: nonEmpty(100).describe(
    "Where it was submitted, e.g. 'LeetCode', or 'Local test cases'",
  ),
  platformRef: nonEmpty(100)
    .optional()
    .describe("Platform identifier, e.g. '#3'"),
  result: resultSchema.describe(
    "'accepted' if all tests passed, otherwise 'partial'",
  ),
  timeComplexity: nonEmpty(100).describe("Final time complexity, e.g. 'O(n)'"),
  spaceComplexity: nonEmpty(100).describe(
    "Final space complexity, e.g. 'O(1)'",
  ),
  documentationMd: z
    .string()
    .max(200_000)
    .optional()
    .describe("Full Stage 10 documentation in Markdown"),
  solvedAt: z.iso
    .datetime({ offset: true })
    .optional()
    .describe("ISO 8601 timestamp; defaults to now"),
});
export type RecordSolvedProblemInput = z.infer<typeof recordSolvedProblemInput>;

export const recordSolvedProblemOutput = z.object({
  id: z.string(),
  slug: z.string(),
  created: z
    .boolean()
    .describe("false when an existing record for this problem was updated"),
});
export type RecordSolvedProblemOutput = z.infer<
  typeof recordSolvedProblemOutput
>;

export const listSolvedProblemsInput = z.object({
  topic: nonEmpty(100)
    .optional()
    .describe("Filter by topic (case-insensitive)"),
  language: nonEmpty(50)
    .optional()
    .describe("Filter by language (case-insensitive)"),
  difficulty: difficultySchema.optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});
export type ListSolvedProblemsInput = z.input<typeof listSolvedProblemsInput>;

export const problemSummary = z.object({
  slug: z.string(),
  title: z.string(),
  topic: z.string(),
  difficulty: difficultySchema,
  language: z.string(),
  result: resultSchema,
  solvedAt: z.string(),
});

export const listSolvedProblemsOutput = z.object({
  total: z.number().int().describe("Number of problems matching the filters"),
  problems: z.array(problemSummary),
  topicCounts: z
    .array(z.object({ topic: z.string(), count: z.number().int() }))
    .describe(
      "Solved count per topic across all of the learner's problems, ignoring filters",
    ),
});
export type ListSolvedProblemsOutput = z.infer<typeof listSolvedProblemsOutput>;

export const getSolvedProblemInput = z.object({
  slug: nonEmpty(200).describe(
    "Problem slug or title; titles are converted to slugs",
  ),
});
export type GetSolvedProblemInput = z.infer<typeof getSolvedProblemInput>;

export const solvedProblemDetail = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  topic: z.string(),
  difficulty: difficultySchema,
  language: z.string(),
  platform: z.string(),
  platformRef: z.string().nullable(),
  result: resultSchema,
  timeComplexity: z.string(),
  spaceComplexity: z.string(),
  documentationMd: z.string().nullable(),
  solvedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SolvedProblemDetail = z.infer<typeof solvedProblemDetail>;
