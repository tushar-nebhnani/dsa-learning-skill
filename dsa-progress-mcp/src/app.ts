import { timingSafeEqual } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Express, NextFunction, Request, Response } from "express";
import type { PrismaClient } from "./db/db.js";
import { createMcpServer } from "./server.js";

export interface AppOptions {
  host?: string;
  authToken?: string;
}

function bearerAuth(token: string) {
  const expected = Buffer.from(`Bearer ${token}`);
  return (req: Request, res: Response, next: NextFunction) => {
    const given = Buffer.from(req.headers.authorization ?? "");
    if (given.length === expected.length && timingSafeEqual(given, expected))
      return next();
    res
      .status(401)
      .json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Unauthorized" },
        id: null,
      });
  };
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

export function createApp(
  prisma: PrismaClient,
  options: AppOptions = {},
): Express {
  const app = createMcpExpressApp({ host: options.host ?? "127.0.0.1" });

  app.get("/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "db_unavailable" });
    }
  });

  if (options.authToken) app.use("/mcp", bearerAuth(options.authToken));

  // Stateless mode: a fresh server + transport per request, so no session state is kept between calls.
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
