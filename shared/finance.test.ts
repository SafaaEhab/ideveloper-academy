import { describe, expect, it } from "vitest";
import {
  computeSubscriptionAmounts,
  computeSubscriptionBalance,
  nextRenewalDateKey,
  receiptNumberFor,
  subscriptionEndDateKey,
  validateDiscountReason,
  validateSubscriptionDates,
  type LedgerEntry,
} from "./finance";

const payment = (amountMinor: number): LedgerEntry => ({
  type: "payment",
  status: "posted",
  amountMinor,
});
const reversal = (amountMinor: number): LedgerEntry => ({
  type: "reversal",
  status: "posted",
  amountMinor,
});

describe("subscription discounts", () => {
  it("applies sibling and manual discounts in order, capped at the base", () => {
    expect(
      computeSubscriptionAmounts({
        baseAmountMinor: 100000,
        siblingDiscountPercent: 10,
        manualDiscountMinor: 5000,
      }),
    ).toEqual({
      baseAmountMinor: 100000,
      siblingDiscountMinor: 10000,
      manualDiscountMinor: 5000,
      finalAmountMinor: 85000,
    });
  });

  it("never lets discounts exceed the base amount", () => {
    const result = computeSubscriptionAmounts({
      baseAmountMinor: 10000,
      siblingDiscountPercent: 100,
      manualDiscountMinor: 5000,
    });
    expect(result.finalAmountMinor).toBe(0);
    expect(result.siblingDiscountMinor).toBe(10000);
    expect(result.manualDiscountMinor).toBe(0);
  });

  it("requires a reason for a manual discount", () => {
    expect(validateDiscountReason(5000, "")).toContain("سبب");
    expect(validateDiscountReason(5000, "خصم أخ")).toBeNull();
    expect(validateDiscountReason(0, "")).toBeNull();
  });
});

describe("subscription dates", () => {
  it("accepts a valid period and rejects reversed dates", () => {
    expect(
      validateSubscriptionDates({
        startDateKey: "2026-01-01",
        dueDateKey: "2026-01-10",
        endDateKey: "2026-01-31",
        recurringDueDay: 10,
      }),
    ).toBeNull();
    expect(
      validateSubscriptionDates({
        startDateKey: "2026-01-10",
        dueDateKey: "2026-01-01",
      }),
    ).toContain("الاستحقاق");
    expect(
      validateSubscriptionDates({
        startDateKey: "2026-01-01",
        dueDateKey: "2026-01-10",
        recurringDueDay: 31,
      }),
    ).toContain("28");
  });

  it("derives end dates and renewals for each subscription type", () => {
    expect(subscriptionEndDateKey("2026-01-01", "monthly")).toBe("2026-01-31");
    expect(subscriptionEndDateKey("2026-01-01", "two_months")).toBe("2026-02-28");
    expect(subscriptionEndDateKey("2026-01-01", "one_time")).toBeNull();
    expect(nextRenewalDateKey("2026-01-31", "monthly")).toBe("2026-02-28");
    expect(nextRenewalDateKey("2026-01-31", "two_months")).toBe("2026-03-31");
    expect(nextRenewalDateKey("2026-01-31", "one_time")).toBeNull();
  });
});

describe("payment status from the ledger", () => {
  const base = {
    finalAmountMinor: 100000,
    dueDateKey: "2026-01-10",
    todayKey: "2026-01-01",
  };

  it("is Due when nothing is paid", () => {
    const balance = computeSubscriptionBalance({ ...base, entries: [] });
    expect(balance.status).toBe("due");
    expect(balance.remainingMinor).toBe(100000);
    expect(balance.partiallyPaid).toBe(false);
  });

  it("is Partially paid for a payment below the total", () => {
    const balance = computeSubscriptionBalance({
      ...base,
      entries: [payment(40000)],
    });
    expect(balance.status).toBe("partially_paid");
    expect(balance.remainingMinor).toBe(60000);
    expect(balance.netPaidMinor).toBe(40000);
  });

  it("is Overdue when a balance remains after the due date", () => {
    const balance = computeSubscriptionBalance({
      ...base,
      entries: [payment(40000)],
      todayKey: "2026-01-15",
    });
    expect(balance.status).toBe("overdue");
    expect(balance.isOverdue).toBe(true);
    expect(balance.partiallyPaid).toBe(true);
    expect(balance.daysOverdue).toBe(5);
  });

  it("is Paid after the full amount, and reports overpayment separately", () => {
    expect(
      computeSubscriptionBalance({ ...base, entries: [payment(100000)] }).status,
    ).toBe("paid");
    const overpaid = computeSubscriptionBalance({
      ...base,
      entries: [payment(120000)],
    });
    expect(overpaid.status).toBe("paid");
    expect(overpaid.remainingMinor).toBe(0);
    expect(overpaid.overpaidMinor).toBe(20000);
  });

  it("excludes a reversed payment and subtracts its reversal", () => {
    const balance = computeSubscriptionBalance({
      ...base,
      entries: [
        { type: "payment", status: "reversed", amountMinor: 50000 },
        reversal(50000),
        payment(30000),
      ],
    });
    expect(balance.netPaidMinor).toBe(30000);
    expect(balance.remainingMinor).toBe(70000);
    expect(balance.status).toBe("partially_paid");
  });

  it("ignores a reversed reversal row", () => {
    const balance = computeSubscriptionBalance({
      ...base,
      entries: [payment(100000), { ...reversal(50000), status: "reversed" }],
    });
    expect(balance.netPaidMinor).toBe(100000);
    expect(balance.status).toBe("paid");
  });

  it("clamps a negative ledger defensively", () => {
    const balance = computeSubscriptionBalance({
      ...base,
      entries: [reversal(50000)],
    });
    expect(balance.netPaidMinor).toBe(0);
    expect(balance.remainingMinor).toBe(100000);
  });
});

describe("receipt numbers", () => {
  it("is sequential and year-scoped", () => {
    expect(receiptNumberFor(1, 2026)).toBe("REC-2026-000001");
    expect(receiptNumberFor(123456, 2026)).toBe("REC-2026-123456");
    expect(receiptNumberFor(0, 2026)).toBe("REC-2026-000000");
  });
});
