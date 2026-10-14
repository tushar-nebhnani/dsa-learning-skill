'use client'

import { animate, stagger } from 'motion'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { TOPIC_COUNT } from '@/lib/content'
import {
  ACCEPTED_TO_MOVE_ON, DIFFICULTIES, RESULTS, RESULT_LABEL, dailyActivity, formatDate, formatDay, formatMonth, revisits, roadmapProgress, topicProgress, weeklyActivity,
  type HeatDay, type Journey, type Problem, type TopicProgress,
} from '@/lib/journey'
import { EASE_OUT, prefersReducedMotion } from '@/lib/motion'

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * The learner's whole journey on one page. Complete in the server HTML; after load the figures count up and the charts draw in once.
 * `example` labels the data as example values; `account` is the sign-in bar shown above the heading.
 */
export function Dashboard({ journey, example = false, account }: { journey: Journey; example?: boolean; account?: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  const { problems, timeZone: tz, profile: { name, preferences: prefs } } = journey

  const sections = useMemo(() => roadmapProgress(problems), [problems])
  const weeks = useMemo(() => weeklyActivity(journey), [journey])
  const queue = useMemo(() => revisits(journey), [journey])
  const heat = useMemo(() => dailyActivity(journey), [journey])

  const accepted = problems.filter(p => p.result === 'accepted').length
  const cleared = sections.flatMap(s => s.topics).filter(t => t.cleared).length
  const topics = new Set(problems.map(p => p.topic.toLowerCase())).size
  const due = queue.filter(r => r.due).length
  const first = problems.reduce<string | null>((min, p) => (min === null || p.firstSolvedAt < min ? p.firstSolvedAt : min), null)
  const current = prefs.currentTopic ? topicProgress(problems, prefs.currentTopic) : null

  useLayoutEffect(() => {
    const el = root.current
    if (!el || prefersReducedMotion()) return
    const all = (q: string) => el.querySelectorAll<HTMLElement>(q)
    const runs = [
      animate(all('[data-rise]'), { opacity: [0, 1], y: [14, 0] }, { duration: 0.5, ease: EASE_OUT, delay: stagger(0.05) }),
      animate(all('[data-grow="x"]'), { scaleX: [0, 1] }, { duration: 0.7, ease: EASE_OUT, delay: stagger(0.05, { startDelay: 0.3 }) }),
      animate(all('[data-grow="y"]'), { scaleY: [0, 1] }, { duration: 0.7, ease: EASE_OUT, delay: stagger(0.05, { startDelay: 0.3 }) }),
      animate(all('.cell'), { opacity: [0, 1] }, { duration: 0.3, ease: EASE_OUT, delay: stagger(0.012, { startDelay: 0.25 }) }),
      animate(all('.hcol'), { opacity: [0, 1] }, { duration: 0.3, ease: EASE_OUT, delay: stagger(0.012, { startDelay: 0.2 }) }),
    ]
    all('[data-count]').forEach(node => {
      runs.push(animate(0, Number(node.dataset.count), { duration: 0.9, ease: EASE_OUT, onUpdate: v => { node.textContent = String(Math.round(v)) } }))
    })
    return () => runs.forEach(r => r.stop())
  }, [])

  if (!problems.length) {
    return (
      <div className="dash shell">
        {account}
        <header className="dhead">
          <span className="label"><span className="tick" aria-hidden="true" />Your journey</span>
          <h1>Nothing recorded yet.</h1>
          <p className="lede">Finish a problem with the tutor and it will show up here, along with your topics and revisits.</p>
        </header>
      </div>
    )
  }

  return (
    <div className="dash shell" ref={root}>
      {account}
      <header className="dhead" data-rise>
        <div className="col">
          <span className="label"><span className="tick" aria-hidden="true" />Your journey{example && <> <span className="beta">Example data</span></>}</span>
          <h1>{name ? `${name.split(' ')[0]}, here’s where you are.` : 'Here’s where you are.'}</h1>
          <p className="lede">
            {plural(problems.length, 'problem')} across {plural(topics, 'topic')}{first ? ` since ${formatDate(first, tz)}` : ''}. Everything on this page comes from what the tutor saves at the end of each session.
          </p>
        </div>
        <dl className="prefs">
          <div><dt className="label">Language</dt><dd>{prefs.preferredLanguage ?? 'Not set'}{prefs.languageComfort ? <small> · {prefs.languageComfort}</small> : null}</dd></div>
          <div><dt className="label">DSA comfort</dt><dd>{prefs.dsaComfort ? cap(prefs.dsaComfort) : 'Not set'}</dd></div>
          <div><dt className="label">Mode</dt><dd>{prefs.learningMode ? cap(prefs.learningMode) : 'Not set'}</dd></div>
          <div><dt className="label">Current topic</dt><dd>{prefs.currentTopic ?? 'Not set'}</dd></div>
        </dl>
      </header>

      <section className="tiles" aria-label="Summary">
        <Tile label="Problems solved" value={problems.length} note={first ? `first on ${formatDate(first, tz)}` : ''} lead />
        <Tile label="Accepted" value={accepted} of={problems.length} note={RESULTS.slice(1).map(r => `${problems.filter(p => p.result === r).length} ${RESULT_LABEL[r].toLowerCase()}`).join(' · ')} />
        <Tile label="Topics cleared" value={cleared} of={TOPIC_COUNT} note="three accepted, one medium or hard" />
        <Tile label="Revisits due" value={due} note={`${queue.length} scheduled`} />
      </section>

      <Heatmap heat={heat} />

      <div className="dgrid wide">
        <RoadmapMap sections={sections} current={prefs.currentTopic} cleared={cleared} />
        <div className="dcol">
          {current && <CurrentTopic progress={current} roadmap={prefs.learningMode === 'roadmap'} />}
          <figure className="fig" data-rise>
            <figcaption className="label">Revisit queue</figcaption>
            {queue.length ? (
              <ul className="queue">
                {queue.map(r => (
                  <li key={r.slug}>
                    <div>
                      <b>{r.title}</b>
                      <span className="note">{r.topic} · {r.difficulty} · {RESULT_LABEL[r.result].toLowerCase()} last time</span>
                    </div>
                    {r.due
                      ? <span className="due">Due</span>
                      : <span className="when">{formatDate(r.revisitAt, tz)}<small>in {plural(r.daysLeft, 'day')}</small></span>}
                  </li>
                ))}
              </ul>
            ) : <p className="note">Nothing is marked for revisit.</p>}
            <p className="note">A problem comes back 7 days after it’s recorded. The tutor offers a due one before anything new.</p>
          </figure>
        </div>
      </div>

      <div className="dgrid">
        <Activity weeks={weeks} />
        <figure className="fig" data-rise>
          <figcaption className="label">Breakdown</figcaption>
          <Bars title="By difficulty" rows={DIFFICULTIES.map(d => [cap(d), problems.filter(p => p.difficulty === d).length])} total={problems.length} />
          <Bars title="By result" rows={RESULTS.map(r => [RESULT_LABEL[r], problems.filter(p => p.result === r).length])} total={problems.length} />
        </figure>
      </div>

      <ProblemLog problems={problems} tz={tz} />
    </div>
  )
}

function Tile({ label, value, of, note, lead }: { label: string; value: number; of?: number; note: string; lead?: boolean }) {
  return (
    <div className={`tile${lead ? ' lead' : ''}`} data-rise>
      <span className="label">{label}</span>
      <span className="num"><span data-count={value}>{value}</span>{of !== undefined && <small> / {of}</small>}</span>
      <span className="note">{note}</span>
    </div>
  )
}

const WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', '']
const heatLevel = (n: number) => Math.min(n, 3)

/** A year of days, one column per week. Hover or tap a day to list what was recorded on it. */
function Heatmap({ heat }: { heat: ReturnType<typeof dailyActivity> }) {
  const [picked, setPicked] = useState<HeatDay | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const columns = useMemo(() => Array.from({ length: heat.weeks }, (_, w) => heat.days.slice(w * 7, w * 7 + 7)), [heat])
  const inView = heat.days.reduce((sum, d) => sum + d.titles.length, 0)

  // On a narrow screen the grid scrolls sideways; start at the newest week.
  useEffect(() => { if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth }, [])

  const pick = (e: React.SyntheticEvent) => {
    const i = (e.target as HTMLElement).dataset.i
    if (i !== undefined) setPicked(heat.days[Number(i)])
  }

  return (
    <figure className="fig heat" data-rise>
      <figcaption className="label">Daily activity</figcaption>
      <div className="heatbody">
        <div className="hscroll" ref={scroller}>
          <div className="hgrid" role="img" aria-label={`${plural(heat.activeDays, 'active day')}; current streak ${plural(heat.current, 'day')}, longest ${plural(heat.longest, 'day')}`}
            onMouseOver={pick} onClick={pick} onMouseLeave={() => setPicked(null)}>
            <div className="hdays" aria-hidden="true">{WEEKDAYS.map((d, i) => <span key={i}>{d}</span>)}</div>
            {columns.map((week, w) => (
              <div className="hcol" key={week[0].day}>
                <span className="hmon">{w === 0 || formatMonth(week[0].day) !== formatMonth(columns[w - 1][0].day) ? formatMonth(week[0].day) : ''}</span>
                {week.map((d, i) => (
                  <i key={d.day} data-i={w * 7 + i} className={`hc l${heatLevel(d.titles.length)}${d.future ? ' future' : ''}${picked === d ? ' on' : ''}`} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <dl className="streaks">
          <div><dt className="label">Current streak</dt><dd><span data-count={heat.current}>{heat.current}</span><small> {heat.current === 1 ? 'day' : 'days'}</small></dd></div>
          <div><dt className="label">Longest streak</dt><dd><span data-count={heat.longest}>{heat.longest}</span><small> {heat.longest === 1 ? 'day' : 'days'}</small></dd></div>
          <div><dt className="label">Active days</dt><dd><span data-count={heat.activeDays}>{heat.activeDays}</span></dd></div>
        </dl>
      </div>
      <div className="heatfoot">
        <p className="segcap" aria-live="polite">
          {picked
            ? <><b>{formatDay(picked.day)}</b> · {picked.titles.length ? `${plural(picked.titles.length, 'problem')}: ${picked.titles.join(', ')}` : 'nothing recorded'}</>
            : <><b>{plural(inView, 'problem')}</b> recorded in the last year{heat.current > 0 && heat.solvedToday === 0 ? '. Solve one today to keep the streak going.' : '. Hover a day.'}</>}
        </p>
        <ul className="legend scale" aria-label="Problems recorded in a day">
          {['0', '1', '2', '3+'].map((n, i) => <li key={n}><i className={`hc l${i}`} />{n}</li>)}
        </ul>
      </div>
    </figure>
  )
}

const cellState = (t: TopicProgress) => (t.cleared ? 'cleared' : t.solved ? 'started' : 'todo')
const STATE_LABEL = { cleared: 'cleared', started: 'in progress', todo: 'not started' }

/** One cell per roadmap topic, grouped by section. Hover, tap or focus a cell to name it. */
function RoadmapMap({ sections, current, cleared }: { sections: ReturnType<typeof roadmapProgress>; current: string | null; cleared: number }) {
  const [picked, setPicked] = useState<TopicProgress | null>(null)
  const isCurrent = (t: TopicProgress) => current !== null && t.topic.toLowerCase() === current.toLowerCase()

  return (
    <figure className="fig" data-rise>
      <figcaption className="label">Roadmap</figcaption>
      <div className="map" onMouseLeave={() => setPicked(null)}>
        {sections.map(s => (
          <div className="maprow" key={s.name} role="group" aria-label={s.name}>
            <span className="mapname">{s.name}</span>
            <div className="cells">
              {s.topics.map(t => (
                <button
                  key={t.topic}
                  type="button"
                  className={`cell ${cellState(t)}${isCurrent(t) ? ' cur' : ''}${picked === t ? ' on' : ''}`}
                  aria-label={`${t.topic}: ${STATE_LABEL[cellState(t)]}${isCurrent(t) ? ', current topic' : ''}`}
                  onMouseEnter={() => setPicked(t)}
                  onFocus={() => setPicked(t)}
                  onBlur={() => setPicked(null)}
                  onClick={() => setPicked(t)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="segcap" aria-live="polite">
        {picked
          ? <><b>{picked.topic}</b> · {picked.solved ? `${picked.solved} solved, ${picked.accepted} accepted` : 'not started'}{isCurrent(picked) ? ' · current topic' : picked.cleared ? ' · cleared' : ''}</>
          : <><b>{cleared} of {TOPIC_COUNT} topics</b> cleared. Hover a topic.</>}
      </p>
      <ul className="legend" aria-label="Legend">
        <li><i className="cell cleared" />Cleared</li>
        <li><i className="cell started" />In progress</li>
        <li><i className="cell todo" />Not started</li>
        <li><i className="cell todo cur" />Current topic</li>
      </ul>
    </figure>
  )
}

function CurrentTopic({ progress, roadmap }: { progress: TopicProgress; roadmap: boolean }) {
  const filled = Math.min(progress.accepted, ACCEPTED_TO_MOVE_ON)
  return (
    <figure className="fig" data-rise>
      <figcaption className="label">Current topic</figcaption>
      <h2 className="topic">{progress.topic}</h2>
      {roadmap ? (
        <>
          <div className="slots" role="img" aria-label={`${filled} of ${ACCEPTED_TO_MOVE_ON} accepted problems`}>
            {Array.from({ length: ACCEPTED_TO_MOVE_ON }, (_, i) => <i key={i} className={i < filled ? 'full' : ''}>{i < filled && <b data-grow="x" />}</i>)}
          </div>
          <ul className="checks">
            <li className={filled === ACCEPTED_TO_MOVE_ON ? 'ok' : ''}><Mark ok={filled === ACCEPTED_TO_MOVE_ON} />{filled} of {ACCEPTED_TO_MOVE_ON} accepted</li>
            <li className={progress.harder ? 'ok' : ''}><Mark ok={progress.harder} />One accepted at medium or hard</li>
          </ul>
          <p className="note">{progress.cleared ? 'Both conditions are met, so the next session moves to the next topic.' : 'Meet both and the tutor moves you to the next topic.'}</p>
        </>
      ) : (
        <p className="note">{plural(progress.solved, 'problem')} solved here, {progress.accepted} accepted. In topic mode you stay until you choose another topic.</p>
      )}
    </figure>
  )
}

function Mark({ ok }: { ok: boolean }) {
  return (
    <svg className="mk" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      {ok ? <path d="m3.5 8.5 3 3 6-7" /> : <circle cx="8" cy="8" r="4.5" />}
    </svg>
  )
}

/** Problems recorded per week. Hover, tap or focus a column to list them. */
function Activity({ weeks }: { weeks: ReturnType<typeof weeklyActivity> }) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...weeks.map(w => w.problems.length))
  const picked = active === null ? null : weeks[active]
  const total = weeks.reduce((sum, w) => sum + w.problems.length, 0)

  return (
    <figure className="fig" data-rise>
      <figcaption className="label">Problems per week</figcaption>
      <div className="cols" role="group" aria-label="Problems recorded per week" onMouseLeave={() => setActive(null)}>
        {weeks.map((w, i) => (
          <button
            key={w.start}
            type="button"
            className={`colm${active === i ? ' on' : ''}`}
            aria-label={`Week of ${formatDay(w.start)}: ${plural(w.problems.length, 'problem')}`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(i)}
          >
            <span className="plot">
              <span className="val">{w.problems.length || ''}</span>
              <span className="bar" data-grow="y" style={{ height: `${(w.problems.length / max) * 100}%` }} />
            </span>
            <span className="wk">{formatDay(w.start)}</span>
          </button>
        ))}
      </div>
      <p className="segcap" aria-live="polite">
        {picked
          ? <><b>Week of {formatDay(picked.start)}</b> · {picked.problems.length ? picked.problems.map(p => p.title).join(', ') : 'nothing recorded'}</>
          : <><b>{plural(total, 'problem')}</b> in the last {weeks.length} weeks, by the date each was last recorded. Hover a week.</>}
      </p>
    </figure>
  )
}

function Bars({ title, rows, total }: { title: string; rows: [label: string, count: number][]; total: number }) {
  return (
    <div className="bars">
      <span className="bt">{title}</span>
      {rows.map(([label, count]) => (
        <div className="brow" key={label}>
          <span>{label}</span>
          <span className="track"><i data-grow="x" style={{ width: `${(count / total) * 100}%` }} /></span>
          <span className="bv">{count}</span>
        </div>
      ))}
    </div>
  )
}

/** Every recorded problem, newest first, with a topic filter. */
function ProblemLog({ problems, tz }: { problems: Problem[]; tz?: string }) {
  const [topic, setTopic] = useState<string | null>(null)
  const topics = useMemo(() => [...new Set(problems.map(p => p.topic))], [problems])
  const rows = useMemo(
    () => problems.filter(p => topic === null || p.topic === topic).sort((a, b) => b.lastSolvedAt.localeCompare(a.lastSolvedAt)),
    [problems, topic],
  )

  return (
    <section className="log" aria-labelledby="log-heading" data-rise>
      <div className="loghead">
        <h2 id="log-heading">Problem log</h2>
        <div className="filters" role="group" aria-label="Filter by topic">
          <button type="button" className="filt" aria-pressed={topic === null} onClick={() => setTopic(null)}>All <small>{problems.length}</small></button>
          {topics.map(t => (
            <button key={t} type="button" className="filt" aria-pressed={topic === t} onClick={() => setTopic(t)}>
              {t} <small>{problems.filter(p => p.topic === t).length}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="scroll">
          <table>
            <thead>
              <tr><th>Problem</th><th>Topic</th><th>Difficulty</th><th>Result</th><th>Last solved</th><th>Revisit</th></tr>
            </thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.slug}>
                  <td><b>{p.title}</b></td>
                  <td>{p.topic}</td>
                  <td>{cap(p.difficulty)}</td>
                  <td><span className={`res ${p.result}`}><i aria-hidden="true" />{RESULT_LABEL[p.result]}</span></td>
                  <td className="mono">{formatDate(p.lastSolvedAt, tz)}</td>
                  <td className="mono">{p.revisit && p.revisitAt ? formatDate(p.revisitAt, tz) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
