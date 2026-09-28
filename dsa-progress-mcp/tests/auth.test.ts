import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { hashToken } from "../src/auth/provider.js";
import {
  CLIENT_REDIRECT_URI,
  createTestDb,
  googleCallback,
  googleCode,
  googleUser,
  openLoginPage,
  pkcePair,
  registerClient,
  signIn,
  startTestServer,
  tokenRequest,
  type TestDb,
  type TestServer,
} from "./helpers.js";

async function mcpStatus(baseUrl: string, token: string | null): Promise<Response> {
  return fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping", params: {} }),
  });
}

describe("OAuth with Google sign-in", () => {
  let db: TestDb;
  let ts: TestServer;
  let baseUrl: string;

  before(async () => {
    db = await createTestDb();
    ts = await startTestServer(db.prisma);
    baseUrl = ts.baseUrl;
  });
  after(async () => {
    await ts.close();
    await db.close();
  });
  beforeEach(async () => {
    await db.reset();
  });

  describe("discovery", () => {
    it("answers an unauthenticated MCP call with 401 and the resource metadata URL", async () => {
      const res = await mcpStatus(baseUrl, null);
      assert.equal(res.status, 401);
      assert.match(
        res.headers.get("www-authenticate") ?? "",
        new RegExp(`resource_metadata="${baseUrl}/.well-known/oauth-protected-resource/mcp"`),
      );
    });

    it("publishes resource and authorization server metadata", async () => {
      const resource = await (await fetch(`${baseUrl}/.well-known/oauth-protected-resource/mcp`)).json();
      assert.equal(resource.resource, `${baseUrl}/mcp`);
      assert.deepEqual(resource.authorization_servers, [`${baseUrl}/`]);

      const as = await (await fetch(`${baseUrl}/.well-known/oauth-authorization-server`)).json();
      assert.equal(as.authorization_endpoint, `${baseUrl}/authorize`);
      assert.equal(as.token_endpoint, `${baseUrl}/token`);
      assert.equal(as.registration_endpoint, `${baseUrl}/register`);
      assert.deepEqual(as.code_challenge_methods_supported, ["S256"]);
    });
  });

  describe("login page", () => {
    it("shows the client name and a Continue with Google link carrying the state", async () => {
      const clientId = await registerClient(baseUrl);
      const { res, html, state } = await openLoginPage(baseUrl, clientId, pkcePair().challenge);
      assert.equal(res.status, 200);
      assert.match(res.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
      assert.match(html, /Test Client/);
      assert.match(html, /Continue with Google/);
      assert.ok(state.length > 20);
      assert.ok(html.includes(`https://accounts.google.test/auth?state=${encodeURIComponent(state)}`));
    });

    it("escapes a malicious client name", async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: "<script>alert(1)</script>",
          redirect_uris: [CLIENT_REDIRECT_URI],
          token_endpoint_auth_method: "none",
        }),
      });
      const { client_id } = (await res.json()) as { client_id: string };
      const { html } = await openLoginPage(baseUrl, client_id, pkcePair().challenge);
      assert.ok(!html.includes("<script>alert(1)</script>"));
      assert.match(html, /&#60;script&#62;/);
    });

    it("rejects an authorization request for a different resource", async () => {
      const clientId = await registerClient(baseUrl);
      const url = new URL(`${baseUrl}/authorize`);
      url.search = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: CLIENT_REDIRECT_URI,
        code_challenge: pkcePair().challenge,
        code_challenge_method: "S256",
        resource: "https://evil.example/mcp",
      }).toString();
      const res = await fetch(url, { redirect: "manual" });
      assert.equal(res.status, 302);
      assert.equal(new URL(res.headers.get("location")!).searchParams.get("error"), "invalid_target");
    });
  });

  describe("Google callback", () => {
    it("creates the learner on first sign-in and reuses them on the next", async () => {
      await signIn(baseUrl, googleUser("g-1", { name: "Old Name" }));
      await signIn(baseUrl, googleUser("g-1", { name: "New Name" }));
      const learners = await db.prisma.learner.findMany();
      assert.equal(learners.length, 1);
      assert.equal(learners[0]?.googleSub, "g-1");
      assert.equal(learners[0]?.name, "New Name");
    });

    it("redirects back with the client's state", async () => {
      const clientId = await registerClient(baseUrl);
      const { state } = await openLoginPage(baseUrl, clientId, pkcePair().challenge, "abc123");
      const res = await googleCallback(baseUrl, { state, code: googleCode(googleUser("g-1")) }, state);
      const location = new URL(res.headers.get("location")!);
      assert.equal(`${location.origin}${location.pathname}`, CLIENT_REDIRECT_URI);
      assert.equal(location.searchParams.get("state"), "abc123");
      assert.ok(location.searchParams.get("code"));
    });

    it("refuses a callback without the matching state cookie", async () => {
      const clientId = await registerClient(baseUrl);
      const { state } = await openLoginPage(baseUrl, clientId, pkcePair().challenge);
      const code = googleCode(googleUser("g-1"));
      assert.equal((await googleCallback(baseUrl, { state, code })).status, 400);
      assert.equal((await googleCallback(baseUrl, { state, code }, "other-state")).status, 400);
      assert.equal(await db.prisma.learner.count(), 0);
    });

    it("can't be replayed", async () => {
      const clientId = await registerClient(baseUrl);
      const { state } = await openLoginPage(baseUrl, clientId, pkcePair().challenge);
      const code = googleCode(googleUser("g-1"));
      assert.equal((await googleCallback(baseUrl, { state, code }, state)).status, 302);
      assert.equal((await googleCallback(baseUrl, { state, code }, state)).status, 400);
    });

    it("sends access_denied to the client when the user declines at Google", async () => {
      const clientId = await registerClient(baseUrl);
      const { state } = await openLoginPage(baseUrl, clientId, pkcePair().challenge, "s1");
      const res = await googleCallback(baseUrl, { state, error: "access_denied" }, state);
      const location = new URL(res.headers.get("location")!);
      assert.equal(location.searchParams.get("error"), "access_denied");
      assert.equal(location.searchParams.get("state"), "s1");
    });

    it("sends access_denied to the client when the user cancels on the login page", async () => {
      const clientId = await registerClient(baseUrl);
      const { state } = await openLoginPage(baseUrl, clientId, pkcePair().challenge);
      const res = await fetch(`${baseUrl}/oauth/cancel?state=${encodeURIComponent(state)}`, {
        redirect: "manual",
        headers: { Cookie: `dsa_oauth_state=${encodeURIComponent(state)}` },
      });
      assert.equal(new URL(res.headers.get("location")!).searchParams.get("error"), "access_denied");
    });

    it("shows an error page when Google rejects the code", async () => {
      const clientId = await registerClient(baseUrl);
      const { state } = await openLoginPage(baseUrl, clientId, pkcePair().challenge);
      const res = await googleCallback(baseUrl, { state, code: "invalid" }, state);
      assert.equal(res.status, 502);
      assert.match(await res.text(), /Couldn't sign you in/);
    });
  });

  describe("tokens", () => {
    async function authorizationCode(challenge: string) {
      const clientId = await registerClient(baseUrl);
      const { state } = await openLoginPage(baseUrl, clientId, challenge);
      const res = await googleCallback(baseUrl, { state, code: googleCode(googleUser("g-1")) }, state);
      return { clientId, code: new URL(res.headers.get("location")!).searchParams.get("code")! };
    }

    it("issues tokens that work on /mcp", async () => {
      const { accessToken, refreshToken } = await signIn(baseUrl, googleUser("g-1"));
      assert.equal((await mcpStatus(baseUrl, accessToken)).status, 200);
      assert.notEqual(accessToken, refreshToken);
    });

    it("stores only hashes of tokens", async () => {
      const { accessToken } = await signIn(baseUrl, googleUser("g-1"));
      assert.equal(await db.prisma.oAuthToken.count({ where: { tokenHash: accessToken } }), 0);
      assert.equal(await db.prisma.oAuthToken.count({ where: { tokenHash: hashToken(accessToken) } }), 1);
    });

    it("rejects a wrong PKCE verifier", async () => {
      const { challenge } = pkcePair();
      const { clientId, code } = await authorizationCode(challenge);
      const res = await tokenRequest(baseUrl, {
        grant_type: "authorization_code",
        client_id: clientId,
        code,
        code_verifier: pkcePair().verifier,
        redirect_uri: CLIENT_REDIRECT_URI,
      });
      assert.equal(res.status, 400);
      assert.equal(((await res.json()) as { error: string }).error, "invalid_grant");
    });

    it("accepts an authorization code only once", async () => {
      const { verifier, challenge } = pkcePair();
      const { clientId, code } = await authorizationCode(challenge);
      const params = {
        grant_type: "authorization_code",
        client_id: clientId,
        code,
        code_verifier: verifier,
        redirect_uri: CLIENT_REDIRECT_URI,
      };
      assert.equal((await tokenRequest(baseUrl, params)).status, 200);
      assert.equal((await tokenRequest(baseUrl, params)).status, 400);
    });

    it("rejects a code issued to another client", async () => {
      const { verifier, challenge } = pkcePair();
      const { code } = await authorizationCode(challenge);
      const otherClient = await registerClient(baseUrl);
      const res = await tokenRequest(baseUrl, {
        grant_type: "authorization_code",
        client_id: otherClient,
        code,
        code_verifier: verifier,
        redirect_uri: CLIENT_REDIRECT_URI,
      });
      assert.equal(res.status, 400);
    });

    it("rotates refresh tokens", async () => {
      const { clientId, refreshToken } = await signIn(baseUrl, googleUser("g-1"));
      const params = { grant_type: "refresh_token", client_id: clientId, refresh_token: refreshToken };
      const first = await tokenRequest(baseUrl, params);
      assert.equal(first.status, 200);
      const { access_token } = (await first.json()) as { access_token: string };
      assert.equal((await mcpStatus(baseUrl, access_token)).status, 200);
      assert.equal((await tokenRequest(baseUrl, params)).status, 400);
    });

    it("rejects revoked and expired access tokens", async () => {
      const revoked = await signIn(baseUrl, googleUser("g-1"));
      const revokeRes = await fetch(`${baseUrl}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: revoked.clientId, token: revoked.accessToken }),
      });
      assert.equal(revokeRes.status, 200);
      assert.equal((await mcpStatus(baseUrl, revoked.accessToken)).status, 401);

      const expired = await signIn(baseUrl, googleUser("g-2"));
      await db.prisma.oAuthToken.update({
        where: { tokenHash: hashToken(expired.accessToken) },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      assert.equal((await mcpStatus(baseUrl, expired.accessToken)).status, 401);
    });

    it("doesn't accept a refresh token as an access token", async () => {
      const { refreshToken } = await signIn(baseUrl, googleUser("g-1"));
      assert.equal((await mcpStatus(baseUrl, refreshToken)).status, 401);
    });
  });
});
