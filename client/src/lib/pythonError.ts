/**
 * Pyodide wraps every failure in its own evaluation frames. Students only need
 * the part that points at their code and the final exception, so the internal
 * `_pyodide`/importlib/asyncio frames are dropped here.
 *
 * Pure and framework-free so it can be unit tested directly.
 */
export function formatPythonError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String(error ?? "");
  const message = raw.replace(/\r\n/g, "\n").trim();
  if (!message) return "حدث خطأ غير معروف أثناء تشغيل الكود.";

  const lines = message.split("\n");
  const kept: string[] = [];
  let inTraceback = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("Traceback (most recent call last):")) {
      inTraceback = true;
      kept.push(line);
      continue;
    }

    if (inTraceback && /^\s+File "/.test(line)) {
      const internal =
        /_pyodide|site-packages[\\/](pyodide|importlib|asyncio|runpy|stack_data)|<frozen /i.test(
          line,
        );
      if (!internal) {
        kept.push(line);
        // The source line that follows the frame belongs to it; keep it too.
        if (index + 1 < lines.length) {
          kept.push(lines[index + 1]);
          index += 1;
        }
      } else if (index + 1 < lines.length) {
        // Skip the internal frame's source line as well.
        index += 1;
      }
      continue;
    }

    kept.push(line);
    if (inTraceback && line.trim() === "") inTraceback = false;
  }

  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim() || message;
}
