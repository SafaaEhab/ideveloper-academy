import { COMPANY_WHATSAPP_NUMBER } from "./contact";

// Shape of the announcement the admin panel manages. The site popup renders
// whatever `site.announcement` returns, and nothing at all when it returns null.

export type AnnouncementPrize = { place: string; reward: string };

export type Announcement = {
  id: number;
  badge: string;
  title: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaHint: string;
  whatsappNumber: string;
  deadline: string | null;
  enabled: boolean;
  facts: string[];
  prizes: AnnouncementPrize[];
  createdAt: Date;
  updatedAt: Date;
};

// Chrome the popup owns rather than the trainer — the surrounding words the copy
// slots into. Kept here so swapping them stays a one-file job.
export const ANNOUNCEMENT_LABELS = {
  skip: "مش دلوقتي",
  deadlineLabel: "آخر موعد للتسجيل",
  startedLabel: "بدأت التسجيل بالفعل، سجّل قبل ما تفوتك",
  countdownUnits: { days: "يوم", hours: "ساعة", minutes: "دقيقة", seconds: "ثانية" },
  defaultCta: "سجّل دلوقتي",
  defaultHint: "التسجيل عن طريق واتساب",
  emptyTitle: "مفيش إعلان معروض دلوقتي، وأول ما تنشر إعلان من لوحة الأدمن هيظهر في أول الموقع.",
};

// wa.me wants the country code and number with no "+" and no separators, and
// tolerates any of the punctuation people naturally type.
export function normalizeWhatsAppNumber(value: string) {
  return value.replace(/[^\d]/g, "");
}

export function announcementWhatsAppNumber(announcement: Pick<Announcement, "whatsappNumber">) {
  const custom = normalizeWhatsAppNumber(announcement.whatsappNumber);
  return custom || COMPANY_WHATSAPP_NUMBER;
}

export function buildAnnouncementWhatsAppLink(
  announcement: Pick<Announcement, "whatsappNumber" | "title">,
) {
  const body = [
    `السلام عليكم، عايز أعرف تفاصيل ${announcement.title}.`,
    "",
    "الاسم:",
    "السن:",
  ].join("\n");
  return `https://wa.me/${announcementWhatsAppNumber(announcement)}?text=${encodeURIComponent(body)}`;
}

// ── Editing helpers shared by the admin form ─────────────────────────────────

/** One chip per line, blank lines dropped. */
export function linesToFacts(value: string) {
  return value
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function factsToLines(facts: readonly string[]) {
  return facts.join("\n");
}

/** One prize per line as "place | reward". Both "|" and ":" work as the divider. */
export function linesToPrizes(value: string) {
  return value
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [place, reward] = line.split(/[|:]/, 2);
      return { place: (place ?? "").trim(), reward: (reward ?? "").trim() };
    })
    .filter(prize => prize.place && prize.reward)
    .slice(0, 8);
}

export function prizesToLines(prizes: readonly AnnouncementPrize[]) {
  return prizes.map(prize => `${prize.place} | ${prize.reward}`).join("\n");
}

// A datetime-local input needs "YYYY-MM-DDTHH:mm" in the browser's own timezone;
// the server date arrives as a full ISO timestamp.
export function toDateTimeLocal(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ── Countdown ────────────────────────────────────────────────────────────────

// Number of milliseconds left until the deadline, never negative.
export function getDeadlineRemaining(deadline: string | null, now: number = Date.now()) {
  if (!deadline) return 0;
  const time = new Date(deadline).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, time - now);
}

export function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}