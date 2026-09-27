const fs = require("fs");
const p = "client/src/lib/certificate.ts";
let t = fs.readFileSync(p, "utf8");

const from = `  drawDivider(ctx, 1272, 150, W - 150);

  drawText(ctx, "\\u0623\\u0643\\u0627\\u062f\\u0645\\u064a\\u0629 iDeveloper", 380, 1330, {
    font: \`400 30px \${SANS}\`,
    color: INK,
  });
  drawText(ctx, "iDEVELOPER ACADEMY \\u00b7 PROGRAM DIRECTOR", 380, 1364, {
    font: \`600 18px \${SANS}\`,
    color: MUTED,
    tracking: 3,
  });

  drawSeal(ctx, W / 2, 1318);

  drawText(ctx, "CERTIFICATE NO.", 1640, 1300, {
    font: \`600 18px \${SANS}\`,
    color: MUTED,
    tracking: 3,
  });
  drawText(ctx, serial, 1640, 1336, {
    font: \`700 30px \${MONO}\`,
    color: INK,
  });
  drawText(ctx, "ISSUED ON", 1640, 1372, {
    font: \`600 16px \${SANS}\`,
    color: MUTED,
    tracking: 3,
  });
  drawText(ctx, longDate(issuedOn), 1780, 1372, {
    font: \`500 19px \${SANS}\`,
    color: INK,
    align: "right",
  });`;

const to = `  drawDivider(ctx, 1140, 150, W - 150);

  drawText(ctx, ACADEMY_NAME, 380, 1230, {
    font: \`italic 400 34px \${SERIF}\`,
    color: INK,
  });
  drawText(ctx, "PROGRAM DIRECTOR", 380, 1264, {
    font: \`600 18px \${SANS}\`,
    color: MUTED,
    tracking: 3,
  });
  drawText(ctx, "\\u0625\\u062f\\u0627\\u0631\\u0629 \\u0627\\u0644\\u0628\\u0631\\u0646\\u0627\\u0645\\u062c", 380, 1298, {
    font: \`600 20px \${SANS}\`,
    color: MUTED,
  });

  drawSeal(ctx, W / 2, 1240);

  const rightX = 1700;
  drawText(ctx, "CERTIFICATE NO.", rightX, 1196, {
    font: \`600 18px \${SANS}\`,
    color: MUTED,
    tracking: 3,
  });
  drawText(ctx, serial, rightX, 1236, {
    font: \`700 30px \${MONO}\`,
    color: INK,
  });
  drawText(ctx, \`ISSUED ON \\u00b7 \${longDate(issuedOn)}\`, rightX, 1282, {
    font: \`500 21px \${SANS}\`,
    color: INK,
  });`;

if (!t.includes(from)) {
  console.error("footer block NOT FOUND");
  process.exit(1);
}
t = t.replace(from, to);
fs.writeFileSync(p, t, "utf8");
console.log("footer patched");
