/**
 * Validation rules shared by the forms and the tRPC boundary.
 *
 * Keeping one implementation means the admin form, the public registration
 * form and the server can never drift apart on what "valid" means.
 */

export const PHONE_VALIDATION_MESSAGE =
  "اكتب رقم موبايل مصري صحيح، مثال: 01012345678";
export const PHONE_REQUIRED_MESSAGE = "رقم الهاتف مطلوب";
export const IMAGE_VALIDATION_MESSAGE =
  "Enter a valid HTTPS image URL or a path that starts with /images/";

/**
 * Egyptian mobile numbers are `1[0125]` followed by 8 digits. Landlines are
 * accepted too (area code + 7/8 digits), because parent numbers are often a
 * home line. Anything else — including letters — is rejected.
 */
const EGYPT_MOBILE_NSN = /^1[0125]\d{8}$/;
const EGYPT_LANDLINE_NSN = /^[2-9]\d{7,8}$/;

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const EXTENDED_ARABIC_INDIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export type PhoneValidation =
  | { ok: true; value: string; reason: "ok" }
  | { ok: false; value: string; reason: "required" | "invalid" };

export type NormalizedPhone =
  | { ok: true; value: string; national: string; kind: "mobile" | "landline" }
  | { ok: false; value: string; reason: "required" | "invalid" };

function toLatinDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, digit => String(ARABIC_INDIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, digit =>
      String(EXTENDED_ARABIC_INDIC_DIGITS.indexOf(digit))
    );
}

/**
 * Removes only formatting characters a person might reasonably type or paste.
 * Letters and stray punctuation are deliberately left in place so validation
 * can reject them rather than silently turning "abc010..." into a number.
 */
function stripFormatting(value: string): string {
  return value.trim().replace(/[\s\u00a0\u202f\-().\u2010-\u2015/]/g, "");
}

/**
 * Normalizes an Egyptian phone number to E.164 (`+20...`).
 *
 * This never blindly prepends `+20`: it first understands the shape it was
 * given (local `01...`, international `+20...`, `0020...`, and `20...`), then
 * validates the national significant number before adding the country code.
 */
export function normalizeEgyptianPhone(
  value: string | null | undefined
): NormalizedPhone {
  const raw = toLatinDigits(String(value ?? "")).trim();
  if (!raw) return { ok: false, value: "", reason: "required" };

  const compact = stripFormatting(raw);
  if (!compact) return { ok: false, value: raw, reason: "invalid" };

  // Only a single leading plus is allowed. Any other non-digit character
  // (letters, `#`, `@`, ...) makes the number undialable.
  if (!/^\+?\d+$/.test(compact)) {
    return { ok: false, value: raw, reason: "invalid" };
  }

  let national = compact;
  if (national.startsWith("+")) {
    if (!national.startsWith("+20")) {
      return { ok: false, value: raw, reason: "invalid" };
    }
    national = national.slice(3);
  } else if (national.startsWith("00")) {
    if (!national.startsWith("0020")) {
      return { ok: false, value: raw, reason: "invalid" };
    }
    national = national.slice(4);
  } else if (national.startsWith("20")) {
    national = national.slice(2);
  }

  // `+20 (0)10 ...` is a common way to write an Egyptian number.
  if (national.startsWith("0")) national = national.slice(1);

  if (EGYPT_MOBILE_NSN.test(national)) {
    return {
      ok: true,
      value: `+20${national}`,
      national,
      kind: "mobile",
    };
  }
  if (EGYPT_LANDLINE_NSN.test(national)) {
    return {
      ok: true,
      value: `+20${national}`,
      national,
      kind: "landline",
    };
  }
  return { ok: false, value: raw, reason: "invalid" };
}

/**
 * Kept for every existing caller: returns the normalized E.164 value on
 * success, or the trimmed input on failure.
 */
export function normalizePhone(value: string | null | undefined): string {
  const result = normalizeEgyptianPhone(value);
  return result.ok ? result.value : String(value ?? "").trim();
}

export function validatePhone(
  value: string | null | undefined
): PhoneValidation {
  const result = normalizeEgyptianPhone(value);
  if (result.ok) return { ok: true, value: result.value, reason: "ok" };
  return { ok: false, value: result.value, reason: result.reason };
}

/** Optional phone fields keep an empty value, but never accept a bad one. */
export function validateOptionalPhone(
  value: string | null | undefined
): PhoneValidation {
  if (!String(value ?? "").trim()) return { ok: true, value: "", reason: "ok" };
  return validatePhone(value);
}

/** Only the national part, useful for showing a compact local number. */
export function localEgyptianPhone(value: string | null | undefined): string {
  const normalized = normalizeEgyptianPhone(value);
  return normalized.ok ? `0${normalized.national}` : (value ?? "");
}

export type ImageValidation = {
  ok: boolean;
  /** The normalized value, or null when the field is empty. */
  value: string | null;
  error: string | null;
};

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const LOCAL_ACHIEVEMENT_IMAGE =
  /^\/api\/uploads\/achievements\/achievement-[a-z0-9]{12}\.(png|jpg|jpeg|webp|gif|avif)$/;

/**
 * Image input may be an HTTPS URL or a local `/images/...` path.
 *
 * The local branch is checked as a plain string before any URL parsing so a
 * protocol-relative `//host` or an encoded traversal cannot slip through, and
 * the remote branch requires the `https:` protocol explicitly — `new URL`
 * happily parses `javascript:` and `data:` otherwise.
 */
export function validateImageSource(
  value: string | null | undefined
): ImageValidation {
  const raw = (value ?? "").trim();
  if (!raw) return { ok: true, value: null, error: null };
  if (raw.length > 2000) {
    return { ok: false, value: null, error: IMAGE_VALIDATION_MESSAGE };
  }
  if (CONTROL_CHARACTERS.test(raw) || raw.includes("\\")) {
    return { ok: false, value: null, error: IMAGE_VALIDATION_MESSAGE };
  }
  // Protocol-relative URLs inherit the page protocol and are never accepted.
  if (raw.startsWith("//")) {
    return { ok: false, value: null, error: IMAGE_VALIDATION_MESSAGE };
  }

  if (raw.startsWith("/api/uploads/achievements/")) {
    return LOCAL_ACHIEVEMENT_IMAGE.test(raw)
      ? { ok: true, value: raw, error: null }
      : { ok: false, value: null, error: IMAGE_VALIDATION_MESSAGE };
  }

  if (raw.startsWith("/images/")) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      return { ok: false, value: null, error: IMAGE_VALIDATION_MESSAGE };
    }
    if (
      !decoded.startsWith("/images/") ||
      decoded.includes("..") ||
      decoded.includes("\\") ||
      decoded.includes("://")
    ) {
      return { ok: false, value: null, error: IMAGE_VALIDATION_MESSAGE };
    }
    return { ok: true, value: raw, error: null };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, value: null, error: IMAGE_VALIDATION_MESSAGE };
  }
  const hasHost = Boolean(url.hostname && url.hostname.includes("."));
  if (
    url.protocol !== "https:" ||
    !hasHost ||
    url.username ||
    url.password ||
    !url.pathname ||
    url.pathname === "/"
  ) {
    return { ok: false, value: null, error: IMAGE_VALIDATION_MESSAGE };
  }
  return { ok: true, value: url.toString(), error: null };
}

export function isValidImageSource(value: string | null | undefined): boolean {
  return validateImageSource(value).ok;
}

/** The Egyptian mobile/local shape, exported for client-side `pattern` attributes. */
export const PHONE_INPUT_PATTERN = "(?:\\+?20|0020|0)?1[0125][0-9]{8}";
