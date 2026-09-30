'use client'

import { animate } from 'motion'
import { useEffect, useRef, useState } from 'react'
import { COMMANDS } from '@/lib/site'
import { EASE_OUT, prefersReducedMotion } from '@/lib/motion'

const PROMPT = 'Coach me through a sliding window problem.'

/** The hero's Claude Code sample. Complete in the server HTML; after load it replays once: the prompt types in, then the tutor's first reply appears. */
export function HeroTerminal() {
  const [typed, setTyped] = useState(PROMPT)
  const [caret, setCaret] = useState(false)
  const reply = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    let cancelled = false
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms))
    const run = async () => {
      await wait(700)
      if (cancelled || !reply.current) return
      reply.current.style.opacity = '0'
      setTyped(''); setCaret(true)
      for (let i = 1; i <= PROMPT.length && !cancelled; i++) { setTyped(PROMPT.slice(0, i)); await wait(32) }
      await wait(350); if (cancelled) return
      setCaret(false)
      await wait(300); if (cancelled || !reply.current) return
      animate(reply.current, { opacity: [0, 1], y: [6, 0] }, { duration: 0.45, ease: EASE_OUT })
    }
    run()
    return () => { cancelled = true; if (reply.current) reply.current.style.opacity = '' }
  }, [])

  return (
    <figure className="code" aria-label="Starting a session in Claude Code">
      <div className="head"><span>claude code</span><span className="chip">EXAMPLE</span></div>
      <pre>
        <span className="c"># once: the skill, then the server</span>{'\n'}
        <span className="p">$</span> {COMMANDS.unzip}{'\n'}
        <span className="p">$</span> {COMMANDS.addServer}{'\n\n'}
        <span className="c"># then, in a session</span>{'\n'}
        <span className="p">&gt;</span> <span>{typed}</span><span className="caret" style={{ opacity: caret ? 1 : 0 }} />
        <span className="reply" ref={reply}>
          <span className="c"># stage 00 · profile loaded, problem picked</span>{'\n'}
          <span className="k">Title</span>{'       Longest Substring Without Repeating Characters\n'}
          <span className="k">Difficulty</span>{'  medium\n'}
          <span className="k">Problem</span>{'     Given a string s, find the length of the longest\n            substring that contains no repeating characters.\n'}
          <span className="k">Examples</span>{'    "abcabcbb" → 3 · "bbbbb" → 1 · "pwwkew" → 3\n\n'}
          Any questions about the problem before we start?
        </span>
      </pre>
    </figure>
  )
}
