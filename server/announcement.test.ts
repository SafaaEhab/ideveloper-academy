import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getActiveAnnouncement: vi.fn(async () => null),
  listAnnouncements: vi.fn(async () => []),
  insertAnnouncement: vi.fn(async () => 11),
  updateAnnouncement: vi.fn(async () => undefined),
  setOnlyAnnouncementEnabled: vi.fn(async () => undefined),
  deleteAnnouncement: vi.fn(async () => undefined),
}));

import * as dbModule from "./db";
import { readAnnouncement } from "./announcement";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const db = vi.mocked(dbModule);

const announcementRow = {
  id: 3,
  badge: "إعلان خاص",
  title: "مسابقة iDeveloper السنوية",
  headline: "اكتشف موهبتك في البرمجة",
  body: "سجّل دلوقتي",
  ctaLabel: "سجّل دلوقتي",
  ctaHint: "عن طريق واتساب",
  whatsappNumber: "",
  deadline: new Date("2026-11-20T19:00:00Z"),
  enabled: true,
  facts: JSON.stringify(["المشاركة مجانية", ""]),
  prizes: JSON.stringify([{ place: "المركز الأول", reward: "جهاز لابتوب" }]),
  createdAt: new Date("2026-10-01T00:00:00Z"),
  updatedAt: new Date("2026-10-02T00:00:00Z"),
};

const adminContext = { user: { id: 1, openId: "admin", name: "Admin", email: "admin@example.com", loginMethod: "test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext;
const publicContext = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext;

const validInput = {
  badge: "إعلان خاص",
  title: "مسابقة iDeveloper السنوية",
  headline: "اكتشف موهبتك في البرمجة",
  body: "سجّل دلوقتي",
  ctaLabel: "سجّل دلوقتي",
  ctaHint: "عن طريق واتساب",
  whatsappNumber: "",
  deadline: "2026-11-20T21:00",
  enabled: true,
  facts: ["المشاركة مجانية", "أونلاين"],
  prizes: [{ place: "المركز الأول", reward: "جهاز لابتوب" }],
};

describe("the site popup", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("shows nothing when the academy has no announcement switched on", async () => {
    db.getActiveAnnouncement.mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(publicContext);
    await expect(caller.site.announcement()).resolves.toBeNull();
  });

  it("serves the enabled announcement without any admin login", async () => {
    db.getActiveAnnouncement.mockResolvedValueOnce(readAnnouncement(announcementRow));
    const caller = appRouter.createCaller(publicContext);
    await expect(caller.site.announcement()).resolves.toMatchObject({
      title: "مسابقة iDeveloper السنوية",
      enabled: true,
    });
  });
});

describe("announcement admin procedures", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("keeps the announcement list behind the admin role", async () => {
    const caller = appRouter.createCaller(publicContext);
    await expect(caller.admin.announcements()).rejects.toBeTruthy();
  });

  it("refuses to publish an announcement without a title", async () => {
    const caller = appRouter.createCaller(adminContext);
    await expect(caller.admin.saveAnnouncement({ ...validInput, title: "  " })).rejects.toBeTruthy();
  });

  it("refuses a WhatsApp number that is not a number", async () => {
    const caller = appRouter.createCaller(adminContext);
    await expect(caller.admin.saveAnnouncement({ ...validInput, whatsappNumber: "whatsapp me" })).rejects.toBeTruthy();
  });

  it("creates an announcement and silences whatever was on before", async () => {
    const caller = appRouter.createCaller(adminContext);
    await expect(caller.admin.saveAnnouncement(validInput)).resolves.toEqual({ success: true, id: 11 });
    expect(db.insertAnnouncement).toHaveBeenCalledWith(expect.objectContaining({ title: validInput.title, enabled: true }));
    expect(db.setOnlyAnnouncementEnabled).toHaveBeenCalledWith(11, true);
  });

  it("updates in place instead of creating a duplicate", async () => {
    const caller = appRouter.createCaller(adminContext);
    await expect(caller.admin.saveAnnouncement({ ...validInput, id: 3 })).resolves.toEqual({ success: true, id: 3 });
    expect(db.updateAnnouncement).toHaveBeenCalledWith(3, expect.objectContaining({ title: validInput.title }));
    expect(db.insertAnnouncement).not.toHaveBeenCalled();
  });

  it("stores the one-item-per-line lists as JSON", async () => {
    const caller = appRouter.createCaller(adminContext);
    await caller.admin.saveAnnouncement(validInput);
    expect(db.insertAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({
        facts: JSON.stringify(["المشاركة مجانية", "أونلاين"]),
        prizes: JSON.stringify([{ place: "المركز الأول", reward: "جهاز لابتوب" }]),
      }),
    );
  });

  it("saves a blank deadline as no countdown", async () => {
    const caller = appRouter.createCaller(adminContext);
    await caller.admin.saveAnnouncement({ ...validInput, deadline: "" });
    expect(db.insertAnnouncement).toHaveBeenCalledWith(expect.objectContaining({ deadline: null }));
  });

  it("turns the popup on and off from the panel switch", async () => {
    const caller = appRouter.createCaller(adminContext);
    await expect(caller.admin.setAnnouncementEnabled({ id: 3, enabled: false })).resolves.toEqual({ success: true });
    expect(db.setOnlyAnnouncementEnabled).toHaveBeenCalledWith(3, false);
  });

  it("deletes an announcement so the site has nothing to show", async () => {
    const caller = appRouter.createCaller(adminContext);
    await expect(caller.admin.deleteAnnouncement({ id: 3 })).resolves.toEqual({ success: true });
    expect(db.deleteAnnouncement).toHaveBeenCalledWith(3);
  });
});

describe("announcement row parsing", () => {
  it("returns null when there is no row", () => {
    expect(readAnnouncement(undefined)).toBeNull();
  });

  it("normalises empty columns so the popup can render them directly", () => {
    const parsed = readAnnouncement({ ...announcementRow, badge: null, headline: null, body: null, ctaLabel: null, ctaHint: null, whatsappNumber: null, deadline: null, facts: null, prizes: null });
    expect(parsed).toMatchObject({
      badge: "",
      headline: "",
      body: "",
      ctaLabel: "",
      ctaHint: "",
      whatsappNumber: "",
      deadline: null,
      facts: [],
      prizes: [],
    });
  });

  it("drops blank list entries", () => {
    expect(readAnnouncement({ ...announcementRow, facts: JSON.stringify(["أ", "  ", "ب"]) })?.facts).toEqual(["أ", "ب"]);
  });

  it("survives a hand-edited or corrupt JSON column", () => {
    const parsed = readAnnouncement({ ...announcementRow, facts: "not json", prizes: '{"place":"x"}' });
    expect(parsed?.facts).toEqual([]);
    expect(parsed?.prizes).toEqual([]);
  });

  it("skips prize rows that are missing a half", () => {
    const parsed = readAnnouncement({ ...announcementRow, prizes: JSON.stringify([{ place: "الأول", reward: "لابتوب" }, { place: "الثاني" }, null, "nope"]) });
    expect(parsed?.prizes).toEqual([{ place: "الأول", reward: "لابتوب" }]);
  });

  it("hands the browser a timestamp it can count down against", () => {
    expect(readAnnouncement(announcementRow)?.deadline).toBe("2026-11-20T19:00:00.000Z");
  });
});