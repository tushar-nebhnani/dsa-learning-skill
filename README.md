# DSA Tutor Skill + DSA Progress MCP

A Claude skill that coaches a learner through DSA problems stage by stage, without ever giving away the solution, plus an MCP server that remembers the learner's progress between sessions.

| Part | Path | What it is |
|---|---|---|
| **DSA Learning Skill** | [dsa-learning-skill/](dsa-learning-skill/) | `SKILL.md`: a strict tutor that takes each problem from Stage 0 (setup) to Stage 11 (documentation and PDF). |
| **DSA Progress MCP** | [dsa-progress-mcp/](dsa-progress-mcp/) | A remote MCP server (Streamable HTTP, Google sign-in) that stores the learner's preferences, solved problems and revisits in Postgres. |

Without the MCP server the skill starts from zero every conversation. With it, the tutor greets a returning learner, skips setup questions it already has answers to, never repeats a solved problem, and brings back problems marked for revisit after 7 days.

## How a session works

1. **Stage 0: Setup.** `get_learner_profile` loads the learner. New learners see an introduction and answer five questions (language, language comfort, DSA comfort, learning mode, current topic), saved with `save_learner_preferences`. If a revisit is due (`list_problems_to_revisit`), it is offered first; otherwise a new problem is picked, avoiding everything in `list_solved_problems`.
2. **Stages 1–9.** Describe the problem, build intuition with test cases, choose a technical approach, write pseudo code, dry run and debug, code it, analyse complexity, optimise, and submit.
3. **Stage 10: Feedback** from an interviewer's point of view.
4. **Stage 11: Documentation.** The write-up follows [references/documentation-example.md](dsa-learning-skill/references/documentation-example.md), is saved with `record_solved_problem`, and is turned into a revision PDF.

In `roadmap` mode, topics follow [references/roadmap.md](dsa-learning-skill/references/roadmap.md), which also sets the difficulty and moving-on rules.

## Repository layout

The two parts live in separate folders because they ship to different places: the skill is uploaded as a zip of `SKILL.md` and `references/`, while the server is deployed to a host. They are kept in one repo because they share a contract: the five tool names and their inputs and outputs. When a tool changes in [dsa-progress-mcp/src/tools/](dsa-progress-mcp/src/tools/), update the **Available Tools** section of [SKILL.md](dsa-learning-skill/SKILL.md) in the same commit.

## Running locally (Claude Code)

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

## Deploying to claude.ai

claude.ai cannot reach `localhost`, so the server needs a public HTTPS URL.

1. Create a hosted Postgres database and run `npm run db:migrate` against it.
2. Deploy `dsa-progress-mcp/` to a Node host (`npm run build`, then `npm start`) with `HOST=0.0.0.0`, `TRUST_PROXY=1`, `KEEP_ALIVE=true` (on a free plan), `PUBLIC_URL=https://<your-domain>` and the other variables from its README.
3. Add `https://<your-domain>/oauth/google/callback` as a redirect URI on the Google OAuth client.
4. In claude.ai, open **Settings → Connectors → Add custom connector** and enter `https://<your-domain>/mcp`.
5. Zip the skill folder and upload it under **Settings → Capabilities → Skills**:

   ```bash
   zip -r dsa-learning-skill.zip dsa-learning-skill
   ```

6. Run the scenarios from [Testing](#testing) again in claude.ai.
