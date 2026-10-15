'use client'

import { animate } from 'motion'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { SAMPLE_JOURNEY, type Journey } from '@/lib/journey'
import { EASE_OUT, prefersReducedMotion } from '@/lib/motion'
import { BASE_PATH } from '@/lib/site'
import { Dashboard } from './Dashboard'

/**
 * The dashboard with its account bar. `journey` is the signed-in learner's, read from the database on the server.
 * Without one, a sign-in dialog covers the page and can't be dismissed; the example journey stays visible behind it.
 */
export function JourneyDashboard({ journey, error }: { journey: Journey | null; error: string | null }) {
  const router = useRouter()
  const panel = useRef<HTMLDivElement>(null)
  const go = useRef<HTMLAnchorElement>(null)

  // The server counts days on the learner's calendar; tell it which one, and redraw if it had to guess.
  // Only when the cookie changes, so a zone the server can't use falls back to UTC once instead of reloading forever.
  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const value = encodeURIComponent(timeZone)
    if (document.cookie.match(/(?:^|;\s*)dsa_tz=([^;]*)/)?.[1] === value) return
    document.cookie = `dsa_tz=${value}; path=/; max-age=31536000; samesite=lax`
    if (journey && journey.timeZone !== timeZone) router.refresh()
  }, [journey, router])

  useEffect(() => {
    if (journey) return
    go.current?.focus()
    if (panel.current && !prefersReducedMotion()) animate(panel.current, { opacity: [0, 1], y: [-8, 0], scale: [0.98, 1] }, { duration: 0.22, ease: EASE_OUT })
    // Keeps the keyboard on the dialog's one button, unless the command menu (opened over it) already handled the Tab.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Tab' && !e.defaultPrevented) { e.preventDefault(); go.current?.focus() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [journey])

  const account = journey && (
    <div className="acct" data-rise>
      <p>
        {journey.profile.avatarUrl && <img src={journey.profile.avatarUrl} alt="" width={28} height={28} referrerPolicy="no-referrer" />}
        <span>Signed in{journey.profile.name ? <> as <b>{journey.profile.name}</b></> : null}. This is the progress your tutor has recorded.</span>
      </p>
      <form className="row" method="post" action={`${BASE_PATH}/api/auth/signout`}>
        <button className="btn" type="button" onClick={() => router.refresh()}>Refresh</button>
        <button className="btn" type="submit">Sign out</button>
      </form>
    </div>
  )

  // The key remounts the dashboard when the data changes, so its entrance plays again after a refresh.
  return (
    <>
      <Dashboard key={journey?.asOf ?? 'example'} journey={journey ?? SAMPLE_JOURNEY} example={!journey} account={account} />
      {!journey && (
        <div className="palette">
          <div className="pal ask" ref={panel} role="dialog" aria-modal="true" aria-labelledby="ask-heading">
            <span className="label"><span className="tick" aria-hidden="true" />Dashboard</span>
            <h2 id="ask-heading">Sign in to see your journey.</h2>
            <p>Use the Google account your tutor is connected to. Your solved problems, streak, roadmap and revisits load from there.</p>
            {error && <p className="err" role="alert">{error}</p>}
            <div className="row">
              {/* A plain link: sign-in is a full-page trip to Google and back. */}
              <a ref={go} className="btn primary google" href={`${BASE_PATH}/api/auth/google`}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                </svg>
                Sign in with Google
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
