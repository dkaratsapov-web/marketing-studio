#!/usr/bin/env node
// Скриншоты страниц: node scripts/shot.mjs <url> [папка] [--full] [--mobile|--desktop] [--wait=мс]
// По умолчанию снимает компьютер 1440×900 и iPhone 13, печатает статус, заголовок и ошибки страницы.
import { createRequire } from 'module';
import { existsSync } from 'fs';
// Playwright берётся из окружения: в облачной сессии он предустановлен глобально
const roots = [process.env.PLAYWRIGHT_ROOT, '/opt/node22/lib/node_modules/', '/opt/node-tools/node_modules/', process.cwd() + '/node_modules/'].filter(Boolean);
const root = roots.find((r) => existsSync(r + 'playwright')) ?? roots[0];
const { chromium, devices } = createRequire(root)('playwright');
const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--'));
const out = args.filter((a) => !a.startsWith('--'))[1] ?? process.cwd();
const full = args.includes('--full');
const wait = Number((args.find((a) => a.startsWith('--wait=')) ?? '--wait=2000').split('=')[1]);
const only = args.includes('--mobile') ? ['mobile'] : args.includes('--desktop') ? ['desktop'] : ['desktop', 'mobile'];
if (!url) { console.log('shot <url> [папка] [--full] [--mobile|--desktop] [--wait=мс]'); process.exit(1); }
const name = new URL(url).hostname.replace(/^www\./, '') + new URL(url).pathname.replace(/\/+$/, '').replace(/[^a-z0-9а-я]+/gi, '_');
(async () => {
  const b = await chromium.launch();
  for (const kind of only) {
    const ctx = await b.newContext(kind === 'mobile' ? { ...devices['iPhone 13'], deviceScaleFactor: 2 } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push('JS: ' + e.message.slice(0, 140)));
    p.on('requestfailed', (r) => { const e = r.failure()?.errorText; if (e && e !== 'net::ERR_ABORTED') errs.push(`не загрузилось: ${new URL(r.url()).host} ${e}`); });
    let status = '—';
    try { status = (await p.goto(url, { waitUntil: 'load', timeout: 45000 }))?.status(); } catch (e) { status = e.message.split('\n')[0]; }
    await p.waitForTimeout(wait);
    const file = `${out}/${name || 'page'}-${kind}${full ? '-full' : ''}.png`;
    await p.screenshot({ path: file, fullPage: full }).catch((e) => errs.push('скриншот: ' + e.message));
    const title = await p.title().catch(() => '');
    console.log(`${kind}: ${status} | «${title}» | ${file}`);
    [...new Set(errs)].slice(0, 8).forEach((e) => console.log('   ', e));
    await ctx.close();
  }
  await b.close();
})();
