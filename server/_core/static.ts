import express, { type Express } from "express";
import fs from "node:fs";
import path from "node:path";

/**
 * Serves the Vite build without importing Vite itself.
 *
 * Keeping this in its own module lets the production bundle leave the whole
 * Vite/dev toolchain out of `node_modules`, which is what makes the single-file
 * MonsterASP deployment practical.
 */
export function serveStatic(app: Express): void {
  // The production bundle is launched from the site root (wwwroot on
  // MonsterASP), so the client build is always `./dist/public` relative to the
  // working directory. STATIC_DIR is available for custom layouts.
  const distPath = process.env.STATIC_DIR
    ? path.resolve(process.env.STATIC_DIR)
    : path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // SPA fallback: every non-API route serves index.html.
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
