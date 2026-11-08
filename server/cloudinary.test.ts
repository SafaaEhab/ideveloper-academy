import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const ORIGINAL = {
  cloud: process.env.CLOUDINARY_CLOUD_NAME,
  key: process.env.CLOUDINARY_API_KEY,
  secret: process.env.CLOUDINARY_API_SECRET,
  uploadDir: process.env.UPLOAD_DIR,
};

let tempDir: string;

describe("Cloudinary configuration safety", () => {
  beforeEach(async () => {
    vi.resetModules();
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ideveloper-cloudinary-"));
    process.env.UPLOAD_DIR = tempDir;
  });

  afterEach(async () => {
    if (ORIGINAL.cloud === undefined) delete process.env.CLOUDINARY_CLOUD_NAME;
    else process.env.CLOUDINARY_CLOUD_NAME = ORIGINAL.cloud;
    if (ORIGINAL.key === undefined) delete process.env.CLOUDINARY_API_KEY;
    else process.env.CLOUDINARY_API_KEY = ORIGINAL.key;
    if (ORIGINAL.secret === undefined) delete process.env.CLOUDINARY_API_SECRET;
    else process.env.CLOUDINARY_API_SECRET = ORIGINAL.secret;
    if (ORIGINAL.uploadDir === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = ORIGINAL.uploadDir;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("reports the exact missing variable names without values, with local fallback enabled", async () => {
    const { cloudinaryConfigurationStatus } = await import("./_core/cloudinary");
    expect(cloudinaryConfigurationStatus()).toEqual({
      upload: true,
      storage: "local",
      missing: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
    });
  });

  it("saves the photo locally when Cloudinary is not configured", async () => {
    const { uploadImage } = await import("./_core/cloudinary");
    const dataUrl = `data:image/png;base64,${Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]).toString("base64")}`;
    const result = await uploadImage(dataUrl);
    expect(result.url).toMatch(/^\/api\/uploads\/achievements\/achievement-[a-z0-9]{12}\.png$/);
    expect(result.publicId).toMatch(/^local:achievement-[a-z0-9]{12}\.png$/);
    const filename = result.url.split("/").pop()!;
    await expect(fs.stat(path.join(tempDir, filename))).resolves.toBeTruthy();
  });

  it("validates the file before reporting missing credentials", async () => {
    const { uploadImage } = await import("./_core/cloudinary");
    await expect(uploadImage("data:text/plain;base64,aGVsbG8=")).rejects.toThrow(/Only images/);
  });
});
