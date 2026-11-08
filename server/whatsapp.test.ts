import { describe, expect, it } from "vitest";
import { normalizeWhatsAppGroupUrl } from "@shared/whatsapp";

describe("normalizeWhatsAppGroupUrl", () => {
  it("treats an empty value as removing the link", () => {
    expect(normalizeWhatsAppGroupUrl("")).toEqual({ url: null });
    expect(normalizeWhatsAppGroupUrl("   ")).toEqual({ url: null });
    expect(normalizeWhatsAppGroupUrl(null)).toEqual({ url: null });
    expect(normalizeWhatsAppGroupUrl(undefined)).toEqual({ url: null });
  });

  it("accepts a real WhatsApp group invite link", () => {
    expect(
      normalizeWhatsAppGroupUrl("https://chat.whatsapp.com/ABCdef123456"),
    ).toEqual({ url: "https://chat.whatsapp.com/ABCdef123456" });
  });

  it("adds https:// when the protocol was left out", () => {
    expect(normalizeWhatsAppGroupUrl("chat.whatsapp.com/ABCdef123456")).toEqual({
      url: "https://chat.whatsapp.com/ABCdef123456",
    });
  });

  it("trims accidental spaces around a pasted link", () => {
    expect(
      normalizeWhatsAppGroupUrl(
        "  https://chat.whatsapp.com/ABCdef123456  ",
      ),
    ).toEqual({ url: "https://chat.whatsapp.com/ABCdef123456" });
  });

  it("accepts an invite path with a trailing slash", () => {
    expect(
      normalizeWhatsAppGroupUrl("https://chat.whatsapp.com/ABCdef123456/"),
    ).toEqual({ url: "https://chat.whatsapp.com/ABCdef123456/" });
  });

  it("rejects non-HTTPS links", () => {
    expect(
      normalizeWhatsAppGroupUrl("http://chat.whatsapp.com/ABCdef123456"),
    ).toMatchObject({ url: null });
    expect(
      normalizeWhatsAppGroupUrl("http://chat.whatsapp.com/ABCdef123456").error,
    ).toContain("https://");
  });

  it("rejects other hosts, even when they look similar", () => {
    for (const link of [
      "https://wa.me/123456",
      "https://chat.whatsapp.com.evil.example/ABC",
      "https://evil.example/chat.whatsapp.com/ABC",
      "https://web.whatsapp.com/ABC",
    ]) {
      expect(normalizeWhatsAppGroupUrl(link).url).toBeNull();
    }
  });

  it("rejects a host without an invite code", () => {
    const result = normalizeWhatsAppGroupUrl("https://chat.whatsapp.com/");
    expect(result.url).toBeNull();
    expect(result.error).toContain("invite code");
  });

  it("rejects malformed URLs without throwing", () => {
    expect(() => normalizeWhatsAppGroupUrl("not a link at all")).not.toThrow();
    expect(normalizeWhatsAppGroupUrl("not a link at all").url).toBeNull();
    expect(normalizeWhatsAppGroupUrl("javascript:alert(1)").url).toBeNull();
  });
});
