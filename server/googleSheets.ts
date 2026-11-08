import { createSign } from "node:crypto";
import type { Lead } from "../drizzle/schema";
import {
  genderLabel,
  leadStatusLabel,
  notInterestedReasonLabel,
} from "../shared/leads";

/**
 * Google Sheets reporting integration.
 *
 * The database is the source of truth. This module only writes a read-only
 * reporting copy into one spreadsheet using a service account. Nothing is ever
 * read back into the database.
 *
 * A service account JWT is signed locally and exchanged for an OAuth access
 * token, so the project needs no extra Google SDK dependency. The private key
 * only ever exists in server-side environment variables.
 */

export type FetchLike = typeof fetch;

type ServiceAccount = {
  clientEmail: string;
  privateKey: string;
};

export type GoogleSheetsStatus = {
  configured: boolean;
  enabled: boolean;
  missing: string[];
  spreadsheetId: string | null;
  sheetName: string;
  serviceAccountEmail: string | null;
};

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const sheetsBase = "https://sheets.googleapis.com/v4/spreadsheets";

export const GOOGLE_SHEETS_HEADERS = [
  "Lead ID",
  "الاسم الكامل",
  "رقم الطالب",
  "السن",
  "المدرسة",
  "العنوان",
  "بريد ولي الأمر",
  "رقم ولي الأمر",
  "الكورس",
  "الجنس",
  "لديه أخ مسجل",
  "ملاحظات العميل",
  "الحالة",
  "الموظف المسؤول",
  "تاريخ التسجيل",
  "آخر تواصل",
  "المتابعة القادمة",
  "الملاحظات الداخلية",
  "المصدر",
  "إلغاء واتساب",
  "سبب عدم الإكمال",
  "تاريخ التحويل",
  "رقم الطالب بعد التحويل",
  "محاولات مكررة",
  "آخر مزامنة",
] as const;

const HEADER_LAST_COLUMN = "Y";

function normalizePrivateKey(value: string): string {
  return value.replace(/\\n/g, "\n").trim();
}

function serviceAccountFromEnv(): ServiceAccount | null {
  const json =
    process.env.GOOGLE_SHEETS_CREDENTIALS_JSON ??
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ??
    process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON ??
    "";
  if (json.trim()) {
    try {
      const parsed = JSON.parse(json) as {
        client_email?: string;
        private_key?: string;
      };
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email,
          privateKey: normalizePrivateKey(parsed.private_key),
        };
      }
    } catch {
      return null;
    }
  }

  const email =
    process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL ??
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ??
    "";
  const key =
    process.env.GOOGLE_SHEETS_PRIVATE_KEY ??
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ??
    "";
  if (email.trim() && key.trim()) {
    return {
      clientEmail: email.trim(),
      privateKey: normalizePrivateKey(key),
    };
  }
  return null;
}

function spreadsheetIdFromEnv(): string {
  return (
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID ??
    process.env.GOOGLE_SHEET_ID ??
    process.env.GOOGLE_SPREADSHEET_ID ??
    ""
  ).trim();
}

export function sheetNameFromEnv(): string {
  return (
    (
      process.env.GOOGLE_SHEETS_SHEET_NAME ??
      process.env.GOOGLE_SHEET_TAB_NAME ??
      "Leads"
    ).trim() || "Leads"
  );
}

/**
 * Reports exactly what is missing (names only, never values) so the admin can
 * finish the setup without a log dig.
 */
export function googleSheetsStatus(): GoogleSheetsStatus {
  const enabled = process.env.GOOGLE_SHEETS_ENABLED !== "false";
  const account = serviceAccountFromEnv();
  const spreadsheetId = spreadsheetIdFromEnv();
  const missing: string[] = [];

  if (!account?.clientEmail) {
    missing.push("GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL");
  }
  if (!account?.privateKey) {
    missing.push("GOOGLE_SHEETS_PRIVATE_KEY");
  }
  if (!spreadsheetId) {
    missing.push("GOOGLE_SHEETS_SPREADSHEET_ID");
  }
  if (!enabled) {
    return {
      configured: false,
      enabled,
      missing,
      spreadsheetId: spreadsheetId || null,
      sheetName: sheetNameFromEnv(),
      serviceAccountEmail: account?.clientEmail ?? null,
    };
  }

  return {
    configured: missing.length === 0,
    enabled,
    missing,
    spreadsheetId: spreadsheetId || null,
    sheetName: sheetNameFromEnv(),
    serviceAccountEmail: account?.clientEmail ?? null,
  };
}

export class GoogleSheetsNotConfiguredError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Google Sheets غير مهيأ. المتغيرات الناقصة: ${missing.join(", ")}`);
    this.name = "GoogleSheetsNotConfiguredError";
  }
}

export class GoogleSheetsError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "GoogleSheetsError";
  }
}

function requireConfig(): {
  account: ServiceAccount;
  spreadsheetId: string;
  sheetName: string;
} {
  const status = googleSheetsStatus();
  if (!status.configured) {
    throw new GoogleSheetsNotConfiguredError(status.missing);
  }
  const account = serviceAccountFromEnv();
  if (!account) throw new GoogleSheetsNotConfiguredError(status.missing);
  return {
    account,
    spreadsheetId: spreadsheetIdFromEnv(),
    sheetName: sheetNameFromEnv(),
  };
}

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

type TokenCache = {
  token: string;
  expiresAt: number;
  clientEmail: string;
};

let tokenCache: TokenCache | null = null;

async function getGoogleAccessToken(
  account: ServiceAccount,
  fetchImpl: FetchLike = fetch
): Promise<string> {
  if (
    tokenCache &&
    tokenCache.clientEmail === account.clientEmail &&
    tokenCache.expiresAt > Date.now() + 60_000
  ) {
    return tokenCache.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: account.clientEmail,
      scope: SHEETS_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3_600,
    })
  );
  const unsigned = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(account.privateKey);
  const assertion = `${unsigned}.${base64url(signature)}`;

  const response = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !body.access_token) {
    throw new GoogleSheetsError(
      `تعذر الحصول على صلاحية Google Sheets: ${body.error_description || body.error || response.status}`,
      response.status
    );
  }
  tokenCache = {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3_600) * 1_000,
    clientEmail: account.clientEmail,
  };
  return body.access_token;
}

function quoteSheetName(name: string): string {
  return `'${name.replace(/'/g, "''")}'`;
}

type SheetsResponse = {
  ok: boolean;
  status: number;
  text: string;
  json: unknown;
};

async function sheetsRequest(
  config: { account: ServiceAccount; spreadsheetId: string },
  path: string,
  init: RequestInit,
  fetchImpl: FetchLike = fetch
): Promise<SheetsResponse> {
  const send = async (forceToken = false): Promise<SheetsResponse> => {
    if (forceToken) tokenCache = null;
    const token = await getGoogleAccessToken(config.account, fetchImpl);
    const response = await fetchImpl(
      `${sheetsBase}/${encodeURIComponent(config.spreadsheetId)}${path}`,
      {
        ...init,
        headers: {
          ...(init.headers ?? {}),
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    const text = await response.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { ok: response.ok, status: response.status, text, json };
  };

  let result = await send();
  if (result.status === 401) result = await send(true);
  if (!result.ok) {
    const parsed = result.json as {
      error?: { message?: string };
    } | null;
    throw new GoogleSheetsError(
      parsed?.error?.message || `Google Sheets رفض الطلب (${result.status})`,
      result.status
    );
  }
  return result;
}

const headersReady = new Set<string>();

async function ensureHeaders(
  config: { account: ServiceAccount; spreadsheetId: string; sheetName: string },
  fetchImpl: FetchLike
): Promise<void> {
  const key = `${config.spreadsheetId}:${config.sheetName}`;
  if (headersReady.has(key)) return;

  const quoted = quoteSheetName(config.sheetName);
  const get = await sheetsRequest(
    config,
    `/values/${encodeURIComponent(`${quoted}!A1:${HEADER_LAST_COLUMN}1`)}`,
    { method: "GET" },
    fetchImpl
  );
  const values = (get.json as { values?: string[][] } | null)?.values;
  const firstCell = values?.[0]?.[0]?.trim() ?? "";
  if (!firstCell) {
    await sheetsRequest(
      config,
      `/values/${encodeURIComponent(`${quoted}!A1:${HEADER_LAST_COLUMN}1`)}?valueInputOption=RAW`,
      {
        method: "PUT",
        body: JSON.stringify({ values: [[...GOOGLE_SHEETS_HEADERS]] }),
      },
      fetchImpl
    );
  }
  headersReady.add(key);
}

function sheetDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * The exact row sent to the sheet. Kept pure and exported so tests can assert
 * that a status/employee change changes the values without touching Google.
 */
export function leadToSheetRow(
  lead: Lead,
  assignedEmployeeName: string | null,
  now: Date = new Date()
): string[] {
  return [
    String(lead.id),
    lead.fullName,
    lead.studentPhone,
    String(lead.age),
    lead.school,
    lead.address,
    lead.parentEmail,
    lead.parentPhone,
    lead.course,
    genderLabel(lead.gender),
    lead.hasRegisteredSibling ? "نعم" : "لا",
    lead.customerNotes ?? "",
    leadStatusLabel(lead.status),
    assignedEmployeeName ?? "",
    sheetDate(lead.registrationDate),
    sheetDate(lead.lastContactDate),
    sheetDate(lead.nextFollowUpDate),
    lead.internalNotes ?? "",
    lead.source,
    lead.whatsAppOptOut ? "نعم" : "لا",
    notInterestedReasonLabel(lead.notInterestedReason),
    sheetDate(lead.convertedAt),
    lead.convertedStudentId ? String(lead.convertedStudentId) : "",
    String(lead.duplicateAttempts),
    sheetDate(now),
  ];
}

export function parseUpdatedRowNumber(
  updatedRange: string | undefined
): number | null {
  if (!updatedRange) return null;
  const match = updatedRange.match(/![A-Z]+(\d+)/i);
  if (!match) return null;
  const row = Number(match[1]);
  return Number.isInteger(row) && row > 0 ? row : null;
}

async function findRowByLeadId(
  config: { account: ServiceAccount; spreadsheetId: string; sheetName: string },
  leadId: number,
  fetchImpl: FetchLike
): Promise<number | null> {
  const quoted = quoteSheetName(config.sheetName);
  const response = await sheetsRequest(
    config,
    `/values/${encodeURIComponent(`${quoted}!A2:A100000`)}`,
    { method: "GET" },
    fetchImpl
  );
  const rows = (response.json as { values?: string[][] } | null)?.values ?? [];
  const index = rows.findIndex(
    row => String(row[0] ?? "").trim() === String(leadId)
  );
  return index >= 0 ? index + 2 : null;
}

async function resolveRowNumber(
  config: { account: ServiceAccount; spreadsheetId: string; sheetName: string },
  lead: Lead,
  fetchImpl: FetchLike
): Promise<number | null> {
  if (lead.googleSheetRowNumber) {
    const quoted = quoteSheetName(config.sheetName);
    const response = await sheetsRequest(
      config,
      `/values/${encodeURIComponent(`${quoted}!A${lead.googleSheetRowNumber}:A${lead.googleSheetRowNumber}`)}`,
      { method: "GET" },
      fetchImpl
    );
    const existing = (response.json as { values?: string[][] } | null)
      ?.values?.[0]?.[0];
    if (String(existing ?? "").trim() === String(lead.id)) {
      return lead.googleSheetRowNumber;
    }
  }
  // Reconciliation: if the stored row moved, was deleted, or is unknown, look
  // the lead up by its stable ID before appending. This is what prevents
  // duplicate rows across retries.
  return findRowByLeadId(config, lead.id, fetchImpl);
}

export type SheetSyncResult = {
  rowNumber: number;
  updated: boolean;
};

/**
 * Writes the current lead row, updating the existing row when one can be found
 * and appending otherwise. Exported with an injectable fetch for tests.
 */
export async function syncLeadToSheet(
  lead: Lead,
  assignedEmployeeName: string | null,
  fetchImpl: FetchLike = fetch
): Promise<SheetSyncResult> {
  const config = requireConfig();
  await ensureHeaders(config, fetchImpl);
  const quoted = quoteSheetName(config.sheetName);
  const existingRow = await resolveRowNumber(config, lead, fetchImpl);
  const values = [leadToSheetRow(lead, assignedEmployeeName)];

  if (existingRow) {
    await sheetsRequest(
      config,
      `/values/${encodeURIComponent(`${quoted}!A${existingRow}:${HEADER_LAST_COLUMN}${existingRow}`)}?valueInputOption=RAW`,
      {
        method: "PUT",
        body: JSON.stringify({ values }),
      },
      fetchImpl
    );
    return { rowNumber: existingRow, updated: true };
  }

  const append = await sheetsRequest(
    config,
    `/values/${encodeURIComponent(`${quoted}!A1:${HEADER_LAST_COLUMN}1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      body: JSON.stringify({ values }),
    },
    fetchImpl
  );
  const updatedRange = (
    append.json as { updates?: { updatedRange?: string } } | null
  )?.updates?.updatedRange;
  let rowNumber = parseUpdatedRowNumber(updatedRange);
  if (!rowNumber) rowNumber = await findRowByLeadId(config, lead.id, fetchImpl);
  if (!rowNumber) {
    throw new GoogleSheetsError(
      "تم إرسال الصف لكن تعذر تحديد رقمه في Google Sheets",
      500
    );
  }
  return { rowNumber, updated: false };
}
