// The learner's journey, as the dashboard reads it, and everything the dashboard works out from it.
// Field names match the MCP tools (get_learner_profile, list_solved_problems, list_problems_to_revisit),
// so real data can replace SAMPLE_JOURNEY without changing the page.

import { ROADMAP_TOPICS } from './content'

export type Difficulty = 'easy' | 'medium' | 'hard'
export type Result = 'accepted' | 'partial' | 'not_solved'

export type Problem = {
  slug: string
  title: string
  topic: string
  difficulty: Difficulty
  language: string
  result: Result
  revisit: boolean
  /** null = no revisit scheduled. */
  revisitAt: string | null
  firstSolvedAt: string
  lastSolvedAt: string
}

export type Journey = {
  /** The moment the data was read. "Due" and the activity weeks are measured from it, so the page renders the same on the server and in the browser. */
  asOf: string
  /** The time zone days are counted in. The learner's own for live data; UTC when left out. */
  timeZone?: string
  profile: {
    name: string | null
    avatarUrl?: string | null
    preferences: {
      preferredLanguage: string | null
      languageComfort: 'beginner' | 'intermediate' | 'advanced' | null
      dsaComfort: 'beginner' | 'intermediate' | 'advanced' | null
      learningMode: 'roadmap' | 'topic' | null
      currentTopic: string | null
    }
  }
  /** One row per solved problem, across every topic. */
  problems: Problem[]
}

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
export const RESULTS: Result[] = ['accepted', 'partial', 'not_solved']
export const RESULT_LABEL: Record<Result, string> = { accepted: 'Accepted', partial: 'Partial', not_solved: 'Not solved' }

/** Accepted problems needed to move on from a roadmap topic; at least one must be medium or hard (references/roadmap.md). */
export const ACCEPTED_TO_MOVE_ON = 3

const DAY = 86_400_000
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const month = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' })
const calendars = new Map<string, Intl.DateTimeFormat>()

/** The calendar day a moment falls on in `timeZone`, as days since 1 Jan 1970. Day 0 was a Thursday. */
export function dayNumber(at: string | number, timeZone = 'UTC') {
  let calendar = calendars.get(timeZone)
  if (!calendar) calendars.set(timeZone, calendar = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }))
  const [y, m, d] = calendar.format(new Date(at)).split('-').map(Number)
  return Date.UTC(y, m - 1, d) / DAY
}

const mondayOf = (day: number) => day - ((day + 3) % 7)

/** "2 Sept" for a day number. */
export const formatDay = (day: number) => dayMonth.format(day * DAY)
export const formatMonth = (day: number) => month.format(day * DAY)
/** "2 Sept" for a moment, on the learner's calendar. */
export const formatDate = (at: string | number, timeZone?: string) => formatDay(dayNumber(at, timeZone))

export type TopicProgress = {
  topic: string
  solved: number
  accepted: number
  /** An accepted medium or hard problem. */
  harder: boolean
  /** The roadmap's moving-on rule is met. */
  cleared: boolean
}

export function topicProgress(problems: Problem[], topic: string): TopicProgress {
  const rows = problems.filter(p => same(p.topic, topic))
  const accepted = rows.filter(p => p.result === 'accepted')
  const harder = accepted.some(p => p.difficulty !== 'easy')
  return { topic, solved: rows.length, accepted: accepted.length, harder, cleared: accepted.length >= ACCEPTED_TO_MOVE_ON && harder }
}

/** Progress for every roadmap topic, by section, plus any topics the learner practised that aren't on the roadmap. */
export function roadmapProgress(problems: Problem[]) {
  const sections = ROADMAP_TOPICS.map(([name, topics]) => ({ name, topics: topics.map(t => topicProgress(problems, t)) }))
  const onRoadmap = ROADMAP_TOPICS.flatMap(([, topics]) => topics)
  const others = [...new Set(problems.map(p => p.topic))].filter(t => !onRoadmap.some(r => same(r, t)))
  if (others.length) sections.push({ name: 'Other topics', topics: others.map(t => topicProgress(problems, t)) })
  return sections
}

export type Week = { start: number; problems: Problem[] }

/** The last `count` weeks (Monday to Sunday), oldest first, with the problems last recorded in each. `start` is a day number. */
export function weeklyActivity(journey: Journey, count = 8): Week[] {
  const monday = mondayOf(dayNumber(journey.asOf, journey.timeZone))
  return Array.from({ length: count }, (_, i) => {
    const start = monday - (count - 1 - i) * 7
    return { start, problems: journey.problems.filter(p => { const d = dayNumber(p.lastSolvedAt, journey.timeZone); return d >= start && d < start + 7 }) }
  })
}

export type HeatDay = { day: number; titles: string[]; future: boolean }

/**
 * One cell per day for the last `weeks` weeks, in Monday-first columns, plus the streaks.
 * The server keeps two dates per problem, so a day is active when a problem was first solved or last recorded on it.
 */
export function dailyActivity(journey: Journey, weeks = 53) {
  const today = dayNumber(journey.asOf, journey.timeZone)
  const byDay = new Map<number, string[]>()
  for (const p of journey.problems) {
    for (const day of new Set([dayNumber(p.firstSolvedAt, journey.timeZone), dayNumber(p.lastSolvedAt, journey.timeZone)])) {
      byDay.set(day, [...(byDay.get(day) ?? []), p.title])
    }
  }

  const start = mondayOf(today) - (weeks - 1) * 7
  const days: HeatDay[] = Array.from({ length: weeks * 7 }, (_, i) => ({ day: start + i, titles: byDay.get(start + i) ?? [], future: start + i > today }))

  // A streak is still alive today if yesterday was active, so it only breaks after a full day off.
  let current = 0
  for (let day = byDay.has(today) ? today : today - 1; byDay.has(day); day--) current++
  let longest = 0, run = 0, prev = NaN
  for (const day of [...byDay.keys()].sort((a, b) => a - b)) {
    run = day === prev + 1 ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = day
  }

  return { days, weeks, current, longest, activeDays: byDay.size, solvedToday: byDay.get(today)?.length ?? 0 }
}

export type Revisit = Problem & { revisitAt: string; due: boolean; daysLeft: number }

/** Problems marked for revisit, earliest first. */
export function revisits(journey: Journey): Revisit[] {
  const now = Date.parse(journey.asOf)
  return journey.problems
    .filter((p): p is Problem & { revisitAt: string } => p.revisit && p.revisitAt !== null)
    .map(p => { const at = Date.parse(p.revisitAt); return { ...p, due: at <= now, daysLeft: Math.max(0, Math.ceil((at - now) / DAY)) } })
    .sort((a, b) => Date.parse(a.revisitAt) - Date.parse(b.revisitAt))
}

// Example values, in the shape above. A roadmap learner six weeks in.
const row = (
  title: string, topic: string, difficulty: Difficulty, result: Result, first: string, opts: { last?: string; revisitAt?: string } = {},
): Problem => ({
  slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  title, topic, difficulty, language: 'Python', result,
  revisit: Boolean(opts.revisitAt), revisitAt: opts.revisitAt ? `${opts.revisitAt}T10:00:00.000Z` : null,
  firstSolvedAt: `${first}T10:00:00.000Z`, lastSolvedAt: `${opts.last ?? first}T10:00:00.000Z`,
})

export const SAMPLE_JOURNEY: Journey = {
  asOf: '2026-10-13T12:00:00.000Z',
  profile: {
    name: null,
    preferences: { preferredLanguage: 'Python', languageComfort: 'intermediate', dsaComfort: 'beginner', learningMode: 'roadmap', currentTopic: 'Sliding Window' },
  },
  problems: [
    row('Reverse an Array In Place', 'Array Basics', 'easy', 'accepted', '2026-09-02'),
    row('Move Zeroes', 'Array Basics', 'easy', 'accepted', '2026-09-04'),
    row('Rotate Array', 'Array Basics', 'medium', 'accepted', '2026-09-07'),
    row('Range Sum Query', 'Prefix Sum', 'easy', 'accepted', '2026-09-10'),
    row('Find Pivot Index', 'Prefix Sum', 'easy', 'accepted', '2026-09-12'),
    row('Subarray Sum Equals K', 'Prefix Sum', 'medium', 'accepted', '2026-09-16', { last: '2026-09-24' }),
    row('Product of Array Except Self', 'Prefix Sum', 'medium', 'accepted', '2026-09-19'),
    row('Pair With Target Sum in Sorted Array', 'Two Pointers', 'easy', 'accepted', '2026-09-22'),
    row('Remove Duplicates from Sorted Array', 'Two Pointers', 'easy', 'accepted', '2026-09-26'),
    row('Container With Most Water', 'Two Pointers', 'medium', 'not_solved', '2026-09-29', { revisitAt: '2026-10-06' }),
    row('3Sum', 'Two Pointers', 'medium', 'accepted', '2026-10-02'),
    row('Maximum Sum Subarray of Size K', 'Sliding Window', 'easy', 'accepted', '2026-10-10'),
    row('Longest Substring Without Repeating Characters', 'Sliding Window', 'medium', 'partial', '2026-10-11', { revisitAt: '2026-10-18' }),
    row('Minimum Size Subarray Sum', 'Sliding Window', 'medium', 'accepted', '2026-10-12'),
  ],
}
