import type { Express, Request, Response } from "express";
import { getAssignmentFile, getInstructorByUserId, isGroupAuthorizedForInstructor } from "../db";
import { sdk } from "./sdk";
import { readStudentSessionFromRequest } from "./studentSession";

/**
 * Private download endpoint for assignment attachments.
 *
 * Uploads are stored in the database, so there is no public directory to guess.
 * Every request is authorized against the signed student cookie or an admin /
 * instructor session before a single byte is sent.
 */
export function registerAssignmentFileRoutes(app: Express): void {
  app.get("/api/assignment-files/:id", async (req: Request, res: Response) => {
    const fileId = Number(req.params.id);
    if (!Number.isInteger(fileId) || fileId <= 0) {
      res.status(400).json({ error: "Invalid file id" });
      return;
    }
    const row = await getAssignmentFile(fileId);
    if (!row) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    let allowed = false;
    const studentId = await readStudentSessionFromRequest(req);
    if (studentId != null && studentId === row.submission.studentId) {
      allowed = true;
    }

    if (!allowed) {
      try {
        const user = await sdk.authenticateRequest(req);
        if (user?.role === "admin") {
          allowed = true;
        } else if (user?.role === "instructor") {
          const instructor = await getInstructorByUserId(user.id);
          if (
            instructor?.active &&
            (await isGroupAuthorizedForInstructor(instructor.id, row.assignment.groupId))
          ) {
            allowed = true;
          }
        }
      } catch {
        allowed = false;
      }
    }

    if (!allowed) {
      // The same answer for "not yours" and "does not exist" avoids leaking ids.
      res.status(404).json({ error: "File not found" });
      return;
    }

    let bytes: Buffer;
    try {
      bytes = Buffer.from(row.file.dataBase64, "base64");
    } catch {
      res.status(500).json({ error: "File could not be read" });
      return;
    }

    res.setHeader("Content-Type", row.file.mimeType);
    res.setHeader("Content-Length", String(bytes.length));
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(row.file.originalName)}`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    res.send(bytes);
  });
}
