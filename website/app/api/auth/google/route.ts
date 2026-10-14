import { NextResponse } from 'next/server'
import { STATE_COOKIE, authConfigured, cookieOptions, dashboardUrl, googleAuthUrl, newState } from '@/lib/session'

// Starts Sign in with Google: remembers a one-time state in a cookie, then hands over to Google.
export async function GET() {
  if (!authConfigured()) return NextResponse.redirect(dashboardUrl('config'))
  const state = newState()
  const res = NextResponse.redirect(googleAuthUrl(state))
  res.cookies.set(STATE_COOKIE, state, cookieOptions(600))
  return res
}
