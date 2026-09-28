# dsa-progress-mcp

MCP server for the [DSA tutor skill](../dsa-learning-skill/SKILL.md). It remembers each learner's preferences, solved problems and revisits. Learners sign in with Google via OAuth.

Stack: TypeScript, Express (Streamable HTTP, stateless), Zod, Prisma 7 + Postgres.

## Tools

The learner is always taken from the access token, never from tool input.

| Tool | Input | What it does |
|---|---|---|
| `get_learner_profile` | none | Returns the learner's `name`, `onboarded`, `totalSolved`, `revisitsDue` (revisit date has arrived) and `preferences` (`preferredLanguage`, `languageComfort`, `dsaComfort`, `learningMode`, `currentTopic`; unsaved ones are `null`). |
| `save_learner_preferences` | any of the five preferences | Updates only the fields passed (at least one; `null` clears a field). The learner becomes `onboarded` once all five are saved, and stays onboarded. A `currentTopic` that matches an existing topic apart from case reuses that topic's spelling. |
| `list_solved_problems` | none | Problems solved in the `currentTopic`, newest first, plus `solvedInOtherTopics`. Fails if no `currentTopic` is saved. |
| `record_solved_problem` | `title`, `difficulty`, `language`, `result` (`accepted` / `partial` / `not_solved`), `documentationMd`, `revisit` | Saves a finished problem under the `currentTopic`. Records are matched on a slug of the title, so recording the same title again updates it (its topic and first-solved date are kept). `revisit: true` schedules a revisit 7 days later; `false` clears it. |
| `list_problems_to_revisit` | none | Every problem marked for revisit, across all topics, earliest first, each with `due: true` once its revisit date has arrived. |

Each tool lives in its own file under `src/tools/`, is registered in `src/tools/index.ts`, and takes its schemas from `src/tools/schema.ts`. Every tool returns its result both as JSON text and as `structuredContent`.

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

For production, `npm run build` then `npm start`.

Register with Claude Code (no header needed; it opens the browser to sign in on first use):

```bash
claude mcp add --transport http dsa-progress http://localhost:3333/mcp
```

Use `localhost` rather than `127.0.0.1` in the URL so it matches `PUBLIC_URL`.

### Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | yes | | Postgres connection string |
| `HOST` | no | `127.0.0.1` | Interface to bind to |
| `PORT` | no | `3333` | Port to listen on |
| `PUBLIC_URL` | no | `http://localhost:$PORT` | OAuth issuer and base of `/mcp` and the Google redirect URI |
| `GOOGLE_CLIENT_ID` | yes | | Google OAuth client |
| `GOOGLE_CLIENT_SECRET` | yes | | Its secret |

`GET /health` checks the database connection.

## Authentication

The server is its own OAuth 2.1 authorization server and uses Google only to identify the user:

1. An MCP call without a token gets `401` with a `WWW-Authenticate` header pointing at `/.well-known/oauth-protected-resource/mcp`.
2. The client reads the metadata, registers itself (`/register`, dynamic client registration) and opens `/authorize` with PKCE.
3. `/authorize` shows the login page; **Continue with Google** goes to Google, which returns to `/oauth/google/callback`.
4. The callback finds or creates the learner by Google account id (`sub`), then redirects to the client with a one-time code.
5. The client exchanges the code at `/token` for an access token (1 hour) and a rotating refresh token (30 days).
6. Every MCP request must carry a valid access token; the signed-in learner is available as `authInfo`.

The SDK's `mcpAuthRouter` serves the OAuth endpoints; `src/auth/provider.ts` stores clients, codes and tokens (only SHA-256 hashes of codes and tokens are stored). Any Google account with a verified email can sign in.

## Errors

Tool handlers are wrapped in `withToolErrors` (`src/utils/tool-error.ts`), which turns the `AppError` hierarchy in `src/utils/errors.ts` into MCP tool errors with a readable message, for example "Pass at least one preference to save."

## Schema changes

Edit `prisma/schema.prisma`, then `npm run db:migrate:dev -- --name <change>` (needs the database running).

## Tests

```bash
npm test
npm run typecheck
```

Uses Node's built-in `node:test`. Tests run against an in-memory Postgres (PGlite) with the real Prisma migrations applied, so Docker is not required.
