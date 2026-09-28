import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { getOAuthProtectedResourceMetadataUrl, mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Express, NextFunction, Request, Response } from "express";
import type { GoogleSignIn } from "./auth/google.js";
import { DsaOAuthProvider } from "./auth/provider.js";
import { createAuthRoutes } from "./auth/routes.js";
import type { PrismaClient } from "./db/db.js";
import { type AppError, handleError, MethodNotAllowedError, ServiceUnavailableError } from "./utils/errors.js";
import { createMcpServer } from "./server.js";

export interface AppOptions {
  host?: string;
  /** Public base URL of this server, e.g. http://localhost:3333. */
  publicUrl: string;
  google: GoogleSignIn;
  /** The SDK rate-limits the OAuth endpoints; tests turn that off. Defaults to true. */
  rateLimitAuth?: boolean;
  /** Reverse proxies in front of the server (e.g. 1 on Render), so rate limits see the client's IP. Defaults to 0. */
  trustProxy?: number;
}

/** JSON-RPC error body for /mcp; `data` carries the app error code and HTTP status. */
function sendJsonRpcError(res: Response, error: AppError) {
  res.status(error.status).json({
    jsonrpc: "2.0",
    error: { code: error.status >= 500 ? -32603 : -32000, message: error.message, data: error.toJSON() },
    id: null,
  });
}

function methodNotAllowed(_req: Request, res: Response) {
  sendJsonRpcError(res, new MethodNotAllowedError("Only POST is supported on /mcp."));
}

export function createApp(prisma: PrismaClient, options: AppOptions): Express {
  const app = createMcpExpressApp({ host: options.host ?? "127.0.0.1" });
  if (options.trustProxy) app.set("trust proxy", options.trustProxy);
  const issuerUrl = new URL(options.publicUrl);
  const mcpUrl = new URL("/mcp", issuerUrl);
  const provider = new DsaOAuthProvider({ prisma, google: options.google, mcpUrl });

  app.get("/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok" });
    } catch (err) {
      const error = handleError("health", new ServiceUnavailableError("The database is unreachable.", { cause: err }));
      res.status(error.status).json({ status: "db_unavailable", error: error.toJSON() });
    }
  });

  // OAuth metadata, dynamic client registration, /authorize, /token and /revoke.
  app.use(
    mcpAuthRouter({
      provider,
      issuerUrl,
      resourceServerUrl: mcpUrl,
      resourceName: "DSA Progress",
      ...(options.rateLimitAuth === false && {
        authorizationOptions: { rateLimit: false },
        clientRegistrationOptions: { rateLimit: false },
        tokenOptions: { rateLimit: false },
        revocationOptions: { rateLimit: false },
      }),
    }),
  );
  app.use(createAuthRoutes({ prisma, google: options.google, provider }));

  app.use(
    "/mcp",
    requireBearerAuth({
      verifier: provider,
      resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(mcpUrl),
    }),
  );

  // Stateless mode: a fresh server + transport per request, so no session state is kept between calls.
  // The signed-in user is available on req.auth, which the transport passes on as authInfo.
  app.post("/mcp", async (req, res) => {
    const server = createMcpServer(prisma);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      const error = handleError("mcp", err);
      if (!res.headersSent) sendJsonRpcError(res, error);
    }
  });
  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);

  // Last resort for anything a route didn't handle itself, e.g. a malformed JSON body.
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);
    const error = handleError(`${req.method} ${req.path}`, err);
    if (req.path.startsWith("/mcp")) sendJsonRpcError(res, error);
    else res.status(error.status).json({ error: error.toJSON() });
  });

  return app;
}
