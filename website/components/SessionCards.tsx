import { STAGES } from '@/lib/content'

// The example session, stage by stage. Taken from dsa-learning-skill/references/documentation-example.md.

function Card({ head, tag, children }: { head: string; tag: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="head"><span className="label">{head}</span><span className="label">{tag}</span></div>
      <div className="body">{children}</div>
    </div>
  )
}

function Said({ who, children }: { who: 'You' | 'Tutor'; children: React.ReactNode }) {
  return <div className={`said${who === 'Tutor' ? ' tutor' : ''}`}><span className="who">{who}</span><span>{children}</span></div>
}

const CARDS: React.ReactNode[] = [
  <Card key="00" head="get_learner_profile" tag="example values">
    <pre>{`{
  "onboarded": true,
  "totalSolved": 12,
  "revisitsDue": 2,
  "preferences": { "preferredLanguage": "Python", "learningMode": "roadmap", "currentTopic": "Sliding Window" }
}`}</pre>
    <p className="note">Returning learners skip the setup questions. A due revisit is offered first.</p>
  </Card>,

  <Card key="01" head="Tutor" tag="Medium">
    <p><b>Longest Substring Without Repeating Characters.</b> Given a string <code>s</code>, find the length of the longest substring with no repeating characters.</p>
    <table>
      <thead><tr><th>Input</th><th>Output</th></tr></thead>
      <tbody>
        <tr><td><code>&quot;abcabcbb&quot;</code></td><td>3</td></tr>
        <tr><td><code>&quot;bbbbb&quot;</code></td><td>1</td></tr>
        <tr><td><code>&quot;pwwkew&quot;</code></td><td>3</td></tr>
      </tbody>
    </table>
  </Card>,

  <Card key="02" head="Test cases, by hand" tag="Mistake recorded">
    <Said who="You">For <code>&quot;pwwkew&quot;</code> the answer is 4, <code>&quot;pwke&quot;</code>.</Said>
    <Said who="Tutor">Does <code>&quot;pwke&quot;</code> appear exactly as written inside <code>&quot;pwwkew&quot;</code>?</Said>
    <Said who="You">No. A substring has to be contiguous. So 3, <code>&quot;wke&quot;</code>.</Said>
  </Card>,

  <Card key="03" head="Your answer" tag="Checked">
    <table>
      <tbody>
        <tr><th scope="row">Data structure</th><td>Hash set of the characters in the current window. O(1) average lookup.</td></tr>
        <tr><th scope="row">Rejected</th><td>A plain list: membership is O(window size), back to O(n²).</td></tr>
      </tbody>
    </table>
  </Card>,

  <Card key="04" head="Written by you" tag="Not corrected yet">
    <div className="redact" role="img" aria-label="Your pseudo code, hidden here">
      {[62, 78, 54, 70, 40, 66].map((w, i) => <i key={i} style={{ width: `${w}%` }} />)}
    </div>
    <p className="note">Hidden on this page on purpose. The tutor doesn’t hint or correct at this stage, even if it has bugs.</p>
  </Card>,

  <Card key="05" head="Bug found by you" tag={'Test: "bbbbb"'}>
    <pre><span className="bad">best = max(best, right - left)</span>{'\n'}best = max(best, right - left + 1)</pre>
    <p className="note">Expected 1, got 0. Dry running <code>right = 0, left = 0</code> showed a one-character window counted as length 0.</p>
  </Card>,

  <Card key="06" head="Tutor" tag="Run locally">
    <p>Run these on your machine and tell me the outputs.</p>
    <table>
      <thead><tr><th>Input</th><th>Expected</th></tr></thead>
      <tbody>
        <tr><td><code>&quot;&quot;</code></td><td>0</td></tr>
        <tr><td><code>&quot;dvdf&quot;</code></td><td>3</td></tr>
        <tr><td><code>&quot;abba&quot;</code></td><td>2</td></tr>
      </tbody>
    </table>
    <p className="note">A failing case sends you back to stage 05.</p>
  </Card>,

  <Card key="07" head="Your answer" tag="Exact, not vague">
    <table>
      <tbody>
        <tr><th scope="row">Time</th><td>O(n)</td></tr>
        <tr><th scope="row">Space</th><td>O(min(n, k)), where k is the size of the character set</td></tr>
      </tbody>
    </table>
  </Card>,

  <Card key="08" head="Tutor" tag="Back to 04">
    <Said who="Tutor">Which part of the program does the most work? Can the left edge jump instead of stepping?</Said>
    <p className="note">You found a better approach, so the cycle restarts at stage 04 and runs again as Pass 2.</p>
  </Card>,

  <Card key="09" head="Platform" tag="Accepted">
    <p>The same statement and constraints were found on LeetCode (#3), so you submit there. Without a match, you get a fresh set of local tests, including the largest inputs.</p>
  </Card>,

  <Card key="10" head="From an interviewer’s view" tag="3–5 points">
    <p>Each point names the stage and the moment it came from: what to fix and why it would cost you in an interview, plus at least one strength to keep.</p>
  </Card>,

  <Card key="11" head="record_solved_problem" tag="Saved · PDF">
    <pre>{`{
  "title": "Longest Substring Without Repeating Characters",
  "difficulty": "medium",
  "language": "Python",
  "result": "accepted",
  "revisit": false
}`}</pre>
    <p className="note">The write-up records every mistake: what you said, why it was wrong, how you fixed it. It becomes your revision PDF.</p>
  </Card>,
]

export function SessionCards() {
  return STAGES.map((s, i) => (
    <article key={s.n} className="step" id={`stage-${s.n}`} aria-label={`Stage ${s.n}: ${s.heading}`}>
      <span className="label lab">{s.n} · {s.heading}</span>
      {CARDS[i]}
    </article>
  ))
}
