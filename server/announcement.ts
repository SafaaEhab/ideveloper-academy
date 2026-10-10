import type { announcements } from "../drizzle/schema";

export type AnnouncementPrize = { place: string; reward: string };

export type ParsedAnnouncement = {
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

/** Both list columns hold JSON the trainer typed as one item per line. */
function readStringList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  } catch {
    return [];
  }
}

function readPrizes(raw: string | null): AnnouncementPrize[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item): AnnouncementPrize | null => {
        if (!item || typeof item !== "object") return null;
        const { place, reward } = item as { place?: unknown; reward?: unknown };
        if (typeof place !== "string" || typeof reward !== "string") return null;
        const trimmed = { place: place.trim(), reward: reward.trim() };
        return trimmed.place ? trimmed : null;
      })
      .filter((item): item is AnnouncementPrize => item !== null);
  } catch {
    return [];
  }
}

/**
 * Shape a stored announcement for the site popup. Every column is optional in the
 * database, so this fills the gaps — and a hand-edited or corrupt JSON list must
 * degrade to an empty list rather than take the whole site down.
 */
export function readAnnouncement(row: typeof announcements.$inferSelect | undefined | null): ParsedAnnouncement | null {
  if (!row) return null;
  return {
    id: row.id,
    badge: row.badge ?? "",
    title: row.title,
    headline: row.headline ?? "",
    body: row.body ?? "",
    ctaLabel: row.ctaLabel ?? "",
    ctaHint: row.ctaHint ?? "",
    whatsappNumber: row.whatsappNumber ?? "",
    // Serialised so the browser countdown is right in the visitor's own timezone.
    deadline: row.deadline ? new Date(row.deadline).toISOString() : null,
    enabled: !!row.enabled,
    facts: readStringList(row.facts),
    prizes: readPrizes(row.prizes),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}