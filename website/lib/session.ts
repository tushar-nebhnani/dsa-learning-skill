// The dashboard's own sign-in: Google identifies the visitor, and a signed cookie remembers them.
// Server only. It shares nothing with the MCP server's OAuth except the Google account id.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { BASE_PATH, SITE_URL } from './site'

export const SESSION_COOKIE = 'dsa_session'
export const STATE_COOKIE = 'dsa_signin_state'
/** Set by the dashboard in the browser, so the server counts days on the learner's calendar. */
export const TZ_COOKIE = 'dsa_tz'
const SESSION_DAYS = 30

export type Session = { sub: string; name: string | null; picture: string | null; exp: number }

/** Signed out, the dashboard explains why with one of these. */
export const SIGN_IN_ERRORS = {
  config: 'Sign-in isn’t set up on this site yet.',
  cancelled: 'Google sign-in was cancelled.',
  state: 'This sign-in didn’t start in this browser. Try again.',
  google: 'Signing in with Google failed. Try again.',
  unverified: 'That Google account’s email isn’t verified.',
} as const
export type SignInError = keyof typeof SIGN_IN_ERRORS

const env = () => {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret, SESSION_SECRET: secret } = process.env
  return clientId && clientSecret && secret && secret.length >= 32 ? { clientId, clientSecret, secret } : null
}

export const authConfigured = () => env() !== null
export const dashboardUrl = (error?: SignInError) => `${SITE_URL}${BASE_PATH}/dashboard${error ? `?error=${error}` : ''}`
const callbackUrl = () => `${SITE_URL}${BASE_PATH}/api/auth/google/callback`

/** Cookie settings shared by the session and the sign-in state. */
export const cookieOptions = (maxAge: number) => ({
  httpOnly: true, sameSite: 'lax' as const, secure: SITE_URL.startsWith('https:'), path: '/', maxAge,
})
export const SESSION_MAX_AGE = SESSION_DAYS * 86_400

const sign = (body: string, secret: string) => createHmac('sha256', secret).update(body).digest('base64url')

export function sealSession(identity: Omit<Session, 'exp'>): string {
  const body = Buffer.from(JSON.stringify({ ...identity, exp: Date.now() + SESSION_MAX_AGE * 1000 })).toString('base64url')
  return `${body}.${sign(body, env()!.secret)}`
}

/** The session in a cookie value, or null when it is missing, forged or expired. */
export function openSession(value: string | undefined): Session | null {
  const config = env()
  const [body, mac] = value?.split('.') ?? []
  if (!config || !body || !mac) return null
  const expected = Buffer.from(sign(body, config.secret)), given = Buffer.from(mac)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const session = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Session
    return typeof session.sub === 'string' && session.exp > Date.now() ? session : null
  } catch {
    return null
  }
}

export const newState = () => randomBytes(24).toString('base64url')

export function googleAuthUrl(state: string): string {
  const query = new URLSearchParams({
    client_id: env()!.clientId, redirect_uri: callbackUrl(), response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${query}`
}

/**
 * Trades Google's code for the visitor's identity. The ID token comes straight from Google over TLS
 * in reply to our own request, so its payload is read without checking the signature again.
 */
export async function googleIdentity(code: string): Promise<Omit<Session, 'exp'> | SignInError> {
  const { clientId, clientSecret } = env()!
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: callbackUrl(), grant_type: 'authorization_code' }),
  }).catch(() => null)
  if (!res?.ok) return 'google'
  const { id_token: idToken } = await res.json() as { id_token?: string }
  const payload = idToken?.split('.')[1]
  if (!payload) return 'google'
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
    sub?: string; aud?: string; email_verified?: boolean; name?: string; picture?: string
  }
  if (!claims.sub || claims.aud !== clientId) return 'google'
  if (!claims.email_verified) return 'unverified'
  return { sub: claims.sub, name: claims.name ?? null, picture: claims.picture ?? null }
}
