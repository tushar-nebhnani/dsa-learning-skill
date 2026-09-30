'use client'

import { useEffect, useState } from 'react'
import { LINKS } from '@/lib/site'
import { PaletteButton } from './CommandPalette'
import { ThemeToggle } from './ThemeToggle'

export const SECTIONS = [
  { id: 'session', label: 'Session' },
  { id: 'memory', label: 'Memory' },
  { id: 'rules', label: 'Rules' },
  { id: 'install', label: 'Install' },
] as const

/** Brand, section links that follow the scroll, the ⌘K menu, theme, GitHub and the download. Frosts once the page scrolls. */
export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    // a section is current while it crosses the band just below the nav
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) setActive(e.target.id)
        else setActive(cur => (cur === e.target.id && e.boundingClientRect.top > 0 ? null : cur))
      })
    }, { rootMargin: '-80px 0px -70% 0px' })
    SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) io.observe(el) })
    return () => { window.removeEventListener('scroll', onScroll); io.disconnect() }
  }, [])

  return (
    <header className={`nav wrap${scrolled ? ' scrolled' : ''}`}>
      <div className="shell">
        <a className="brand" href="#top" aria-label="DSA Tutor, back to top">
          <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="7" />
            <path d="M11 9c-2.5 0-3 1.2-3 3v1.5c0 1.3-.6 2-2 2.5 1.4.5 2 1.2 2 2.5V20c0 1.8.5 3 3 3M21 9c2.5 0 3 1.2 3 3v1.5c0 1.3.6 2 2 2.5-1.4.5-2 1.2-2 2.5V20c0 1.8-.5 3-3 3" />
          </svg>
          <span className="wm">dsa tutor</span>
          <span className="beta">Beta</span>
        </a>

        <nav className="navlinks" aria-label="Sections">
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} aria-current={active === s.id ? 'true' : undefined}>{s.label}</a>
          ))}
        </nav>

        <div className="navr">
          <PaletteButton />
          <ThemeToggle />
          <a className="btn icon gh" href={LINKS.repo} aria-label="GitHub repository">
            <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
          </a>
          <a className="btn primary dl" href={LINKS.download}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 4v11m0 0 4.5-4.5M12 15l-4.5-4.5M5 19h14" /></svg>
            Download
          </a>
        </div>
      </div>
    </header>
  )
}
