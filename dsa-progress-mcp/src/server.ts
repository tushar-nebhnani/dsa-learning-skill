import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { PrismaClient } from "./db/db.js";
import {
  getSolvedProblemInput,
  listSolvedProblemsInput,
  listSolvedProblemsOutput,
  recordSolvedProblemInput,
  recordSolvedProblemOutput,
  solvedProblemDetail,
} from "./db/schemas.js";
import { getSolvedProblem } from "./tools/getSolvedProblem.js";
import { listSolvedProblems } from "./tools/listSolvedProblems.js";
import { recordSolvedProblem } from "./tools/recordSolvedProblem.js";

function ok(data: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data) }],
    structuredContent: data,
  };
}

function fail(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

/** Runs a handler and turns thrown errors into MCP tool errors instead of transport failures. */
async function safely(
  label: string,
  fn: () => Promise<CallToolResult>,
): Promise<CallToolResult> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[${label}]`, err);
    return fail(
      `${label} failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function createMcpServer(prisma: PrismaClient): McpServer {
  const server = new McpServer({ name: "dsa-progress", version: "1.0.0" });

  server.registerTool(
    "record_solved_problem",
    {
      title: "Record solved problem",
      description:
        "Save a DSA problem the learner has finished (call after Stage 10 documentation). " +
        "Recording the same title again updates the existing record.",
      inputSchema: recordSolvedProblemInput,
      outputSchema: recordSolvedProblemOutput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    (input) =>
      safely("record_solved_problem", async () =>
        ok(await recordSolvedProblem(prisma, input)),
      ),
  );

  server.registerTool(
    "list_solved_problems",
    {
      title: "List solved problems",
      description:
        "List the problems the learner has already solved, newest first, with solved counts per topic. " +
        "Call before choosing a new problem so you don't repeat one and can see which topics are covered.",
      inputSchema: listSolvedProblemsInput,
      outputSchema: listSolvedProblemsOutput,
      annotations: { readOnlyHint: true },
    },
    (input) =>
      safely("list_solved_problems", async () =>
        ok(await listSolvedProblems(prisma, input)),
      ),
  );

  server.registerTool(
    "get_solved_problem",
    {
      title: "Get solved problem",
      description:
        "Get the full record of one solved problem, including its Stage 10 documentation, by slug or title.",
      inputSchema: getSolvedProblemInput,
      outputSchema: solvedProblemDetail,
      annotations: { readOnlyHint: true },
    },
    (input) =>
      safely("get_solved_problem", async () => {
        const problem = await getSolvedProblem(prisma, input);
        return problem
          ? ok(problem)
          : fail(`No solved problem found for "${input.slug}".`);
      }),
  );

  return server;
}
