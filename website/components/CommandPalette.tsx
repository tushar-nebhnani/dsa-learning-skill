'use client'

import { animate } from 'motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { STAGES } from '@/lib/content'
import { COMMANDS, DOWNLOAD_NAME, LINKS } from '@/lib/site'
import { EASE_OUT, OPEN_PALETTE, TOGGLE_THEME, copyText, prefersReducedMotion } from '@/lib/motion'

type Command = { label: string; kind: 'jump' | 'copy' | 'link' | 'view'; run: () => void }

const scrollTo = (id: string, block: ScrollLogicalPosition = 'center') =>
  document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block })

/** The ⌘K button in the nav. */
export function PaletteButton() {
  return (
    <button className="kpill" type="button" aria-haspopup="dialog" aria-label="Open the command menu" onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE))}>
      <svg className="kicon" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
      <span className="kdesk">Search</span>
      <span className="kmob">Menu</span>
      <kbd>⌘K</kbd>
    </button>
  )
}

/** The command menu: opens from the nav button, ⌘K or Ctrl+K; type to filter, arrows to move, Enter to run, Esc to close. */
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [sel, setSel] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)

  const commands = useMemo<Command[]>(() => [
    ...STAGES.map(s => ({ label: `Go to stage ${s.n} · ${s.title}`, kind: 'jump' as const, run: () => scrollTo(`stage-${s.n}`) })),
    { label: 'Go to memory', kind: 'jump', run: () => scrollTo('memory', 'start') },
    { label: 'Go to rules', kind: 'jump', run: () => scrollTo('rules', 'start') },
    { label: 'Go to install', kind: 'jump', run: () => scrollTo('install', 'start') },
    { label: 'Download the skill (.zip)', kind: 'link', run: () => { const a = document.createElement('a'); a.href = LINKS.download; a.download = DOWNLOAD_NAME; a.click() } },
    { label: 'Copy: add the MCP server', kind: 'copy', run: () => { void copyText(COMMANDS.addServer) } },
    { label: 'Copy: install the downloaded skill', kind: 'copy', run: () => { void copyText(COMMANDS.unzip) } },
    { label: 'Copy: clone the skill', kind: 'copy', run: () => { void copyText(COMMANDS.clone) } },
    { label: 'Copy: server URL', kind: 'copy', run: () => { void copyText(LINKS.mcp) } },
    { label: 'Toggle dark mode', kind: 'view', run: () => window.dispatchEvent(new Event(TOGGLE_THEME)) },
    { label: 'Open the repo on GitHub', kind: 'link', run: () => { window.location.href = LINKS.repo } },
  ], [])

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    return commands.filter(c => c.label.toLowerCase().includes(q))
  }, [commands, query])

  const show = useCallback(() => {
    lastFocus.current = document.activeElement as HTMLElement | null
    setQuery(''); setSel(0); setOpen(true)
  }, [])
  const close = useCallback(() => { setOpen(false); lastFocus.current?.focus() }, [])
  const run = (i: number) => { const c = items[i]; if (!c) return; close(); c.run() }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open ? close() : show() }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener(OPEN_PALETTE, show)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener(OPEN_PALETTE, show) }
  }, [open, show, close])

  useEffect(() => {
    if (!open) return
    input.current?.focus()
    if (panel.current && !prefersReducedMotion()) animate(panel.current, { opacity: [0, 1], y: [-8, 0], scale: [0.98, 1] }, { duration: 0.22, ease: EASE_OUT })
  }, [open])

  const onKeyDown = (e: React.KeyboardEvent) => {
    const n = Math.max(items.length, 1)
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => (s + 1) % n) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => (s - 1 + n) % n) }
    else if (e.key === 'Enter') { e.preventDefault(); run(sel) }
    else if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (e.key === 'Tab') e.preventDefault()
  }

  return (
    <div className="palette" hidden={!open} onClick={e => { if (e.target === e.currentTarget) close() }}>
      <div className="pal" ref={panel} role="dialog" aria-modal="true" aria-label="Command menu">
        <input
          ref={input}
          type="text"
          placeholder="type a command"
          autoComplete="off"
          aria-controls="palette-list"
          aria-activedescendant={items.length ? `cmd-${sel}` : undefined}
          value={query}
          onChange={e => { setQuery(e.target.value); setSel(0) }}
          onKeyDown={onKeyDown}
        />
        <ul id="palette-list" role="listbox" aria-label="Commands">
          {items.length ? items.map((c, i) => (
            <li key={c.label} id={`cmd-${i}`} role="option" aria-selected={i === sel} onMouseMove={() => i !== sel && setSel(i)} onClick={() => run(i)}>
              <span>{c.label}</span><span className="k">{c.kind}</span>
            </li>
          )) : <li className="empty" role="option" aria-selected={false} aria-disabled="true">No matching command.</li>}
        </ul>
      </div>
    </div>
  )
}
