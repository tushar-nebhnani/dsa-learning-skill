# dsa-progress-mcp

MCP server for the DSA tutor skill. Learners sign in with Google via OAuth.

## Tools

- `get_learner_profile`: the signed-in learner's name, whether they are onboarded (any preference saved), total problems solved, problems due for a revisit (`revisit_at` has passed), and their saved preferences (language, language/DSA comfort, learning mode, current topic).

Each tool lives in its own file under `src/tools/` and is registered in `src/tools/index.ts`.

Stack: TypeScript, Express (Streamable HTTP, stateless), Zod, Prisma 7 + Postgres.

## Setup

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an OAuth client of type **Web application** with the authorized redirect URI `http://localhost:3333/oauth/google/callback` (i.e. `$PUBLIC_URL/oauth/google/callback`).
2. Configure and start:

```bash
npm install                # also runs prisma generate
cp .env.example .env       # fill in GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
npm run db:up              # Postgres 16 via docker compose
npm run db:migrate         # prisma migrate deploy
npm run dev                # http://localhost:3333/mcp
```

Register with Claude Code (no header needed; it opens the browser to sign in on first use):

```bash
claude mcp add --transport http dsa-progress http://localhost:3333/mcp
```

Use `localhost` rather than `127.0.0.1` in the URL so it matches `PUBLIC_URL`.

## Authentication

The server is its own OAuth 2.1 authorization server and uses Google only to identify the user:

1. An MCP call without a token gets `401` with a `WWW-Authenticate` header pointing at `/.well-known/oauth-protected-resource/mcp`.
2. The client reads the metadata, registers itself (`/register`, dynamic client registration) and opens `/authorize` with PKCE.
3. `/authorize` shows the login page; **Continue with Google** goes to Google, which returns to `/oauth/google/callback`.
4. The callback finds or creates the learner by Google account id (`sub`), then redirects to the client with a one-time code.
5. The client exchanges the code at `/token` for an access token (1 hour) and a rotating refresh token (30 days).
6. Every MCP request must carry a valid access token; the signed-in learner is available as `authInfo`.

The SDK's `mcpAuthRouter` serves the OAuth endpoints; `src/auth/provider.ts` stores clients, codes and tokens (only SHA-256 hashes of codes and tokens are stored). Any Google account with a verified email can sign in.

## Schema changes

Edit `prisma/schema.prisma`, then `npm run db:migrate:dev -- --name <change>` (needs the database running).

## Tests

```bash
npm test
```

Uses Node's built-in `node:test`. Tests run against an in-memory Postgres (PGlite) with the real Prisma migrations applied, so Docker is not required.
