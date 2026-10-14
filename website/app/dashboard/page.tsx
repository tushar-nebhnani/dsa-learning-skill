import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { CommandPalette } from '@/components/CommandPalette'
import { JourneyDashboard } from '@/components/JourneyDashboard'
import { Nav } from '@/components/Nav'
import { loadJourney } from '@/lib/db'
import type { Journey } from '@/lib/journey'
import { SESSION_COOKIE, SIGN_IN_ERRORS, TZ_COOKIE, openSession } from '@/lib/session'
import { LINKS } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your DSA Tutor journey on one page: solved problems, daily streak, roadmap progress and the revisit queue.',
  alternates: { canonical: '/dashboard' },
  // Private to the signed-in learner, so there is nothing here to index.
  robots: { index: false, follow: true },
}

/** The time zone the browser reported, if it is one this server knows; UTC otherwise. */
function timeZoneFrom(value: string | undefined) {
  try {
    return value ? new Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions().timeZone : 'UTC'
  } catch {
    return 'UTC'
  }
}

// Rendered per request: a signed-in learner's journey is read from the database before the page is sent.
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [jar, { error: code }] = await Promise.all([cookies(), searchParams])
  const session = openSession(jar.get(SESSION_COOKIE)?.value)

  let journey: Journey | null = null
  let error: string | null = code && code in SIGN_IN_ERRORS ? SIGN_IN_ERRORS[code as keyof typeof SIGN_IN_ERRORS] : null
  if (session) {
    try {
      journey = await loadJourney(session, timeZoneFrom(jar.get(TZ_COOKIE)?.value))
    } catch (err) {
      console.error('dashboard: loading the journey failed', err)
      error = 'You’re signed in, but your progress couldn’t be loaded. Try again in a minute.'
    }
  }

  return (
    <>
      <a className="skip" href="#top">Skip to content</a>

      <Nav page="dashboard" />

      <CommandPalette />

      <main id="top" className="wrap">
        <JourneyDashboard journey={journey} error={error} />
      </main>

      <footer className="foot wrap">
        <div className="shell">
          <p>
            <b>dsa tutor</b> · dashboard: sign in with Google, then your progress is read from the progress database · the sign-in is a cookie on this site, separate from your MCP client’s · source: <a className="tlink" href={LINKS.repo}>github.com/tushar-nebhnani/dsa-learning-skill</a>
          </p>
        </div>
      </footer>
    </>
  )
}
