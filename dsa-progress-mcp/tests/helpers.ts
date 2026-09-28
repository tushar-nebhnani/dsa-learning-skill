import { createHash, randomBytes } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import type { Server } from "node:http";
import { createServer } from "node:net";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { createApp } from "../src/app.js";
import type { GoogleIdentity, GoogleSignIn } from "../src/auth/google.js";
import { createPrisma, type PrismaClient } from "../src/db/db.js";

const MIGRATIONS_DIR = path.resolve(
  import.meta.dirname,
  "../prisma/migrations",
);

export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address() as { port: number };
      srv.close(() => resolve(port));
    });
  });
}

export interface TestDb {
  prisma: PrismaClient;
  reset(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Starts an in-memory Postgres (PGlite) behind a wire-protocol socket, applies the real
 * Prisma migrations, and returns a PrismaClient connected to it. No Docker needed.
 */
export async function createTestDb(): Promise<TestDb> {
  const pglite = await PGlite.create();
  for (const dir of (
    await readdir(MIGRATIONS_DIR, { withFileTypes: true })
  ).filter((d) => d.isDirectory())) {
    await pglite.exec(
      await readFile(
        path.join(MIGRATIONS_DIR, dir.name, "migration.sql"),
        "utf8",
      ),
    );
  }

  const port = await freePort();
  const socketServer = new PGLiteSocketServer({
    db: pglite,
    port,
    host: "127.0.0.1",
  });
  await socketServer.start();

  // PGlite is single-connection, so keep the pool at one.
  const prisma = createPrisma(
    `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable`,
    {
      maxConnections: 1,
    },
  );

  return {
    prisma,
    reset: async () => {
      await prisma.$executeRawUnsafe(
        "TRUNCATE solved_problems, users, oauth_clients, pending_authorizations, authorization_codes, oauth_tokens CASCADE",
      );
    },
    close: async () => {
      await prisma.$disconnect();
      await socketServer.stop();
      await pglite.close();
    },
  };
}

/**
 * Stands in for Google: the "authorization code" Google would send back is just the encoded identity,
 * and the code "invalid" fails like a rejected exchange would.
 */
export const fakeGoogle: GoogleSignIn = {
  authUrl: (state) => `https://accounts.google.test/auth?state=${encodeURIComponent(state)}`,
  identify: async (code) => {
    if (code === "invalid") throw new Error("Google rejected the code");
    return JSON.parse(Buffer.from(code, "base64url").toString("utf8")) as GoogleIdentity;
  },
};

export function googleCode(identity: GoogleIdentity): string {
  return Buffer.from(JSON.stringify(identity)).toString("base64url");
}

export function googleUser(sub: string, overrides: Partial<GoogleIdentity> = {}): GoogleIdentity {
  return { sub, email: `${sub}@example.com`, name: `User ${sub}`, picture: null, ...overrides };
}

export interface TestServer {
  server: Server;
  baseUrl: string;
  close(): Promise<void>;
}

export async function startTestServer(prisma: PrismaClient): Promise<TestServer> {
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = createApp(prisma, { publicUrl: baseUrl, google: fakeGoogle, rateLimitAuth: false }).listen(port, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  return { server, baseUrl, close: () => new Promise((resolve) => server.close(() => resolve())) };
}

export const CLIENT_REDIRECT_URI = "http://127.0.0.1:9999/callback";

export function pkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
}

export async function registerClient(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "Test Client",
      redirect_uris: [CLIENT_REDIRECT_URI],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    }),
  });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { client_id: string }).client_id;
}

/** Opens the login page the way a browser would; returns the page and the state cookie it set. */
export async function openLoginPage(baseUrl: string, clientId: string, challenge: string, clientState = "client-state") {
  const url = new URL(`${baseUrl}/authorize`);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: CLIENT_REDIRECT_URI,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: clientState,
    resource: `${baseUrl}/mcp`,
  }).toString();
  const res = await fetch(url, { redirect: "manual" });
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith("dsa_oauth_state="));
  const state = cookie ? decodeURIComponent(cookie.split(";")[0]!.split("=")[1]!) : "";
  return { res, html: await res.text(), state };
}

export async function googleCallback(baseUrl: string, params: Record<string, string>, cookieState?: string) {
  return fetch(`${baseUrl}/oauth/google/callback?${new URLSearchParams(params)}`, {
    redirect: "manual",
    headers: cookieState ? { Cookie: `dsa_oauth_state=${encodeURIComponent(cookieState)}` } : {},
  });
}

export async function tokenRequest(baseUrl: string, params: Record<string, string>) {
  return fetch(`${baseUrl}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
}

export interface SignedIn {
  clientId: string;
  accessToken: string;
  refreshToken: string;
}

/** Runs the whole OAuth flow (register, authorize, Google sign-in, token) and returns the tokens. */
export async function signIn(baseUrl: string, identity: GoogleIdentity): Promise<SignedIn> {
  const clientId = await registerClient(baseUrl);
  const { verifier, challenge } = pkcePair();
  const { state } = await openLoginPage(baseUrl, clientId, challenge);
  const callback = await googleCallback(baseUrl, { state, code: googleCode(identity) }, state);
  const code = new URL(callback.headers.get("location") ?? "").searchParams.get("code");
  if (!code) throw new Error(`no code in redirect: ${callback.status} ${callback.headers.get("location")}`);

  const res = await tokenRequest(baseUrl, {
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    code_verifier: verifier,
    redirect_uri: CLIENT_REDIRECT_URI,
    resource: `${baseUrl}/mcp`,
  });
  if (res.status !== 200) throw new Error(`token failed: ${res.status} ${await res.text()}`);
  const tokens = (await res.json()) as { access_token: string; refresh_token: string };
  return { clientId, accessToken: tokens.access_token, refreshToken: tokens.refresh_token };
}
