import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { createApp } from "../src/app.js";
import { createTestDb, sampleProblem, type TestDb } from "./helpers.js";

const AUTH_TOKEN = "test-token";

function listen(server: Server): Promise<string> {
  return new Promise((resolve) => {
    server.once("listening", () => {
      const { port } = server.address() as AddressInfo;
      resolve(`http://127.0.0.1:${port}`);
    });
  });
}

async function connectClient(baseUrl: string, token: string | null = AUTH_TOKEN): Promise<Client> {
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
    requestInit: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
  await client.connect(transport);
  return client;
}

async function call(client: Client, name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  return (await client.callTool({ name, arguments: args })) as CallToolResult;
}

function text(result: CallToolResult): string {
  const first = result.content[0];
  return first?.type === "text" ? first.text : "";
}

describe("MCP over HTTP", () => {
  let db: TestDb;
  let server: Server;
  let baseUrl: string;
  let client: Client;

  before(async () => {
    db = await createTestDb();
    server = createApp(db.prisma, { authToken: AUTH_TOKEN }).listen(0, "127.0.0.1");
    baseUrl = await listen(server);
    client = await connectClient(baseUrl);
  });
  after(async () => {
    await client.close();
    await new Promise((resolve) => server.close(resolve));
    await db.close();
  });
  beforeEach(async () => {
    await db.reset();
  });

  it("exposes the three tools with input and output schemas", async () => {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), ["get_solved_problem", "list_solved_problems", "record_solved_problem"]);
    for (const tool of tools) {
      assert.equal(tool.inputSchema.type, "object");
      assert.equal(tool.outputSchema?.type, "object");
    }
    const record = tools.find((t) => t.name === "record_solved_problem");
    assert.ok(record?.inputSchema.required?.includes("title"));
  });

  it("records a problem, then lists and fetches it", async () => {
    const recorded = await call(client, "record_solved_problem", sampleProblem({ documentationMd: "# Doc" }));
    assert.equal(recorded.isError, undefined);
    assert.equal(recorded.structuredContent?.created, true);
    assert.deepEqual(JSON.parse(text(recorded)), recorded.structuredContent);

    const listed = await call(client, "list_solved_problems", {});
    const list = listed.structuredContent as { total: number; problems: { slug: string }[]; topicCounts: unknown[] };
    assert.equal(list.total, 1);
    assert.equal(list.problems[0]?.slug, "longest-substring-without-repeating-characters");
    assert.deepEqual(list.topicCounts, [{ topic: "Sliding Window", count: 1 }]);

    const fetched = await call(client, "get_solved_problem", { slug: "Longest Substring Without Repeating Characters" });
    assert.equal(fetched.structuredContent?.documentationMd, "# Doc");
  });

  it("reports created=false when recording the same problem twice", async () => {
    await call(client, "record_solved_problem", sampleProblem());
    const again = await call(client, "record_solved_problem", sampleProblem());
    assert.equal(again.structuredContent?.created, false);
  });

  it("returns a tool error for invalid input instead of saving", async () => {
    const result = await call(client, "record_solved_problem", { ...sampleProblem(), difficulty: "extreme" });
    assert.equal(result.isError, true);
    assert.match(text(result), /difficulty/);
    assert.equal(await db.prisma.solvedProblem.count(), 0);
  });

  it("returns a tool error when the problem is not found", async () => {
    const result = await call(client, "get_solved_problem", { slug: "nope" });
    assert.equal(result.isError, true);
    assert.match(text(result), /No solved problem found/);
  });

  it("rejects requests without the bearer token", async () => {
    await assert.rejects(connectClient(baseUrl, null));
    await assert.rejects(connectClient(baseUrl, "wrong-token"));
  });

  it("returns 405 for GET /mcp", async () => {
    const res = await fetch(`${baseUrl}/mcp`, { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } });
    assert.equal(res.status, 405);
  });

  it("reports health when the database is reachable", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: "ok" });
  });
});
