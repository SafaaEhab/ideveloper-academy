import { describe, expect, it } from "vitest";
import {
  clampMinorToRange,
  formatMinorAmount,
  formatMinorPlain,
  parseAmountToMinor,
  percentOfMinor,
  sumMinor,
} from "./money";

describe("money parsing", () => {
  it("parses whole and decimal EGP amounts into piastres", () => {
    expect(parseAmountToMinor("1250")).toEqual({ ok: true, minor: 125000 });
    expect(parseAmountToMinor("1250.5")).toEqual({ ok: true, minor: 125050 });
    expect(parseAmountToMinor("1250.50")).toEqual({ ok: true, minor: 125050 });
    expect(parseAmountToMinor("0.01")).toEqual({ ok: true, minor: 1 });
  });

  it("accepts Arabic-Indic digits and thousands separators", () => {
    expect(parseAmountToMinor("١٢٥٠")).toEqual({ ok: true, minor: 125000 });
    expect(parseAmountToMinor("١٬٢٥٠٫٥٠")).toEqual({ ok: true, minor: 125050 });
    expect(parseAmountToMinor("1,250.50")).toEqual({ ok: true, minor: 125050 });
  });

  it("accepts a numeric input without floating point storage", () => {
    expect(parseAmountToMinor(12.34)).toEqual({ ok: true, minor: 1234 });
    expect(parseAmountToMinor(0.1 + 0.2)).toEqual({ ok: true, minor: 30 });
  });

  it("rejects zero, negative, ambiguous and malformed values", () => {
    for (const value of ["", "0", "0.00", "-5", "1.234", "1,2,3", "abc", "1e5"]) {
      expect(parseAmountToMinor(value).ok).toBe(false);
    }
    expect(parseAmountToMinor(-5).ok).toBe(false);
  });

  it("rejects amounts above the safe limit", () => {
    expect(parseAmountToMinor("999999999999").ok).toBe(false);
  });

  it("formats minor units without floating point drift", () => {
    expect(formatMinorPlain(123456)).toBe("1234.56");
    expect(formatMinorPlain(1)).toBe("0.01");
    expect(formatMinorAmount(123456, { locale: "en-EG", withCurrency: false })).toContain(
      "1,234.56",
    );
  });

  it("sums and clamps integer minors", () => {
    expect(sumMinor([100, 250, 0])).toBe(350);
    expect(percentOfMinor(100000, 10)).toBe(10000);
    expect(percentOfMinor(100000, 0)).toBe(0);
    expect(percentOfMinor(100000, 200)).toBe(100000);
    expect(clampMinorToRange(-5, 0, 100)).toBe(0);
    expect(clampMinorToRange(500, 0, 100)).toBe(100);
  });
});
