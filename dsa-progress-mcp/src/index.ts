import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createPrisma } from "./db/db.js";

const config = loadConfig();
const prisma = createPrisma(config.DATABASE_URL);
const app = createApp(prisma, {
  host: config.HOST,
  authToken: config.MCP_AUTH_TOKEN,
});

const httpServer = app.listen(config.PORT, config.HOST, () => {
  console.log(
    `dsa-progress MCP listening on http://${config.HOST}:${config.PORT}/mcp`,
  );
});

async function shutdown() {
  httpServer.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
