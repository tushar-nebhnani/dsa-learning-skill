import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { getSolvedProblem } from "../src/tools/getSolvedProblem.js";
import { listSolvedProblems } from "../src/tools/listSolvedProblems.js";
import { recordSolvedProblem } from "../src/tools/recordSolvedProblem.js";
import { createTestDb, sampleProblem, type TestDb } from "./helpers.js";

describe("tool handlers (Postgres via PGlite)", () => {
  let db: TestDb;

  before(async () => {
    db = await createTestDb();
  });
  after(async () => {
    await db.close();
  });
  beforeEach(async () => {
    await db.reset();
  });

  describe("recordSolvedProblem", () => {
    it("creates a new record and derives the slug from the title", async () => {
      const out = await recordSolvedProblem(db.prisma, sampleProblem());
      assert.equal(out.created, true);
      assert.equal(out.slug, "longest-substring-without-repeating-characters");
      assert.match(out.id, /^[0-9a-f-]{36}$/);
    });

    it("updates instead of duplicating when the same problem is recorded again", async () => {
      const first = await recordSolvedProblem(db.prisma, sampleProblem({ result: "partial" }));
      const second = await recordSolvedProblem(db.prisma, sampleProblem({ result: "accepted", timeComplexity: "O(n log n)" }));

      assert.equal(second.created, false);
      assert.equal(second.id, first.id);
      assert.equal(await db.prisma.solvedProblem.count(), 1);

      const stored = await getSolvedProblem(db.prisma, { slug: first.slug });
      assert.equal(stored?.result, "accepted");
      assert.equal(stored?.timeComplexity, "O(n log n)");
    });

    it("treats titles that differ only in case/punctuation as the same problem", async () => {
      await recordSolvedProblem(db.prisma, sampleProblem({ title: "Two Sum" }));
      const again = await recordSolvedProblem(db.prisma, sampleProblem({ title: "two-sum!" }));
      assert.equal(again.created, false);
      assert.equal(await db.prisma.solvedProblem.count(), 1);
    });

    it("stores optional fields as null when omitted", async () => {
      const { platformRef: _omit, ...noRef } = sampleProblem();
      const out = await recordSolvedProblem(db.prisma, noRef);
      const stored = await getSolvedProblem(db.prisma, { slug: out.slug });
      assert.equal(stored?.platformRef, null);
      assert.equal(stored?.documentationMd, null);
    });

    it("uses the given solvedAt, otherwise now", async () => {
      const explicit = await recordSolvedProblem(db.prisma, sampleProblem({ title: "A", solvedAt: "2026-01-02T03:04:05Z" }));
      const before = Date.now();
      const implicit = await recordSolvedProblem(db.prisma, sampleProblem({ title: "B" }));

      assert.equal((await getSolvedProblem(db.prisma, { slug: explicit.slug }))?.solvedAt, "2026-01-02T03:04:05.000Z");
      const implicitAt = Date.parse((await getSolvedProblem(db.prisma, { slug: implicit.slug }))!.solvedAt);
      assert.ok(implicitAt >= before - 1000 && implicitAt <= Date.now() + 1000);
    });

    it("keeps records separate per learner", async () => {
      await recordSolvedProblem(db.prisma, sampleProblem(), "alice");
      const bob = await recordSolvedProblem(db.prisma, sampleProblem(), "bob");
      assert.equal(bob.created, true);
      assert.equal((await listSolvedProblems(db.prisma, {}, "alice")).total, 1);
      assert.equal((await listSolvedProblems(db.prisma, {})).total, 0);
    });
  });

  describe("listSolvedProblems", () => {
    beforeEach(async () => {
      await recordSolvedProblem(db.prisma, sampleProblem({ title: "Two Sum", topic: "Hashing", difficulty: "easy", solvedAt: "2026-09-01T00:00:00Z" }));
      await recordSolvedProblem(db.prisma, sampleProblem({ title: "Max Sum Subarray of Size K", topic: "Sliding Window", difficulty: "easy", solvedAt: "2026-09-02T00:00:00Z" }));
      await recordSolvedProblem(db.prisma, sampleProblem({ title: "Minimum Window Substring", topic: "Sliding Window", difficulty: "hard", language: "Java", solvedAt: "2026-09-03T00:00:00Z" }));
    });

    it("returns an empty result when nothing is solved", async () => {
      await db.reset();
      assert.deepEqual(await listSolvedProblems(db.prisma, {}), { total: 0, problems: [], topicCounts: [] });
    });

    it("lists newest first with ISO dates", async () => {
      const out = await listSolvedProblems(db.prisma, {});
      assert.equal(out.total, 3);
      assert.deepEqual(
        out.problems.map((p) => p.slug),
        ["minimum-window-substring", "max-sum-subarray-of-size-k", "two-sum"],
      );
      assert.equal(out.problems[0]?.solvedAt, "2026-09-03T00:00:00.000Z");
    });

    it("returns per-topic counts", async () => {
      const out = await listSolvedProblems(db.prisma, {});
      assert.deepEqual(out.topicCounts, [
        { topic: "Hashing", count: 1 },
        { topic: "Sliding Window", count: 2 },
      ]);
    });

    it("filters by topic case-insensitively, while topicCounts still covers everything", async () => {
      const out = await listSolvedProblems(db.prisma, { topic: "sliding window" });
      assert.equal(out.total, 2);
      assert.ok(out.problems.every((p) => p.topic === "Sliding Window"));
      assert.equal(out.topicCounts.length, 2);
    });

    it("filters by language and difficulty", async () => {
      assert.equal((await listSolvedProblems(db.prisma, { language: "java" })).total, 1);
      assert.equal((await listSolvedProblems(db.prisma, { difficulty: "easy" })).total, 2);
      assert.equal((await listSolvedProblems(db.prisma, { difficulty: "easy", topic: "Hashing" })).total, 1);
    });

    it("paginates with limit and offset while total stays the full count", async () => {
      const page = await listSolvedProblems(db.prisma, { limit: 1, offset: 1 });
      assert.equal(page.total, 3);
      assert.deepEqual(page.problems.map((p) => p.slug), ["max-sum-subarray-of-size-k"]);
    });

    it("does not include documentation in the summary", async () => {
      await recordSolvedProblem(db.prisma, sampleProblem({ title: "Two Sum", documentationMd: "# Two Sum" }));
      const out = await listSolvedProblems(db.prisma, {});
      assert.ok(out.problems.every((p) => !("documentationMd" in p)));
    });
  });

  describe("getSolvedProblem", () => {
    it("returns the full record including documentation", async () => {
      await recordSolvedProblem(db.prisma, sampleProblem({ documentationMd: "# Notes\nUsed a set." }));
      const out = await getSolvedProblem(db.prisma, { slug: "longest-substring-without-repeating-characters" });
      assert.equal(out?.title, "Longest Substring Without Repeating Characters");
      assert.equal(out?.documentationMd, "# Notes\nUsed a set.");
      assert.equal(out?.platformRef, "#3");
      assert.ok(!("learnerId" in (out ?? {})));
    });

    it("accepts a title in place of the slug", async () => {
      await recordSolvedProblem(db.prisma, sampleProblem());
      const out = await getSolvedProblem(db.prisma, { slug: "Longest Substring Without Repeating Characters" });
      assert.equal(out?.slug, "longest-substring-without-repeating-characters");
    });

    it("returns null for an unknown problem", async () => {
      assert.equal(await getSolvedProblem(db.prisma, { slug: "does-not-exist" }), null);
    });
  });
});
