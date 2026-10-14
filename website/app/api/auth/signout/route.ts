import { NextResponse } from 'next/server'
import { SESSION_COOKIE, dashboardUrl } from '@/lib/session'

// A form POST, so a link on another site can't sign the visitor out.
export async function POST() {
  const res = NextResponse.redirect(dashboardUrl(), 303)
  res.cookies.delete(SESSION_COOKIE)
  return res
}
