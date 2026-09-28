import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError, InternalError, NotFoundError, toAppError, UnauthorizedError } from "../src/utils/errors.js";
import { Prisma } from "../src/generated/prisma/client.js";
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
