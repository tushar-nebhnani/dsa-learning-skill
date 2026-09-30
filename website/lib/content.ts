// Facts the page repeats from the skill. Sources:
// stages and loops → dsa-learning-skill/SKILL.md · roadmap → references/roadmap.md

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

/** Roadmap sections and their topic counts: 13 sections, 52 topics. */
export const ROADMAP: [name: string, topics: number][] = [
  ['Arrays', 8], ['Hashing', 2], ['Strings', 3], ['Binary Search', 3], ['Linked Lists', 4], ['Stacks & Queues', 4],
  ['Recursion & Backtracking', 4], ['Trees', 4], ['Heaps', 4], ['Graphs', 5], ['Greedy', 2], ['Dynamic Programming', 6],
  ['Advanced Topics', 3],
]

export const TOPIC_COUNT = ROADMAP.reduce((sum, [, n]) => sum + n, 0)
