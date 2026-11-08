import { describe, expect, it } from "vitest";
import {
  normalizeEgyptianPhone,
  normalizePhone,
  validateOptionalPhone,
  validatePhone,
} from "./validation";

describe("Egyptian phone normalization", () => {
  it("normalizes the common local mobile format", () => {
    expect(normalizeEgyptianPhone("01012345678")).toMatchObject({
      ok: true,
      value: "+201012345678",
      national: "1012345678",
      kind: "mobile",
    });
    expect(normalizePhone("01123456789")).toBe("+201123456789");
    expect(normalizePhone("01234567890")).toBe("+201234567890");
    expect(normalizePhone("01512345678")).toBe("+201512345678");
  });

  it("normalizes international and 00-prefixed formats", () => {
    for (const value of [
      "+201012345678",
      "+20 101 234 5678",
      "00201012345678",
      "201012345678",
      "+20 (0)10 1234 5678",
      "010 1234 5678",
      "010-1234-5678",
      "010.1234.5678",
    ]) {
      expect(normalizePhone(value)).toBe("+201012345678");
    }
  });

  it("converts Arabic-Indic digits before validating", () => {
    expect(normalizePhone("٠١٠١٢٣٤٥٦٧٨")).toBe("+201012345678");
  });

  it("accepts an Egyptian landline but keeps the country code", () => {
    expect(normalizeEgyptianPhone("0223456789")).toMatchObject({
      ok: true,
      value: "+20223456789",
      kind: "landline",
    });
  });

  it("rejects letters and malformed numbers", () => {
    for (const value of [
      "abcdefgh",
      "010abc45678",
      "0101234567",
      "010123456789",
      "+15551234567",
      "12345",
      "0101234#678",
      "",
    ]) {
      expect(validatePhone(value).ok).toBe(false);
    }
  });

  it("never blindly prepends +20 to a foreign number", () => {
    expect(normalizePhone("+15551234567")).toBe("+15551234567");
    expect(validatePhone("+15551234567").ok).toBe(false);
  });

  it("keeps optional phones empty and never accepts a bad optional value", () => {
    expect(validateOptionalPhone("")).toEqual({
      ok: true,
      value: "",
      reason: "ok",
    });
    expect(validateOptionalPhone(undefined).ok).toBe(true);
    expect(validateOptionalPhone("not-a-phone").ok).toBe(false);
  });

  it("returns an Arabic validation message", async () => {
    const { PHONE_VALIDATION_MESSAGE } = await import("./validation");
    expect(PHONE_VALIDATION_MESSAGE).toContain("رقم موبايل مصري");
  });
});
