// Facts the page repeats from the skill. Sources:
// stages and loops → dsa-learning-skill/SKILL.md · roadmap → references/roadmap.md · problems → references/problem-ladder.json (via lib/ladder.json)

import ladder from './ladder.json'

export type Stage = {
  n: string
  /** Short name for the pinned pane, the rail and the ⌘K menu. */
  title: string
  /** Full name shown above each card on small screens. */
  heading: string
  /** Set on stages that can send the learner back to an earlier stage. */
  loop?: string
}

export const STAGES: Stage[] = [
  { n: '00', title: 'Setup', heading: 'Setup' },
  { n: '01', title: 'The problem', heading: 'The problem' },
  { n: '02', title: 'Intuition', heading: 'Intuition' },
  { n: '03', title: 'Approach', heading: 'Technical approach' },
  { n: '04', title: 'Pseudo code', heading: 'Pseudo code' },
  { n: '05', title: 'Dry run', heading: 'Dry run & debugging' },
  { n: '06', title: 'Code', heading: 'Code', loop: 'A failing test sends you back to 05.' },
  { n: '07', title: 'Complexity', heading: 'Complexity' },
  { n: '08', title: 'Optimisation', heading: 'Optimisation', loop: 'A better idea sends you back to 04.' },
  { n: '09', title: 'Submission', heading: 'Submission', loop: 'A failing test sends you back to 05.' },
  { n: '10', title: 'Feedback', heading: 'Feedback' },
  { n: '11', title: 'Documentation', heading: 'Documentation' },
]

export type Difficulty = 'easy' | 'medium' | 'hard'
export type LadderProblem = { rung: number; title: string; difficulty: Difficulty; url: string }
export type LadderTopic = { topic: string; section: string; type: 'core' | 'mixed'; problems: LadderProblem[] }

/** lib/ladder.json, generated from references/problem-ladder.json by scripts/build-ladder.mjs: section → topic → problems, in roadmap order. */
type LadderFile = Record<string, Record<string, Omit<LadderTopic, 'topic' | 'section'>>>

/** Roadmap sections and their topics, in order, mixed reviews included. Topic names match `currentTopic` exactly. */
export const ROADMAP_SECTIONS: [name: string, topics: LadderTopic[]][] = Object.entries(ladder as LadderFile)
  .map(([section, topics]) => [section, Object.entries(topics).map(([topic, t]) => ({ topic, section, ...t }))])

/** Every roadmap topic and mixed review in order, with its problems easiest first. */
export const LADDER: LadderTopic[] = ROADMAP_SECTIONS.flatMap(([, topics]) => topics)

/** Roadmap sections and their topics, in order: 14 sections, 53 topics (mixed reviews not included). */
export const ROADMAP_TOPICS: [name: string, topics: string[]][] = ROADMAP_SECTIONS
  .map(([name, topics]) => [name, topics.filter(t => t.type === 'core').map(t => t.topic)])

/** Roadmap sections and their topic counts. */
export const ROADMAP: [name: string, topics: number][] = ROADMAP_TOPICS.map(([name, topics]) => [name, topics.length])

export const TOPIC_COUNT = ROADMAP.reduce((sum, [, n]) => sum + n, 0)

/** Everything on the roadmap, mixed reviews included. */
export const ROADMAP_ITEM_COUNT = LADDER.length
