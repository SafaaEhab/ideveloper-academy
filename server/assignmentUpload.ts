import { randomUUID } from "node:crypto";

/**
 * Assignment upload validation.
 *
 * The browser sends a base64 payload and a claimed MIME type. Neither is
 * trusted: the decoded bytes are checked against the allowed signatures, the
 * size is recalculated, and the stored name is generated here. The original
 * name is kept for display only and is stripped of any path components.
 */

export const MAX_ASSIGNMENT_FILE_BYTES = 3 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "application/zip",
]);

const MIME_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "application/x-zip-compressed": "application/zip",
  "text/csv": "text/plain",
};

export type ValidatedAssignmentFile = {
  originalName: string;
  mimeType: string;
  size: number;
  dataBase64: string;
  storageKey: string;
};

function normalizeMime(value: string): string {
  const lower = value.trim().toLowerCase();
  return MIME_ALIASES[lower] ?? lower;
}

function safeDisplayName(value: string): string {
  const base = value.split(/[\\/]/).pop() ?? "attachment";
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (cleaned || "attachment").slice(0, 255);
}

function detectMime(bytes: Buffer): string | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (bytes.length >= 5 && bytes.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  if (bytes.length >= 4 && bytes.toString("ascii", 0, 4) === "PK\u0003\u0004") return "application/zip";
  return null;
}

export class AssignmentFileError extends Error {}

export function validateAssignmentFile(input: {
  name: string;
  mimeType: string;
  dataBase64: string;
}): ValidatedAssignmentFile {
  const originalName = safeDisplayName(input.name);
  const mimeType = normalizeMime(input.mimeType);
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new AssignmentFileError(
      "That file type is not allowed. Use PDF, PNG, JPEG, WebP, plain text or ZIP.",
    );
  }
  const compact = input.dataBase64.replace(/\s+/g, "");
  if (!compact || !/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) {
    throw new AssignmentFileError("That file could not be read.");
  }
  const bytes = Buffer.from(compact, "base64");
  if (bytes.length === 0) {
    throw new AssignmentFileError("That file is empty.");
  }
  if (bytes.length > MAX_ASSIGNMENT_FILE_BYTES) {
    throw new AssignmentFileError("That file is larger than 3 MB.");
  }

  const detected = detectMime(bytes);
  const compatible =
    detected === null
      ? mimeType === "text/plain" && !bytes.includes(0)
      : detected === mimeType;
  if (!compatible) {
    throw new AssignmentFileError(
      "The file contents do not match the selected file type.",
    );
  }

  return {
    originalName,
    mimeType,
    size: bytes.length,
    // Canonical base64, so the stored value is exactly what was validated.
    dataBase64: bytes.toString("base64"),
    storageKey: randomUUID(),
  };
}
