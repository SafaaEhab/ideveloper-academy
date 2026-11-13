import { describe, expect, it } from "vitest";
import { buildReminderBody, buildReminderPlan } from "./reminderScheduler";
import { DEFAULT_SETTINGS } from "./settings";

const offsets = [-3, 0, 2, 7];

describe("payment reminder schedule", () => {
  it("creates all four reminders for a future obligation", () => {
    const plan = buildReminderPlan({
      dueDateKey: "2026-02-10",
      offsets,
      reminderHour: "09:00",
      timeZone: "Africa/Cairo",
      now: new Date("2026-02-01T12:00:00.000Z"),
    });
    expect(plan.map(item => item.kind)).toEqual([
      "before_due_3",
      "due",
      "overdue_2",
      "overdue_7",
    ]);
    expect(plan.every(item => item.status === "pending")).toBe(true);
    expect(plan[0].scheduledFor.toISOString()).toBe("2026-02-07T07:00:00.000Z");
    expect(plan[1].scheduledFor.toISOString()).toBe("2026-02-10T07:00:00.000Z");
  });

  it("marks old reminders skipped when a subscription is created late", () => {
    const plan = buildReminderPlan({
      dueDateKey: "2026-02-01",
      offsets,
      reminderHour: "09:00",
      timeZone: "Africa/Cairo",
      now: new Date("2026-02-11T12:00:00.000Z"),
    });
    const byKind = Object.fromEntries(plan.map(item => [item.kind, item]));
    expect(byKind.before_due_3.status).toBe("skipped");
    expect(byKind.due.status).toBe("skipped");
    expect(byKind.overdue_2.status).toBe("skipped");
    expect(byKind.overdue_7.status).toBe("pending");
  });

  it("keeps only the latest applicable overdue step", () => {
    const plan = buildReminderPlan({
      dueDateKey: "2026-02-01",
      offsets,
      reminderHour: "09:00",
      timeZone: "Africa/Cairo",
      now: new Date("2026-02-04T12:00:00.000Z"),
    });
    const byKind = Object.fromEntries(plan.map(item => [item.kind, item]));
    expect(byKind.overdue_2.status).toBe("pending");
    expect(byKind.overdue_7.status).toBe("pending");
  });

  it("uses payment-method-specific instructions with no invented details", () => {
    const cash = buildReminderBody({
      studentName: "ليلى",
      course: "Python",
      amountDue: "1,000.00 EGP",
      dueDateKey: "2026-02-10",
      method: "cash",
      settings: { ...DEFAULT_SETTINGS, cashHours: "", cashInstructions: "" },
      kind: "due",
    });
    expect(cash).toContain("مقر الأكاديمية");
    expect(cash).toContain("غير مُكوّنة");

    const bank = buildReminderBody({
      studentName: "ليلى",
      course: "Python",
      amountDue: "1,000.00 EGP",
      dueDateKey: "2026-02-10",
      method: "bank_transfer",
      settings: DEFAULT_SETTINGS,
      kind: "due",
    });
    expect(bank).toContain("التحويل البنكي غير مُكوّنة");

    const instapay = buildReminderBody({
      studentName: "ليلى",
      course: "Python",
      amountDue: "1,000.00 EGP",
      dueDateKey: "2026-02-10",
      method: "instapay",
      settings: { ...DEFAULT_SETTINGS, instapayNumber: "test@instapay" },
      kind: "due",
    });
    expect(instapay).toContain("test@instapay");
    expect(instapay).toContain("صورة التحويل");
  });
});
