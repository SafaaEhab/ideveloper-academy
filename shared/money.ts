/**
 * Money is always handled as integer minor units (piastres for EGP).
 *
 * Floating point is never used for a stored or compared amount. Parsing accepts
 * Arabic-Indic digits and common separators, but refuses ambiguous values such
 * as "1,2,3" instead of guessing.
 */

export type MoneyParseResult =
  | { ok: true; minor: number }
  | { ok: false; error: string };

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩]/g, char => String(ARABIC_DIGITS.indexOf(char)));
}

/**
 * Parses a human-entered amount into piastres. Maximum is 10,000,000 EGP,
 * comfortably below the 32-bit signed integer limit (2,147,483,647 piastres).
 */
export function parseAmountToMinor(input: string | number): MoneyParseResult {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) {
      return { ok: false, error: "اكتب مبلغاً صحيحاً" };
    }
    const minor = Math.round(input * 100);
    if (!Number.isSafeInteger(minor)) {
      return { ok: false, error: "المبلغ أكبر من الحد المسموح" };
    }
    if (minor <= 0) return { ok: false, error: "المبلغ يجب أن يكون أكبر من صفر" };
    if (minor > 1_000_000_000) {
      return { ok: false, error: "المبلغ أكبر من الحد المسموح" };
    }
    return { ok: true, minor };
  }

  const raw = normalizeDigits(String(input ?? "")).trim();
  if (!raw) return { ok: false, error: "اكتب المبلغ" };

  // Allow "1,250.50" and "1250.5" but reject ambiguous grouping such as
  // "1,2,3". Arabic thousands and decimal separators are normalized first.
  const normalized = raw.replace(/[٬\s]/g, "").replace(/٫/g, ".");
  if (
    /[٬,]/.test(raw.replace(/\s/g, "")) &&
    !/^\d{1,3}(?:[٬,]\d{3})+(?:\.\d{1,2})?$/.test(
      raw.replace(/\s/g, "").replace(/٫/g, "."),
    )
  ) {
    return { ok: false, error: "اكتب المبلغ بالجنيه والقرش، مثال: 1250.50" };
  }
  const cleaned = normalized.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return { ok: false, error: "اكتب المبلغ بالجنيه والقرش، مثال: 1250.50" };
  }

  const [whole, fraction = ""] = cleaned.split(".");
  const minor =
    Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  if (!Number.isSafeInteger(minor) || minor > 1_000_000_000) {
    return { ok: false, error: "المبلغ أكبر من الحد المسموح" };
  }
  if (minor <= 0) return { ok: false, error: "المبلغ يجب أن يكون أكبر من صفر" };
  return { ok: true, minor };
}

/** Formats piastres as a plain EGP string without a currency symbol. */
export function formatMinorAmount(
  minor: number,
  options: { locale?: string; currency?: string; withCurrency?: boolean } = {},
): string {
  const safe = Number.isFinite(minor) ? Math.trunc(minor) : 0;
  const value = safe / 100;
  try {
    return new Intl.NumberFormat(options.locale ?? "ar-EG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...(options.withCurrency === false
        ? {}
        : { style: "currency", currency: options.currency ?? "EGP" }),
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${options.currency ?? "EGP"}`;
  }
}

/** A short English/ASCII amount for generated PDFs and Excel cells. */
export function formatMinorPlain(minor: number): string {
  return (Math.trunc(Number.isFinite(minor) ? minor : 0) / 100).toFixed(2);
}

export function sumMinor(values: number[]): number {
  return values.reduce((total, value) => total + Math.trunc(value || 0), 0);
}

/** Percent discounts are rounded once, then capped at the base amount. */
export function percentOfMinor(baseMinor: number, percent: number): number {
  if (!Number.isFinite(percent) || percent <= 0 || baseMinor <= 0) return 0;
  const capped = Math.min(100, Math.max(0, percent));
  return Math.min(baseMinor, Math.round((baseMinor * capped) / 100));
}

export function clampMinorToRange(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}
