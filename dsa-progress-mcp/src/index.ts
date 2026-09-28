import { createApp } from "./app.js";
import { createGoogleSignIn } from "./auth/google.js";
import { loadConfig } from "./config.js";
import { createPrisma } from "./db/db.js";

const config = loadConfig();
const prisma = createPrisma(config.DATABASE_URL);
const app = createApp(prisma, {
  host: config.HOST,
  publicUrl: config.PUBLIC_URL,
  google: createGoogleSignIn({
    clientId: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    redirectUri: `${config.PUBLIC_URL}/oauth/google/callback`,
  }),
});

const httpServer = app.listen(config.PORT, config.HOST, () => {
  console.log(`dsa-progress MCP listening on ${config.PUBLIC_URL}/mcp`);
});

async function shutdown() {
  httpServer.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
