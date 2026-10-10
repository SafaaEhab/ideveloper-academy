// @ts-check
/**
 * Server-side Cloudinary uploads for admin-managed pictures.
 *
 * The browser never sees the API secret: the client hands over a data URL, this
 * module signs the upload and hands back a public delivery URL.
 *
 * Cloudinary requires the signature to cover every parameter except `file`,
 * `api_key`, `resource_type` and `cloud_name`, sorted alphabetically and joined
 * with `&`, hashed with SHA-1 together with the secret.
 *
 * Public IDs on this account are bare file names — there are no folders, so a
 * name is a global name. Every upload therefore gets a random suffix and never
 * reuses a caller's file name.
 */
import { createHash } from "node:crypto";
import { customAlphabet } from "nanoid";
import { ENV } from "./env";

/** Assets this module uploaded always start with this, so deletes stay safe. */
const UPLOAD_PREFIX = "achievement-";
const randomSuffix = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 12);

/** Hard ceiling on a single upload: ~8 MB of decoded bytes. */
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = /^image\/(png|jpeg|jpg|webp|gif|avif)$/i;

export function isCloudinaryConfigured(): boolean {
  return Boolean(ENV.cloudinaryCloudName && ENV.cloudinaryApiKey && ENV.cloudinaryApiSecret);
}

/** SHA-1 signature over the sorted parameter string. */
function sign(params: Record<string, string>, secret: string): string {
  const payload = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(payload + secret).digest("hex");
}

/** Optimised delivery URL, matching the `f_auto,q_auto` form used site-wide. */
export function deliveryUrl(publicId: string): string {
  return `https://res.cloudinary.com/${ENV.cloudinaryCloudName}/image/upload/f_auto,q_auto/${publicId}`;
}

/**
 * Splits a data URL into its bytes. Throws with a message worth showing to the
 * admin rather than letting a raw decode error escape.
 */
function decodeDataUrl(dataUrl: string): { bytes: Buffer; mime: string } {
  const match = /^data:([a-z0-9.+/-]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) throw new Error("That file could not be read — pick an image from your device.");
  const mime = match[1].toLowerCase();
  if (!ALLOWED_MIME.test(mime)) throw new Error("Only images are allowed (PNG, JPEG, WebP, GIF or AVIF).");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length) throw new Error("That file appears to be empty.");
  if (bytes.length > MAX_BYTES) throw new Error("That image is larger than 8 MB — please use a smaller one.");
  return { bytes, mime };
}

/** Uploads a data URL and returns the delivery URL plus the asset's public ID. */
export async function uploadImage(dataUrl: string): Promise<{ url: string; publicId: string }> {
  // Validate the payload before the config check, so a bad file is always
  // reported as a bad file rather than as a missing-key problem.
  const { bytes, mime } = decodeDataUrl(dataUrl);
  if (!isCloudinaryConfigured()) {
    throw new Error("Image upload is not configured on this server. Add the Cloudinary keys to .env, or paste an image URL instead.");
  }
  const params = {
    public_id: `${UPLOAD_PREFIX}${randomSuffix()}`,
    timestamp: String(Math.floor(Date.now() / 1000)),
    overwrite: "true",
  };

  const body = new FormData();
  body.set("file", new Blob([new Uint8Array(bytes)], { type: mime }), `upload.${mime.split("/")[1]}`);
  body.set("api_key", ENV.cloudinaryApiKey);
  for (const [key, value] of Object.entries(params)) body.set(key, value);
  body.set("signature", sign(params, ENV.cloudinaryApiSecret));

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${ENV.cloudinaryCloudName}/image/upload`,
    { method: "POST", body },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.public_id) {
    const detail = payload?.error?.message ?? `upload failed (${response.status})`;
    throw new Error(`Cloudinary rejected the image: ${detail}`);
  }
  return { url: deliveryUrl(payload.public_id), publicId: payload.public_id as string };
}

/**
 * The public ID of an image this module uploaded, or null for anything else.
 * A URL pasted by hand — or pointing at another cloud — is never destroyed.
 */
export function ownedPublicId(url: string | null | undefined): string | null {
  if (!url || !ENV.cloudinaryCloudName) return null;
  const host = `https://res.cloudinary.com/${ENV.cloudinaryCloudName}/image/upload/`;
  if (!url.startsWith(host)) return null;
  const publicId = url.slice(host.length).split("?")[0].replace(/^f_auto,q_auto\//, "");
  return new RegExp(`^${UPLOAD_PREFIX}[a-z0-9]{12}$`).test(publicId) ? publicId : null;
}

/** Removes a previously uploaded asset. Best-effort: a failure never blocks a delete. */
export async function destroyImage(publicId: string): Promise<void> {
  if (!isCloudinaryConfigured()) return;
  const params = {
    public_id: publicId,
    timestamp: String(Math.floor(Date.now() / 1000)),
    invalidate: "true",
  };
  try {
    await fetch(`https://api.cloudinary.com/v1_1/${ENV.cloudinaryCloudName}/image/destroy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, api_key: ENV.cloudinaryApiKey, signature: sign(params, ENV.cloudinaryApiSecret) }),
    });
  } catch (error) {
    console.warn("[Cloudinary] Could not remove", publicId, error);
  }
}
