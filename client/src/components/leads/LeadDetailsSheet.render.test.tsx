// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const state = vi.hoisted(() => ({
  lead: {
    id: 7,
    fullName: "Test Lead",
    studentPhone: "+201012345678",
    age: 11,
    school: "Test School",
    address: "Test Address",
    parentEmail: "parent@example.com",
    parentPhone: "+201123456789",
    course: "Python",
    gender: "male",
    hasRegisteredSibling: false,
    siblingName: null,
    siblingPhone: null,
    customerNotes: null,
    status: "not_interested",
    notInterestedReason: "price",
    notInterestedNote: "The family asked us to call after Ramadan.",
    internalNotes: null,
    source: "website",
    duplicateAttempts: 0,
    whatsAppOptOut: false,
    assignedEmployeeId: null,
    assignedEmployeeName: null,
    registrationDate: new Date("2026-11-09T10:00:00Z"),
    lastContactDate: new Date("2026-11-09T11:00:00Z"),
    nextFollowUpDate: null,
    convertedStudentId: null,
    convertedStudent: null,
    googleSheetSyncStatus: "synced",
    googleSheetSyncError: null,
    isOverdue: false,
    activities: [],
  },
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, role: "admin", leadAccess: true, canConvertLeads: true },
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      leads: {
        list: { invalidate: vi.fn() },
        detail: { invalidate: vi.fn() },
      },
    }),
    leads: {
      detail: { useQuery: () => ({ data: state.lead, isError: false }) },
      employees: { useQuery: () => ({ data: [] }) },
      update: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      logContact: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      updateStatus: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      retrySync: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      convert: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import LeadDetailsSheet from "@/components/leads/LeadDetailsSheet";

describe("LeadDetailsSheet not-interested details", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.innerHTML = "";
  });

  it("shows both the reason label and the saved free-text details", () => {
    act(() =>
      root.render(
        <LeadDetailsSheet leadId={7} open onOpenChange={() => {}} />,
      ),
    );

    const text = document.body.textContent ?? "";
    expect(text).toContain("سبب عدم الإكمال");
    expect(text).toContain("السعر");
    expect(text).toContain("تفاصيل السبب");
    expect(text).toContain("The family asked us to call after Ramadan.");
  });
});
