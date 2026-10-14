// Reads the learner's journey straight from the progress database (the one the MCP server writes to).
// Server only, and read-only: the MCP server stays the single writer.

import { Pool } from 'pg'
import type { Journey, Problem } from './journey'
import type { Session } from './session'

// One small pool per server process; kept on globalThis so dev reloads don't open a new one each time.
const globalForPool = globalThis as { dsaPool?: Pool }
const pool = () => (globalForPool.dsaPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 3 }))

const iso = (at: Date | null) => at?.toISOString() ?? null

/** The signed-in visitor's journey. A Google account the tutor has never seen gets an empty one. */
export async function loadJourney(session: Session, timeZone: string): Promise<Journey> {
  const db = pool()
  const { rows: [learner] } = await db.query(
    `SELECT id, name, avatar_url, preferred_language, language_comfort, dsa_comfort, learning_mode, current_topic
       FROM users WHERE google_sub = $1`,
    [session.sub],
  )
  const { rows } = learner
    ? await db.query(
        `SELECT slug, title, topic, difficulty, language, result, revisit, revisit_at, first_solved_at, last_solved_at
           FROM solved_problems WHERE learner_id = $1 ORDER BY last_solved_at DESC`,
        [learner.id],
      )
    : { rows: [] }

  return {
    asOf: new Date().toISOString(),
    timeZone,
    profile: {
      name: learner?.name ?? session.name,
      avatarUrl: learner?.avatar_url ?? session.picture,
      preferences: {
        preferredLanguage: learner?.preferred_language ?? null,
        languageComfort: learner?.language_comfort ?? null,
        dsaComfort: learner?.dsa_comfort ?? null,
        learningMode: learner?.learning_mode ?? null,
        currentTopic: learner?.current_topic ?? null,
      },
    },
    problems: rows.map((row): Problem => ({
      slug: row.slug, title: row.title, topic: row.topic, difficulty: row.difficulty, language: row.language, result: row.result,
      revisit: row.revisit, revisitAt: iso(row.revisit_at), firstSolvedAt: iso(row.first_solved_at)!, lastSolvedAt: iso(row.last_solved_at)!,
    })),
  }
}
