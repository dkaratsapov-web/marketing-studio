/**
 * PDF для рассылок по отраслевым решениям. Собирает HTML-страницы A4 в стиле сайта и печатает их
 * в PDF через Chromium. Шрифты и картинки берутся из готовой сборки сайта.
 *
 * Запуск: npm run build; (cd out && python3 -m http.server 8088) в соседнем окне;
 *         node scripts/pdf/build.mjs [slug]
 * Результат: public/pdf/korporaciya-<slug>.pdf
 *
 * Правило: только факты из дел и прайса, примеры подписаны «пример».
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { INDUSTRIES } from "./content.mjs";
import { render } from "./render.mjs";

const require = createRequire(process.env.PLAYWRIGHT_ROOT ?? "/opt/node-tools/node_modules/");
const { chromium } = require("playwright");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "out/pdf-src");
const HOST = process.env.PDF_HOST ?? "http://127.0.0.1:8088";

// Шрифты сайта: @font-face из собранного CSS, ссылки на файлы шрифтов делаем абсолютными
fs.mkdirSync(path.join(OUT, "img"), { recursive: true });
const cssDir = path.join(ROOT, "out/_next/static/chunks");
const faces = fs
  .readdirSync(cssDir)
  .filter((f) => f.endsWith(".css"))
  .flatMap((f) => fs.readFileSync(path.join(cssDir, f), "utf8").match(/@font-face\{[^}]*\}/g) ?? [])
  .filter((f) => !/Fallback/.test(f))
  .map((f) => f.replace(/url\(\.\.\/media\//g, "url(/_next/static/media/"));
fs.writeFileSync(path.join(OUT, "fonts.css"), [...new Set(faces)].join("\n"));

// Картинки дел: перекодируем в JPEG, иначе Chromium кладёт их в PDF без сжатия и файл весит мегабайты
const sharp = require(path.join(ROOT, "node_modules/sharp"));
for (const d of INDUSTRIES)
  for (const img of d.images ?? [])
    await sharp(path.join(ROOT, "src/assets/cases", img)).flatten({ background: "#ffffff" }).jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(OUT, "img", path.basename(img)));

const MARK = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "mark.json"), "utf8"));
const only = process.argv[2];
const b = await chromium.launch();
const p = await b.newPage();
fs.mkdirSync(path.join(ROOT, "public/pdf"), { recursive: true });
for (const d of INDUSTRIES.filter((x) => !only || x.slug === only)) {
  fs.writeFileSync(path.join(OUT, `${d.slug}.html`), render(d, MARK));
  await p.goto(`${HOST}/pdf-src/${d.slug}.html`, { waitUntil: "networkidle" });
  await p.waitForFunction(() => window.__fitted === true);
  await p.pdf({ path: path.join(ROOT, `public/pdf/korporaciya-${d.slug}.pdf`), format: "A4", printBackground: true, preferCSSPageSize: true });
  if (process.env.PREVIEW) {
    await p.setViewportSize({ width: 794, height: 1123 });
    await p.screenshot({ path: path.join(process.env.PREVIEW, `pdf-${d.slug}.png`), fullPage: true });
  }
  console.log("ok", d.slug);
}
await b.close();
