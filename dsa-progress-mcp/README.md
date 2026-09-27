# dsa-progress-mcp

MCP server that stores the DSA problems a learner has solved, so the DSA tutor skill can avoid repeats and see topic coverage.

Stack: TypeScript, Express (Streamable HTTP, stateless), Zod, Prisma 7 + Postgres.

## Tools

| Tool | Purpose |
|---|---|
| `record_solved_problem` | Save a finished problem. Re-recording the same title updates it (`created: false`). |
| `list_solved_problems` | Solved problems newest first, filterable by topic/language/difficulty, plus `topicCounts` across all topics. |
| `get_solved_problem` | Full record for one problem by slug or title, including the Stage 10 documentation. |

## Setup

```bash
npm install                # also runs prisma generate
cp .env.example .env
npm run db:up              # Postgres 16 via docker compose
npm run db:migrate         # prisma migrate deploy
npm run dev                # http://127.0.0.1:3333/mcp
```

Register with Claude Code:

```bash
claude mcp add --transport http dsa-progress http://127.0.0.1:3333/mcp
# with MCP_AUTH_TOKEN set:
claude mcp add --transport http dsa-progress http://127.0.0.1:3333/mcp --header "Authorization: Bearer <token>"
```

## Schema changes

Edit `prisma/schema.prisma`, then `npm run db:migrate:dev -- --name <change>` (needs the database running).

## Tests

```bash
npm test
```

Uses Node's built-in `node:test`. Tests run against an in-memory Postgres (PGlite) with the real Prisma migrations applied, so Docker is not required.
