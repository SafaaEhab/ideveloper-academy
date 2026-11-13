import { describe, expect, it } from "vitest";
import { formatPythonError } from "@/lib/pythonError";

describe("formatPythonError", () => {
  it("drops Pyodide's internal frames but keeps the student's code and error", () => {
    const raw = [
      "Traceback (most recent call last):",
      '  File "/lib/python3.12/site-packages/_pyodide/_base.py", line 581, in eval_code_async',
      "    await CodeRunner(...).run_async()",
      '  File "/lib/python3.12/site-packages/_pyodide/_base.py", line 409, in run_async',
      "    coroutine = eval(self.code, globals, locals)",
      '  File "<exec>", line 2, in <module>',
      "    print(missing)",
      "NameError: name 'missing' is not defined",
    ].join("\n");

    const formatted = formatPythonError(new Error(raw));

    expect(formatted).toContain('File "<exec>", line 2');
    expect(formatted).toContain("NameError: name 'missing' is not defined");
    expect(formatted).not.toContain("_pyodide");
    expect(formatted).not.toContain("eval_code_async");
  });

  it("keeps a plain SyntaxError message untouched", () => {
    const raw = '  File "<exec>", line 1\n    print(\n          ^\nSyntaxError: \'(\' was never closed';
    expect(formatPythonError(raw)).toBe(raw.trim());
  });

  it("returns an Arabic fallback for an empty error", () => {
    expect(formatPythonError("")).toContain("حدث خطأ غير معروف");
  });
});
