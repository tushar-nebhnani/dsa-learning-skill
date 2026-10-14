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

/** Roadmap sections and their topics, in order: 14 sections, 53 topics (mixed reviews not included). Topic names match `currentTopic` exactly. */
export const ROADMAP_TOPICS: [name: string, topics: string[]][] = [
  ['Arrays', ['Array Basics', 'Prefix Sum', 'Two Pointers', 'Sliding Window', "Kadane's Algorithm", 'Sorting & Intervals', 'Cyclic Sort', 'Matrix Traversal']],
  ['Hashing', ['Hash Map & Hash Set', 'Hashing with Arrays']],
  ['Strings', ['String Basics', 'String Two Pointers & Windows', 'String Matching']],
  ['Binary Search', ['Binary Search Basics', 'Binary Search on Modified Arrays', 'Binary Search on Answer']],
  ['Linked Lists', ['Linked List Basics', 'Fast & Slow Pointers', 'In-place Reversal', 'Merging Lists']],
  ['Stacks & Queues', ['Stack Basics', 'Monotonic Stack', 'Queue & Deque', 'Monotonic Deque']],
  ['Recursion & Backtracking', ['Recursion Basics', 'Subsets & Combinations', 'Permutations', 'Constraint Backtracking']],
  ['Trees', ['Tree Traversals (DFS)', 'Tree BFS', 'Tree Path Problems', 'Binary Search Trees']],
  ['Heaps', ['Heap Basics', 'Top K Elements', 'Two Heaps', 'K-way Merge']],
  ['Graphs', ['Graph Traversal (BFS & DFS)', 'Topological Sort', 'Union Find', 'Shortest Paths', 'Minimum Spanning Tree']],
  ['Greedy', ['Greedy Basics', 'Greedy with Sorting & Heaps']],
  ['Dynamic Programming', ['1D Dynamic Programming', '2D Grid Dynamic Programming', 'Knapsack', 'Subsequence Dynamic Programming', 'String Dynamic Programming', 'Interval Dynamic Programming']],
  ['Advanced Topics', ['Tries', 'Bit Manipulation', 'Segment Tree & Fenwick Tree']],
  ['Math', ['Math & Number Theory']],
]

/** Roadmap sections and their topic counts. */
export const ROADMAP: [name: string, topics: number][] = ROADMAP_TOPICS.map(([name, topics]) => [name, topics.length])

export const TOPIC_COUNT = ROADMAP.reduce((sum, [, n]) => sum + n, 0)
