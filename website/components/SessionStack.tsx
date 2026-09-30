'use client'

import { animate } from 'motion'
import { useEffect, useRef, useState } from 'react'
import type { Stage } from '@/lib/content'
import { EASE_OUT, prefersReducedMotion } from '@/lib/motion'

/**
 * The feature stack: a pinned pane on the left that follows whichever stage card is in the reading zone,
 * plus a slim stage bar on small screens, where the pinned pane is hidden. The cards themselves are server-rendered children.
 */
export function SessionStack({ stages, children }: { stages: Stage[]; children: React.ReactNode }) {
  const [cur, setCur] = useState(0)
  const [barVisible, setBarVisible] = useState(false)
  const prev = useRef(0)
  const steps = useRef<HTMLDivElement>(null)
  const num = useRef<HTMLSpanElement>(null)
  const title = useRef<HTMLSpanElement>(null)
  const loop = useRef<HTMLParagraphElement>(null)

  // which card is in the reading zone
  useEffect(() => {
    const cards = [...(steps.current?.querySelectorAll<HTMLElement>('.step') ?? [])]
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setCur(cards.indexOf(e.target as HTMLElement)) })
    }, { rootMargin: '-45% 0px -50% 0px' })
    cards.forEach(c => io.observe(c))
    const bar = new IntersectionObserver(([e]) => setBarVisible(e.isIntersecting), { rootMargin: '-80px 0px -40% 0px' })
    if (steps.current) bar.observe(steps.current)
    return () => { io.disconnect(); bar.disconnect() }
  }, [])

  // mark cards, and animate the pinned pane when the stage changes
  useEffect(() => {
    steps.current?.querySelectorAll<HTMLElement>('.step').forEach((c, i) => {
      c.classList.toggle('on', i === cur)
      c.classList.toggle('done', i < cur)
    })
    const down = cur >= prev.current
    const first = prev.current === cur
    prev.current = cur
    if (first || prefersReducedMotion()) return
    if (num.current) animate(num.current, { y: [down ? '60%' : '-60%', '0%'], opacity: [0, 1] }, { duration: 0.35, ease: EASE_OUT })
    if (title.current) animate(title.current, { opacity: [0.3, 1] }, { duration: 0.3 })
    if (loop.current && stages[cur].loop) animate(loop.current, { opacity: [0, 1], y: [6, 0] }, { duration: 0.3, ease: EASE_OUT })
  }, [cur, stages])

  const jump = (i: number) =>
    document.getElementById(`stage-${stages[i].n}`)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' })

  const stage = stages[cur]
  return (
    <>
      <div className={`mbar${barVisible ? ' show' : ''}`} aria-hidden="true" style={{ ['--p' as string]: (cur + 1) / stages.length }}>
        <b>{stage.n}</b><span>{stage.title}</span><i />
      </div>
      <div className="shell">
        <div className="pin">
          <span className="label">One problem, start to finish</span>
          <h2 id="session-heading">A session, stage by stage.</h2>
          <p>Taken from the example write-up in the repo: Longest Substring Without Repeating Characters, in Python.</p>
          <div className="cur" aria-live="polite">
            <span className="nwrap"><span className="n" ref={num}>{stage.n}</span></span>
            <span className="t" ref={title}>{stage.title}</span>
          </div>
          <p className="loop" ref={loop} hidden={!stage.loop}><b>↺</b><span>{stage.loop}</span></p>
          <div className="rail" role="group" aria-label="Jump to a stage">
            {stages.map((s, i) => (
              <button key={s.n} type="button" className={i <= cur ? 'on' : undefined} aria-label={`Stage ${s.n}: ${s.title}`} aria-current={i === cur ? 'step' : undefined} onClick={() => jump(i)} />
            ))}
          </div>
          <p className="note">Press <kbd>⌘K</kbd> to jump to any stage.</p>
        </div>
        <div className="steps" ref={steps}>{children}</div>
      </div>
    </>
  )
}
