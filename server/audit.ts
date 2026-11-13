import { auditLogs } from "../drizzle/schema";
import type { DbTransaction } from "./db";
import { getDb } from "./db";

export type AuditExecutor =
  | DbTransaction
  | NonNullable<Awaited<ReturnType<typeof getDb>>>;

export type AuditInput = {
  actorUserId: number | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
};

/**
 * Append-only audit trail for sensitive actions. It never stores secrets,
 * passwords, tokens or full provider payloads.
 */
export async function writeAudit(
  executor: AuditExecutor,
  input: AuditInput,
): Promise<void> {
  await executor.insert(auditLogs).values({
    actorUserId: input.actorUserId ?? null,
    action: input.action.slice(0, 120),
    entityType: input.entityType.slice(0, 64),
    entityId: input.entityId ?? null,
    metadata: input.metadata ? JSON.stringify(input.metadata).slice(0, 10_000) : null,
    ipAddress: input.ipAddress ? input.ipAddress.slice(0, 64) : null,
    createdAt: new Date(),
  });
}

/** Best-effort audit for non-financial actions; never hides the real error. */
export async function tryWriteAudit(input: AuditInput): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await writeAudit(db, input);
  } catch (error) {
    console.error(
      "[Audit] failed:",
      error instanceof Error ? error.message : String(error),
    );
  }
}
