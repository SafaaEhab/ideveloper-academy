import { describe, expect, it } from "vitest";
import { createAccessCode, getStudentByCode } from "./db";

describe("academy access codes", () => {
  it("generates a readable IDA-prefixed code with the expected length", async () => {
    const code = await createAccessCode();
    expect(code).toMatch(/^IDA-[A-Z2-9]{8}$/);
  });

  it("does not ship with any working sample code", async () => {
    await expect(getStudentByCode("IDA-XXXXXXXX")).resolves.toBeNull();
    await expect(getStudentByCode("IDA-DEMO")).resolves.toBeNull();
  });
});
