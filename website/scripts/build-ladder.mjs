// Copies the problem ladder (../dsa-learning-skill/references/problem-ladder.json) into lib/ladder.json for the dashboard.
// Keeps only what the dashboard shows: `teaches`, `answer` and the topic's `cue` give the approach away, so they stay off the page.
// (They aren't secret: the skill needs them, so they ship in the skill zip and on GitHub.)
// Runs before `npm run dev` and `npm run build`. lib/ladder.json is committed, so a host that only uploads website/ still builds.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const source = join(here, '..', '..', 'dsa-learning-skill', 'references', 'problem-ladder.json')
const out = join(here, '..', 'lib', 'ladder.json')

if (!existsSync(source)) {
  console.warn(`⚠ ladder skipped: ${source} not found; keeping the committed lib/ladder.json`)
  process.exit(0)
}

// Same shape as the source, section → topic → problems, in roadmap order.
const sections = JSON.parse(readFileSync(source, 'utf8'))
const ladder = Object.fromEntries(Object.entries(sections).map(([section, topics]) => [
  section,
  Object.fromEntries(Object.entries(topics).map(([topic, t]) => [topic, {
    type: t.type,
    problems: t.problems
      .map(p => ({ rung: p.rung, title: p.title, difficulty: p.difficulty.toLowerCase(), url: p.url }))
      .sort((a, b) => a.rung - b.rung),
  }])),
]))
const topics = Object.values(ladder).flatMap(Object.values)

// one line per problem, as in the source
writeFileSync(out, JSON.stringify(ladder, null, 1).replace(/\{\n\s+("rung"[^}]*?)\n\s+\}/g, (_, body) => `{${body.replace(/\n\s+/g, ' ')}}`) + '\n')
console.log(`ladder: ${Object.keys(ladder).length} sections, ${topics.length} topics, ${topics.reduce((n, t) => n + t.problems.length, 0)} problems → lib/ladder.json`)
