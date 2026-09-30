# DSA Tutor Skill + DSA Progress MCP

A Claude skill that coaches a learner through DSA problems stage by stage, without ever giving away the solution, plus an MCP server that remembers the learner's progress between sessions.

| Part | Path | What it is |
|---|---|---|
| **DSA Learning Skill** | [dsa-learning-skill/](dsa-learning-skill/) | `SKILL.md`: a strict tutor that takes each problem from Stage 0 (setup) to Stage 11 (documentation and PDF). |
| **DSA Progress MCP** | [dsa-progress-mcp/](dsa-progress-mcp/) | A remote MCP server (Streamable HTTP, Google sign-in) that stores the learner's preferences, solved problems and revisits in Postgres. |
| **Website** | [website/](website/) | The homepage: a Next.js site, exported as static files, with the skill download, the MCP server URL and install steps. |

Without the MCP server the skill starts from zero every conversation. With it, the tutor greets a returning learner, skips setup questions it already has answers to, never repeats a solved problem, and brings back problems marked for revisit after 7 days.

## How a session works

1. **Stage 0: Setup.** `get_learner_profile` loads the learner. New learners see an introduction and answer five questions (language, language comfort, DSA comfort, learning mode, current topic), saved with `save_learner_preferences`. If a revisit is due (`list_problems_to_revisit`), it is offered first; otherwise a new problem is picked, avoiding everything in `list_solved_problems`.
2. **Stages 1–9.** Describe the problem, build intuition with test cases, choose a technical approach, write pseudo code, dry run and debug, code it, analyse complexity, optimise, and submit.
3. **Stage 10: Feedback** from an interviewer's point of view.
4. **Stage 11: Documentation.** The write-up follows [references/documentation-example.md](dsa-learning-skill/references/documentation-example.md), is saved with `record_solved_problem`, and is turned into a revision PDF.

In `roadmap` mode, topics follow [references/roadmap.md](dsa-learning-skill/references/roadmap.md), which also sets the difficulty and moving-on rules.

## Using it

The MCP server is hosted at:

```
https://dsa-progress-mcp.onrender.com/mcp
```

You sign in with Google the first time a client connects. Your progress is tied to your Google account, not to the client, so it follows you between Claude and any other agent. While the Google app is in testing mode, only accounts added as test users can sign in; ask the maintainer to add yours.

To get the skill as a zip, run this from the repo root:

```bash
zip -r dsa-learning-skill.zip dsa-learning-skill
```

### Claude (web and desktop)

1. **Settings → Connectors → Add custom connector**, enter the URL above, and sign in with Google. Connectors added on the web also appear in the desktop app.
2. **Settings → Capabilities**: turn on **Code execution and file creation** (skills need it, and Stage 11 uses it for the PDF), then upload `dsa-learning-skill.zip` under **Skills**.
3. Start a chat, for example: "Coach me through a sliding window problem."

Custom connectors and skills depend on your Claude plan.

### Claude Code

```bash
claude mcp add --transport http -s user dsa-progress https://dsa-progress-mcp.onrender.com/mcp
git clone https://github.com/tushar-nebhnani/dsa-learning-skill.git
ln -s "$(pwd)/dsa-learning-skill/dsa-learning-skill" ~/.claude/skills/dsa-learning-skill
```

Then run `/mcp`, choose **dsa-progress → Authenticate**, and ask for a DSA problem.

### Other agents

- **MCP server:** works with any client that supports remote MCP over Streamable HTTP with OAuth and dynamic client registration, such as Cursor, VS Code (Copilot agent mode), Windsurf, Codex CLI, Gemini CLI and ChatGPT developer-mode connectors. Clients that need a pre-registered client ID are not supported.
- **Skill:** agents that read the `SKILL.md` format load the whole [dsa-learning-skill/](dsa-learning-skill/) folder from their skills directory. For any other agent, paste `SKILL.md` into its custom instructions or project rules, followed by [roadmap.md](dsa-learning-skill/references/roadmap.md) and [documentation-example.md](dsa-learning-skill/references/documentation-example.md), since the skill refers to them by path.

The skill was written and tested with Claude. On other models, check that the rules hold (see [Testing](#testing)). Without a web search tool, Stage 9 falls back to local test cases; without file creation, Stage 11 gives Markdown instead of a PDF.

## Repository layout

The two parts live in separate folders because they ship to different places: the skill is uploaded as a zip of `SKILL.md` and `references/`, while the server is deployed to a host. They are kept in one repo because they share a contract: the five tool names and their inputs and outputs. When a tool changes in [dsa-progress-mcp/src/tools/](dsa-progress-mcp/src/tools/), update the **Available Tools** section of [SKILL.md](dsa-learning-skill/SKILL.md) in the same commit.

## Running locally

For development against your own server instead of the hosted one:

1. Start the MCP server; see [dsa-progress-mcp/README.md](dsa-progress-mcp/README.md). You need a Google OAuth client with the redirect URI `http://localhost:3333/oauth/google/callback`.
2. Register it with Claude Code:

   ```bash
   claude mcp add --transport http dsa-progress http://localhost:3333/mcp
   ```

3. Install the skill. A symlink keeps edits to `SKILL.md` live:

   ```bash
   ln -s "$(pwd)/dsa-learning-skill" ~/.claude/skills/dsa-learning-skill
   ```

4. Start a new `claude` session and ask it to coach you through a DSA problem. The first tool call opens the browser to sign in with Google.

To work on the website, run `npm install` and `npm run dev` from `website/`, then open http://localhost:3000. See [website/README.md](website/README.md).

## Testing

**Server:** from `dsa-progress-mcp/`, run `npm run typecheck` and `npm test`. The tests use an in-memory Postgres, so Docker is not needed.

**Skill:** with the server running, walk through these scenarios in a fresh session:

| Scenario | What to check |
|---|---|
| New learner | Introduction is shown, the five details are asked in one message and saved, and the problem matches `currentTopic`. |
| Returning learner | Greeted by name with `totalSolved`, and the setup questions are not asked again. |
| Full problem | Stages 1–11 run in order, `record_solved_problem` saves the problem, and a PDF is produced. |
| Revisit | Set a problem's `revisit_at` in the past; the tutor offers it at the start of the next session. |
| Rules hold | "Just give me the code" or "skip to coding" is refused. |
| Triggering | A DSA practice request loads the skill; an unrelated coding question does not. |

## Deployment

The hosted server runs on **Render** (web service `dsa-progress-mcp`, Singapore region, free plan) with a **Neon** Postgres database in the same region. Render auto-deploys every push to `main`.

| Setting | Value |
|---|---|
| Build command | `cd dsa-progress-mcp && npm ci --include=dev && npm run build` |
| Start command | `cd dsa-progress-mcp && npm start` |
| Environment | `NODE_VERSION=22`, `HOST=0.0.0.0`, `TRUST_PROXY=1`, `KEEP_ALIVE=true`, `PUBLIC_URL=https://dsa-progress-mcp.onrender.com`, `DATABASE_URL` (Neon pooled connection string), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |

### Website

[website/](website/) builds to static files in `website/out/`, so any static host can serve it. On Render, create a static site with the build command `cd website && npm ci && npm run build`, the publish directory `website/out`, and `NEXT_PUBLIC_SITE_URL` set to the site's public URL. Its **Download the skill** buttons link to `releases/latest/download/dsa-learning-skill.zip`, so each GitHub release needs a `dsa-learning-skill.zip` asset built with:

```bash
zip -r -X dsa-learning-skill.zip dsa-learning-skill -x '*.DS_Store'
```

### Server

`KEEP_ALIVE` stops Render's free plan from sleeping the server after 15 idle minutes. An always-on service uses about 744 of the workspace's 750 free instance hours a month, so turn it off or move to a paid plan if other free services share the workspace.

**Schema changes:** Render does not run migrations. Apply them to Neon before pushing code that needs them, using the direct (non-pooler) connection string:

```bash
cd dsa-progress-mcp
DATABASE_URL="<neon direct url>" npx prisma migrate deploy
```

**Deploying your own copy:** create a Postgres database and apply the migrations as above, deploy `dsa-progress-mcp/` to a Node host with the settings in the table (using your own `PUBLIC_URL`), and add `$PUBLIC_URL/oauth/google/callback` as a redirect URI on your Google OAuth client.
