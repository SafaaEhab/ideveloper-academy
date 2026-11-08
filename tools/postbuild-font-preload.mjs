/**
 * Adds preload hints for the two font files the hero needs before React paints.
 *
 * Vite hashes font assets, so the URLs are only known after the build. This
 * keeps the design font (Cairo 700/800) without a swap-induced layout shift.
 */
import fs from "node:fs";
import path from "node:path";

const publicDir = path.resolve(process.cwd(), "dist", "public");
const assetsDir = path.join(publicDir, "assets");
const htmlPath = path.join(publicDir, "index.html");

if (!fs.existsSync(htmlPath) || !fs.existsSync(assetsDir)) {
  console.warn("[postbuild] dist/public is missing — skipping font preloads.");
  process.exit(0);
}

const wanted = [
  /^cairo-arabic-700-normal-.*\.woff2$/,
  /^cairo-arabic-800-normal-.*\.woff2$/,
  /^space-grotesk-latin-700-normal-.*\.woff2$/,
];

const files = fs
  .readdirSync(assetsDir)
  .filter(name => wanted.some(pattern => pattern.test(name)));

if (files.length === 0) {
  console.warn("[postbuild] no font files found — skipping preloads.");
  process.exit(0);
}

let html = fs.readFileSync(htmlPath, "utf8");

// Vite emits one render-blocking stylesheet. The inline `#boot` shell already
// carries the critical hero styles, so the full app CSS can load without
// blocking the first paint. The React entry waits for `__appCssReady` before
// removing the shell, which prevents an unstyled flash.
html = html.replace(
  /<link rel="stylesheet"([^>]*?)href="([^"]+\.css)"([^>]*)>/g,
  (_match, before, href, after) =>
    `<link rel="preload" as="style"${before}href="${href}"${after} onload="this.onload=null;this.rel='stylesheet';window.__appCssReady=true" data-app-css="1">\n` +
    `    <noscript><link rel="stylesheet"${before}href="${href}"${after}></noscript>`,
);

for (const file of files) {
  const href = `/assets/${file}`;
  if (html.includes(`href="${href}"`)) continue;
  const tag = `    <link rel="preload" as="font" type="font/woff2" crossorigin href="${href}" />\n`;
  html = html.replace("</head>", `${tag}  </head>`);
}
fs.writeFileSync(htmlPath, html, "utf8");
console.log(`[postbuild] preloaded ${files.length} font file(s): ${files.join(", ")}`);
