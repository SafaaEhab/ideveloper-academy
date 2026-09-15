import { describe, expect, it } from "vitest";
import { createAccessCode, getStudentByCode } from "./db";

describe("academy access codes", () => {
  it("generates a readable IDA-prefixed code with the expected length", async () => {
    const code = await createAccessCode();
    expect(code).toMatch(/^IDA-[A-Z2-9]{8}$/);
  });

  it("opens only the matching course for each shared course code", async () => {
    await expect(getStudentByCode("id-123456789")).resolves.toMatchObject({ courses: ["Python"] });
    await expect(getStudentByCode("ID-987654321")).resolves.toMatchObject({ courses: ["Web"] });
    await expect(getStudentByCode("id-147852369")).resolves.toMatchObject({ courses: ["Scratch"] });
  });
});
