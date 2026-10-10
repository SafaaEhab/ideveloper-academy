// @ts-check
/**
 * Prepares a picked image for upload.
 *
 * A modern phone photo is several megabytes and far larger than an achievement
 * card ever needs, so anything that is not already a reasonably sized JPEG is
 * redrawn onto a canvas at a bounded size and re-encoded. JPEG sources pass
 * through untouched, which keeps text-heavy posters crisp.
 */
const MAX_EDGE = 1600;
const MAX_BYTES = 8 * 1024 * 1024;
/** Below this, a JPEG is small enough to send as-is. */
const PASSTHROUGH_BYTES = 1.5 * 1024 * 1024;
const ALLOWED = /^image\/(png|jpeg|jpg|webp|gif|avif)$/i;

/** Rejects anything that is not an image before a single byte is read. */
export function checkImageFile(file: File): string | null {
  if (!ALLOWED.test(file.type)) return "Only images are allowed (PNG, JPEG, WebP, GIF or AVIF).";
  if (file.size > MAX_BYTES) return "That image is larger than 8 MB — please pick a smaller one.";
  return null;
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.readAsDataURL(blob);
  });
}

/** Draws the bitmap onto a canvas no larger than {@link MAX_EDGE} and encodes it. */
async function redraw(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot resize the image.");
  // JPEG has no alpha channel — without a fill, transparent PNGs turn black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.86));
  if (!blob) throw new Error("This browser cannot resize the image.");
  return readAsDataUrl(blob);
}

/** Returns a data URL ready to hand to the upload mutation. */
export async function prepareImageForUpload(file: File): Promise<string> {
  const problem = checkImageFile(file);
  if (problem) throw new Error(problem);
  const isJpeg = /^image\/jpe?g$/i.test(file.type);
  return isJpeg && file.size <= PASSTHROUGH_BYTES ? readAsDataUrl(file) : redraw(file);
}
