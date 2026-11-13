import { describe, expect, it } from "vitest";
import {
  campaignProgress,
  extractVariables,
  isCampaignCancellable,
  renderMessage,
  templateParameters,
  validateKnownVariables,
} from "./messaging";
import { evaluateRecipient, type RecipientCandidate } from "../server/messaging";

function candidate(overrides: Partial<RecipientCandidate> = {}): RecipientCandidate {
  return {
    recipientType: "lead",
    recipientId: 1,
    name: "أحمد",
    phone: "+201012345678",
    rawPhone: "01012345678",
    courseName: "Python",
    status: "new",
    statusLabel: "جديد",
    groupId: null,
    groupName: null,
    classSchedule: null,
    assignedEmployeeId: null,
    assignedEmployeeName: null,
    whatsAppConsent: true,
    whatsAppOptOut: false,
    paymentStatus: null,
    paymentStatusLabel: null,
    amountDueMinor: 0,
    variables: {
      student_name: "أحمد",
      course_name: "Python",
      class_schedule: "",
      amount_due: "",
    },
    ...overrides,
  };
}

const rules = {
  messageType: "marketing" as const,
  requireMarketingConsent: true,
  seenPhones: new Set<string>(),
};

describe("message variables", () => {
  it("extracts known and unknown variables", () => {
    expect(
      extractVariables("مرحباً {{student_name}} — {{ amount_due }} {{unknown}}"),
    ).toEqual(["student_name", "amount_due", "unknown"]);
    expect(validateKnownVariables("{{student_name}} {{nope}}")).toEqual({
      ok: false,
      unknown: ["nope"],
      known: ["student_name"],
    });
  });

  it("renders values and makes missing values visible", () => {
    const result = renderMessage(
      "مرحباً {{student_name}}، كورس {{course_name}}، موعد {{class_schedule}}، متبقي {{amount_due}}",
      {
        student_name: "ليلى",
        course_name: "Web",
        class_schedule: "",
        amount_due: "1,250.00 EGP",
      },
    );
    expect(result.text).toContain("ليلى");
    expect(result.text).toContain("Web");
    expect(result.text).toContain("—");
    expect(result.missing).toEqual(["class_schedule"]);
    expect(result.used).toEqual([
      "student_name",
      "course_name",
      "class_schedule",
      "amount_due",
    ]);
  });

  it("never silently drops an unknown placeholder", () => {
    const result = renderMessage("{{unknown_variable}}", {});
    expect(result.text).toBe("—");
    expect(result.missing).toContain("unknown_variable");
  });

  it("maps declared template variables to ordered parameters", () => {
    expect(
      templateParameters(["student_name", "amount_due"], {
        student_name: "Omar",
        amount_due: "",
      }),
    ).toEqual({ parameters: ["Omar", "—"], missing: ["amount_due"] });
  });
});

describe("recipient eligibility", () => {
  it("accepts a consenting lead with a valid phone", () => {
    const result = evaluateRecipient(candidate(), {
      ...rules,
      seenPhones: new Set(),
    });
    expect(result.eligible).toBe(true);
    expect(result.exclusionReason).toBeNull();
  });

  it("always excludes a not-interested lead from bulk marketing", () => {
    const result = evaluateRecipient(
      candidate({ status: "not_interested", statusLabel: "غير راغب" }),
      { ...rules, seenPhones: new Set() },
    );
    expect(result.eligible).toBe(false);
    expect(result.exclusionReason).toBe("not_interested");
  });

  it("always excludes an opted-out recipient", () => {
    const result = evaluateRecipient(candidate({ whatsAppOptOut: true }), {
      ...rules,
      seenPhones: new Set(),
    });
    expect(result.exclusionReason).toBe("opted_out");
  });

  it("requires consent for marketing when the policy is on, but not for transactional", () => {
    const noConsent = candidate({ whatsAppConsent: false });
    expect(
      evaluateRecipient(noConsent, { ...rules, seenPhones: new Set() })
        .exclusionReason,
    ).toBe("no_consent");
    expect(
      evaluateRecipient(noConsent, {
        ...rules,
        messageType: "transactional",
        seenPhones: new Set(),
      }).eligible,
    ).toBe(true);
  });

  it("marks missing and invalid phones", () => {
    expect(
      evaluateRecipient(candidate({ rawPhone: "", phone: null }), {
        ...rules,
        seenPhones: new Set(),
      }).exclusionReason,
    ).toBe("missing_phone");
    expect(
      evaluateRecipient(candidate({ rawPhone: "abc", phone: null }), {
        ...rules,
        seenPhones: new Set(),
      }).exclusionReason,
    ).toBe("invalid_phone");
  });

  it("deduplicates the same normalized phone, even when the first row was excluded", () => {
    const seen = new Set<string>();
    const first = evaluateRecipient(
      candidate({ recipientId: 1, whatsAppOptOut: true }),
      { ...rules, seenPhones: seen },
    );
    const second = evaluateRecipient(
      candidate({ recipientId: 2, name: "سارة" }),
      { ...rules, seenPhones: seen },
    );
    expect(first.exclusionReason).toBe("opted_out");
    expect(second.exclusionReason).toBe("duplicate");
  });
});

describe("campaign helpers", () => {
  it("computes bounded progress", () => {
    expect(campaignProgress({ sentCount: 5, failedCount: 5, totalRecipients: 20 })).toBe(50);
    expect(campaignProgress({ sentCount: 0, failedCount: 0, totalRecipients: 0 })).toBe(0);
    expect(campaignProgress({ sentCount: 30, failedCount: 0, totalRecipients: 20 })).toBe(100);
  });

  it("only cancels scheduled or queued campaigns", () => {
    expect(isCampaignCancellable("scheduled")).toBe(true);
    expect(isCampaignCancellable("queued")).toBe(true);
    expect(isCampaignCancellable("sending")).toBe(false);
    expect(isCampaignCancellable("completed")).toBe(false);
  });
});
