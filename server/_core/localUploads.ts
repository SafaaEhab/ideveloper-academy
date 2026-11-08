/**
 * Local image storage for achievement photos when Cloudinary is not configured.
 *
 * Files live under `App_Data/uploads/achievements` on MonsterASP, outside the
 * public static folder, and are served by the authenticated-by-URL
 * `/api/uploads/achievements/:file` route. The URL stored in the database is
 * relative; the client resolves it against `API_BASE_URL`, so the Vercel
 * frontend loads the image from the Monster backend.
 */
import { customAlphabet } from "nanoid";
import fs from "node:fs/promises";
import path from "node:path";

export const LOCAL_UPLOAD_URL_PREFIX = "/api/uploads/achievements/";
export const LOCAL_UPLOAD_FILE_PATTERN =
  /^achievement-[a-z0-9]{12}\.(png|jpg|jpeg|webp|gif|avif)$/;

const randomSuffix = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 12);

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

export function localUploadDir(): string {
  const configured = process.env.UPLOAD_DIR?.trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);
  }
  return path.resolve(process.cwd(), "App_Data", "uploads", "achievements");
}

export function localUploadFilenameFromUrl(url: string | null | undefined): string | null {
  if (!url?.startsWith(LOCAL_UPLOAD_URL_PREFIX)) return null;
  const filename = url.slice(LOCAL_UPLOAD_URL_PREFIX.length).split("?")[0];
  return LOCAL_UPLOAD_FILE_PATTERN.test(filename) ? filename : null;
}

export function localUploadContentType(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[extension] ?? "application/octet-stream";
}

export async function saveLocalImage(
  bytes: Buffer,
  mime: string,
): Promise<{ filename: string; url: string }> {
  const extension = EXT_BY_MIME[mime.toLowerCase()];
  if (!extension) throw new Error("Unsupported image type");

  const directory = localUploadDir();
  await fs.mkdir(directory, { recursive: true });
  const filename = `achievement-${randomSuffix()}.${extension}`;
  await fs.writeFile(path.join(directory, filename), bytes, { flag: "wx" });
  return { filename, url: `${LOCAL_UPLOAD_URL_PREFIX}${filename}` };
}

export async function deleteLocalImage(filename: string): Promise<void> {
  if (!LOCAL_UPLOAD_FILE_PATTERN.test(filename)) return;
  await fs.rm(path.join(localUploadDir(), filename), { force: true });
}

export async function readLocalImage(filename: string): Promise<Buffer | null> {
  if (!LOCAL_UPLOAD_FILE_PATTERN.test(filename)) return null;
  try {
    return await fs.readFile(path.join(localUploadDir(), filename));
  } catch {
    return null;
  }
}
