import { and, eq, inArray, lt, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import {
  leadActivities,
  leadStaff,
  leads,
  leadSyncJobs,
  users,
  type Lead,
} from "../drizzle/schema";
import { getDb } from "./db";
import {
  GoogleSheetsNotConfiguredError,
  googleSheetsStatus,
  syncLeadToSheet,
  type FetchLike,
} from "./googleSheets";

/**
 * Durable Google Sheets outbox worker.
 *
 * Every registration/edit writes a row to `academy_lead_sync_jobs` in the same
 * transaction as the lead change. This module claims due jobs with a conditional
 * UPDATE (so two workers cannot process one job), performs the one-way sheet
 * write, and records success or an exponential-backoff failure.
 *
 * The production backend is a long-running Node process (MonsterASP), so the
 * interval below is a real scheduler. A restart loses nothing: due jobs are
 * still in MySQL. On a serverless host the same worker can be invoked by the
 * retry admin action; nothing depends on an in-memory queue.
 */

const DEFAULT_MAX_ATTEMPTS = 8;
const DEFAULT_RETRY_BASE_MS = 60_000;
const MAX_BACKOFF_MS = 6 * 60 * 60 * 1_000;
const STALE_LOCK_MS = 5 * 60 * 1_000;

const assignedEmployee = alias(users, "sync_assigned_employee");
const assignedStaff = alias(leadStaff, "sync_assigned_staff");

function maxAttempts(): number {
  const value = Number(
    process.env.LEAD_SYNC_MAX_ATTEMPTS ?? DEFAULT_MAX_ATTEMPTS
  );
  return Number.isFinite(value) && value >= 1
    ? Math.floor(value)
    : DEFAULT_MAX_ATTEMPTS;
}

function retryBaseMs(): number {
  const value = Number(
    process.env.LEAD_SYNC_RETRY_BASE_MS ?? DEFAULT_RETRY_BASE_MS
  );
  return Number.isFinite(value) && value >= 1_000
    ? Math.floor(value)
    : DEFAULT_RETRY_BASE_MS;
}

export function backoffDelayMs(attempt: number): number {
  const exponent = Math.max(0, attempt - 1);
  return Math.min(retryBaseMs() * 2 ** exponent, MAX_BACKOFF_MS);
}

function errorMessage(error: unknown): string {
  if (error instanceof GoogleSheetsNotConfiguredError) {
    return `Google Sheets غير مهيأ — ${error.missing.join(", ")}`;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

function truncate(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

async function readLeadWithEmployee(leadId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      lead: leads,
      employeeName: sql<
        string | null
      >`coalesce(${assignedStaff.displayName}, ${assignedEmployee.name}, ${assignedEmployee.email})`,
    })
    .from(leads)
    .leftJoin(
      assignedEmployee,
      eq(assignedEmployee.id, leads.assignedEmployeeId)
    )
    .leftJoin(assignedStaff, eq(assignedStaff.userId, leads.assignedEmployeeId))
    .where(eq(leads.id, leadId))
    .limit(1);
  return rows[0] ?? null;
}

async function recordSyncActivity(
  leadId: number,
  type: "sheet_sync_failed" | "sheet_sync_succeeded",
  note: string,
  now: Date
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(leadActivities).values({
    leadId,
    type,
    note: truncate(note, 2000),
    createdAt: now,
  });
}

async function runClaimedJob(
  jobId: number,
  fetchImpl: FetchLike = fetch,
  now: Date = new Date()
): Promise<{ ok: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { ok: false, error: "Database unavailable" };

  const jobRows = await db
    .select()
    .from(leadSyncJobs)
    .where(eq(leadSyncJobs.id, jobId))
    .limit(1);
  const job = jobRows[0];
  if (!job) return { ok: false, error: "Sync job not found" };

  const row = await readLeadWithEmployee(job.leadId);
  if (!row) {
    await db.delete(leadSyncJobs).where(eq(leadSyncJobs.id, jobId));
    return { ok: true };
  }

  const lead = row.lead;
  const wasFailed = lead.googleSheetSyncStatus === "failed";

  try {
    const result = await syncLeadToSheet(
      lead,
      row.employeeName ?? null,
      fetchImpl
    );

    // If the lead changed while the HTTP call was in flight, the row we just
    // wrote is already stale. Keep the saved row id, mark the lead pending, and
    // process the newer revision immediately instead of claiming "synced".
    const currentRows = await db
      .select({
        syncRevision: leads.syncRevision,
        googleSheetSyncStatus: leads.googleSheetSyncStatus,
      })
      .from(leads)
      .where(eq(leads.id, lead.id))
      .limit(1);
    const current = currentRows[0];
    const hasNewerRevision = Boolean(
      current && current.syncRevision !== lead.syncRevision
    );

    await db
      .update(leads)
      .set({
        googleSheetRowNumber: result.rowNumber,
        googleSheetLastSyncAt: now,
        googleSheetSyncedRevision: lead.syncRevision,
        googleSheetSyncAttempts: job.attempts,
        googleSheetSyncStatus: hasNewerRevision ? "pending" : "synced",
        googleSheetSyncError: null,
        updatedAt: now,
      })
      .where(eq(leads.id, lead.id));

    await db
      .update(leadSyncJobs)
      .set(
        hasNewerRevision
          ? {
              status: "pending",
              attempts: 0,
              nextAttemptAt: now,
              lockedAt: null,
              lastError: null,
              updatedAt: now,
            }
          : {
              status: "succeeded",
              lockedAt: null,
              lastError: null,
              updatedAt: now,
            }
      )
      .where(eq(leadSyncJobs.id, jobId));

    if (wasFailed && !hasNewerRevision) {
      await recordSyncActivity(
        lead.id,
        "sheet_sync_succeeded",
        "تمت إعادة النسخ إلى Google Sheets بنجاح بعد فشل سابق.",
        now
      );
    }
    return { ok: true };
  } catch (error) {
    const message = errorMessage(error);
    const attempts = job.attempts + 1;
    const terminal =
      error instanceof GoogleSheetsNotConfiguredError ||
      attempts >= maxAttempts();
    const nextAttemptAt = terminal
      ? new Date(now.getTime() + 24 * 60 * 60 * 1_000)
      : new Date(now.getTime() + backoffDelayMs(attempts));

    await db
      .update(leadSyncJobs)
      .set({
        status: "failed",
        attempts,
        nextAttemptAt,
        lockedAt: null,
        lastError: truncate(message, 2000),
        updatedAt: now,
      })
      .where(eq(leadSyncJobs.id, jobId));

    await db
      .update(leads)
      .set({
        googleSheetSyncStatus: "failed",
        googleSheetSyncAttempts: attempts,
        googleSheetSyncError: truncate(message, 1000),
        updatedAt: now,
      })
      .where(eq(leads.id, lead.id));

    if (terminal) {
      await recordSyncActivity(
        lead.id,
        "sheet_sync_failed",
        `لم يتم النسخ إلى Google Sheets. السبب: ${message}`,
        now
      );
    }
    return { ok: false, error: message };
  }
}

function claimableCondition(now: Date) {
  return or(
    inArray(leadSyncJobs.status, ["pending", "failed"]),
    // A worker that died mid-call must not strand its job forever.
    and(
      eq(leadSyncJobs.status, "processing"),
      lt(leadSyncJobs.lockedAt, new Date(now.getTime() - STALE_LOCK_MS))
    )
  );
}

async function claimJob(jobId: number, now: Date): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .update(leadSyncJobs)
    .set({ status: "processing", lockedAt: now, updatedAt: now })
    .where(
      and(
        eq(leadSyncJobs.id, jobId),
        claimableCondition(now),
        lte(leadSyncJobs.nextAttemptAt, now)
      )
    );
  return Number(result[0]?.affectedRows ?? 0) === 1;
}

let processing = false;

export async function processLeadSyncQueue(options?: {
  fetchImpl?: FetchLike;
  now?: Date;
  limit?: number;
  /** Restrict the worker to one lead (used by tests and targeted retries). */
  leadId?: number;
}): Promise<{ processed: number; failed: number; skipped: boolean }> {
  if (processing) return { processed: 0, failed: 0, skipped: true };
  processing = true;
  const db = await getDb();
  const now = options?.now ?? new Date();
  const fetchImpl = options?.fetchImpl ?? fetch;
  let processed = 0;
  let failed = 0;

  try {
    if (!db) return { processed, failed, skipped: false };
    const due = await db
      .select({ id: leadSyncJobs.id })
      .from(leadSyncJobs)
      .where(
        and(
          claimableCondition(now),
          lte(leadSyncJobs.nextAttemptAt, now),
          options?.leadId ? eq(leadSyncJobs.leadId, options.leadId) : undefined
        )
      )
      .orderBy(leadSyncJobs.nextAttemptAt)
      .limit(Math.max(1, Math.min(options?.limit ?? 5, 20)));

    for (const job of due) {
      if (!(await claimJob(job.id, now))) continue;
      const result = await runClaimedJob(job.id, fetchImpl, now);
      processed += 1;
      if (!result.ok) failed += 1;
    }
    return { processed, failed, skipped: false };
  } catch (error) {
    console.error("[LeadSync] queue failed:", errorMessage(error));
    return { processed, failed, skipped: false };
  } finally {
    processing = false;
  }
}

export async function retryLeadSync(
  leadId: number,
  fetchImpl: FetchLike = fetch,
  now: Date = new Date()
): Promise<{
  ok: boolean;
  status: Lead["googleSheetSyncStatus"];
  error: string | null;
  rowNumber: number | null;
}> {
  const db = await getDb();
  if (!db) {
    return {
      ok: false,
      status: "failed",
      error: "Database unavailable",
      rowNumber: null,
    };
  }

  const leadRows = await db
    .select()
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);
  if (!leadRows[0]) {
    throw new Error("هذا العميل غير موجود");
  }

  await db
    .insert(leadSyncJobs)
    .values({
      leadId,
      status: "pending",
      attempts: 0,
      // A manual retry must be claimable in this same call. MySQL can round a
      // timestamp with sub-second precision when storing it, so using exactly
      // `now` can leave the row a fraction of a second in the future and make
      // the immediate claim miss it.
      nextAttemptAt: new Date(now.getTime() - 1_000),
      lockedAt: null,
      lastError: null,
      updatedAt: now,
    })
    .onDuplicateKeyUpdate({
      set: {
        status: "pending",
        attempts: 0,
        nextAttemptAt: new Date(now.getTime() - 1_000),
        lockedAt: null,
        lastError: null,
        updatedAt: now,
      },
    });

  await db
    .update(leads)
    .set({
      googleSheetSyncStatus: "pending",
      googleSheetSyncError: null,
      googleSheetSyncAttempts: 0,
      updatedAt: now,
    })
    .where(eq(leads.id, leadId));

  const jobRows = await db
    .select({ id: leadSyncJobs.id })
    .from(leadSyncJobs)
    .where(eq(leadSyncJobs.leadId, leadId))
    .limit(1);
  const jobId = jobRows[0]?.id;
  if (jobId) {
    if (await claimJob(jobId, now)) {
      await runClaimedJob(jobId, fetchImpl, now);
    }
  }

  const finalRows = await db
    .select({
      googleSheetSyncStatus: leads.googleSheetSyncStatus,
      googleSheetSyncError: leads.googleSheetSyncError,
      googleSheetRowNumber: leads.googleSheetRowNumber,
    })
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);
  const final = finalRows[0];
  return {
    ok: final?.googleSheetSyncStatus === "synced",
    status: final?.googleSheetSyncStatus ?? "failed",
    error: final?.googleSheetSyncError ?? null,
    rowNumber: final?.googleSheetRowNumber ?? null,
  };
}

/**
 * Queues every lead whose reporting row is missing, failed or pending so the
 * worker can reconcile by stable lead id. It never creates a second row: the
 * worker searches column A first.
 */
export async function reconcileLeadSync(): Promise<{
  queued: number;
  configured: boolean;
}> {
  const db = await getDb();
  if (!db) return { queued: 0, configured: false };
  const now = new Date();
  const dueAt = new Date(now.getTime() - 1_000);
  const rows = await db
    .select({ id: leads.id })
    .from(leads)
    .where(
      or(
        inArray(leads.googleSheetSyncStatus, ["pending", "failed"]),
        sql`${leads.googleSheetRowNumber} is null`
      )
    )
    .limit(500);

  for (const row of rows) {
    await db
      .insert(leadSyncJobs)
      .values({
        leadId: row.id,
        status: "pending",
        attempts: 0,
        nextAttemptAt: dueAt,
        lockedAt: null,
        lastError: null,
        updatedAt: now,
      })
      .onDuplicateKeyUpdate({
        set: {
          status: "pending",
          attempts: 0,
          nextAttemptAt: dueAt,
          lockedAt: null,
          lastError: null,
          updatedAt: now,
        },
      });
    await db
      .update(leads)
      .set({
        googleSheetSyncStatus: "pending",
        googleSheetSyncError: null,
        googleSheetSyncAttempts: 0,
        updatedAt: now,
      })
      .where(eq(leads.id, row.id));
  }

  void processLeadSyncQueue();
  return {
    queued: rows.length,
    configured: googleSheetsStatus().configured,
  };
}

/** Fire-and-forget after a request responds; the durable job remains. */
export function kickLeadSync(): void {
  setTimeout(() => {
    void processLeadSyncQueue();
  }, 0).unref();
}

let schedulerStarted = false;

export function startLeadSyncScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  const interval = Number(process.env.LEAD_SYNC_INTERVAL_MS ?? "20000");
  const every =
    Number.isFinite(interval) && interval >= 5_000 ? interval : 20_000;
  const timer = setInterval(() => {
    void processLeadSyncQueue();
  }, every);
  timer.unref();
  const initial = setTimeout(() => {
    void processLeadSyncQueue();
  }, 2_000);
  initial.unref();
}
