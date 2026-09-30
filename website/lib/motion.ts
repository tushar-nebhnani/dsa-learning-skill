// Shared motion settings. Every animation on the page is skipped when the visitor prefers reduced motion.
export const EASE_OUT = [0.16, 1, 0.3, 1] as const

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Copies text; returns false when the browser refuses, so the caller can fall back to selecting it. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// Events that let the nav, the ⌘K menu and the theme toggle talk without shared state.
export const OPEN_PALETTE = 'dsa:open-palette'
export const TOGGLE_THEME = 'dsa:toggle-theme'
