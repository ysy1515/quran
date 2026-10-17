/* global window */
// Renders every icon from index.html to out/<name>.png using the bundled Chromium.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { extname, join } from "node:path";

const root = new URL(".", import.meta.url).pathname;
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript" };
const server = createServer((req, res) => {
  const p = join(root, decodeURIComponent(req.url.split("?")[0]));
  if (!existsSync(p)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": types[extname(p)] ?? "application/octet-stream" }).end(readFileSync(p));
}).listen(5288);

const only = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1100, height: 1100 } });
page.on("console", (m) => console.log("[page]", m.text()));
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto("http://localhost:5288/index.html");
await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
const names = only.length ? only : await page.evaluate(() => window.MODEL_NAMES);
mkdirSync(join(root, "out"), { recursive: true });
for (const n of names) {
  const url = await page.evaluate((n) => window.renderIcon(n), n);
  writeFileSync(join(root, "out", `${n}.png`), Buffer.from(url.split(",")[1], "base64"));
  console.log("rendered", n);
}
await browser.close();
server.close();
