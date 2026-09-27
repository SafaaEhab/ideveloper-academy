/**
 * Digital certificate engine.
 *
 * Draws the certificate directly on a <canvas> (2D context) and wraps the
 * result into a landscape A4 PDF via jsPDF. Canvas is used on purpose: it lets
 * the browser do the text shaping (so Arabic student names render correctly)
 * and avoids depending on a CSS-to-canvas renderer that cannot parse the
 * `oklch()` colors emitted by Tailwind v4.
 *
 * No data leaves the browser — the PDF is produced and downloaded locally.
 */
import { jsPDF } from "jspdf";

export const ACADEMY_LOGO =
  "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/logo.png";

export const ACADEMY_NAME = "iDeveloper Academy";

/** Landscape A4 at roughly 170 DPI. */
const W = 2000;
const H = 1414;

const SERIF = 'Georgia, "Times New Roman", "Noto Serif", serif';
const SANS = '"Segoe UI", "Noto Sans Arabic", Tahoma, Arial, sans-serif';
const MONO = '"Cascadia Mono", Consolas, "Courier New", monospace';

const INK = "#12161F";
const BODY = "#4A5568";
const MUTED = "#6B7688";
const BLUE = "#1E5CD6";
const BLUE_SOFT = "#E8EFFD";
const LINE = "#C8D3E8";
const GOLD = "#C9A227";
const CREAM = "#FFFDF8";

export type CertificateCourse = {
  /** Short course key as shown in the academy, e.g. "Python". */
  courseName: string;
  /** Full certificate title, e.g. "Python Programming & Problem Solving". */
  courseTitle: string;
  /** One-line descriptor under the title. */
  courseSubtitle: string;
  sessionCount: number;
  monthCount: number;
};

export type CertificateInput = CertificateCourse & {
  studentName: string;
  accessCode: string;
  issuedOn?: Date;
};

export type IssuedCertificate = {
  fileName: string;
  serial: string;
  issuedOn: Date;
};

const letterSpacingSupported = () => {
  if (typeof document === "undefined") return false;
  try {
    return "letterSpacing" in document.createElement("canvas").getContext("2d")!;
  } catch {
    return false;
  }
};

const supports = letterSpacingSupported();

type DrawOptions = {
  font: string;
  color?: string;
  align?: CanvasTextAlign;
  tracking?: number;
  alpha?: number;
};

function setFont(ctx: CanvasRenderingContext2D, options: DrawOptions) {
  ctx.font = options.font;
  if (supports) {
    ctx.letterSpacing = `${options.tracking ?? 0}px`;
  }
}

/** Measures text, honoring tracking on engines that support it. */
function measure(ctx: CanvasRenderingContext2D, text: string, options: DrawOptions) {
  setFont(ctx, options);
  if (supports || !options.tracking) return ctx.measureText(text).width;
  let width = 0;
  for (const char of text) width += ctx.measureText(char).width + (options.tracking ?? 0);
  return width - (options.tracking ?? 0);
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: DrawOptions
) {
  const tracking = options.tracking ?? 0;
  ctx.save();
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = supports || !tracking ? (options.align ?? "center") : "left";
  ctx.fillStyle = options.color ?? INK;
  if (options.alpha !== undefined) ctx.globalAlpha = options.alpha;

  if (!supports && tracking) {
    const width = measure(ctx, text, options);
    let cursor = x;
    if (options.align === "center") cursor = x - width / 2;
    else if (options.align === "right") cursor = x - width;
    setFont(ctx, options);
    for (const char of text) {
      ctx.fillText(char, cursor, y);
      cursor += ctx.measureText(char).width + tracking;
    }
  } else {
    setFont(ctx, options);
    ctx.fillText(text, x, y);
  }
  ctx.restore();
}

/** Shrinks the font until the text fits `maxWidth`. */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  build: (size: number) => string,
  startSize: number,
  minSize: number
) {
  let size = startSize;
  while (size > minSize) {
    const font = build(size);
    setFont(ctx, { font });
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return build(size);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function strokeRectFrame(
  ctx: CanvasRenderingContext2D,
  inset: number,
  lineWidth: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  ctx.restore();
}

function drawCornerMarks(ctx: CanvasRenderingContext2D) {
  const inset = 70;
  const arm = 54;
  ctx.save();
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 6;
  ctx.lineCap = "square";
  const corners = [
    [inset, inset, 1, 1],
    [W - inset, inset, -1, 1],
    [inset, H - inset, 1, -1],
    [W - inset, H - inset, -1, -1],
  ] as const;
  for (const [x, y, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + dx * arm, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * arm);
    ctx.stroke();
  }
  ctx.fillStyle = GOLD;
  for (const [x, y] of [
    [inset, inset],
    [W - inset, inset],
    [inset, H - inset],
    [W - inset, H - inset],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawDivider(
  ctx: CanvasRenderingContext2D,
  y: number,
  from: number,
  to: number,
  color = LINE
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(from, y);
  ctx.lineTo(to, y);
  ctx.stroke();
  ctx.restore();
}

function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size, cy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawArcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  font: string,
  color: string
) {
  setFont(ctx, { font });
  const chars = Array.from(text);
  const tracking = 3;
  const widths = chars.map((char) => ctx.measureText(char).width + tracking);
  const total = widths.reduce((sum, value) => sum + value, 0);
  const totalAngle = total / radius;
  let angle = -Math.PI / 2 - totalAngle / 2;
  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < chars.length; i += 1) {
    const step = widths[i] / radius;
    angle += step / 2;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
    angle += step / 2;
  }
  ctx.restore();
}

function loadImage(src: string, timeoutMs = 9000): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") {
      resolve(null);
      return;
    }
    const image = new Image();
    let settled = false;
    const finish = (result: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    image.crossOrigin = "anonymous";
    image.onload = () => finish(image.naturalWidth > 0 ? image : null);
    image.onerror = () => finish(null);
    image.src = src;
    window.setTimeout(() => finish(image.complete && image.naturalWidth > 0 ? image : null), timeoutMs);
  });
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement | null,
  cx: number,
  cy: number,
  maxWidth: number,
  maxHeight: number
) {
  ctx.save();
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(cx, cy, maxHeight * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.stroke();

  if (logo) {
    const ratio = Math.min(maxWidth / logo.naturalWidth, maxHeight / logo.naturalHeight);
    const w = logo.naturalWidth * ratio;
    const h = logo.naturalHeight * ratio;
    ctx.drawImage(logo, cx - w / 2, cy - h / 2, w, h);
  } else {
    // Monogram fallback so the certificate is never issued without branding.
    ctx.fillStyle = BLUE;
    roundRect(ctx, cx - 46, cy - 46, 92, 92, 24);
    ctx.fill();
    drawText(ctx, "iD", cx, cy + 18, { font: `700 52px ${SERIF}`, color: "#FFFFFF" });
  }
  ctx.restore();
}

function drawSeal(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const r = 96;
  ctx.save();
  ctx.shadowColor = "rgba(18, 22, 31, 0.20)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 7;
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const ring = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  ring.addColorStop(0, GOLD);
  ring.addColorStop(1, "#E8C766");
  ctx.strokeStyle = ring;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(30, 92, 214, 0.30)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 22, 0, Math.PI * 2);
  ctx.stroke();

  drawArcText(ctx, "iDEVELOPER", cx, cy, r - 36, `700 19px ${SANS}`, BLUE);
  drawText(ctx, "\u2605", cx, cy + 12, { font: `400 46px ${SANS}`, color: GOLD });
  drawText(ctx, "ACADEMY", cx, cy + 48, { font: `700 16px ${SANS}`, color: MUTED, tracking: 4 });
  drawText(ctx, "VERIFIED", cx, cy + 70, { font: `700 16px ${SANS}`, color: MUTED, tracking: 4 });
  ctx.restore();
}

function drawStat(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  value: string,
  label: string
) {
  drawText(ctx, value, cx, y, { font: `700 52px ${SERIF}`, color: BLUE });
  drawText(ctx, label, cx, y + 34, { font: `600 19px ${SANS}`, color: MUTED, tracking: 3 });
}

function drawBackground(ctx: CanvasRenderingContext2D) {
  const base = ctx.createLinearGradient(0, 0, W, H);
  base.addColorStop(0, CREAM);
  base.addColorStop(0.55, "#FBFCFF");
  base.addColorStop(1, "#EEF3FE");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, 240, 0, W / 2, 240, 900);
  glow.addColorStop(0, "rgba(30, 92, 214, 0.10)");
  glow.addColorStop(1, "rgba(30, 92, 214, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Oversized monogram watermark.
  drawText(ctx, "iD", W / 2, 780, { font: `700 460px ${SERIF}`, color: BLUE, alpha: 0.05 });
}

function hash(input: string) {
  let value = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    value = Math.imul(value ^ input.charCodeAt(i), 16777619);
  }
  return value >>> 0;
}

const COURSE_PREFIX: Record<string, string> = {
  Python: "PY",
  Scratch: "SC",
  Web: "WB",
  Robotics: "RB",
};

export function certificateSerial(input: Pick<CertificateInput, "accessCode" | "courseName">, issuedOn: Date) {
  const prefix = COURSE_PREFIX[input.courseName] ?? input.courseName.slice(0, 2).toUpperCase();
  const digest = hash(`${input.accessCode}:${input.courseName}`).toString(36).toUpperCase();
  return `IDV-${issuedOn.getFullYear()}-${prefix}-${digest.slice(0, 6).padStart(6, "0")}`;
}

const longDate = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(date);

function drawCertificate(
  ctx: CanvasRenderingContext2D,
  input: CertificateInput,
  logo: HTMLImageElement | null,
  serial: string,
  issuedOn: Date
) {
  drawBackground(ctx);

  strokeRectFrame(ctx, 46, 2, "#B9C6DE");
  strokeRectFrame(ctx, 70, 6, BLUE);
  strokeRectFrame(ctx, 88, 1.5, LINE);
  drawCornerMarks(ctx);

  // ── Header ───────────────────────────────────────────────────────────────
  drawLogo(ctx, logo, W / 2, 176, 250, 112);
  drawText(ctx, ACADEMY_NAME.toUpperCase(), W / 2, 288, {
    font: `700 34px ${SANS}`,
    color: BLUE,
    tracking: 9,
  });
  drawDivider(ctx, 320, W / 2 - 190, W / 2 + 190);
  drawDiamond(ctx, W / 2, 320, 9, GOLD);

  // ── Titles ───────────────────────────────────────────────────────────────
  drawText(ctx, "CERTIFICATE", W / 2, 424, {
    font: `700 92px ${SERIF}`,
    color: INK,
    tracking: 8,
  });
  drawText(ctx, "OF COMPLETION", W / 2, 492, {
    font: `400 52px ${SERIF}`,
    color: BLUE,
    tracking: 12,
  });
  drawText(ctx, "\u0634\u0647\u0627\u062f\u0629 \u0625\u062a\u0645\u0627\u0645", W / 2, 556, {
    font: `700 44px ${SANS}`,
    color: BLUE,
  });

  // ── Student ──────────────────────────────────────────────────────────────
  drawText(ctx, "This is to certify that", W / 2, 632, {
    font: `400 30px ${SERIF}`,
    color: BODY,
    tracking: 1,
  });

  const name = input.studentName.trim() || "Student";
  const nameWidth = 1180;
  const nameFont = fitFont(ctx, name, nameWidth, (size) => `700 ${size}px ${SERIF}`, 100, 44);
  drawText(ctx, name, W / 2, 736, { font: nameFont, color: INK });

  const rule = Math.min(1300, Math.max(420, measure(ctx, name, { font: nameFont }) + 120));
  drawDivider(ctx, 774, W / 2 - rule / 2, W / 2 + rule / 2, GOLD);
  drawDiamond(ctx, W / 2, 774, 8, GOLD);

  drawText(ctx, "has successfully completed every session of the", W / 2, 834, {
    font: `400 28px ${SERIF}`,
    color: BODY,
  });

  const title = input.courseTitle;
  drawText(ctx, title, W / 2, 906, {
    font: fitFont(ctx, title, 1440, (size) => `700 ${size}px ${SERIF}`, 68, 38),
    color: BLUE,
  });
  drawText(ctx, input.courseSubtitle, W / 2, 950, {
    font: `400 26px ${SERIF}`,
    color: MUTED,
  });

  // ── Stats ────────────────────────────────────────────────────────────────
  const statsY = 1058;
  const columns = [
    { value: String(input.sessionCount), label: "SESSIONS" },
    { value: String(input.monthCount), label: "MONTHS" },
    { value: "100%", label: "COMPLETED" },
  ];
  columns.forEach((column, index) => {
    const cx = W / 2 + (index - 1) * 340;
    drawStat(ctx, cx, statsY, column.value, column.label);
    if (index < columns.length - 1) {
      ctx.save();
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + 170, statsY - 48);
      ctx.lineTo(cx + 170, statsY + 36);
      ctx.stroke();
      ctx.restore();
    }
  });

  // ── Footer ───────────────────────────────────────────────────────────────
  drawDivider(ctx, 1140, 150, W - 150);

  drawText(ctx, ACADEMY_NAME, 380, 1230, {
    font: `italic 400 34px ${SERIF}`,
    color: INK,
  });
  drawText(ctx, "PROGRAM DIRECTOR", 380, 1264, {
    font: `600 18px ${SANS}`,
    color: MUTED,
    tracking: 3,
  });
  drawText(ctx, "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062c", 380, 1298, {
    font: `600 20px ${SANS}`,
    color: MUTED,
  });

  drawSeal(ctx, W / 2, 1240);

  const rightX = 1700;
  drawText(ctx, "CERTIFICATE NO.", rightX, 1196, {
    font: `600 18px ${SANS}`,
    color: MUTED,
    tracking: 3,
  });
  drawText(ctx, serial, rightX, 1236, {
    font: `700 30px ${MONO}`,
    color: INK,
  });
  drawText(ctx, `ISSUED ON \u00b7 ${longDate(issuedOn)}`, rightX, 1282, {
    font: `500 21px ${SANS}`,
    color: INK,
  });
}

function slugify(value: string) {
  const cleaned = value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w؀-ۿ-]+/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned.slice(0, 48) || "student";
}

/**
 * Paints the certificate onto a fresh canvas.
 * Exported so it can be reused for an on-screen preview.
 */
export async function renderCertificateCanvas(
  input: CertificateInput,
  options: { logoUrl?: string; issuedOn?: Date } = {}
): Promise<HTMLCanvasElement | null> {
  if (typeof document === "undefined") return null;

  const issuedOn = options.issuedOn ?? new Date();
  const serial = certificateSerial(input, issuedOn);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const logo = await loadImage(options.logoUrl ?? ACADEMY_LOGO);

  try {
    drawCertificate(ctx, input, logo, serial, issuedOn);
  } catch (error) {
    // A tainted canvas (logo served without CORS headers) breaks drawing —
    // fall back to the monogram so the student still gets a certificate.
    console.warn("[certificate] styled render failed, retrying without logo", error);
    try {
      ctx.clearRect(0, 0, W, H);
      drawCertificate(ctx, input, null, serial, issuedOn);
    } catch (retryError) {
      console.error("[certificate] render failed", retryError);
      return null;
    }
  }

  return canvas;
}

/**
 * Renders the certificate and triggers a PDF download.
 * Resolves with the issued certificate metadata, or `null` if rendering failed.
 */
export async function issueCertificate(input: CertificateInput): Promise<IssuedCertificate | null> {
  if (typeof document === "undefined") return null;

  const issuedOn = input.issuedOn ?? new Date();
  const serial = certificateSerial(input, issuedOn);
  const fileName = `iDeveloper-Certificate-${slugify(input.studentName)}-${input.courseName}.pdf`;

  // Give webfonts a chance to settle so the exported file matches the screen.
  try {
    await Promise.race([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise((resolve) => window.setTimeout(resolve, 2500)),
    ]);
  } catch {
    /* fonts API unavailable — fall through with system fonts */
  }

  const canvas = await renderCertificateCanvas(input, { issuedOn });
  if (!canvas) return null;

  let dataUrl: string;
  try {
    dataUrl = canvas.toDataURL("image/png");
  } catch (error) {
    console.error("[certificate] export failed", error);
    return null;
  }

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  pdf.addImage(dataUrl, "PNG", 0, 0, 297, 210, undefined, "FAST");
  pdf.setProperties({
    title: `${ACADEMY_NAME} — ${input.courseName} Certificate`,
    subject: `Issued to ${input.studentName}`,
    author: ACADEMY_NAME,
    creator: ACADEMY_NAME,
  });
  pdf.save(fileName);

  return { fileName, serial, issuedOn };
}

/** localStorage flag so a certificate is auto-issued once per course. */
const issuedKey = (accessCode: string, courseName: string) =>
  `idev-certificate-${accessCode}-${courseName}`;

export const hasIssuedCertificate = (accessCode: string, courseName: string) => {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(issuedKey(accessCode, courseName)) !== null;
  } catch {
    return false;
  }
};

export const markCertificateIssued = (accessCode: string, courseName: string, serial: string) => {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(issuedKey(accessCode, courseName), serial);
  } catch {
    /* storage unavailable */
  }
};
