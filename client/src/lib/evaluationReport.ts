/**
 * Full group evaluation report.
 *
 * The instructor needs one image per A4 page that can be dropped into the
 * group's WhatsApp chat. Just like the certificate engine, everything is drawn
 * on a <canvas>: the browser shapes Arabic names and notes for us, and we avoid
 * CSS-to-canvas libraries that cannot read Tailwind v4's `oklch()` colors.
 *
 * The report is deliberately literal about missing data:
 *  - a student with no saved row gets an amber "بدون تقييم" badge;
 *  - a saved row with an empty field says "لم يُسجَّل";
 *  - a value that does not exist at all is shown as "—".
 *
 * No data leaves the browser. Sharing is a separate step in the dialog.
 */

import { ACADEMY_LOGO, ACADEMY_NAME } from "./certificate";

export const REPORT_STUDENTS_PER_PAGE = 12;
export const REPORT_PAGE_WIDTH = 1240;
export const REPORT_PAGE_HEIGHT = 1754;

const FONT_STACK = 'Cairo, "Segoe UI", Tahoma, Arial, sans-serif';

const PAPER = "#FCFAF5";
const INK = "#15202B";
const BODY = "#3F4A56";
const MUTED = "#7B8491";
const TEAL = "#0F6B5C";
const TEAL_SOFT = "#E7F2EF";
const GOLD = "#B4873C";
const LINE = "#E7E1D5";
const ROW_ALT = "#F7F3EB";
const CARD = "#FFFFFF";
const GREEN = "#177245";
const GREEN_SOFT = "#E6F4EA";
const ROSE = "#B23A48";
const ROSE_SOFT = "#FCEBEE";
const SKY = "#1D5E8C";
const SKY_SOFT = "#E8F1F8";
const AMBER = "#9A5B12";
const AMBER_SOFT = "#FBF0DF";
const AMBER_BADGE = "#F2DFC3";

const MARGIN = 64;
const CONTENT_W = REPORT_PAGE_WIDTH - MARGIN * 2;
const RIGHT = REPORT_PAGE_WIDTH - MARGIN;

// ── Shapes ─────────────────────────────────────────────────────────────────

export type ReportStudent = {
  id: number;
  name: string;
  courses?: string[];
};

export type ReportEvaluation = {
  studentId: number;
  attendance: "present" | "absent" | null;
  homework: "completed" | "not_completed" | null;
  focus: number | null;
  participation: number | null;
  notes: string | null;
};

export type ReportRow = {
  studentId: number;
  name: string;
  /** False means no evaluation row was saved for this student/occurrence. */
  evaluated: boolean;
  attendance: "present" | "absent" | null;
  homework: "completed" | "not_completed" | null;
  focus: number | null;
  participation: number | null;
  notes: string | null;
};

export type ReportStats = {
  studentCount: number;
  evaluatedCount: number;
  missingCount: number;
  /** Saved rows that still have at least one empty dimension. */
  partialCount: number;
};

export type ReportInput = {
  groupName: string;
  level?: string | null;
  courses?: string[];
  instructorName?: string | null;
  location?: string | null;
  dateKey: string;
  dateLabel: string;
  timeLabel: string;
  students: ReportStudent[];
  /** Evaluations for this occurrence only. The last row per student wins. */
  evaluations: ReportEvaluation[];
  generatedAt?: Date;
};

export type ReportPage = {
  pageNumber: number;
  totalPages: number;
  blob: Blob;
  fileName: string;
};

export type ShareMessageInput = {
  groupName: string;
  dateLabel: string;
  timeLabel: string;
  location?: string | null;
  instructorName?: string | null;
  studentCount: number;
  evaluatedCount: number;
  missingCount: number;
  partialCount: number;
  pageCount: number;
};

// ── Pure data helpers (unit tested without a DOM) ──────────────────────────

/** Merges every student with their saved evaluation for this occurrence. */
export function buildReportRows(
  students: ReportStudent[],
  evaluations: ReportEvaluation[],
): ReportRow[] {
  const latest = new Map<number, ReportEvaluation>();
  for (const evaluation of evaluations) {
    latest.set(evaluation.studentId, evaluation);
  }

  const seen = new Set<number>();
  const rows: ReportRow[] = [];
  for (const student of students) {
    if (seen.has(student.id)) continue;
    seen.add(student.id);
    const saved = latest.get(student.id);
    rows.push({
      studentId: student.id,
      name: student.name,
      evaluated: Boolean(saved),
      attendance: saved?.attendance ?? null,
      homework: saved?.homework ?? null,
      focus: saved?.focus ?? null,
      participation: saved?.participation ?? null,
      notes: saved?.notes?.trim() ? saved.notes.trim() : null,
    });
  }
  return rows;
}

export function summarizeReportRows(rows: ReportRow[]): ReportStats {
  const evaluated = rows.filter(row => row.evaluated);
  return {
    studentCount: rows.length,
    evaluatedCount: evaluated.length,
    missingCount: rows.length - evaluated.length,
    partialCount: evaluated.filter(
      row =>
        row.attendance === null ||
        row.homework === null ||
        row.focus === null ||
        row.participation === null,
    ).length,
  };
}

/**
 * Always returns at least one page so an empty group still produces a report
 * with its header (and an explicit "no students" line) instead of no file.
 */
export function paginateReportRows(
  rows: ReportRow[],
  perPage: number = REPORT_STUDENTS_PER_PAGE,
): ReportRow[][] {
  if (perPage < 1) throw new Error("perPage must be at least 1");
  if (rows.length === 0) return [[]];
  const pages: ReportRow[][] = [];
  for (let index = 0; index < rows.length; index += perPage) {
    pages.push(rows.slice(index, index + perPage));
  }
  return pages;
}

export function buildShareMessage(input: ShareMessageInput): string {
  const lines = [
    `تقرير تقييم شامل — مجموعة ${input.groupName}`,
    `الحصة: ${input.dateLabel} · ${input.timeLabel}${
      input.location ? ` · ${input.location}` : ""
    }`,
    `المدرّب: ${input.instructorName?.trim() || "غير مسند"}`,
    `عدد الطلاب: ${input.studentCount} · تم تقييمهم: ${input.evaluatedCount} · بدون تقييم محفوظ: ${input.missingCount}`,
  ];

  if (input.partialCount > 0) {
    lines.push(
      `تقييمات ناقصة: ${input.partialCount} (الحقول الفارغة تظهر كـ «لم يُسجَّل»).`,
    );
  }
  if (input.missingCount > 0) {
    lines.push(
      "الطلاب غير المقيَّمين معلَّمون داخل صور التقرير بكلمة «بدون تقييم».",
    );
  } else if (input.studentCount > 0) {
    lines.push("كل الطلاب لديهم تقييم محفوظ لهذه الحصة.");
  }

  lines.push(
    `صور التقرير: ${input.pageCount} ${input.pageCount === 1 ? "صفحة" : "صفحات"}.`,
    ACADEMY_NAME,
  );

  return lines.join("\n");
}

function safeFilePart(value: string): string {
  return (
    value
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "group"
  );
}

export function reportFileName(
  input: Pick<ReportInput, "groupName" | "dateKey">,
  pageNumber: number,
  totalPages: number,
): string {
  return `iDeveloper-${safeFilePart(input.groupName)}-${input.dateKey}-p${pageNumber}-of-${totalPages}.png`;
}

// ── Canvas helpers ─────────────────────────────────────────────────────────

type DrawTextOptions = {
  size: number;
  weight?: number;
  color?: string;
  align?: "left" | "center" | "right";
  maxWidth?: number;
  baseline?: CanvasTextBaseline;
  alpha?: number;
};

function setFont(ctx: CanvasRenderingContext2D, size: number, weight = 400) {
  ctx.font = `${weight} ${size}px ${FONT_STACK}`;
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (maxWidth <= 0) return "";
  if (ctx.measureText(text).width <= maxWidth) return text;
  const characters = Array.from(text);
  while (characters.length > 1) {
    characters.pop();
    const candidate = `${characters.join("").trimEnd()}…`;
    if (ctx.measureText(candidate).width <= maxWidth) return candidate;
  }
  return "…";
}

/** Wraps Arabic text by words, using at most `maxLines` and an ellipsis. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  size: number,
  weight: number,
): string[] {
  setFont(ctx, size, weight);
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (let index = 0; index < words.length; index += 1) {
    const candidate = current ? `${current} ${words[index]}` : words[index];
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);
    if (lines.length === maxLines - 1) {
      const rest = words.slice(index).join(" ");
      lines.push(ellipsize(ctx, rest, maxWidth));
      return lines;
    }
    current = ctx.measureText(words[index]).width <= maxWidth ? words[index] : "";
    if (!current) {
      lines.push(ellipsize(ctx, words[index], maxWidth));
      if (lines.length === maxLines) return lines;
    }
  }

  if (current) lines.push(ellipsize(ctx, current, maxWidth));
  return lines.slice(0, maxLines);
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: DrawTextOptions,
) {
  ctx.save();
  setFont(ctx, options.size, options.weight ?? 400);
  ctx.fillStyle = options.color ?? INK;
  ctx.textAlign = options.align ?? "right";
  ctx.textBaseline = options.baseline ?? "alphabetic";
  if (options.alpha !== undefined) ctx.globalAlpha = options.alpha;
  const value =
    options.maxWidth !== undefined
      ? ellipsize(ctx, text, options.maxWidth)
      : text;
  ctx.fillText(value, x, y);
  ctx.restore();
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string,
) {
  ctx.save();
  ctx.fillStyle = color;
  roundedRect(ctx, x, y, width, height, radius);
  ctx.fill();
  ctx.restore();
}

function strokeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string,
  lineWidth = 1,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  roundedRect(ctx, x, y, width, height, radius);
  ctx.stroke();
  ctx.restore();
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  background: string,
  color: string,
  label: string,
  size = 13,
) {
  fillRoundRect(ctx, x, y, width, height, height / 2, background);
  drawText(ctx, label, x + width / 2, y + height / 2 + size * 0.35, {
    size,
    weight: 700,
    color,
    align: "center",
  });
}

function drawRule(
  ctx: CanvasRenderingContext2D,
  y: number,
  color = LINE,
  xFrom = MARGIN,
  xTo = RIGHT,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(xFrom, y + 0.5);
  ctx.lineTo(xTo, y + 0.5);
  ctx.stroke();
  ctx.restore();
}

async function settleFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    const sample = "أبجد هوز 0123 iDeveloper";
    await Promise.race([
      Promise.all(
        [400, 600, 700, 800].map(weight =>
          document.fonts.load(`${weight} 24px Cairo`, sample).catch(() => []),
        ),
      ).then(() => document.fonts.ready),
      new Promise(resolve => setTimeout(resolve, 3000)),
    ]);
  } catch {
    /* Font loading API unavailable — fall back to system fonts. */
  }
}

function loadImage(source: string, timeoutMs = 8000): Promise<HTMLImageElement | null> {
  if (typeof Image === "undefined") return Promise.resolve(null);
  return new Promise(resolve => {
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
    image.src = source;
    setTimeout(
      () => finish(image.complete && image.naturalWidth > 0 ? image : null),
      timeoutMs,
    );
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error("تعذّر تجهيز صورة التقرير على هذا المتصفح"));
    }, "image/png");
  });
}

// ── Drawing ────────────────────────────────────────────────────────────────

const COLUMNS = [
  { key: "index", label: "#", width: 52 },
  { key: "name", label: "الطالب", width: 300 },
  { key: "attendance", label: "الحضور", width: 116 },
  { key: "homework", label: "الواجب", width: 128 },
  { key: "focus", label: "التركيز", width: 98 },
  { key: "participation", label: "المشاركة", width: 120 },
  { key: "notes", label: "ملاحظات المدرّب", width: 298 },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

function columnGeometry() {
  const result = new Map<ColumnKey, { x: number; width: number }>();
  let cursor = RIGHT;
  for (const column of COLUMNS) {
    result.set(column.key, { x: cursor - column.width, width: column.width });
    cursor -= column.width;
  }
  return result;
}

const GEOMETRY = columnGeometry();

const DIVIDER_Y = 136;
const TITLE_Y = 194;
const SUBTITLE_Y = 228;
const META_Y = 250;
const META_H = 94;
const SUMMARY_Y = 368;
const SUMMARY_H = 70;
const NOTE_Y = 466;
const TABLE_Y = 490;
const TABLE_HEADER_H = 48;
const ROWS_Y = TABLE_Y + TABLE_HEADER_H;
const ROW_H = 77;
const LEGEND_Y = 1498;
const FOOTER_LINE_Y = 1640;
const FOOTER_Y = 1672;

function drawLogo(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement | null,
) {
  const size = 64;
  const x = RIGHT - size;
  const y = 44;
  fillRoundRect(ctx, x, y, size, size, 16, CARD);
  strokeRoundRect(ctx, x, y, size, size, 16, LINE, 1);

  if (logo) {
    const ratio = Math.min((size - 16) / logo.naturalWidth, (size - 16) / logo.naturalHeight);
    const width = logo.naturalWidth * ratio;
    const height = logo.naturalHeight * ratio;
    ctx.drawImage(
      logo,
      x + (size - width) / 2,
      y + (size - height) / 2,
      width,
      height,
    );
  } else {
    fillRoundRect(ctx, x + 10, y + 10, size - 20, size - 20, 12, TEAL);
    drawText(ctx, "iD", x + size / 2, y + size / 2 + 8, {
      size: 20,
      weight: 800,
      color: "#FFFFFF",
      align: "center",
    });
  }
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  input: ReportInput,
  pageNumber: number,
  totalPages: number,
  logo: HTMLImageElement | null,
) {
  const gradient = ctx.createLinearGradient(0, 0, REPORT_PAGE_WIDTH, 0);
  gradient.addColorStop(0, TEAL);
  gradient.addColorStop(0.65, TEAL);
  gradient.addColorStop(1, GOLD);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, REPORT_PAGE_WIDTH, 10);

  drawLogo(ctx, logo);

  drawText(ctx, ACADEMY_NAME, RIGHT - 80, 82, {
    size: 28,
    weight: 800,
    color: INK,
  });
  drawText(ctx, "أكاديمية البرمجة والتفكير الإبداعي", RIGHT - 80, 108, {
    size: 14,
    weight: 500,
    color: MUTED,
  });

  drawPill(
    ctx,
    MARGIN,
    58,
    152,
    32,
    TEAL_SOFT,
    TEAL,
    `صفحة ${pageNumber} من ${totalPages}`,
    12,
  );

  drawRule(ctx, DIVIDER_Y);

  ctx.save();
  ctx.fillStyle = GOLD;
  ctx.fillRect(RIGHT - 36, TITLE_Y - 36, 36, 5);
  ctx.restore();

  drawText(ctx, "تقرير تقييم شامل", RIGHT, TITLE_Y, {
    size: 38,
    weight: 800,
    color: INK,
  });

  const subtitle = [
    input.groupName,
    input.level?.trim() || null,
    input.courses?.length ? input.courses.join(" · ") : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  drawText(ctx, subtitle, RIGHT, SUBTITLE_Y, {
    size: 20,
    weight: 600,
    color: TEAL,
    maxWidth: CONTENT_W,
  });
}

function drawMeta(ctx: CanvasRenderingContext2D, input: ReportInput) {
  fillRoundRect(ctx, MARGIN, META_Y, CONTENT_W, META_H, 14, CARD);
  strokeRoundRect(ctx, MARGIN, META_Y, CONTENT_W, META_H, 14, LINE, 1);

  const gap = 16;
  const inset = 20;
  const columnWidth = (CONTENT_W - inset * 2 - gap * 2) / 3;
  const columns = [
    {
      label: "المدرّب",
      value: input.instructorName?.trim() || "غير مسند",
    },
    {
      label: "تاريخ الحصة",
      value: input.dateLabel,
    },
    {
      label: "الوقت",
      value: input.timeLabel,
      sub: input.location?.trim() || null,
    },
  ];

  let rightEdge = RIGHT - inset;
  for (const column of columns) {
    const x = rightEdge - columnWidth;
    drawText(ctx, column.label, rightEdge, META_Y + 30, {
      size: 11,
      weight: 600,
      color: MUTED,
    });
    drawText(ctx, column.value, rightEdge, META_Y + 57, {
      size: 17,
      weight: 700,
      color: INK,
      maxWidth: columnWidth,
    });
    if (column.sub) {
      drawText(ctx, column.sub, rightEdge, META_Y + 77, {
        size: 12,
        weight: 500,
        color: MUTED,
        maxWidth: columnWidth,
      });
    }
    rightEdge = x - gap;
  }
}

function drawSummary(ctx: CanvasRenderingContext2D, stats: ReportStats) {
  const gap = 12;
  const cardWidth = (CONTENT_W - gap * 2) / 3;
  const cards = [
    {
      label: "طلاب المجموعة",
      value: String(stats.studentCount),
      hint: "المفعّلون في هذه الحصة",
      background: CARD,
      accent: TEAL,
    },
    {
      label: "تم تقييمهم",
      value: String(stats.evaluatedCount),
      hint:
        stats.studentCount > 0
          ? `${Math.round((stats.evaluatedCount / stats.studentCount) * 100)}% من المجموعة`
          : "لا يوجد طلاب",
      background: CARD,
      accent: GREEN,
    },
    {
      label: "بدون تقييم محفوظ",
      value: String(stats.missingCount),
      hint:
        stats.missingCount > 0 ? "معلَّمون داخل الجدول" : "لا يوجد نقص",
      background: stats.missingCount > 0 ? AMBER_SOFT : CARD,
      accent: stats.missingCount > 0 ? AMBER : GREEN,
    },
  ];

  let x = MARGIN;
  for (const card of cards) {
    fillRoundRect(ctx, x, SUMMARY_Y, cardWidth, SUMMARY_H, 12, card.background);
    strokeRoundRect(ctx, x, SUMMARY_Y, cardWidth, SUMMARY_H, 12, LINE, 1);
    ctx.save();
    ctx.fillStyle = card.accent;
    roundedRect(ctx, x, SUMMARY_Y, cardWidth, SUMMARY_H, 12);
    ctx.clip();
    ctx.fillRect(x, SUMMARY_Y, cardWidth, 4);
    ctx.restore();

    drawText(ctx, card.label, x + cardWidth - 16, SUMMARY_Y + 22, {
      size: 11,
      weight: 600,
      color: MUTED,
    });
    drawText(ctx, card.value, x + cardWidth - 16, SUMMARY_Y + 50, {
      size: 26,
      weight: 800,
      color: INK,
    });
    drawText(ctx, card.hint, x + 16, SUMMARY_Y + 50, {
      size: 11,
      weight: 500,
      color: MUTED,
      align: "left",
      maxWidth: cardWidth - 84,
    });
    x += cardWidth + gap;
  }
}

function drawTableHeader(ctx: CanvasRenderingContext2D) {
  fillRoundRect(ctx, MARGIN, TABLE_Y, CONTENT_W, TABLE_HEADER_H, 10, "#16232B");

  for (const column of COLUMNS) {
    const { x, width } = GEOMETRY.get(column.key)!;
    const align: DrawTextOptions["align"] =
      column.key === "index" ||
      column.key === "attendance" ||
      column.key === "homework" ||
      column.key === "focus" ||
      column.key === "participation"
        ? "center"
        : "right";
    drawText(
      ctx,
      column.label,
      align === "center" ? x + width / 2 : x + width - 12,
      TABLE_Y + 30,
      {
        size: 12,
        weight: 700,
        color: "#DDE7E3",
        align,
        maxWidth: width - 16,
      },
    );
  }
}

function drawMetricCell(
  ctx: CanvasRenderingContext2D,
  column: "attendance" | "homework",
  row: ReportRow,
  rowY: number,
) {
  const { x, width } = GEOMETRY.get(column)!;
  const center = x + width / 2;

  if (!row.evaluated) {
    drawText(ctx, "—", center, rowY + 45, {
      size: 17,
      weight: 600,
      color: MUTED,
      align: "center",
    });
    return;
  }

  if (column === "attendance") {
    if (row.attendance === "present") {
      drawPill(ctx, center - 35, rowY + 26, 70, 25, GREEN_SOFT, GREEN, "حاضر");
    } else if (row.attendance === "absent") {
      drawPill(ctx, center - 35, rowY + 26, 70, 25, ROSE_SOFT, ROSE, "غائب");
    } else {
      drawText(ctx, "لم يُسجَّل", center, rowY + 45, {
        size: 11,
        weight: 600,
        color: MUTED,
        align: "center",
      });
    }
    return;
  }

  if (row.homework === "completed") {
    drawPill(ctx, center - 46, rowY + 26, 92, 25, SKY_SOFT, SKY, "سلّم الواجب", 11);
  } else if (row.homework === "not_completed") {
    drawPill(ctx, center - 46, rowY + 26, 92, 25, AMBER_SOFT, AMBER, "لم يسلّم", 12);
  } else {
    drawText(ctx, "لم يُسجَّل", center, rowY + 45, {
      size: 11,
      weight: 600,
      color: MUTED,
      align: "center",
    });
  }
}

function drawScoreCell(
  ctx: CanvasRenderingContext2D,
  column: "focus" | "participation",
  row: ReportRow,
  rowY: number,
) {
  const { x, width } = GEOMETRY.get(column)!;
  const value = column === "focus" ? row.focus : row.participation;
  drawText(
    ctx,
    value === null ? "—" : `${value}/5`,
    x + width / 2,
    rowY + 45,
    {
      size: value === null ? 17 : 16,
      weight: value === null ? 600 : 700,
      color: value === null ? MUTED : INK,
      align: "center",
    },
  );
}

function drawRows(ctx: CanvasRenderingContext2D, rows: ReportRow[]) {
  if (rows.length === 0) {
    fillRoundRect(
      ctx,
      MARGIN,
      ROWS_Y,
      CONTENT_W,
      ROW_H * 2,
      10,
      TEAL_SOFT,
    );
    drawText(ctx, "لا يوجد طلاب مفعّلون في هذه المجموعة", RIGHT - 24, ROWS_Y + 66, {
      size: 20,
      weight: 700,
      color: TEAL,
    });
    drawText(
      ctx,
      "التقرير جاهز لكن من غير صفوف لأن المجموعة لا تضم طلابًا مفعّلين حاليًا.",
      RIGHT - 24,
      ROWS_Y + 96,
      { size: 14, weight: 500, color: BODY, maxWidth: CONTENT_W - 48 },
    );
    return;
  }

  rows.forEach((row, index) => {
    const rowY = ROWS_Y + index * ROW_H;
    const background = !row.evaluated ? AMBER_SOFT : index % 2 === 0 ? CARD : ROW_ALT;
    ctx.fillStyle = background;
    ctx.fillRect(MARGIN, rowY, CONTENT_W, ROW_H);

    if (!row.evaluated) {
      ctx.fillStyle = AMBER;
      ctx.fillRect(RIGHT - 4, rowY, 4, ROW_H);
    }
    if (index < rows.length - 1) drawRule(ctx, rowY + ROW_H);

    const indexColumn = GEOMETRY.get("index")!;
    drawText(ctx, String(index + 1), indexColumn.x + indexColumn.width / 2, rowY + 45, {
      size: 13,
      weight: 600,
      color: MUTED,
      align: "center",
    });

    const nameColumn = GEOMETRY.get("name")!;
    const hasBadge = !row.evaluated;
    if (hasBadge) {
      drawPill(
        ctx,
        nameColumn.x + 10,
        rowY + 26,
        84,
        24,
        AMBER_BADGE,
        AMBER,
        "بدون تقييم",
        11,
      );
    }
    drawText(ctx, row.name, nameColumn.x + nameColumn.width - 12, rowY + 39, {
      size: 19,
      weight: 700,
      color: INK,
      maxWidth: nameColumn.width - (hasBadge ? 108 : 24),
    });

    const courseLabel = row.evaluated ? null : "لم يُحفظ تقييم للحصة";
    if (courseLabel) {
      drawText(
        ctx,
        courseLabel,
        nameColumn.x + nameColumn.width - 12,
        rowY + 61,
        {
          size: 10.5,
          weight: 500,
          color: AMBER,
          maxWidth: nameColumn.width - 24,
        },
      );
    }

    drawMetricCell(ctx, "attendance", row, rowY);
    drawMetricCell(ctx, "homework", row, rowY);
    drawScoreCell(ctx, "focus", row, rowY);
    drawScoreCell(ctx, "participation", row, rowY);

    const notesColumn = GEOMETRY.get("notes")!;
    const notesMaxWidth = notesColumn.width - 24;
    const notesX = notesColumn.x + notesColumn.width - 12;
    if (row.notes) {
      const lines = wrapText(
        ctx,
        row.notes.replace(/\s+/g, " "),
        notesMaxWidth,
        2,
        12.5,
        400,
      );
      lines.forEach((line, lineIndex) => {
        drawText(ctx, line, notesX, rowY + 37 + lineIndex * 18, {
          size: 12.5,
          weight: 400,
          color: BODY,
          maxWidth: notesMaxWidth,
        });
      });
    } else {
      drawText(ctx, "—", notesX, rowY + 45, {
        size: 13.5,
        weight: 400,
        color: MUTED,
        maxWidth: notesMaxWidth,
      });
    }
  });
}

function drawLegend(ctx: CanvasRenderingContext2D) {
  drawText(ctx, "دليل الرموز", RIGHT, LEGEND_Y, {
    size: 12,
    weight: 700,
    color: TEAL,
  });

  const firstLine = LEGEND_Y + 28;
  let right = RIGHT;
  drawPill(ctx, right - 70, firstLine - 16, 70, 24, GREEN_SOFT, GREEN, "حاضر", 11);
  right -= 82;
  drawPill(ctx, right - 70, firstLine - 16, 70, 24, ROSE_SOFT, ROSE, "غائب", 11);
  right -= 86;
  drawText(ctx, "حالة الحضور", right, firstLine + 2, {
    size: 12,
    weight: 600,
    color: MUTED,
    maxWidth: 100,
  });

  right -= 142;
  drawPill(ctx, right - 92, firstLine - 16, 92, 24, SKY_SOFT, SKY, "سلّم الواجب", 10.5);
  right -= 104;
  drawPill(ctx, right - 92, firstLine - 16, 92, 24, AMBER_SOFT, AMBER, "لم يسلّم", 11);
  right -= 108;
  drawText(ctx, "حالة الواجب", right, firstLine + 2, {
    size: 12,
    weight: 600,
    color: MUTED,
    maxWidth: 100,
  });

  right -= 140;
  drawPill(ctx, right - 84, firstLine - 16, 84, 24, AMBER_BADGE, AMBER, "بدون تقييم", 11);
  right -= 96;
  drawText(ctx, "لم يُحفظ تقييم للطالب في هذه الحصة", right, firstLine + 2, {
    size: 12,
    weight: 600,
    color: AMBER,
    maxWidth: Math.max(80, right - MARGIN),
  });

  const secondLine = LEGEND_Y + 60;
  drawText(
    ctx,
    "«لم يُسجَّل» = الحقل موجود في التقييم لكن من غير قيمة.",
    RIGHT,
    secondLine,
    { size: 12, weight: 500, color: MUTED, maxWidth: 470 },
  );
  drawText(
    ctx,
    "«—» = لا توجد قيمة مسجّلة (أو لا يوجد تقييم محفوظ).",
    RIGHT - 500,
    secondLine,
    { size: 12, weight: 500, color: MUTED, maxWidth: 470 },
  );

  drawRule(ctx, FOOTER_LINE_Y);
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  input: ReportInput,
  pageNumber: number,
  totalPages: number,
) {
  drawText(ctx, ACADEMY_NAME, RIGHT, FOOTER_Y, {
    size: 14,
    weight: 800,
    color: INK,
  });
  drawText(ctx, "تقرير تقييم آلي — يعرض التقييمات المحفوظة فقط.", RIGHT, FOOTER_Y + 20, {
    size: 11,
    weight: 500,
    color: MUTED,
  });

  drawText(ctx, `صفحة ${pageNumber} من ${totalPages}`, MARGIN, FOOTER_Y, {
    size: 12,
    weight: 700,
    color: INK,
    align: "left",
  });

  const generatedAt = input.generatedAt ?? new Date();
  let generated = "";
  try {
    generated = generatedAt.toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    generated = generatedAt.toISOString().slice(0, 16).replace("T", " ");
  }
  drawText(ctx, `تم التجهيز: ${generated}`, REPORT_PAGE_WIDTH / 2, FOOTER_Y + 20, {
    size: 10.5,
    weight: 500,
    color: MUTED,
    align: "center",
    maxWidth: 430,
  });
}

function drawPage(
  ctx: CanvasRenderingContext2D,
  input: ReportInput,
  rows: ReportRow[],
  stats: ReportStats,
  pageNumber: number,
  totalPages: number,
  logo: HTMLImageElement | null,
) {
  ctx.save();
  ctx.direction = "rtl";
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, REPORT_PAGE_WIDTH, REPORT_PAGE_HEIGHT);
  ctx.restore();

  // Direction is canvas state, not a fill property: without this Arabic text
  // would fall back to the document's LTR direction.
  ctx.direction = "rtl";

  drawHeader(ctx, input, pageNumber, totalPages, logo);
  drawMeta(ctx, input);
  drawSummary(ctx, stats);
  drawText(
    ctx,
    "يعرض هذا التقرير التقييمات المحفوظة فقط، ولا يشمل أي تعديلات غير محفوظة.",
    RIGHT,
    NOTE_Y,
    { size: 11.5, weight: 500, color: MUTED, maxWidth: CONTENT_W },
  );

  drawTableHeader(ctx);
  drawRows(ctx, rows);
  drawLegend(ctx);
  drawFooter(ctx, input, pageNumber, totalPages);
}

/**
 * Renders every page of the report to a PNG blob. If the remote logo lacks
 * CORS headers the canvas gets tainted and `toBlob` throws; in that case the
 * pages are rendered again with the drawn monogram so sharing still works.
 */
export async function renderEvaluationReportPages(
  input: ReportInput,
  options: { logoUrl?: string } = {},
): Promise<ReportPage[]> {
  if (typeof document === "undefined") {
    throw new Error("تجهيز التقرير متاح داخل المتصفح فقط");
  }

  await settleFonts();

  const rows = buildReportRows(input.students, input.evaluations);
  const stats = summarizeReportRows(rows);
  const pages = paginateReportRows(rows);
  const logo = await loadImage(options.logoUrl ?? ACADEMY_LOGO);
  const generated = { ...input, generatedAt: input.generatedAt ?? new Date() };

  const render = async (withLogo: HTMLImageElement | null): Promise<ReportPage[]> => {
    const output: ReportPage[] = [];
    for (let index = 0; index < pages.length; index += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = REPORT_PAGE_WIDTH;
      canvas.height = REPORT_PAGE_HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("المتصفح لا يدعم تجهيز صور التقرير");
      drawPage(ctx, generated, pages[index], stats, index + 1, pages.length, withLogo);
      const blob = await canvasToBlob(canvas);
      output.push({
        pageNumber: index + 1,
        totalPages: pages.length,
        blob,
        fileName: reportFileName(generated, index + 1, pages.length),
      });
    }
    return output;
  };

  try {
    return await render(logo);
  } catch (error) {
    if (logo) {
      console.warn("[report] logo tainted the canvas, retrying without it", error);
      return render(null);
    }
    throw error;
  }
}
