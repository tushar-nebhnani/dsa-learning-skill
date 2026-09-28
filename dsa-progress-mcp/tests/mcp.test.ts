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
      result: "accepted" as const, documentationMd: `# ${slug}`, revisitAt,
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
        language: "Python",
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
        language: null,
        languageComfort: null,
        dsaComfort: null,
        learningMode: null,
        currentTopic: null,
      },
    });
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
