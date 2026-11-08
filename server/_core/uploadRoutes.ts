import type { Express, Request, Response } from "express";
import {
  localUploadContentType,
  readLocalImage,
} from "./localUploads";

/**
 * Serves locally stored achievement photos. The file name is validated by
 * `readLocalImage`, so only generated `achievement-*.ext` files can be read;
 * no path traversal is possible.
 */
export function registerUploadRoutes(app: Express): void {
  app.get("/api/uploads/achievements/:file", async (req: Request, res: Response) => {
    const bytes = await readLocalImage(req.params.file);
    if (!bytes) {
      res.status(404).json({ error: "Image not found" });
      return;
    }
    res.setHeader("Content-Type", localUploadContentType(req.params.file));
    res.setHeader("Content-Length", String(bytes.length));
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(bytes);
  });
}
