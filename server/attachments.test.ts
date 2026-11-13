import { describe, expect, it } from "vitest";
import { AttachmentError, validateAttachment } from "./attachments";

const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l9W4WQAAAABJRU5ErkJggg==";
const PDF_BASE64 = Buffer.from("%PDF-1.4\n%%EOF").toString("base64");

describe("attachment validation", () => {
  it("accepts a real PNG with matching magic bytes", () => {
    const result = validateAttachment({
      dataBase64: PNG_BASE64,
      mime: "image/png",
      name: "proof.png",
    });
    expect(result).toMatchObject({ mime: "image/png", name: "proof.png" });
    expect(result!.bytes).toBeGreaterThan(0);
  });

  it("accepts a PDF", () => {
    expect(
      validateAttachment({
        dataBase64: `data:application/pdf;base64,${PDF_BASE64}`,
        mime: "application/pdf",
        name: "receipt.pdf",
      })?.mime,
    ).toBe("application/pdf");
  });

  it("rejects executable or mislabeled files", () => {
    expect(() =>
      validateAttachment({
        dataBase64: Buffer.from("MZ fake exe").toString("base64"),
        mime: "application/x-msdownload",
        name: "virus.exe",
      }),
    ).toThrow(AttachmentError);
    expect(() =>
      validateAttachment({
        dataBase64: Buffer.from("not a png").toString("base64"),
        mime: "image/png",
        name: "fake.png",
      }),
    ).toThrow(/لا يطابق/);
  });

  it("rejects oversized payloads", () => {
    const large = Buffer.alloc(5 * 1024 * 1024 + 1, 1);
    expect(() =>
      validateAttachment({
        dataBase64: large.toString("base64"),
        mime: "image/png",
        name: "large.png",
      }),
    ).toThrow(/5 ميجابايت/);
  });
});
