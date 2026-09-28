import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError, InternalError, NotFoundError, toAppError, UnauthorizedError } from "../src/utils/errors.js";
import { Prisma } from "../src/generated/prisma/client.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { PrismaClient } from "../src/db/db.js";
import { registerTools } from "../src/tools/index.js";
import { withToolErrors } from "../src/utils/tool-error.js";

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("raw prisma details", { code, clientVersion: "test" });

describe("toAppError", () => {
  it("passes app errors through unchanged", () => {
    const err = new NotFoundError("gone");
    assert.equal(toAppError(err), err);
  });

  it("maps known Prisma errors to their status", () => {
    assert.equal(toAppError(prismaError("P2025")).status, 404);
    assert.equal(toAppError(prismaError("P2002")).status, 409);
    assert.equal(toAppError(prismaError("P1001")).status, 503);
  });

  it("hides the details of unknown errors", () => {
    const err = toAppError(new Error("secret internals"));
    assert.ok(err instanceof InternalError);
    assert.equal(err.status, 500);
    assert.doesNotMatch(err.message, /secret/);
  });
});

describe("withToolErrors", () => {
  it("returns thrown app errors as a tool error with code and status", async () => {
    const handler = withToolErrors("test", async () => {
      throw new UnauthorizedError("Not signed in.");
    });
    const result = await handler();
    assert.equal(result.isError, true);
    assert.deepEqual(result.content, [{ type: "text", text: "Not signed in. (unauthorized, status 401)" }]);
    assert.deepEqual(result._meta, { error: { code: "unauthorized", status: 401, message: "Not signed in." } });
  });

  it("does not leak unknown error messages", async () => {
    const original = console.error;
    console.error = () => {};
    try {
      const result = await withToolErrors("test", async () => {
        throw new Error("secret internals");
      })();
      assert.equal(result.isError, true);
      assert.doesNotMatch(JSON.stringify(result), /secret/);
      assert.equal((result._meta?.error as ReturnType<AppError["toJSON"]>).status, 500);
    } finally {
      console.error = original;
    }
  });
});

describe("tools", () => {
  it("hide database error details", async () => {
    // A Prisma client whose every query fails with a message full of internals.
    const failing = (): unknown =>
      new Proxy(() => {}, {
        get: () => failing(),
        apply: () => Promise.reject(new Error("Invalid `prisma.solvedProblem.count()` invocation in /src/tools/x.ts:52:30")),
      });
    const handlers = new Map<string, (...args: unknown[]) => Promise<CallToolResult>>();
    const server = { registerTool: (name: string, _config: unknown, handler: never) => handlers.set(name, handler) };
    registerTools(server as unknown as McpServer, failing() as PrismaClient);

    const extra = { authInfo: { token: "t", clientId: "c", scopes: [], extra: { userId: "learner" } } };
    const originalError = console.error;
    console.error = () => {};
    try {
      for (const [name, handler] of handlers) {
        // Tools with an input schema take (args, extra); the others take only (extra).
        const result = handler.length === 2 ? await handler({ title: "x" }, extra) : await handler(extra);
        assert.equal(result.isError, true, name);
        assert.deepEqual(result.content, [{ type: "text", text: "Something went wrong. Please try again. (internal_error, status 500)" }], name);
      }
    } finally {
      console.error = originalError;
    }
    assert.ok(handlers.has("get_learner_profile"));
  });
});
