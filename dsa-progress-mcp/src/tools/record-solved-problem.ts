import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PrismaClient } from "../db/db.js";
import { BadRequestError } from "../utils/errors.js";
import { withToolErrors } from "../utils/tool-error.js";
import { findLearner, requireCurrentTopic } from "./learner-id.js";
import { recordSchema, recordedSchema } from "./schema.js";

const REVISIT_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/** Symbols that change a title's meaning, so they are spelled out instead of dropped ("C++" vs "C"). */
const SPELLED_SYMBOLS: Record<string, string> = { "+": "plus", "#": "sharp", "&": "and" };

/**
 * "Two Sum II - Input Array Is Sorted" -> "two-sum-ii-input-array-is-sorted".
 * Accents are removed ("Café" -> "cafe") and letters and digits of any script are kept.
 */
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[+#&]/g, (symbol) => ` ${SPELLED_SYMBOLS[symbol]} `)
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function registerRecordSolvedProblem(server: McpServer, prisma: PrismaClient): void {
  server.registerTool(
    "record_solved_problem",
    {
      title: "Record solved problem",
      description:
        "Saves a problem the learner has finished, under their current topic. Call it after the Stage 11 documentation. " +
        "Records are matched on a slug made from the title, so recording the same title again updates the existing " +
        "record (its topic and first-solved date are kept) instead of creating a duplicate. " +
        "It fails if no currentTopic is saved.",
      inputSchema: recordSchema,
      outputSchema: recordedSchema,
      // Not idempotent: every call moves lastSolvedAt and revisitAt. Destructive: recording a title again
      // replaces its earlier documentation and result.
      annotations: { idempotentHint: false, destructiveHint: true, openWorldHint: false },
    },
    withToolErrors("record_solved_problem", async ({ revisit, ...problem }, { authInfo }) => {
      const learner = await findLearner(prisma, authInfo);
      const topic = requireCurrentTopic(learner);
      const slug = slugify(problem.title);
      if (!slug) throw new BadRequestError("The title must contain at least one letter or digit.");

      const fields = {
        ...problem,
        revisit,
        revisitAt: revisit ? new Date(Date.now() + REVISIT_AFTER_MS) : null,
      };
      const row = await prisma.solvedProblem.upsert({
        where: { learnerId_slug: { learnerId: learner.id, slug } },
        create: { ...fields, learnerId: learner.id, slug, topic },
        update: fields,
      });

      const recorded = {
        slug: row.slug,
        title: row.title,
        topic: row.topic,
        difficulty: row.difficulty,
        language: row.language,
        result: row.result,
        revisit: row.revisit,
        revisitAt: row.revisitAt?.toISOString() ?? null,
        firstSolvedAt: row.firstSolvedAt.toISOString(),
        lastSolvedAt: row.lastSolvedAt.toISOString(),
      };
      return {
        content: [{ type: "text", text: JSON.stringify(recorded, null, 2) }],
        structuredContent: recorded,
      };
    }),
  );
}
