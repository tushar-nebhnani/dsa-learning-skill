import { timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, SESSION_MAX_AGE, STATE_COOKIE, authConfigured, cookieOptions, dashboardUrl, googleIdentity, sealSession, type SignInError } from '@/lib/session'

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

// Google sends the visitor back here. The state must match the cookie, so a link opened in another browser can't finish someone else's sign-in.
export async function GET(request: NextRequest) {
  const fail = (error: SignInError) => {
    const res = NextResponse.redirect(dashboardUrl(error))
    res.cookies.delete(STATE_COOKIE)
    return res
  }
  if (!authConfigured()) return fail('config')

  const params = request.nextUrl.searchParams
  const state = params.get('state') ?? '', expected = request.cookies.get(STATE_COOKIE)?.value ?? ''
  if (!state || !same(state, expected)) return fail('state')
  const code = params.get('code')
  if (params.get('error') || !code) return fail('cancelled')

  const identity = await googleIdentity(code)
  if (typeof identity === 'string') return fail(identity)

  const res = NextResponse.redirect(dashboardUrl())
  res.cookies.delete(STATE_COOKIE)
  res.cookies.set(SESSION_COOKIE, sealSession(identity), cookieOptions(SESSION_MAX_AGE))
  return res
}
