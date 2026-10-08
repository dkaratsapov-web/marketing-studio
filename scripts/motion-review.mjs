// Моушн-ревью hero: загрузка, затем реальная прокрутка колесом.
// node motion.mjs <outDir> <desktop|mobile> [pxPerStep] [msPerStep]
import { createRequire } from "module";
import fs from "fs";
// Playwright берётся из окружения (в облачной сессии он предустановлен в /opt/node-tools)
const require = createRequire(process.env.PLAYWRIGHT_ROOT ?? "/opt/node-tools/node_modules/");
const { chromium } = require("playwright");

const [out, kind = "desktop", stepPx = "110", stepMs = "90"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const viewport = kind === "mobile" ? { width: 390, height: 844 } : { width: 1440, height: 900 };

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const ctx = await browser.newContext({
  viewport,
  deviceScaleFactor: 1,
  hasTouch: false,
  recordVideo: { dir: out, size: viewport },
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const t0 = Date.now();
await page.goto(process.env.REVIEW_URL ?? "http://localhost:4321/", { waitUntil: "domcontentloaded" });

const probe = () =>
  page.evaluate(() => {
    const hero = document.getElementById("top");
    const range = hero.offsetHeight - innerHeight;
    const op = (sel) => {
      const el = hero.querySelector(sel);
      if (!el) return 0;
      const cs = getComputedStyle(el);
      return cs.visibility === "hidden" ? 0 : +cs.opacity;
    };
    return {
      y: Math.round(scrollY),
      p: Math.min(1, Math.max(0, scrollY / range)),
      title: op("h1"),
      lead: op('[class*="lead"]'),
      inside: op('[class*="inside"]'),
      flash: op('[class*="flash"]'),
    };
  });

const frames = [];
const shot = async (label) => {
  const s = await probe();
  const t = ((Date.now() - t0) / 1000).toFixed(1);
  const file = `${out}/f${String(frames.length).padStart(3, "0")}.png`;
  await page.screenshot({ path: file });
  frames.push({ file, t, label, ...s });
};

// Интро
for (const ms of [300, 900, 1600, 2400, 3400]) {
  await page.waitForTimeout(Math.max(0, ms - (Date.now() - t0)));
  await shot("intro");
}

// Прокрутка колесом через hero и чуть дальше
await page.mouse.move(viewport.width / 2, viewport.height / 2);
const total = await page.evaluate(() => { const m = document.getElementById("manifest"); return m.offsetTop + m.offsetHeight - innerHeight * 0.6; });
let scrolled = 0;
while (scrolled < total) {
  await page.mouse.wheel(0, +stepPx);
  scrolled += +stepPx;
  await page.waitForTimeout(+stepMs);
  await shot("scroll");
}
await page.waitForTimeout(800);
await shot("settled");

await ctx.close();
await browser.close();
fs.writeFileSync(`${out}/frames.json`, JSON.stringify({ frames, errors }, null, 1));

// Пустые кадры: прокрутка внутри hero, но ни один текст не читается и вспышки нет
const empty = frames.filter(
  (f) => f.label === "scroll" && f.p > 0.02 && f.p < 0.98 && Math.max(f.title, f.lead, f.inside) < 0.35 && f.flash < 0.5,
);
console.log(`frames: ${frames.length}, errors: ${errors.length}`);
console.log(
  frames.map((f) => `${f.t}s p=${(f.p * 100).toFixed(0)}% title=${f.title.toFixed(2)} lead=${f.lead.toFixed(2)} inside=${f.inside.toFixed(2)} flash=${f.flash.toFixed(2)}`).join("\n"),
);
console.log(`empty-text frames: ${empty.length} ${empty.map((f) => (f.p * 100).toFixed(0) + "%").join(", ")}`);
