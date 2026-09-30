'use client'

import { useCallback, useEffect, useState } from 'react'
import { TOGGLE_THEME } from '@/lib/motion'

const KEY = 'dsa-tutor-theme'

/** Light by default, dark from the system setting; a click overrides both and is remembered. */
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null)

  const read = useCallback(() => {
    const root = document.documentElement
    return root.dataset.theme ? root.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [])

  const toggle = useCallback(() => {
    const next = read() ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try { localStorage.setItem(KEY, next) } catch {}
    setDark(next === 'dark')
  }, [read])

  useEffect(() => {
    setDark(read())
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystem = () => setDark(read())
    media.addEventListener('change', onSystem)
    window.addEventListener(TOGGLE_THEME, toggle)
    return () => { media.removeEventListener('change', onSystem); window.removeEventListener(TOGGLE_THEME, toggle) }
  }, [read, toggle])

  // Both icons are rendered; CSS shows the right one from the first paint, before this component hydrates.
  return (
    <button className="btn icon" type="button" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path className="moon" d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        <g className="sun">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </g>
      </svg>
    </button>
  )
}
