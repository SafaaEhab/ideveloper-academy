// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => {
  const store = new Map<string, string>();
  const key = (accessCode: string, courseName: string) =>
    `idev-certificate-${accessCode}-${courseName}`;
  return {
    store,
    issueCertificate: vi.fn(async (input: { studentName: string; courseName: string }) => ({
      fileName: `${input.studentName}-${input.courseName}.pdf`,
      serial: "IDV-2026-PY-TEST",
      issuedOn: new Date(2026, 0, 1),
    })),
    hasIssuedCertificate: vi.fn((accessCode: string, courseName: string) =>
      store.has(key(accessCode, courseName))
    ),
    markCertificateIssued: vi.fn((accessCode: string, courseName: string, serial: string) => {
      store.set(key(accessCode, courseName), serial);
    }),
  };
});

vi.mock("@/lib/certificate", () => ({
  hasIssuedCertificate: mocks.hasIssuedCertificate,
  issueCertificate: mocks.issueCertificate,
  markCertificateIssued: mocks.markCertificateIssued,
}));

import { useCourseCertificate } from "./useCourseCertificate";
import { CERTIFICATE_COURSES } from "@/lib/certificateCourses";

type Handle = ReturnType<typeof useCourseCertificate>;

let container: HTMLDivElement;
let root: Root;

const Probe = ({ isComplete }: { isComplete: boolean }) => {
  const state = useCourseCertificate({
    studentName: "Lina Adel",
    accessCode: "IDA-TEST1",
    isComplete,
    course: CERTIFICATE_COURSES.Python,
  });
  (Probe as unknown as { latest: Handle }).latest = state;
  return null;
};

const render = async (isComplete: boolean) => {
  const handle = {} as Handle;
  await act(async () => {
    root.render(<Probe isComplete={isComplete} />);
  });
  return (Probe as unknown as { latest: Handle }).latest ?? handle;
};

describe("useCourseCertificate", () => {
  beforeEach(() => {
    mocks.store.clear();
    mocks.issueCertificate.mockClear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("does not issue on mount, even when the course is already complete", async () => {
    await render(true);
    expect(mocks.issueCertificate).not.toHaveBeenCalled();
  });

  it("issues automatically the moment the curriculum hits 100%", async () => {
    await render(false);
    expect(mocks.issueCertificate).not.toHaveBeenCalled();

    const handle = await render(true);

    expect(mocks.issueCertificate).toHaveBeenCalledTimes(1);
    expect(mocks.issueCertificate).toHaveBeenCalledWith(
      expect.objectContaining({
        studentName: "Lina Adel",
        accessCode: "IDA-TEST1",
        courseName: "Python",
        sessionCount: CERTIFICATE_COURSES.Python.sessionCount,
        monthCount: CERTIFICATE_COURSES.Python.monthCount,
      })
    );
    expect(mocks.markCertificateIssued).toHaveBeenCalledWith("IDA-TEST1", "Python", "IDV-2026-PY-TEST");
    expect(handle.issued).toBe(true);
    expect(handle.canClaim).toBe(true);
  });

  it("never auto-issues twice, but allows a manual re-download", async () => {
    let handle = await render(false);
    handle = await render(true);
    expect(mocks.issueCertificate).toHaveBeenCalledTimes(1);

    // Drop back below 100% and complete again — the issued flag blocks re-issue.
    await render(false);
    handle = await render(true);
    expect(mocks.issueCertificate).toHaveBeenCalledTimes(1);

    await act(async () => handle.download());
    expect(mocks.issueCertificate).toHaveBeenCalledTimes(2);
  });

  it("respects a certificate that was already issued on this device", async () => {
    mocks.store.set("idev-certificate-IDA-TEST1-Python", "IDV-2025-PY-OLD");
    const handle = await render(false);
    expect(handle.issued).toBe(true);

    await render(true);
    expect(mocks.issueCertificate).not.toHaveBeenCalled();
  });
});
