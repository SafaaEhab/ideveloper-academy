import { describe, expect, it } from "vitest";
import {
  announcementWhatsAppNumber,
  buildAnnouncementWhatsAppLink,
  factsToLines,
  formatRemaining,
  getDeadlineRemaining,
  linesToFacts,
  linesToPrizes,
  normalizeWhatsAppNumber,
  prizesToLines,
  toDateTimeLocal,
} from "./announcement";
import { COMPANY_WHATSAPP_NUMBER } from "./contact";

describe("countdown", () => {
  it("never reports negative time", () => {
    expect(getDeadlineRemaining("2026-01-01T00:00:00Z", Date.parse("2026-06-01T00:00:00Z"))).toBe(0);
  });

  it("treats a missing deadline as no countdown at all", () => {
    expect(getDeadlineRemaining(null)).toBe(0);
    expect(getDeadlineRemaining("not a date")).toBe(0);
  });

  it("splits the remaining time into day/hour/minute/second parts", () => {
    const milliseconds = (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000;
    expect(formatRemaining(milliseconds)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5 });
  });
});

describe("admin text inputs", () => {
  it("reads one fact per line and drops the blank ones", () => {
    expect(linesToFacts("  للمشاركة مجانية \n\nللأعمار من 8 إلى 16 سنة\n")).toEqual([
      "للمشاركة مجانية",
      "للأعمار من 8 إلى 16 سنة",
    ]);
  });

  it("reads one prize per line, splitting on a pipe or a colon", () => {
    expect(linesToPrizes("المركز الأول | جهاز لابتوب\nالمركز الثاني: تاش 3 شهور\nبدون فاصل")).toEqual([
      { place: "المركز الأول", reward: "جهاز لابتوب" },
      { place: "المركز الثاني", reward: "تاش 3 شهور" },
    ]);
  });

  it("caps how many items the popup will show", () => {
    const facts = Array.from({ length: 12 }, (_, index) => `fact ${index}`).join("\n");
    expect(linesToFacts(facts)).toHaveLength(8);
  });

  it("round-trips the lists back into the textarea format", () => {
    const prizes = [{ place: "المركز الأول", reward: "جهاز لابتوب" }];
    expect(prizesToLines(prizes)).toBe("المركز الأول | جهاز لابتوب");
    expect(linesToPrizes(prizesToLines(prizes))).toEqual(prizes);
    expect(factsToLines(["أ", "ب"])).toBe("أ\nب");
  });
});

describe("WhatsApp destination", () => {
  it("strips the formatting people naturally type", () => {
    expect(normalizeWhatsAppNumber("+20 110 115 1926")).toBe("201101151926");
  });

  it("falls back to the academy inbox when the announcement has no number", () => {
    expect(announcementWhatsAppNumber({ whatsappNumber: "" })).toBe(COMPANY_WHATSAPP_NUMBER);
  });

  it("uses the announcement number when one is set", () => {
    expect(announcementWhatsAppNumber({ whatsappNumber: "+20 122 333 4444" })).toBe("201223334444");
  });

  it("prefills a chat that mentions the announcement title", () => {
    const link = buildAnnouncementWhatsAppLink({ whatsappNumber: "", title: "مسابقة Summer" });
    expect(link.startsWith(`https://wa.me/${COMPANY_WHATSAPP_NUMBER}?text=`)).toBe(true);
    expect(decodeURIComponent(link.split("?text=")[1])).toContain("مسابقة Summer");
  });
});

describe("deadline round trip", () => {
  it("formats an ISO timestamp for a datetime-local input", () => {
    const date = new Date(2026, 10, 20, 21, 0);
    const value = toDateTimeLocal(date);
    expect(value).toBe("2026-11-20T21:00");
    // Feeding that value back must land on the very same moment in time.
    expect(toDateTimeLocal(new Date(value))).toBe(value);
  });

  it("keeps an empty input empty", () => {
    expect(toDateTimeLocal(null)).toBe("");
    expect(toDateTimeLocal("")).toBe("");
    expect(toDateTimeLocal("broken")).toBe("");
  });
});