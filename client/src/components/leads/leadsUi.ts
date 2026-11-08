import type { LeadStatus } from "@shared/leads";
import { LEAD_STATUS_TONES } from "@shared/leads";

export function formatLeadDate(
  value: Date | string | null | undefined
): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Africa/Cairo",
    dateStyle: "medium",
    timeStyle: "short",
    numberingSystem: "latn",
  }).format(date);
}

export function formatLeadDay(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Africa/Cairo",
    dateStyle: "medium",
    numberingSystem: "latn",
  }).format(date);
}

export function toDateTimeLocal(
  value: Date | string | null | undefined
): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

export function statusTone(status: LeadStatus | string): string {
  return (
    LEAD_STATUS_TONES[status as LeadStatus] ??
    "border-border bg-muted text-muted-foreground"
  );
}

export function syncTone(status: string): string {
  if (status === "synced") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "failed") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

export function syncLabel(status: string): string {
  if (status === "synced") return "تم النسخ";
  if (status === "failed") return "لم يتم النسخ";
  return "قيد النسخ";
}
