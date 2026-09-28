import { createHash, randomBytes } from "node:crypto";
import type { Response } from "express";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import {
  InvalidGrantError,
  InvalidScopeError,
  InvalidTargetError,
  InvalidTokenError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type { AuthorizationParams, OAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { PrismaClient } from "../db/db.js";
import type { GoogleSignIn } from "./google.js";
import { renderLoginPage } from "./pages.js";

const MINUTE_MS = 60 * 1000;
export const PENDING_AUTHORIZATION_TTL_MS = 10 * MINUTE_MS;
const AUTHORIZATION_CODE_TTL_MS = 1 * MINUTE_MS;
const ACCESS_TOKEN_TTL_MS = 60 * MINUTE_MS;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * MINUTE_MS;

/** Cookie that ties the Google callback to the browser that started the sign-in. */
export const STATE_COOKIE = "dsa_oauth_state";

export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Codes and tokens are stored only as hashes, so a database leak doesn't hand out working credentials. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sameResource(a: string, b: string): boolean {
  return a.replace(/\/+$/, "") === b.replace(/\/+$/, "");
}

class PrismaClientsStore implements OAuthRegisteredClientsStore {
  constructor(private readonly prisma: PrismaClient) {}

  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    const row = await this.prisma.oAuthClient.findUnique({ where: { clientId } });
    return (row?.info as OAuthClientInformationFull | undefined) ?? undefined;
  }

  async registerClient(client: OAuthClientInformationFull): Promise<OAuthClientInformationFull> {
    await this.prisma.oAuthClient.create({ data: { clientId: client.client_id, info: client as object } });
    return client;
  }
}

export interface ProviderOptions {
  prisma: PrismaClient;
  google: GoogleSignIn;
  /** The protected resource (the /mcp URL); tokens are only issued for it. */
  mcpUrl: URL;
}

/**
 * OAuth 2.1 authorization server for the MCP endpoint. The SDK's mcpAuthRouter handles the HTTP side
 * (metadata, registration, PKCE checks); this class stores clients, codes and tokens, and hands the
 * login step to Google via the login page.
 */
export class DsaOAuthProvider implements OAuthServerProvider {
  readonly clientsStore: OAuthRegisteredClientsStore;
  private readonly prisma: PrismaClient;
  private readonly google: GoogleSignIn;
  private readonly mcpUrl: URL;

  constructor(options: ProviderOptions) {
    this.prisma = options.prisma;
    this.google = options.google;
    this.mcpUrl = options.mcpUrl;
    this.clientsStore = new PrismaClientsStore(options.prisma);
  }

  /** Remembers the client's request, then shows the login page; the Google callback finishes it. */
  async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: Response): Promise<void> {
    if (params.resource && !sameResource(params.resource.href, this.mcpUrl.href)) {
      throw new InvalidTargetError(`Unknown resource: ${params.resource.href}`);
    }

    const now = new Date();
    await this.prisma.pendingAuthorization.deleteMany({ where: { expiresAt: { lt: now } } });
    const pending = await this.prisma.pendingAuthorization.create({
      data: {
        id: randomToken(),
        clientId: client.client_id,
        redirectUri: params.redirectUri,
        codeChallenge: params.codeChallenge,
        clientState: params.state ?? null,
        scopes: params.scopes ?? [],
        resource: params.resource?.href ?? null,
        expiresAt: new Date(now.getTime() + PENDING_AUTHORIZATION_TTL_MS),
      },
    });

    res.cookie(STATE_COOKIE, pending.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: this.mcpUrl.protocol === "https:",
      path: "/oauth",
      maxAge: PENDING_AUTHORIZATION_TTL_MS,
    });
    renderLoginPage(res, {
      clientName: client.client_name ?? "An MCP client",
      googleUrl: this.google.authUrl(pending.id),
      cancelUrl: `/oauth/cancel?state=${encodeURIComponent(pending.id)}`,
    });
  }

  async challengeForAuthorizationCode(client: OAuthClientInformationFull, authorizationCode: string): Promise<string> {
    const code = await this.prisma.authorizationCode.findUnique({ where: { codeHash: hashToken(authorizationCode) } });
    if (!code || code.clientId !== client.client_id || code.expiresAt < new Date()) {
      throw new InvalidGrantError("Invalid or expired authorization code");
    }
    return code.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    redirectUri?: string,
    resource?: URL,
  ): Promise<OAuthTokens> {
    // Deleting first makes the code single-use even under concurrent exchanges.
    const code = await this.prisma.authorizationCode
      .delete({ where: { codeHash: hashToken(authorizationCode) } })
      .catch(() => null);
    if (!code || code.clientId !== client.client_id || code.expiresAt < new Date()) {
      throw new InvalidGrantError("Invalid or expired authorization code");
    }
    if (redirectUri !== undefined && redirectUri !== code.redirectUri) {
      throw new InvalidGrantError("redirect_uri does not match the authorization request");
    }
    if (resource && code.resource && !sameResource(resource.href, code.resource)) {
      throw new InvalidTargetError("resource does not match the authorization request");
    }
    return this.issueTokens(client.client_id, code.userId, code.scopes, code.resource);
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
    resource?: URL,
  ): Promise<OAuthTokens> {
    const tokenHash = hashToken(refreshToken);
    const row = await this.prisma.oAuthToken.findUnique({ where: { tokenHash } });
    if (!row || row.kind !== "refresh" || row.clientId !== client.client_id) {
      throw new InvalidGrantError("Invalid refresh token");
    }
    if (scopes?.some((s) => !row.scopes.includes(s))) {
      throw new InvalidScopeError("Requested scopes exceed the original grant");
    }
    if (resource && row.resource && !sameResource(resource.href, row.resource)) {
      throw new InvalidTargetError("resource does not match the original grant");
    }

    // Rotate: the old refresh token stops working the moment a new pair is issued.
    const now = new Date();
    const { count } = await this.prisma.oAuthToken.updateMany({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now },
    });
    if (count === 0) throw new InvalidGrantError("Refresh token is expired or revoked");
    return this.issueTokens(client.client_id, row.userId, scopes ?? row.scopes, row.resource);
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const row = await this.prisma.oAuthToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!row || row.kind !== "access" || row.revokedAt || row.expiresAt < new Date()) {
      throw new InvalidTokenError("Invalid, expired or revoked access token");
    }
    return {
      token,
      clientId: row.clientId,
      scopes: row.scopes,
      expiresAt: Math.floor(row.expiresAt.getTime() / 1000),
      resource: row.resource ? new URL(row.resource) : undefined,
      extra: { userId: row.userId },
    };
  }

  async revokeToken(client: OAuthClientInformationFull, request: OAuthTokenRevocationRequest): Promise<void> {
    await this.prisma.oAuthToken.updateMany({
      where: { tokenHash: hashToken(request.token), clientId: client.client_id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(
    clientId: string,
    userId: string,
    scopes: string[],
    resource: string | null,
  ): Promise<OAuthTokens> {
    const now = Date.now();
    const accessToken = randomToken();
    const refreshToken = randomToken();
    const common = { clientId, userId, scopes, resource };
    await this.prisma.oAuthToken.createMany({
      data: [
        { ...common, tokenHash: hashToken(accessToken), kind: "access", expiresAt: new Date(now + ACCESS_TOKEN_TTL_MS) },
        { ...common, tokenHash: hashToken(refreshToken), kind: "refresh", expiresAt: new Date(now + REFRESH_TOKEN_TTL_MS) },
      ],
    });
    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_MS / 1000,
      refresh_token: refreshToken,
      ...(scopes.length > 0 && { scope: scopes.join(" ") }),
    };
  }

  /** Creates the one-time code the client trades for tokens once Google sign-in has succeeded. */
  async createAuthorizationCode(pending: {
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    scopes: string[];
    resource: string | null;
  }, userId: string): Promise<string> {
    const code = randomToken();
    await this.prisma.authorizationCode.create({
      data: {
        codeHash: hashToken(code),
        clientId: pending.clientId,
        userId,
        redirectUri: pending.redirectUri,
        codeChallenge: pending.codeChallenge,
        scopes: pending.scopes,
        resource: pending.resource,
        expiresAt: new Date(Date.now() + AUTHORIZATION_CODE_TTL_MS),
      },
    });
    return code;
  }
}
