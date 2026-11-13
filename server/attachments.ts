/**
 * Upload validation for optional payment/expense attachments.
 *
 * Files are stored in MySQL as base64 (the same pattern the existing assignment
 * upload uses). Nothing is served from a public folder, and only images/PDF are
 * accepted with both a MIME allowlist and magic-byte checks.
 */

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export type ValidatedAttachment = {
  dataBase64: string;
  mime: string;
  name: string;
  bytes: number;
};

export class AttachmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttachmentError";
  }
}

const ALLOWED: Record<string, { ext: string[]; magic: number[] }> = {
  "image/jpeg": { ext: ["jpg", "jpeg"], magic: [0xff, 0xd8, 0xff] },
  "image/png": { ext: ["png"], magic: [0x89, 0x50, 0x4e, 0x47] },
  "image/webp": {
    ext: ["webp"],
    // RIFF....WEBP
    magic: [0x52, 0x49, 0x46, 0x46],
  },
  "application/pdf": { ext: ["pdf"], magic: [0x25, 0x50, 0x44, 0x46] },
};

export function validateAttachment(input: {
  dataBase64?: string | null;
  mime?: string | null;
  name?: string | null;
} | null | undefined): ValidatedAttachment | null {
  if (!input?.dataBase64) return null;
  const mime = String(input.mime ?? "").toLowerCase().split(";")[0].trim();
  const allowed = ALLOWED[mime];
  if (!allowed) {
    throw new AttachmentError(
      "نوع الملف غير مسموح. المسموح: JPG أو PNG أو WEBP أو PDF فقط.",
    );
  }
  const raw = String(input.dataBase64).trim();
  const withoutPrefix = raw.replace(/^data:[^;]+;base64,/, "");
  if (!/^[A-Za-z0-9+/=\s]+$/.test(withoutPrefix)) {
    throw new AttachmentError("ملف المرفق غير صالح");
  }
  const compact = withoutPrefix.replace(/\s+/g, "");
  let buffer: Buffer;
  try {
    buffer = Buffer.from(compact, "base64");
  } catch {
    throw new AttachmentError("ملف المرفق غير صالح");
  }
  if (buffer.length === 0) throw new AttachmentError("ملف المرفق فارغ");
  if (buffer.length > MAX_ATTACHMENT_BYTES) {
    throw new AttachmentError("حجم المرفق أكبر من 5 ميجابايت");
  }
  for (let index = 0; index < allowed.magic.length; index += 1) {
    if (buffer[index] !== allowed.magic[index]) {
      throw new AttachmentError(
        "محتوى الملف لا يطابق نوعه. ارفع صورة أو PDF صحيحاً.",
      );
    }
  }
  if (mime === "image/webp") {
    const tag = buffer.subarray(8, 12).toString("ascii");
    if (tag !== "WEBP") {
      throw new AttachmentError("ملف WEBP غير صالح");
    }
  }
  const originalName = String(input.name ?? "").trim().slice(0, 200);
  const safeName = originalName || `attachment.${allowed.ext[0]}`;
  return {
    dataBase64: compact,
    mime,
    name: safeName,
    bytes: buffer.length,
  };
}
