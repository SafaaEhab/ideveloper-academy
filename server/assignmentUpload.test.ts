import { describe, expect, it } from "vitest";
import { AssignmentFileError, MAX_ASSIGNMENT_FILE_BYTES, validateAssignmentFile } from "./assignmentUpload";

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from("fake png payload"),
]).toString("base64");

const pdf = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.from("test")]).toString("base64");

describe("assignment uploads", () => {
  it("accepts a real PNG signature and strips path components", () => {
    const result = validateAssignmentFile({
      name: "../../private/evil.png",
      mimeType: "image/png",
      dataBase64: png,
    });
    expect(result.originalName).toBe("evil.png");
    expect(result.mimeType).toBe("image/png");
    expect(result.size).toBeGreaterThan(8);
    expect(result.storageKey).toMatch(/^[a-f0-9-]{36}$/);
  });

  it("accepts a PDF", () => {
    expect(
      validateAssignmentFile({ name: "homework.pdf", mimeType: "application/pdf", dataBase64: pdf }).mimeType,
    ).toBe("application/pdf");
  });

  it("rejects an unsupported MIME type", () => {
    expect(() =>
      validateAssignmentFile({ name: "run.exe", mimeType: "application/x-msdownload", dataBase64: pdf }),
    ).toThrow(AssignmentFileError);
  });

  it("rejects a file whose contents do not match its claimed type", () => {
    expect(() =>
      validateAssignmentFile({ name: "photo.png", mimeType: "image/png", dataBase64: pdf }),
    ).toThrow(/do not match/);
  });

  it("rejects oversized files", () => {
    const oversized = Buffer.alloc(MAX_ASSIGNMENT_FILE_BYTES + 1, 1).toString("base64");
    expect(() =>
      validateAssignmentFile({ name: "big.txt", mimeType: "text/plain", dataBase64: oversized }),
    ).toThrow(/larger than 3 MB/);
  });

  it("rejects an empty payload", () => {
    expect(() =>
      validateAssignmentFile({ name: "empty.txt", mimeType: "text/plain", dataBase64: "" }),
    ).toThrow();
  });

  it("accepts plain text without NUL bytes", () => {
    const text = Buffer.from("my homework answer").toString("base64");
    expect(validateAssignmentFile({ name: "answer.txt", mimeType: "text/plain", dataBase64: text }).size).toBe(18);
  });

  it("rejects binary content disguised as text", () => {
    const binary = Buffer.from([0x00, 0x01, 0x02]).toString("base64");
    expect(() =>
      validateAssignmentFile({ name: "answer.txt", mimeType: "text/plain", dataBase64: binary }),
    ).toThrow();
  });
});
