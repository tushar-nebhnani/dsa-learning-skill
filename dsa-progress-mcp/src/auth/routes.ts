import { timingSafeEqual } from "node:crypto";
import { Router, type Request, type Response } from "express";
import type { PrismaClient } from "../db/db.js";
import { AppError, BadRequestError, handleError, UpstreamError } from "../utils/errors.js";
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
 * authorization can be used once. Throws BadRequestError when the request can't be completed.
 */
async function takePending(prisma: PrismaClient, req: Request, res: Response) {
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const cookie = readCookie(req, STATE_COOKIE) ?? "";
  res.clearCookie(STATE_COOKIE, { path: "/oauth" });
  if (!state || !sameString(state, cookie)) {
    throw new BadRequestError("This sign-in link isn't valid in this browser. Start the sign-in again from your MCP client.");
  }
  const pending = await prisma.pendingAuthorization.delete({ where: { id: state } }).catch(() => null);
  if (!pending || pending.expiresAt < new Date()) {
    throw new BadRequestError("This sign-in request has expired. Start the sign-in again from your MCP client.");
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

      const code = typeof req.query.code === "string" ? req.query.code : "";
      if (req.query.error || !code) {
        redirectToClient(res, pending.redirectUri, {
          error: "access_denied",
          error_description: "Google sign-in was cancelled",
          state: pending.clientState,
        });
        return;
      }

      const identity = await google.identify(code).catch((err: unknown) => {
        throw err instanceof AppError
          ? err
          : new UpstreamError("Signing in with Google failed. Please try again.", { cause: err });
      });
      // The Google account id is the learner's identity; profile fields are refreshed on every sign-in.
      const profile = { email: identity.email, name: identity.name, avatarUrl: identity.picture };
      const learner = await prisma.learner.upsert({
        where: { googleSub: identity.sub },
        create: { googleSub: identity.sub, ...profile },
        update: profile,
      });

      const authorizationCode = await provider.createAuthorizationCode(pending, learner.id);
      redirectToClient(res, pending.redirectUri, { code: authorizationCode, state: pending.clientState });
    } catch (err) {
      const error = handleError("oauth/google/callback", err);
      if (!res.headersSent) renderErrorPage(res, error.status, error.message);
    }
  });

  router.get("/oauth/cancel", async (req, res) => {
    try {
      const pending = await takePending(prisma, req, res);
      redirectToClient(res, pending.redirectUri, {
        error: "access_denied",
        error_description: "The user cancelled sign-in",
        state: pending.clientState,
      });
    } catch (err) {
      const error = handleError("oauth/cancel", err);
      if (!res.headersSent) renderErrorPage(res, error.status, error.message);
    }
  });

  return router;
}
