import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { getOAuthProtectedResourceMetadataUrl, mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Express, Request, Response } from "express";
import type { GoogleSignIn } from "./auth/google.js";
import { DsaOAuthProvider } from "./auth/provider.js";
import { createAuthRoutes } from "./auth/routes.js";
import type { PrismaClient } from "./db/db.js";
import { createMcpServer } from "./server.js";

export interface AppOptions {
  host?: string;
  /** Public base URL of this server, e.g. http://localhost:3333. */
  publicUrl: string;
  google: GoogleSignIn;
  /** The SDK rate-limits the OAuth endpoints; tests turn that off. Defaults to true. */
  rateLimitAuth?: boolean;
}

function methodNotAllowed(_req: Request, res: Response) {
  res
    .status(405)
    .json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    });
}

export function createApp(prisma: PrismaClient, options: AppOptions): Express {
  const app = createMcpExpressApp({ host: options.host ?? "127.0.0.1" });
  const issuerUrl = new URL(options.publicUrl);
  const mcpUrl = new URL("/mcp", issuerUrl);
  const provider = new DsaOAuthProvider({ prisma, google: options.google, mcpUrl });

  app.get("/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "db_unavailable" });
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
      console.error("[mcp]", err);
      if (!res.headersSent) {
        res
          .status(500)
          .json({
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal server error" },
            id: null,
          });
      }
    }
  });
  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);

  return app;
}
