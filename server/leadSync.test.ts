import "dotenv/config";
import { generateKeyPairSync } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import {
  leadActivities,
  leads,
  leadSyncJobs,
  type Lead,
} from "../drizzle/schema";
import {
  GoogleSheetsError,
  GOOGLE_SHEETS_HEADERS,
  leadToSheetRow,
  parseUpdatedRowNumber,
  syncLeadToSheet,
} from "./googleSheets";
import { processLeadSyncQueue, retryLeadSync } from "./leadSync";

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const oldEnv = {
  email: process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
  sheet: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  name: process.env.GOOGLE_SHEETS_SHEET_NAME,
  enabled: process.env.GOOGLE_SHEETS_ENABLED,
};

function configureSheets(sheetId = "phase1-test-sheet", sheetName = "Leads") {
  process.env.GOOGLE_SHEETS_ENABLED = "true";
  process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL =
    "phase1-service@example.iam.gserviceaccount.com";
  process.env.GOOGLE_SHEETS_PRIVATE_KEY = privateKey;
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID = sheetId;
  process.env.GOOGLE_SHEETS_SHEET_NAME = sheetName;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type FetchMock = ReturnType<typeof vi.fn>;

function fakeFetch(options: {
  headerValues?: string[][];
  rowValue?: string;
  appendRange?: string;
  appendStatus?: number;
  track?: { appends: number; puts: number };
}): FetchMock {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("oauth2.googleapis.com/token")) {
      return jsonResponse({ access_token: "phase1-token", expires_in: 3600 });
    }
    const method = (init?.method ?? "GET").toUpperCase();
    if (url.includes(":append")) {
      if (options.track) options.track.appends += 1;
      if (options.appendStatus && options.appendStatus >= 400) {
        return jsonResponse(
          { error: { message: "The caller does not have permission" } },
          options.appendStatus
        );
      }
      return jsonResponse({
        updates: { updatedRange: options.appendRange ?? "Leads!A7:Y7" },
      });
    }
    if (method === "PUT") {
      if (options.track) options.track.puts += 1;
      return jsonResponse({ updatedRows: 1 });
    }
    if (url.includes("A2%3AA100000") || url.includes("A2:A100000")) {
      return jsonResponse({ values: [] });
    }
    if (url.includes("A1")) {
      return jsonResponse({
        values: options.headerValues ?? [[...GOOGLE_SHEETS_HEADERS]],
      });
    }
    return jsonResponse({
      values: options.rowValue ? [[options.rowValue]] : [],
    });
  }) as FetchMock;
}

function sampleLead(overrides: Partial<Lead> = {}): Lead {
  const now = new Date("2026-11-08T12:00:00.000Z");
  return {
    id: 424242,
    legacyRegistrationId: null,
    fullName: "سارة أحمد",
    studentPhone: "+201012345678",
    age: 11,
    school: "مدرسة النيل",
    address: "القاهرة",
    parentEmail: "parent@example.com",
    parentPhone: "+201112345678",
    course: "Python",
    gender: "female",
    hasRegisteredSibling: false,
    siblingName: null,
    siblingPhone: null,
    customerNotes: "ملاحظات العميل",
    status: "needs_follow_up",
    assignedEmployeeId: null,
    registrationDate: now,
    lastContactDate: null,
    nextFollowUpDate: new Date("2026-11-10T10:00:00.000Z"),
    internalNotes: "داخلية",
    source: "website",
    whatsAppOptOut: false,
    googleSheetSyncStatus: "pending",
    googleSheetLastSyncAt: null,
    googleSheetRowNumber: null,
    googleSheetSyncAttempts: 0,
    googleSheetSyncError: null,
    googleSheetSyncedRevision: 0,
    syncRevision: 1,
    convertedStudentId: null,
    convertedAt: null,
    duplicateAttempts: 0,
    lastDuplicateAt: null,
    notInterestedReason: null,
    notInterestedNote: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const createdLeadIds: number[] = [];

describe("Google Sheets reporting sync", () => {
  beforeAll(() => configureSheets());

  afterAll(async () => {
    const db = await getDb();
    if (db && createdLeadIds.length > 0) {
      for (const id of createdLeadIds) {
        await db.delete(leadSyncJobs).where(eq(leadSyncJobs.leadId, id));
        await db.delete(leadActivities).where(eq(leadActivities.leadId, id));
        await db.delete(leads).where(eq(leads.id, id));
      }
    }
    process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL = oldEnv.email;
    process.env.GOOGLE_SHEETS_PRIVATE_KEY = oldEnv.key;
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = oldEnv.sheet;
    process.env.GOOGLE_SHEETS_SHEET_NAME = oldEnv.name;
    process.env.GOOGLE_SHEETS_ENABLED = oldEnv.enabled;
    delete process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    delete process.env.GOOGLE_SHEETS_SHEET_NAME;
    delete process.env.GOOGLE_SHEETS_ENABLED;
  });

  it("maps every relevant lead field into one sheet row", () => {
    const row = leadToSheetRow(
      sampleLead(),
      "منى",
      new Date("2026-11-08T14:00:00.000Z")
    );
    expect(row).toHaveLength(GOOGLE_SHEETS_HEADERS.length);
    expect(row[0]).toBe("424242");
    expect(row[1]).toBe("سارة أحمد");
    expect(row[2]).toBe("+201012345678");
    expect(row[12]).toBe("يحتاج اتصال / متابعة");
    expect(row[13]).toBe("منى");
    expect(row[17]).toBe("داخلية");
  });

  it("parses the updated row from the Sheets API response", () => {
    expect(parseUpdatedRowNumber("Leads!A7:Y7")).toBe(7);
    expect(parseUpdatedRowNumber("'Leads'!A12:Y12")).toBe(12);
    expect(parseUpdatedRowNumber(undefined)).toBeNull();
  });

  it("appends a new lead row and saves the returned row number", async () => {
    const result = await syncLeadToSheet(
      sampleLead(),
      "منى",
      fakeFetch({ appendRange: "Leads!A3:Y3" })
    );
    expect(result).toEqual({ rowNumber: 3, updated: false });
  });

  it("updates the same row instead of appending a second one", async () => {
    const track = { appends: 0, puts: 0 };
    const result = await syncLeadToSheet(
      sampleLead({ googleSheetRowNumber: 3, status: "subscribed" }),
      "منى",
      fakeFetch({ rowValue: "424242", track })
    );
    expect(result).toEqual({ rowNumber: 3, updated: true });
    expect(track.appends).toBe(0);
    expect(track.puts).toBe(1);
  });

  it("reports a real Sheets failure with its status", async () => {
    await expect(
      syncLeadToSheet(
        sampleLead(),
        null,
        fakeFetch({ appendStatus: 403, appendRange: "Leads!A4:Y4" })
      )
    ).rejects.toBeInstanceOf(GoogleSheetsError);
  });

  it("stores a failed job with retry metadata and recovers on manual retry", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    configureSheets("phase1-worker-sheet");

    const inserted = await db.insert(leads).values({
      fullName: "عميل اختبار المزامنة",
      studentPhone: "+201099998888",
      age: 10,
      school: "مدرسة الاختبار",
      address: "القاهرة",
      parentEmail: "sync-test@example.com",
      parentPhone: "+201177776666",
      course: "Scratch",
      gender: "male",
      status: "new",
      source: "website",
      registrationDate: new Date(),
      syncRevision: 1,
      updatedAt: new Date(),
    });
    const leadId = Number(inserted[0].insertId);
    createdLeadIds.push(leadId);
    await db.insert(leadSyncJobs).values({
      leadId,
      status: "pending",
      attempts: 0,
      nextAttemptAt: new Date(Date.now() - 1_000),
      updatedAt: new Date(),
    });

    const now = new Date();
    const queueResult = await processLeadSyncQueue({
      fetchImpl: fakeFetch({ appendStatus: 403 }),
      now,
      limit: 1,
      leadId,
    });
    expect(queueResult.processed).toBe(1);
    expect(queueResult.failed).toBe(1);

    const failedLead = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId));
    expect(failedLead[0].googleSheetSyncStatus).toBe("failed");
    expect(failedLead[0].googleSheetSyncError).toContain("permission");
    const failedJob = await db
      .select()
      .from(leadSyncJobs)
      .where(eq(leadSyncJobs.leadId, leadId));
    expect(failedJob[0].status).toBe("failed");
    expect(failedJob[0].attempts).toBe(1);
    expect(failedJob[0].nextAttemptAt.getTime()).toBeGreaterThan(now.getTime());

    const retry = await retryLeadSync(
      leadId,
      fakeFetch({ appendRange: "Leads!A9:Y9" }),
      new Date()
    );
    expect(retry.ok, JSON.stringify(retry)).toBe(true);
    expect(retry.status).toBe("synced");
    expect(retry.rowNumber).toBe(9);

    const synced = await db.select().from(leads).where(eq(leads.id, leadId));
    expect(synced[0].googleSheetSyncStatus).toBe("synced");
    expect(synced[0].googleSheetRowNumber).toBe(9);
    expect(synced[0].googleSheetSyncError).toBeNull();
  }, 30_000);
});
