// @ts-check
/**
 * Every snippet the JavaScript track ships, run in a real browser inside the
 * exact iframe the live preview uses, with the answer printed back.
 *
 * The jsdom fixture in the test suite catches a snippet that throws. This
 * catches the one it cannot see: a snippet that runs, prints nothing, and so
 * shows the student an empty box with no way of telling it apart from a page
 * that has not worked.
 */
import { chromium } from "playwright";
import { allWebLessons } from "../client/src/data/webCurriculum";

const browser = await chromium.launch();
const host = await browser.newPage({ viewport: { width: 900, height: 520 } });

const rows = [];
for (const lesson of allWebLessons.filter(item => item.kind === "JavaScript")) {
  for (const [index, section] of lesson.sections.entries()) {
    for (const [slot, code] of [
      ["code", section.code],
      ["starter", section.starterCode],
      ["solution", section.solutionCode],
    ] as const) {
      if (!code) continue;

      const problems = [];
      const onConsole = message => {
        if (message.type() === "error") problems.push(message.text());
      };
      const onError = error => problems.push(`pageerror: ${error.message}`);
      host.on("console", onConsole);
      host.on("pageerror", onError);

      await host.setContent(
        `<!DOCTYPE html><html><body style="margin:0"><iframe title="p" width="900" height="520" sandbox="allow-scripts allow-modals allow-forms allow-popups" srcdoc="${code.replace(
          /&/g,
          "&amp;"
        ).replace(/"/g, "&quot;")}"></iframe></body></html>`,
        { waitUntil: "networkidle" }
      );

      const frame = host.frameLocator("iframe[title='p']");
      // `#output` is the print shim the preview scaffold adds, and only a
      // snippet classified as a script gets one. A full page has no shim.
      const output =
        (await frame.locator("#output").count()) > 0
          ? ((await frame.locator("#output").textContent()) ?? "").trim()
          : "";
      const bodyText = (await frame.locator("body").innerText())
        .replace(/\s+/g, " ")
        .trim();

      host.off("console", onConsole);
      host.off("pageerror", onError);

      rows.push({
        where: `${lesson.id}#${index} ${slot}`,
        title: section.title,
        problems,
        output: output.slice(0, 60),
        // Something a student can look at: printed output, or text on the page.
        showsSomething: output.length > 0 || bodyText.length > 0,
      });
    }
  }
}
await browser.close();

console.log(
  rows
    .map(
      row =>
        `${row.problems.length === 0 && row.showsSomething ? "ok  " : "CHECK"} ${row.where.padEnd(20)} ${row.title.slice(0, 34).padEnd(36)} ${JSON.stringify(row.output.slice(0, 40))}${row.problems.length ? "  " + row.problems.join(" | ") : ""}`
    )
    .join("\n")
);

const bad = rows.filter(row => row.problems.length > 0);
console.log(`\n${rows.length} snippets, ${bad.length} with errors`);
if (bad.length > 0) process.exit(1);

// A second argument screenshots one snippet, for looking at with eyes.
if (process.argv[2] === "shot") {
  const [, , , lessonId, index, out, height = "320"] = process.argv;
  const section = allWebLessons.find(item => item.id === lessonId)?.sections[
    Number(index)
  ];
  if (!section?.code) throw new Error(`no ${lessonId}#${index}`);
  const shot = await chromium.launch();
  const view = await shot.newPage({
    viewport: { width: 640, height: Number(height) },
  });
  await view.setContent(
    `<!DOCTYPE html><html><body style="margin:0"><iframe title="p" width="640" height="${Number(
      height
    )}" sandbox="allow-scripts allow-modals allow-forms allow-popups" srcdoc="${section.code.replace(
      /&/g,
      "&amp;"
    ).replace(/"/g, "&quot;")}"></iframe></body></html>`,
    { waitUntil: "networkidle" }
  );
  await view.screenshot({ path: out! });
  await shot.close();
  console.log(`screenshot: ${out}`);
}
