import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { handleError } from "./errors.js";

/**
 * Wraps a tool handler so any thrown error comes back as an MCP tool error (isError: true) with a
 * user-safe message, its error code and HTTP-style status, instead of the raw exception text.
 */
export function withToolErrors<Args extends unknown[]>(
  toolName: string,
  handler: (...args: Args) => Promise<CallToolResult>,
): (...args: Args) => Promise<CallToolResult> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (err) {
      const error = handleError(`tool:${toolName}`, err);
      return {
        isError: true,
        content: [{ type: "text", text: `${error.message} (${error.code}, status ${error.status})` }],
        _meta: { error: error.toJSON() },
      };
    }
  };
}
