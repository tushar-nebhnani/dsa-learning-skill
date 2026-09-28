import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createTestDb, googleUser, signIn, startTestServer, type TestDb, type TestServer } from "./helpers.js";

async function connectClient(baseUrl: string, token: string | null): Promise<Client> {
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
    requestInit: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
  await client.connect(transport);
  return client;
}

describe("MCP over HTTP", () => {
  let db: TestDb;
  let ts: TestServer;
  let baseUrl: string;
  let accessToken: string;

  before(async () => {
    db = await createTestDb();
    ts = await startTestServer(db.prisma);
    baseUrl = ts.baseUrl;
    ({ accessToken } = await signIn(baseUrl, googleUser("alice")));
  });
  after(async () => {
    await ts.close();
    await db.close();
  });

  it("connects with a valid access token", async () => {
    const client = await connectClient(baseUrl, accessToken);
    await client.ping();
    await client.close();
  });

  it("rejects requests without a valid access token", async () => {
    await assert.rejects(connectClient(baseUrl, null));
    await assert.rejects(connectClient(baseUrl, "wrong-token"));
  });

  it("get_learner_profile returns the signed-in learner's profile", async () => {
    const learner = await db.prisma.learner.findUniqueOrThrow({ where: { googleSub: "alice" } });
    await db.prisma.learner.update({
      where: { id: learner.id },
      data: {
        name: "Asha",
        onboarded: true,
        preferredLanguage: "Python",
        languageComfort: "intermediate",
        dsaComfort: "beginner",
        learningMode: "roadmap",
        currentTopic: "Arrays",
      },
    });
    const otherLearner = await db.prisma.learner.create({
      data: { googleSub: "someone-else", email: "someone-else@example.com" },
    });
    const DAY_MS = 24 * 60 * 60 * 1000;
    const problem = (slug: string, revisitAt: Date | null) => ({
      learnerId: learner.id, slug, title: slug, topic: "Arrays", difficulty: "easy" as const, language: "Python",
      result: "accepted" as const, documentationMd: `# ${slug}`, revisit: revisitAt !== null, revisitAt,
    });
    await db.prisma.solvedProblem.createMany({
      data: [
        problem("two-sum", new Date(Date.now() - DAY_MS)),
        problem("max-subarray", new Date(Date.now() - 2 * DAY_MS)),
        problem("rotate-array", new Date(Date.now() + DAY_MS)),
        problem("contains-duplicate", null),
        { ...problem("other-learner", new Date(Date.now() - DAY_MS)), learnerId: otherLearner.id },
      ],
    });

    const client = await connectClient(baseUrl, accessToken);
    const result = await client.callTool({ name: "get_learner_profile", arguments: {} });
    await client.close();

    assert.deepEqual(result.structuredContent, {
      name: "Asha",
      onboarded: true,
      totalSolved: 4,
      revisitsDue: 2,
      preferences: {
        preferredLanguage: "Python",
        languageComfort: "intermediate",
        dsaComfort: "beginner",
        learningMode: "roadmap",
        currentTopic: "Arrays",
      },
    });
  });

  it("get_learner_profile reports a new learner as not onboarded", async () => {
    const { accessToken: newToken } = await signIn(baseUrl, googleUser("newcomer", { name: "Ravi" }));
    const client = await connectClient(baseUrl, newToken);
    const result = await client.callTool({ name: "get_learner_profile", arguments: {} });
    await client.close();

    assert.deepEqual(result.structuredContent, {
      name: "Ravi",
      onboarded: false,
      totalSolved: 0,
      revisitsDue: 0,
      preferences: {
        preferredLanguage: null,
        languageComfort: null,
        dsaComfort: null,
        learningMode: null,
        currentTopic: null,
      },
    });
  });

  describe("progress tools", () => {
    let token: string;
    const call = async (name: string, args: Record<string, unknown> = {}) => {
      const client = await connectClient(baseUrl, token);
      const result = await client.callTool({ name, arguments: args });
      await client.close();
      return result;
    };
    const record = (title: string, extra: Record<string, unknown> = {}) =>
      call("record_solved_problem", {
        title, difficulty: "easy", language: "Python", result: "accepted", documentationMd: `# ${title}`, revisit: false,
        ...extra,
      });

    before(async () => {
      ({ accessToken: token } = await signIn(baseUrl, googleUser("bob")));
    });

    it("record_solved_problem and list_solved_problems need a current topic", async () => {
      assert.equal((await record("Two Sum")).isError, true);
      const list = await call("list_solved_problems");
      assert.equal(list.isError, true);
      assert.match((list.content as { text: string }[])[0]!.text, /No current topic/);
    });

    it("save_learner_preferences saves the answers and marks the learner onboarded", async () => {
      assert.equal((await call("save_learner_preferences")).isError, true);

      // Saving only some of the answers doesn't onboard the learner yet.
      const some = await call("save_learner_preferences", { currentTopic: "Arrays", preferredLanguage: "Python" });
      assert.equal((some.structuredContent as { onboarded: boolean }).onboarded, false);

      const result = await call("save_learner_preferences", {
        languageComfort: "intermediate", dsaComfort: "beginner", learningMode: "topic",
      });
      assert.deepEqual(result.structuredContent, {
        onboarded: true,
        preferences: {
          preferredLanguage: "Python", languageComfort: "intermediate", dsaComfort: "beginner",
          learningMode: "topic", currentTopic: "Arrays",
        },
      });

      // Only the fields passed are changed.
      const partial = await call("save_learner_preferences", { dsaComfort: "intermediate" });
      const { preferences } = partial.structuredContent as { preferences: Record<string, unknown> };
      assert.equal(preferences.dsaComfort, "intermediate");
      assert.equal(preferences.currentTopic, "Arrays");

      const profile = await call("get_learner_profile");
      assert.equal((profile.structuredContent as { onboarded: boolean }).onboarded, true);
    });

    it("record_solved_problem files problems under the current topic and updates by title", async () => {
      const first = await record("Two Sum");
      const created = first.structuredContent as Record<string, unknown>;
      assert.equal(created.slug, "two-sum");
      assert.equal(created.topic, "Arrays");
      assert.equal(created.revisit, false);
      assert.equal(created.revisitAt, null);

      const again = await record("two  sum!", { result: "partial", revisit: true });
      const updated = again.structuredContent as Record<string, string>;
      assert.equal(updated.slug, "two-sum");
      assert.equal(updated.result, "partial");
      assert.equal(updated.firstSolvedAt, created.firstSolvedAt);
      const revisitIn = Date.parse(updated.revisitAt!) - Date.now();
      assert.ok(revisitIn > 6.9 * 24 * 60 * 60 * 1000 && revisitIn <= 7 * 24 * 60 * 60 * 1000);

      assert.equal((await record("?!")).isError, true);
    });

    it("record_solved_problem accepts a not_solved result", async () => {
      const result = await record("Trapping Rain Water", { result: "not_solved", revisit: true });
      assert.equal(result.isError, undefined);
      assert.equal((result.structuredContent as { result: string }).result, "not_solved");
      await db.prisma.solvedProblem.deleteMany({ where: { slug: "trapping-rain-water" } });
    });

    it("list_solved_problems returns only the current topic's problems, newest first", async () => {
      await record("Contains Duplicate");
      await call("save_learner_preferences", { currentTopic: "Sliding Window" });
      await record("Longest Substring Without Repeating Characters");
      // A problem first filed under Arrays stays there even when recorded again in another topic.
      await record("Two Sum");

      const windowList = await call("list_solved_problems");
      const windowProblems = windowList.structuredContent as {
        topic: string; problems: { slug: string }[]; solvedInOtherTopics: { slug: string; topic: string }[];
      };
      assert.equal(windowProblems.topic, "Sliding Window");
      assert.deepEqual(windowProblems.problems.map((p) => p.slug), ["longest-substring-without-repeating-characters"]);
      // ...but it is still reported, so the tutor doesn't give it again.
      assert.deepEqual(
        windowProblems.solvedInOtherTopics.map((p) => [p.slug, p.topic]),
        [["contains-duplicate", "Arrays"], ["two-sum", "Arrays"]],
      );

      await call("save_learner_preferences", { currentTopic: "Arrays" });
      const arraysList = await call("list_solved_problems");
      const arrays = arraysList.structuredContent as { count: number; problems: { slug: string }[] };
      assert.equal(arrays.count, 2);
      assert.deepEqual(arrays.problems.map((p) => p.slug), ["two-sum", "contains-duplicate"]);
    });

    it("list_problems_to_revisit returns problems marked for revisit, most overdue first", async () => {
      const bob = await db.prisma.learner.findUniqueOrThrow({ where: { googleSub: "bob" } });
      await record("Max Subarray", { revisit: true });
      await record("Rotate Array", { revisit: true });
      await db.prisma.solvedProblem.update({
        where: { learnerId_slug: { learnerId: bob.id, slug: "rotate-array" } },
        data: { revisitAt: new Date(Date.now() - 60_000) },
      });

      const result = await call("list_problems_to_revisit");
      const list = result.structuredContent as { count: number; problems: { slug: string; due: boolean }[] };
      assert.equal(list.count, 2);
      assert.deepEqual(list.problems.map((p) => [p.slug, p.due]), [["rotate-array", true], ["max-subarray", false]]);
    });

    it("record_solved_problem validates its input", async () => {
      assert.equal((await record("x".repeat(201))).isError, true);
      assert.equal((await record("Valid Title", { language: "y".repeat(201) })).isError, true);
      assert.equal((await record("Valid Title", { documentationMd: "   " })).isError, true);
      // revisit must be passed explicitly, so a revisit isn't cleared by leaving it out.
      assert.equal((await record("Valid Title", { revisit: undefined })).isError, true);
    });

    it("record_solved_problem accepts enum values in any case", async () => {
      const result = await record("Jump Game", { difficulty: " Medium", result: "Not Solved" });
      const recorded = result.structuredContent as { difficulty: string; result: string };
      assert.equal(recorded.difficulty, "medium");
      assert.equal(recorded.result, "not_solved");
      await db.prisma.solvedProblem.deleteMany({ where: { slug: "jump-game" } });
    });

    it("save_learner_preferences reuses an existing topic's spelling", async () => {
      const saved = await call("save_learner_preferences", { currentTopic: "  ARRAYS ", dsaComfort: "Advanced" });
      const { preferences } = saved.structuredContent as { preferences: Record<string, unknown> };
      assert.equal(preferences.currentTopic, "Arrays");
      assert.equal(preferences.dsaComfort, "advanced");
      assert.equal((await call("list_solved_problems")).isError, undefined);
    });

    it("save_learner_preferences clears a preference passed as null, and the learner stays onboarded", async () => {
      const cleared = await call("save_learner_preferences", { currentTopic: null });
      const saved = cleared.structuredContent as { onboarded: boolean; preferences: Record<string, unknown> };
      assert.equal(saved.preferences.currentTopic, null);
      assert.equal(saved.onboarded, true);
    });
  });

  it("annotates the write tools accurately", async () => {
    const client = await connectClient(baseUrl, accessToken);
    const { tools } = await client.listTools();
    await client.close();
    const annotations = Object.fromEntries(tools.map((tool) => [tool.name, tool.annotations]));
    assert.equal(annotations.record_solved_problem?.idempotentHint, false);
    assert.equal(annotations.record_solved_problem?.destructiveHint, true);
    assert.equal(annotations.save_learner_preferences?.destructiveHint, false);
  });

  it("list_solved_problems finds problems whatever the topic's case", async () => {
    const { accessToken: token } = await signIn(baseUrl, googleUser("carol"));
    const carol = await db.prisma.learner.findUniqueOrThrow({ where: { googleSub: "carol" } });
    await db.prisma.learner.update({ where: { id: carol.id }, data: { currentTopic: "hashing" } });
    await db.prisma.solvedProblem.create({
      data: {
        learnerId: carol.id, slug: "two-sum", title: "Two Sum", topic: "Hashing", difficulty: "easy",
        language: "Python", result: "accepted", documentationMd: "# Two Sum",
      },
    });
    const client = await connectClient(baseUrl, token);
    const result = await client.callTool({ name: "list_solved_problems", arguments: {} });
    await client.close();
    assert.equal((result.structuredContent as { count: number }).count, 1);
  });

  it("returns 405 for GET /mcp", async () => {
    const res = await fetch(`${baseUrl}/mcp`, { headers: { Authorization: `Bearer ${accessToken}` } });
    assert.equal(res.status, 405);
    const body = (await res.json()) as { error: { data: { code: string } } };
    assert.equal(body.error.data.code, "method_not_allowed");
  });

  it("returns a 400 JSON-RPC error for a malformed body", async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: "{not json",
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { jsonrpc: string; error: { data: { code: string } } };
    assert.equal(body.jsonrpc, "2.0");
    assert.equal(body.error.data.code, "bad_request");
  });

  it("reports health when the database is reachable", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: "ok" });
  });
});
