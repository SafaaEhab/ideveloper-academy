/**
 * Admin-only download and inspection endpoints for the Excel safety snapshots.
 *
 * These are plain Express routes (not tRPC) because the browser needs a real
 * file download with `Content-Disposition`. Authorization is the same signed
 * session cookie the panel uses, re-checked on every request.
 */
import type { Express, NextFunction, Request, Response } from "express";
import fs from "node:fs/promises";
import {
  findExcelBackup,
  latestExcelBackup,
  listExcelBackups,
  runExcelBackup,
} from "./excelBackup";
import { sdk } from "./sdk";

async function adminOnly(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await sdk.authenticateRequest(req);
    if (user?.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Sign in to download the database backup" });
  }
}

async function sendBackup(res: Response, file: { path: string; name: string; bytes: number }): Promise<void> {
  const buffer = await fs.readFile(file.path);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Length", String(buffer.length));
  res.setHeader("Content-Disposition", `attachment; filename="${file.name}"`);
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.send(buffer);
}

export function registerBackupRoutes(app: Express): void {
  app.get("/api/admin/backups", adminOnly, async (_req, res) => {
    const [backups, latest] = await Promise.all([listExcelBackups(), latestExcelBackup()]);
    res.setHeader("Cache-Control", "no-store");
    res.json({
      backups,
      latest: latest
        ? { name: latest.name, bytes: latest.bytes, createdAt: latest.createdAt }
        : null,
    });
  });

  app.get("/api/admin/backups/latest", adminOnly, async (_req, res) => {
    const latest = await latestExcelBackup();
    if (!latest) {
      res.status(404).json({ error: "No Excel backup exists yet" });
      return;
    }
    await sendBackup(res, latest);
  });

  app.post("/api/admin/backups/run", adminOnly, async (_req, res) => {
    const backup = await runExcelBackup("manual (admin panel)");
    if (!backup) {
      res.status(500).json({ error: "Backup could not be created. Check that DATABASE_URL is set." });
      return;
    }
    res.json({ backup });
  });

  app.get("/api/admin/backups/:name", adminOnly, async (req, res) => {
    const file = await findExcelBackup(req.params.name);
    if (!file) {
      res.status(404).json({ error: "Backup not found" });
      return;
    }
    const stat = await fs.stat(file);
    await sendBackup(res, { path: file, name: req.params.name, bytes: stat.size });
  });
}
