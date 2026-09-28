import { timingSafeEqual } from "node:crypto";
import { Router, type Request, type Response } from "express";
import type { PrismaClient } from "../db/db.js";
import type { GoogleSignIn } from "./google.js";
import { renderErrorPage } from "./pages.js";
import { STATE_COOKIE, type DsaOAuthProvider } from "./provider.js";

function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

function sameString(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function redirectToClient(res: Response, redirectUri: string, params: Record<string, string | null>) {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) if (value !== null) url.searchParams.set(key, value);
  res.redirect(302, url.href);
}

/**
 * Finishes a pending authorization. The `state` must match the cookie set by the login page, so a
 * callback link opened in another browser can't complete someone else's sign-in. Each pending
 * authorization can be used once.
 */
async function takePending(prisma: PrismaClient, req: Request, res: Response) {
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const cookie = readCookie(req, STATE_COOKIE) ?? "";
  res.clearCookie(STATE_COOKIE, { path: "/oauth" });
  if (!state || !sameString(state, cookie)) {
    renderErrorPage(res, 400, "This sign-in link isn't valid in this browser. Start the sign-in again from your MCP client.");
    return null;
  }
  const pending = await prisma.pendingAuthorization.delete({ where: { id: state } }).catch(() => null);
  if (!pending || pending.expiresAt < new Date()) {
    renderErrorPage(res, 400, "This sign-in request has expired. Start the sign-in again from your MCP client.");
    return null;
  }
  return pending;
}

export function createAuthRoutes(options: {
  prisma: PrismaClient;
  google: GoogleSignIn;
  provider: DsaOAuthProvider;
}): Router {
  const { prisma, google, provider } = options;
  const router = Router();

  router.get("/oauth/google/callback", async (req, res) => {
    try {
      const pending = await takePending(prisma, req, res);
      if (!pending) return;

      const code = typeof req.query.code === "string" ? req.query.code : "";
      if (req.query.error || !code) {
        redirectToClient(res, pending.redirectUri, {
          error: "access_denied",
          error_description: "Google sign-in was cancelled",
          state: pending.clientState,
        });
        return;
      }

      const identity = await google.identify(code);
      // The Google account id is the learner's identity; profile fields are refreshed on every sign-in.
      const profile = { email: identity.email, name: identity.name, avatarUrl: identity.picture };
      const user = await prisma.user.upsert({
        where: { googleSub: identity.sub },
        create: { googleSub: identity.sub, ...profile },
        update: profile,
      });

      const authorizationCode = await provider.createAuthorizationCode(pending, user.id);
      redirectToClient(res, pending.redirectUri, { code: authorizationCode, state: pending.clientState });
    } catch (err) {
      console.error("[oauth/google/callback]", err);
      if (!res.headersSent) renderErrorPage(res, 502, "Signing in with Google failed. Please try again.");
    }
  });

  router.get("/oauth/cancel", async (req, res) => {
    try {
      const pending = await takePending(prisma, req, res);
      if (!pending) return;
      redirectToClient(res, pending.redirectUri, {
        error: "access_denied",
        error_description: "The user cancelled sign-in",
        state: pending.clientState,
      });
    } catch (err) {
      console.error("[oauth/cancel]", err);
      if (!res.headersSent) renderErrorPage(res, 500, "Something went wrong. Please try again.");
    }
  });

  return router;
}
