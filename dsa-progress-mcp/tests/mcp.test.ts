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

  it("returns 405 for GET /mcp", async () => {
    const res = await fetch(`${baseUrl}/mcp`, { headers: { Authorization: `Bearer ${accessToken}` } });
    assert.equal(res.status, 405);
  });

  it("reports health when the database is reachable", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: "ok" });
  });
});
