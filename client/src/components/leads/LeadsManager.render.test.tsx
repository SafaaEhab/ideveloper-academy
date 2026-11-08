// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const state = vi.hoisted(() => ({
  lastListInput: null as Record<string, unknown> | null,
  listData: {
    items: [
      {
        id: 7,
        fullName: "سارة أحمد",
        studentPhone: "+201012345678",
        age: 11,
        school: "مدرسة النيل",
        course: "Python",
        status: "new",
        assignedEmployeeId: null,
        assignedEmployeeName: null,
        registrationDate: new Date(),
        lastContactDate: null,
        nextFollowUpDate: null,
        duplicateAttempts: 1,
        convertedStudentId: null,
        googleSheetSyncStatus: "failed",
        googleSheetSyncError: "تعذر الوصول",
        isOverdue: true,
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
    counters: {
      new: 1,
      needs_follow_up: 0,
      subscribed: 0,
      not_interested: 0,
      total: 1,
      overdue: 1,
      mine: 0,
      syncFailed: 1,
    },
    thresholdHours: 24,
  },
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      name: "Admin",
      email: "admin@example.com",
      role: "admin",
      leadAccess: true,
      canConvertLeads: true,
    },
    loading: false,
  }),
}));

vi.mock("@/components/leads/LeadDetailsSheet", () => ({
  default: () => <div data-testid="lead-details" />,
}));
vi.mock("@/components/leads/LeadEmployeesDialog", () => ({
  default: () => <div data-testid="lead-employees" />,
}));
vi.mock("@/components/leads/LeadStatusDialog", () => ({
  default: () => <div data-testid="lead-status-dialog" />,
}));

const invalidate = vi.fn();
const mutate = vi.fn();
const mutation = { mutate, isPending: false };

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      leads: {
        list: { invalidate },
        detail: { invalidate },
        employees: { invalidate },
      },
      admin: {
        students: { invalidate },
        stats: { invalidate },
      },
    }),
    leads: {
      list: {
        useQuery: (input: Record<string, unknown>) => {
          state.lastListInput = input;
          return {
            data: state.listData,
            isLoading: false,
            isError: false,
            isFetching: false,
            error: null,
            refetch: vi.fn(),
          };
        },
      },
      employees: {
        useQuery: () => ({ data: [], isLoading: false, isError: false }),
      },
      syncConfig: {
        useQuery: () => ({
          data: {
            configured: true,
            enabled: true,
            missing: [],
            spreadsheetId: "sheet",
            sheetName: "Leads",
            serviceAccountEmail: null,
          },
        }),
      },
      updateStatus: { useMutation: () => mutation },
      retrySync: { useMutation: () => mutation },
      reconcileSync: { useMutation: () => mutation },
    },
  },
}));

import LeadsManager from "@/components/leads/LeadsManager";

describe("LeadsManager", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    state.lastListInput = null;
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.clearAllMocks();
  });

  const render = () => act(() => root.render(<LeadsManager />));

  it("renders the Arabic dashboard with the required table columns", () => {
    render();
    expect(host.textContent).toContain("العملاء المحتملون");
    expect(host.querySelector("[dir='rtl']")).not.toBeNull();
    for (const header of [
      "اسم العميل",
      "رقم الهاتف",
      "الكورس",
      "السن",
      "الحالة",
      "الموظف المسؤول",
      "تاريخ التسجيل",
      "آخر تواصل",
      "المتابعة القادمة",
      "الإجراءات",
    ]) {
      expect(host.textContent).toContain(header);
    }
    expect(host.textContent).toContain("سارة أحمد");
    expect(host.textContent).toContain("متأخر في الاتصال");
    expect(host.textContent).toContain("لم يتم النسخ");
    expect(state.lastListInput).toMatchObject({ page: 1, pageSize: 20 });
  });

  it("sends the quick filters to the list endpoint", () => {
    render();
    const button = [...host.querySelectorAll("button")].find(node =>
      node.textContent?.includes("يحتاج متابعة")
    );
    if (!button) throw new Error("Quick filter not rendered");
    act(() => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(state.lastListInput).toMatchObject({ status: "needs_follow_up" });
  });

  it("shows the failed-sync warning and the real row action", () => {
    render();
    expect(host.textContent).toContain("1");
    expect(host.textContent).toContain("عميل لم يتم نسخه");
    expect(host.textContent).toContain("تحويل إلى طالب");
  });
});
