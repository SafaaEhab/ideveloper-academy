import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  deleteLocalImage,
  localUploadFilenameFromUrl,
  localUploadDir,
  readLocalImage,
  saveLocalImage,
} from "./_core/localUploads";
import { validateImageSource } from "@shared/validation";

let tempDir: string;
let previousUploadDir: string | undefined;

beforeEach(async () => {
  previousUploadDir = process.env.UPLOAD_DIR;
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ideveloper-uploads-"));
  process.env.UPLOAD_DIR = tempDir;
});

afterEach(async () => {
  if (previousUploadDir === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = previousUploadDir;
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("local achievement uploads (H-08 fallback)", () => {
  it("saves an image and serves it back from the generated filename", async () => {
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const saved = await saveLocalImage(bytes, "image/png");

    expect(saved.filename).toMatch(/^achievement-[a-z0-9]{12}\.png$/);
    expect(saved.url).toBe(`/api/uploads/achievements/${saved.filename}`);
    expect(localUploadDir()).toBe(tempDir);
    await expect(fs.readFile(path.join(tempDir, saved.filename))).resolves.toEqual(bytes);
    await expect(readLocalImage(saved.filename)).resolves.toEqual(bytes);
    expect(localUploadFilenameFromUrl(saved.url)).toBe(saved.filename);
  });

  it("deletes the file and refuses paths outside the generated set", async () => {
    const saved = await saveLocalImage(Buffer.from("x"), "image/webp");
    await deleteLocalImage(saved.filename);
    await expect(readLocalImage(saved.filename)).resolves.toBeNull();
    await expect(readLocalImage("../secret.png")).resolves.toBeNull();
    await expect(readLocalImage("not-an-achievement.png")).resolves.toBeNull();
  });

  it("accepts the local upload URL in achievement validation and rejects traversal", () => {
    const ok = validateImageSource("/api/uploads/achievements/achievement-abc123def456.png");
    expect(ok.ok).toBe(true);
    expect(ok.value).toBe("/api/uploads/achievements/achievement-abc123def456.png");

    expect(validateImageSource("/api/uploads/achievements/../secret.png").ok).toBe(false);
    expect(validateImageSource("/api/uploads/achievements/achievement-abc.png").ok).toBe(false);
  });
});
