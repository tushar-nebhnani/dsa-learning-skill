import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  listSolvedProblemsInput,
  recordSolvedProblemInput,
  toSlug,
} from "../src/db/schemas.js";
import { sampleProblem } from "./helpers.js";

describe("toSlug", () => {
  it("lowercases and hyphenates a title", () => {
    assert.equal(
      toSlug("Longest Substring Without Repeating Characters"),
      "longest-substring-without-repeating-characters",
    );
  });

  it("collapses punctuation and trims leading/trailing separators", () => {
    assert.equal(
      toSlug("  Two Sum -- II (Sorted Input)! "),
      "two-sum-ii-sorted-input",
    );
  });

  it("strips accents", () => {
    assert.equal(toSlug("Café Ordering"), "cafe-ordering");
  });

  it("is idempotent on an existing slug", () => {
    assert.equal(toSlug("two-sum"), "two-sum");
  });

  it("returns an empty string when there is nothing alphanumeric", () => {
    assert.equal(toSlug("!!!"), "");
  });
});

describe("recordSolvedProblemInput", () => {
  it("accepts a complete problem", () => {
    const parsed = recordSolvedProblemInput.parse(
      sampleProblem({ solvedAt: "2026-09-27T10:00:00Z" }),
    );
    assert.equal(parsed.topic, "Sliding Window");
  });

  it("trims string fields", () => {
    const parsed = recordSolvedProblemInput.parse(
      sampleProblem({ topic: "  Two Pointers  " }),
    );
    assert.equal(parsed.topic, "Two Pointers");
  });

  it("rejects a title with no letters or digits", () => {
    assert.equal(
      recordSolvedProblemInput.safeParse(sampleProblem({ title: "???" }))
        .success,
      false,
    );
  });

  it("rejects blank required fields", () => {
    assert.equal(
      recordSolvedProblemInput.safeParse(sampleProblem({ topic: "   " }))
        .success,
      false,
    );
  });

  it("rejects an unknown difficulty", () => {
    const bad = { ...sampleProblem(), difficulty: "extreme" };
    assert.equal(recordSolvedProblemInput.safeParse(bad).success, false);
  });

  it("rejects an unknown result", () => {
    const bad = { ...sampleProblem(), result: "failed" };
    assert.equal(recordSolvedProblemInput.safeParse(bad).success, false);
  });

  it("rejects a malformed solvedAt", () => {
    assert.equal(
      recordSolvedProblemInput.safeParse(
        sampleProblem({ solvedAt: "yesterday" }),
      ).success,
      false,
    );
  });

  it("rejects missing required fields", () => {
    const { timeComplexity: _omit, ...rest } = sampleProblem();
    assert.equal(recordSolvedProblemInput.safeParse(rest).success, false);
  });
});

describe("listSolvedProblemsInput", () => {
  it("applies default limit and offset", () => {
    assert.deepEqual(listSolvedProblemsInput.parse({}), {
      limit: 50,
      offset: 0,
    });
  });

  it("rejects a limit above 200", () => {
    assert.equal(
      listSolvedProblemsInput.safeParse({ limit: 201 }).success,
      false,
    );
  });

  it("rejects a negative offset", () => {
    assert.equal(
      listSolvedProblemsInput.safeParse({ offset: -1 }).success,
      false,
    );
  });
});
