import "dotenv/config";
import { createServer } from "node:http";
import { createApp } from "./app";
import { startExcelBackupScheduler } from "./excelBackup";
import { startLeadSyncScheduler } from "../leadSync";
import { serveStatic } from "./static";

/**
 * Production entry for a long-running Node process (MonsterASP/IIS, Render,
 * Docker). It has no Vite import, so `pnpm build` can bundle the whole server
 * and its runtime dependencies into one file for ZIP/FTP deployment.
 */
async function startServer() {
  const app = createApp();
  // IIS/HttpPlatform terminates TLS and forwards plain HTTP with the original
  // protocol in X-Forwarded-Proto.
  app.set("trust proxy", 1);
  serveStatic(app);

  const port = Number(
    process.env.PORT ||
      process.env.HTTP_PLATFORM_PORT ||
      process.env.SERVER_PORT ||
      3000,
  );
  const server = createServer(app);

  server.listen(port, () => {
    console.log(`[Server] Listening on port ${port}`);
    startExcelBackupScheduler();
    startLeadSyncScheduler();
  });
}

startServer().catch(error => {
  console.error("[Server] Failed to start:", error);
  process.exit(1);
});
