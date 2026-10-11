/**
 * Рендер PDF-презентации отрасли в HTML. Каждая страница — лист A4 (section) с темой dark/light,
 * шапкой со знаком и номером, телом из блоков и подвалом с адресом страницы на сайте.
 *
 * Блоки (поля см. content.mjs):
 *   cover, facts, kicker, h2, h3, p, list, table, rows, fixes, chain, grid, dossier, inventory,
 *   bigmetrics, metrics4, callout, prices, faq, steps, split, people, rules, contact, shot, shots,
 *   stages, clusters, proposal, limits
 */

const SITE = "marketing-studio.pro";

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Неразрывный пробел перед ₽ и внутри чисел вида «20 000», чтобы цена не рвалась
const nb = (s = "") => esc(s).replace(/(\d) (\d)/g, "$1&nbsp;$2").replace(/ ₽/g, "&nbsp;₽").replace(/ \/ /g, "&nbsp;/ ");
const pad = (n) => String(n).padStart(2, "0");

const markSvg = (M, cls) => `<svg class="${cls}" viewBox="0 0 ${M.w} ${M.h}" aria-hidden="true"><path d="${M.ink}" class="mk-ink"/><path d="${M.lime}" class="mk-lime"/></svg>`;

const B = {
  cover: (b, ctx) => `
    <div class="cover">
      <p class="cover-sector">Отраслевое решение · ${esc(b.sector)}</p>
      <h1 class="cover-title">${esc(b.title)}<span class="dot">.</span></h1>
      <p class="cover-lead">${esc(b.lead)}</p>
      ${markSvg(ctx.mark, "cover-mark")}
    </div>`,

  facts: (b) => `
    <div class="facts">
      <p class="mono soft">${esc(b.ref)}</p>
      <div class="facts-row">${b.items.map(([v, l]) => `<div><b>${nb(v)}</b><span>${esc(l)}</span></div>`).join("")}</div>
    </div>`,

  kicker: (b) => `<p class="kicker"><i></i>${esc(b.text)}</p>`,
  h2: (b) => `<h2>${esc(b.text)}<span class="dot">.</span></h2>`,
  h3: (b) => `<h3>${esc(b.text)}</h3>`,
  p: (b) => `<p class="p">${nb(b.text)}</p>`,
  list: (b) => `<ul class="list">${b.items.map((t) => `<li>${nb(t)}</li>`).join("")}</ul>`,

  table: (b) => `
    <figure class="table">
      <table>
        <thead><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
        <tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${nb(c)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
      ${b.note ? `<figcaption class="note">${esc(b.note)}</figcaption>` : ""}
    </figure>`,

  rows: (b) => `
    <ol class="rows">${b.items.map(([tag, name, text]) => `<li><span class="mono acc">${esc(tag)}</span><b>${esc(name)}</b><p>${nb(text)}</p></li>`).join("")}</ol>`,

  fixes: (b) => {
    const numbered = b.items.every(([t]) => /^\d+$/.test(t));
    return `
    <div class="fixes${numbered ? " fixes-num" : ""}">
      ${numbered ? "" : `<div class="fixes-head mono soft"><span>Где</span><span>Как сейчас</span><span>Как делаем</span></div>`}
      ${b.items.map(([tag, was, now]) => `<div class="fix"><b class="${numbered ? "fix-no" : ""}">${esc(tag)}</b><p class="was">${nb(was)}</p><p class="now">${nb(now)}</p></div>`).join("")}
    </div>`;
  },

  chain: (b) => `
    <ol class="chain" style="--n:${b.items.length}">${b.items
      .map(([name, text], i) => `<li><span class="mono acc">${pad(i + 1)}</span><b>${esc(name)}</b>${text ? `<p>${esc(text)}</p>` : ""}</li>`)
      .join("")}</ol>`,

  grid: (b) => `
    <div class="grid" style="--cols:${b.cols}">${b.items.map(([name, text]) => `<div><b>${esc(name)}</b><p>${nb(text)}</p></div>`).join("")}</div>`,

  dossier: (b) => `
    <dl class="dossier">
      <div><dt>Клиент</dt><dd>${esc(b.client)}</dd></div>
      <div><dt>Услуги</dt><dd>${esc(b.services)}</dd></div>
      <div><dt>Задача</dt><dd>${nb(b.task)}</dd></div>
      ${b.did?.length ? `<div><dt>Что сделали</dt><dd><ul class="list">${b.did.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></dd></div>` : ""}
    </dl>`,

  inventory: (b) => `
    <ol class="inventory">${b.items
      .map(([name, text, m], i) => `<li><span class="mono soft">${pad(i + 1)}</span><b>${esc(name)}</b><p>${esc(text)}</p><span class="inv-m">${nb(m)}</span></li>`)
      .join("")}</ol>`,

  bigmetrics: (b) => `<div class="bigmetrics">${b.items.map(([v, l]) => `<div><b>${nb(v)}</b><span>${esc(l)}</span></div>`).join("")}</div>`,

  metrics4: (b) => `
    <div class="metrics4">
      <div class="m4-row">${b.items.map(([v, l]) => `<div><b>${nb(v)}</b><span>${esc(l)}</span></div>`).join("")}</div>
      ${b.note ? `<p class="note">${esc(b.note)}</p>` : ""}
    </div>`,

  callout: (b) => `<div class="callout"><b>${nb(b.value)}</b><p>${nb(b.text)}</p></div>`,

  prices: (b) => `
    <div class="prices">
      ${b.groups
        .map(
          ([g, items]) => `
        <div class="pg">
          <p class="pg-name mono">${esc(g)}</p>
          ${items.map(([n, note, price]) => `<div class="pr"><div><b>${esc(n)}</b><span>${esc(note)}</span></div><i></i><em>${nb(price)}</em></div>`).join("")}
        </div>`,
        )
        .join("")}
      ${b.note ? `<p class="note">${nb(b.note)}</p>` : ""}
    </div>`,

  faq: (b) => `<dl class="faq">${b.items.map(([q, a]) => `<div><dt>${esc(q)}</dt><dd>${nb(a)}</dd></div>`).join("")}</dl>`,

  steps: (b) => `
    <ol class="steps">${b.items
      .map(([when, name, text]) => `<li><span class="mono acc">${nb(when)}</span><b>${esc(name)}</b><p>${nb(text)}</p></li>`)
      .join("")}</ol>`,

  split: (b, ctx) => `<div class="split"><div class="col">${blocks(b.left, ctx)}</div><div class="col">${blocks(b.right, ctx)}</div></div>`,

  people: (b) => `
    <ul class="people">${b.items
      .map(([name, role]) => `<li><span class="ini">${esc(name[0])}</span><div><b>${esc(name)}</b><p>${esc(role)}</p></div></li>`)
      .join("")}</ul>`,

  rules: (b) => `<ol class="rules">${b.items.map(([n, t], i) => `<li><span class="mono acc">${pad(i + 1)}</span><div><b>${esc(n)}</b><p>${esc(t)}</p></div></li>`).join("")}</ol>`,

  contact: (b) => {
    const c = b.contacts;
    const url = `https://${SITE}${b.path}`;
    return `
    <div class="contact">
      <div class="contact-main">
        <p class="mono">Следующий шаг</p>
        <p class="contact-title">Разберём вашу рекламу и сайт на созвоне</p>
        <p class="contact-lead">Позвоните или напишите: Максим договорится о созвоне, Даниил к нему посмотрит ваши каналы и скажет, что можно сделать и сколько это стоит.</p>
      </div>
      <ul class="contact-list">
        ${c.phones.map((p) => `<li><span class="mono">Телефон</span><a href="tel:${p.replace(/[^\d+]/g, "")}">${nb(p)}</a></li>`).join("")}
        ${c.tg.map((t) => `<li><span class="mono">Telegram</span><a href="https://t.me/${t.slice(1)}">${esc(t)}</a></li>`).join("")}
        <li><span class="mono">MAX</span><a href="${esc(c.max)}">Написать в MAX</a></li>
      </ul>
      <p class="contact-hours mono"><span>На связи ${esc(c.hours)}</span><a href="${url}">${SITE}${esc(b.path)}</a></p>
    </div>`;
  },

  shot: (b) => `
    <figure class="shot${b.dark ? " shot-dark" : ""}">
      <div class="frame"><img src="img/${esc(b.img)}" alt="" style="max-height:${b.h}mm"></div>
      <figcaption class="note">${esc(b.cap)}</figcaption>
    </figure>`,

  shots: (b) => `
    <div class="shots">${b.items
      .map(
        ([img, cap, h, kind]) => `
      <figure class="shot${kind === "phone" ? " phone" : ""}">
        <div class="frame"><img src="img/${esc(img)}" alt="" style="max-height:${h}mm"></div>
        <figcaption class="note">${esc(cap)}</figcaption>
      </figure>`,
      )
      .join("")}</div>`,

  stages: (b) => `
    <div class="stages-wrap">
      <ol class="stages">${b.items
        .map(
          ([name, q, answer, tool], i) => `
        <li>
          <span class="mono acc">Стадия ${i + 1}</span>
          <b class="st-name">${esc(name)}</b>
          <p class="mono st-q">${q.split(" · ").map((x) => `«${esc(x)}»`).join("<br>")}</p>
          <p class="st-a"><span class="mono soft">Ответ</span>${esc(answer)}</p>
          <p class="st-a"><span class="mono soft">Инструмент</span>${esc(tool)}</p>
        </li>`,
        )
        .join("")}</ol>
      ${b.note ? `<p class="note">${esc(b.note)}</p>` : ""}
    </div>`,

  clusters: (b) => {
    const total = b.items.reduce((s, [n]) => s + Number(n), 0);
    return `
    <div class="clusters">
      <div class="cl-total"><b>${esc(b.total)}</b><span>страница на сайте, по группам спроса</span></div>
      <div class="cl-bar">${b.items.map(([n], i) => `<i style="flex:${n}" data-i="${i}"></i>`).join("")}</div>
      <ol class="cl-list">${b.items
        .map(([n, name, text], i) => `<li><span class="cl-sw" data-i="${i}"></span><b>${esc(n)}</b><div><b>${esc(name)}</b><p>${esc(text)}</p></div></li>`)
        .join("")}</ol>
      ${total !== Number(b.total) ? `<!-- сумма групп ${total} -->` : ""}
    </div>`;
  },

  proposal: (b) => `
    <figure class="proposal">
      <div class="pp-card">
        <p class="mono pp-head"><span>Предложение агента</span><span>ждёт решения</span></p>
        <p class="pp-action">${esc(b.action)}</p>
        <dl>${b.rows.map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        <p class="pp-btns"><span class="yes">Согласен</span><span>Не надо</span><span>Вернуть как было</span></p>
      </div>
      <figcaption class="note">${esc(b.note)}</figcaption>
    </figure>`,

  limits: (b) => `<div class="limits">${b.items.map(([v, t]) => `<div><b>${nb(v)}</b><p>${esc(t)}</p></div>`).join("")}</div>`,
};

function blocks(list, ctx) {
  // Надзаголовок, заголовок и вводный абзац держатся вместе, зазоры подгонки их не разносят
  const n = list[0]?.type === "kicker" && list[1]?.type === "h2" ? (list[2]?.type === "p" ? 3 : 2) : 0;
  const head = n ? `<div class="head">${render1(list.slice(0, n), ctx)}</div>` : "";
  return head + render1(list.slice(n), ctx);
}

function render1(list, ctx) {
  return list
    .map((b) => {
      const fn = B[b.type];
      if (!fn) throw new Error(`Неизвестный блок: ${b.type}`);
      return fn(b, ctx);
    })
    .join("\n");
}

export function render(d, MARK) {
  const total = d.pages.length;
  const pages = d.pages
    .map((pg, i) => {
      const ctx = { mark: MARK, d };
      const isCover = pg.blocks[0]?.type === "cover";
      return `
  <section class="page ${pg.theme}${isCover ? " is-cover" : ""}">
    <header class="top">
      <span class="brand">${markSvg(MARK, "brand-mark")}<b>Корпорация</b></span>
      <span class="mono soft">${esc(d.sector)}</span>
      <span class="mono">${pad(i + 1)} / ${pad(total)}</span>
    </header>
    <div class="body">${blocks(pg.blocks, ctx)}</div>
    <footer class="foot mono soft">
      <a href="https://${SITE}${d.path}">${SITE}${esc(d.path)}</a>
      <span>Маркетинговое агентство «Корпорация»</span>
    </footer>
  </section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Корпорация · ${esc(d.sector)}</title>
<link rel="stylesheet" href="fonts.css">
<style>${CSS}</style>
</head>
<body>${pages}
<script>${FIT}</script>
</body>
</html>`;
}

/**
 * Подгонка под лист: шрифт и картинки растут вместе (zoom) до 1.24, пока тело страницы
 * помещается; остаток высоты делится между блоками, но не больше 12 мм на зазор.
 */
const FIT = `
document.fonts.ready.then(async () => {
  await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => (i.onload = i.onerror = r))));
  const mm = 96 / 25.4;
  for (const pg of document.querySelectorAll(".page:not(.is-cover)")) {
    const body = pg.querySelector(".body");
    const fits = () => body.scrollHeight <= body.clientHeight + 1;
    let lo = 1, hi = 1.24;
    body.style.setProperty("--z", hi);
    if (!fits()) {
      for (let k = 0; k < 9; k++) { const z = (lo + hi) / 2; body.style.setProperty("--z", z); fits() ? (lo = z) : (hi = z); }
      body.style.setProperty("--z", lo);
    } else lo = hi;
    if (pg.querySelector(".contact")) continue;
    const kids = [...body.children];
    const free = body.getBoundingClientRect().bottom - kids.at(-1).getBoundingClientRect().bottom;
    const add = free / lo / (kids.length - 1);
    if (add > 0) body.style.gap = Math.min(4.4 * mm + add, 12 * mm) + "px";
  }
  window.__fitted = true;
});`;

const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .5 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
)}")`;

const CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #777; }
body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: "Golos Text", sans-serif; font-size: 9.6pt; line-height: 1.45; }
a { color: inherit; text-decoration: none; }
ul, ol { list-style: none; }

.page {
  --lime: #c4f542; --pink: #ff4d9d; --pink-deep: #d1006a;
  position: relative; width: 210mm; height: 297mm; overflow: hidden;
  padding: 11mm 14mm 9mm; display: flex; flex-direction: column;
  break-after: page; background: var(--bg); color: var(--fg);
}
.page:last-child { break-after: auto; }
.dark { --bg: #050505; --fg: #f4f4f0; --soft: rgb(244 244 240 / .6); --line: rgb(255 255 255 / .14); --raised: #111113; --acc: var(--lime); --acc-ink: #050505; }
.light { --bg: #ffffff; --fg: #050505; --soft: #5c5c63; --line: rgb(5 5 5 / .12); --raised: #f3f3f4; --acc: var(--pink-deep); --acc-ink: #ffffff; }
.dark::before { content: ""; position: absolute; inset: 0; background: ${GRAIN}; opacity: .07; pointer-events: none; }
.dark::after { content: ""; position: absolute; width: 150mm; height: 150mm; right: -60mm; top: -70mm; border-radius: 50%; background: radial-gradient(closest-side, rgb(196 245 66 / .16), transparent); pointer-events: none; }
.page > * { position: relative; z-index: 1; }

.mono { font-family: "IBM Plex Mono", monospace; font-size: 7.4pt; letter-spacing: .02em; line-height: 1.4; }
.soft { color: var(--soft); }
.acc { color: var(--acc); }
.dot { color: var(--acc); }
.light .dot { color: var(--pink-deep); }

/* Шапка и подвал */
.top { display: flex; align-items: center; justify-content: space-between; gap: 6mm; padding-bottom: 3.5mm; border-bottom: 1px solid var(--line); margin-bottom: 7mm; }
.brand { display: inline-flex; align-items: center; gap: 2.2mm; font-family: Geologica, sans-serif; font-size: 10pt; letter-spacing: -.01em; }
.brand-mark { width: 5.4mm; height: 5.4mm; }
.mk-ink { fill: var(--fg); } .mk-lime { fill: var(--lime); }
.top > .mono.soft { flex: 1; text-align: right; }
.foot { margin-top: auto; padding-top: 3mm; border-top: 1px solid var(--line); display: flex; justify-content: space-between; }
.body { flex: 1; display: flex; flex-direction: column; gap: 4.4mm; min-height: 0; zoom: var(--z, 1); }

/* Типографика */
h2 { font-family: Geologica, sans-serif; font-weight: 600; font-size: 25pt; line-height: 1.04; letter-spacing: -.03em; max-width: 165mm; text-wrap: balance; }
h3 { font-family: Geologica, sans-serif; font-weight: 600; font-size: 12.5pt; letter-spacing: -.015em; line-height: 1.15; margin-top: 1.5mm; }
.p { max-width: 168mm; text-wrap: pretty; }
.head { display: flex; flex-direction: column; gap: 4.4mm; }
.head .kicker { margin-bottom: -1.5mm; }
.split .table td:first-child { font-family: inherit; font-size: inherit; color: var(--soft); width: 44%; }
.kicker { display: flex; align-items: center; gap: 2mm; font-family: "IBM Plex Mono", monospace; font-size: 7.6pt; color: var(--soft); margin-bottom: -1.5mm; }
.kicker i { width: 2mm; height: 2mm; background: var(--acc); }
.dark .kicker i { background: var(--lime); }
.note { font-family: "IBM Plex Mono", monospace; font-size: 6.8pt; color: var(--soft); margin-top: 1.6mm; }
b { font-weight: 600; }

.list { display: grid; gap: 1.4mm; }
.list li { position: relative; padding-left: 4.5mm; }
.list li::before { content: ""; position: absolute; left: 0; top: .5em; width: 1.6mm; height: 1.6mm; background: var(--lime); }
.light .list li::before { background: var(--pink-deep); }

/* Обложка */
.is-cover .body { gap: 0; }
.cover { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; padding-bottom: 12mm; position: relative; }
.cover-sector { font-family: "IBM Plex Mono", monospace; font-size: 8.4pt; color: var(--lime); margin-bottom: 6mm; }
.cover-title { font-family: Geologica, sans-serif; font-weight: 600; font-size: 54pt; line-height: .95; letter-spacing: -.045em; max-width: 160mm; }
.cover-lead { font-size: 12pt; line-height: 1.45; max-width: 140mm; margin-top: 8mm; color: rgb(244 244 240 / .82); }
.cover-mark { position: absolute; right: -4mm; top: 8mm; width: 82mm; height: 82mm; opacity: .95; }
.cover-mark .mk-ink { fill: #1d1d20; }
.facts { border-top: 1px solid var(--line); padding-top: 5mm; }
.facts-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; margin-top: 4mm; }
.facts-row b { display: block; font-family: Geologica, sans-serif; font-size: 30pt; letter-spacing: -.04em; line-height: 1; color: var(--lime); }
.facts-row span { display: block; margin-top: 2mm; color: var(--soft); }

/* Таблица */
.table table { width: 100%; border-collapse: collapse; }
.table th { text-align: left; font-family: "IBM Plex Mono", monospace; font-weight: 400; font-size: 7.2pt; color: var(--soft); padding: 0 3mm 2mm 0; border-bottom: 1px solid var(--fg); }
.table td { padding: 2.4mm 3mm 2.4mm 0; border-bottom: 1px solid var(--line); vertical-align: top; }
.table td:first-child { font-family: "IBM Plex Mono", monospace; font-size: 8.2pt; }
.table td:nth-child(2) { font-weight: 500; }

/* Тройки: путь гостя */
.rows li { display: grid; grid-template-columns: 20mm 48mm 1fr; gap: 4mm; padding: 2.6mm 0; border-top: 1px solid var(--line); align-items: baseline; }
.rows li:last-child { border-bottom: 1px solid var(--line); }
.rows b { font-family: Geologica, sans-serif; font-size: 10.5pt; letter-spacing: -.01em; }

/* Поломки */
.fixes-head, .fix { display: grid; grid-template-columns: 22mm 1fr 1fr; gap: 5mm; }
.fixes-head { padding-bottom: 1.6mm; border-bottom: 1px solid var(--fg); }
.fix { padding: 2.8mm 0; border-bottom: 1px solid var(--line); align-items: start; }
.fix > b { font-family: Geologica, sans-serif; font-size: 10.5pt; }
.fix .was { color: var(--soft); }
.fix .now { position: relative; padding-left: 4.5mm; font-weight: 500; }
.fix .now::before { content: ""; position: absolute; left: 0; top: .45em; width: 2mm; height: 2mm; border-radius: 50%; background: var(--lime); box-shadow: 0 0 0 .6mm rgb(196 245 66 / .3); }
.fixes-num .fix { grid-template-columns: 10mm 1fr 1fr; }
.fixes-num .fix:first-child { border-top: 1px solid var(--line); }
.fix-no { display: inline-grid; place-items: center; width: 7mm; height: 7mm; border-radius: 50%; border: 1px solid var(--fg); font-size: 9pt !important; }
.fixes-num .was { color: var(--fg); font-weight: 500; }
.fixes-num .now { font-weight: 400; color: var(--soft); }

/* Цепочка */
.chain { display: grid; grid-template-columns: repeat(var(--n), 1fr); position: relative; }
.chain::before { content: ""; position: absolute; left: 0; right: 0; top: 7.6mm; height: 1px; background: var(--fg); }
.chain li { position: relative; padding-right: 2.5mm; }
.chain li::after { content: ""; position: absolute; left: 0; top: 6.4mm; width: 2.4mm; height: 2.4mm; border-radius: 50%; background: var(--bg); border: 1px solid var(--fg); }
.chain li:last-child::after { background: var(--lime); border-color: var(--lime); }
.chain b { display: block; margin-top: 6mm; font-family: Geologica, sans-serif; font-size: 10pt; letter-spacing: -.01em; }
.chain p { margin-top: 1mm; font-size: 8.2pt; color: var(--soft); line-height: 1.35; }

/* Сетка */
.grid { display: grid; grid-template-columns: repeat(var(--cols), 1fr); column-gap: 7mm; }
.grid > div { padding: 3mm 0 3.2mm; border-top: 1px solid var(--line); }
.grid b { display: block; font-family: Geologica, sans-serif; font-size: 10.5pt; letter-spacing: -.01em; margin-bottom: 1.2mm; }
.grid p { color: var(--soft); font-size: 9pt; }
.dark .grid b::before { content: ""; display: inline-block; width: 1.6mm; height: 1.6mm; background: var(--lime); margin-right: 2mm; vertical-align: .15em; }

/* Досье */
.dossier { border: 1px solid var(--line); background: var(--raised); }
.dossier > div { display: grid; grid-template-columns: 30mm 1fr; gap: 5mm; padding: 3mm 5mm; border-bottom: 1px solid var(--line); }
.dossier > div:last-child { border-bottom: 0; }
.dossier dt { font-family: "IBM Plex Mono", monospace; font-size: 7.4pt; color: var(--soft); padding-top: .4mm; }

/* Опись работ */
.inventory li { display: grid; grid-template-columns: 8mm 46mm 1fr 34mm; gap: 4mm; padding: 2.5mm 0; border-top: 1px solid var(--line); align-items: baseline; }
.inventory li:last-child { border-bottom: 1px solid var(--line); }
.inventory b { font-family: Geologica, sans-serif; font-size: 10pt; }
.inventory p { color: var(--soft); }
.inv-m { justify-self: end; font-family: "IBM Plex Mono", monospace; font-size: 8.4pt; color: var(--acc); text-align: right; }

/* Метрики */
.bigmetrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; padding: 6mm 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.bigmetrics b { display: block; font-family: Geologica, sans-serif; font-size: 40pt; line-height: .95; letter-spacing: -.05em; color: var(--lime); text-shadow: 0 0 10mm rgb(196 245 66 / .35); }
.bigmetrics span { display: block; margin-top: 2mm; color: var(--soft); }
.m4-row { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid var(--line); }
.m4-row > div { padding: 3.6mm 4mm; border-right: 1px solid var(--line); }
.m4-row > div:last-child { border-right: 0; }
.m4-row b { display: block; font-family: Geologica, sans-serif; font-size: 19pt; line-height: 1; letter-spacing: -.035em; color: var(--acc); }
.m4-row span { display: block; margin-top: 1.6mm; font-size: 8.4pt; color: var(--soft); }
.callout { padding: 5mm; background: var(--pink); color: #050505; height: 100%; }
.callout b { display: block; font-family: Geologica, sans-serif; font-size: 46pt; line-height: .9; letter-spacing: -.05em; }
.callout p { margin-top: 3mm; font-weight: 500; }

/* Цены */
.prices { display: grid; gap: 3.4mm; }
.pg-name { color: var(--acc); padding-bottom: 1mm; }
.pr { display: grid; grid-template-columns: auto 1fr auto; align-items: end; gap: 3mm; padding: 2mm 0; border-top: 1px solid var(--line); }
.pr b { display: block; font-family: Geologica, sans-serif; font-size: 10.5pt; letter-spacing: -.01em; }
.pr span { display: block; font-size: 8.2pt; color: var(--soft); }
.pr i { border-bottom: 1px dotted var(--soft); margin-bottom: 1.2mm; }
.pr em { font-style: normal; font-family: "IBM Plex Mono", monospace; font-size: 9pt; font-weight: 500; white-space: nowrap; }
.pg:last-of-type .pr { background: var(--raised); padding: 2.6mm 3mm; border-top: 2px solid var(--acc); }

/* Вопросы */
.faq { display: grid; grid-template-columns: 1fr 1fr; gap: 3.6mm 7mm; }
.faq > div { border-top: 1px solid var(--line); padding-top: 2.4mm; }
.faq dt { font-family: Geologica, sans-serif; font-weight: 600; font-size: 10pt; letter-spacing: -.01em; margin-bottom: 1.2mm; }
.faq dd { color: var(--soft); font-size: 9pt; }

/* Шаги */
.steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; }
.steps li { padding: 3.4mm 3.6mm; border: 1px solid var(--line); background: var(--raised); }
.steps b { display: block; margin: 1.6mm 0 1mm; font-family: Geologica, sans-serif; font-size: 10.5pt; }
.steps p { font-size: 8.6pt; color: var(--soft); }

/* Колонки */
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; align-items: start; }
.split .col { display: flex; flex-direction: column; gap: 3.4mm; min-width: 0; }
.split h3 { margin-top: 0; }

.people li { display: grid; grid-template-columns: 9mm 1fr; gap: 3mm; padding: 2.2mm 0; border-top: 1px solid var(--line); align-items: center; }
.ini { display: grid; place-items: center; width: 9mm; height: 9mm; border-radius: 50%; background: var(--lime); color: #050505; font-family: Geologica, sans-serif; font-weight: 600; }
.people p { font-size: 8.4pt; color: var(--soft); }
.rules li { display: grid; grid-template-columns: 7mm 1fr; gap: 2mm; padding: 2.2mm 0; border-top: 1px solid var(--line); }
.rules p { font-size: 8.4pt; color: var(--soft); }

/* Контакты */
.contact { margin-top: auto; display: grid; grid-template-columns: 1.15fr 1fr; gap: 3mm 8mm; padding: 7mm; background: var(--lime); color: #050505; }
.contact .mono { color: rgb(5 5 5 / .62); }
.contact-title { font-family: Geologica, sans-serif; font-weight: 600; font-size: 19pt; line-height: 1.05; letter-spacing: -.03em; margin: 2mm 0 3mm; }
.contact-lead { font-size: 9pt; }
.contact-list li { display: grid; grid-template-columns: 26mm 1fr; padding: 1.7mm 0; border-bottom: 1px solid rgb(5 5 5 / .18); align-items: baseline; }
.contact-list a { font-weight: 600; font-size: 10.5pt; white-space: nowrap; }
.contact-hours { grid-column: 1 / -1; display: flex; justify-content: space-between; gap: 4mm; padding-top: 2mm; border-top: 1px solid rgb(5 5 5 / .18); }
.contact-hours a { color: #050505; text-decoration: underline; text-underline-offset: .6mm; }

/* Скриншоты */
.shot .frame { display: flex; width: fit-content; max-width: 100%; border-radius: 2.4mm; overflow: hidden; border: 1px solid var(--line); background: var(--raised); box-shadow: 0 2mm 6mm rgb(5 5 5 / .08); }
.shot img { display: block; width: auto; height: auto; max-width: 100%; }
.shot-dark .frame { box-shadow: 0 0 0 1px rgb(196 245 66 / .25), 0 3mm 10mm rgb(0 0 0 / .5); }
.shots { display: flex; gap: 5mm; align-items: flex-start; }
.shots .shot { flex: 1; min-width: 0; }
.shots .shot.phone { flex: none; }
.phone .frame { border-radius: 4.5mm; border: 1.6mm solid #111113; box-shadow: 0 2mm 6mm rgb(5 5 5 / .18); }

/* Стадии спроса */
.stages { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; counter-reset: s; }
.stages li { padding: 4mm; background: var(--raised); border-top: 2px solid var(--acc); display: flex; flex-direction: column; gap: 2mm; }
.stages li:nth-child(3) { background: #050505; color: #f4f4f0; border-top-color: var(--lime); }
.stages li:nth-child(3) .acc { color: var(--lime); }
.stages li:nth-child(3) .soft, .stages li:nth-child(3) .st-q { color: rgb(244 244 240 / .62); }
.st-name { font-family: Geologica, sans-serif; font-size: 13pt; letter-spacing: -.02em; }
.st-q { color: var(--soft); font-size: 7.2pt; }
.st-a span { display: block; font-size: 6.8pt; margin-bottom: .4mm; }
.st-a { font-size: 8.8pt; font-weight: 500; }

/* Карта спроса */
.cl-total { display: flex; align-items: baseline; gap: 4mm; }
.cl-total b { font-family: Geologica, sans-serif; font-size: 44pt; line-height: .9; letter-spacing: -.05em; color: var(--acc); }
.cl-total span { color: var(--soft); }
.cl-bar { display: flex; gap: .8mm; height: 7mm; margin: 4mm 0 3mm; }
.cl-bar i, .cl-sw { background: #050505; }
[data-i="1"] { background: #3a3a40 !important; } [data-i="2"] { background: #8f8f96 !important; } [data-i="3"] { background: var(--lime) !important; } [data-i="4"] { background: var(--pink-deep) !important; } [data-i="5"] { background: #d4d4d8 !important; }
.cl-bar i:first-child, .cl-sw[data-i="0"] { background: #050505; }
.cl-list { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2.4mm 6mm; }
.cl-list li { display: grid; grid-template-columns: 2.4mm 9mm 1fr; gap: 2mm; align-items: baseline; }
.cl-sw { width: 2.4mm; height: 2.4mm; }
.cl-list > li > b { font-family: Geologica, sans-serif; font-size: 13pt; letter-spacing: -.03em; }
.cl-list div b { font-size: 9pt; } .cl-list p { font-size: 8pt; color: var(--soft); }

/* Предложение агента */
.pp-card { border: 1px solid rgb(196 245 66 / .4); background: #0e0e10; padding: 4.4mm; }
.pp-head { display: flex; justify-content: space-between; color: var(--lime); }
.pp-head span:last-child { color: var(--soft); }
.pp-action { font-family: Geologica, sans-serif; font-weight: 600; font-size: 11.5pt; line-height: 1.2; letter-spacing: -.015em; margin: 2.6mm 0 3mm; }
.pp-card dl > div { display: grid; grid-template-columns: 16mm 1fr; gap: 2mm; padding: 1.6mm 0; border-top: 1px solid var(--line); font-size: 8.6pt; }
.pp-card dt { color: var(--soft); }
.pp-btns { display: flex; gap: 2mm; margin-top: 3mm; }
.pp-btns span { font-family: "IBM Plex Mono", monospace; font-size: 7pt; padding: 1.4mm 2.4mm; border: 1px solid var(--line); }
.pp-btns .yes { background: var(--lime); color: #050505; border-color: var(--lime); }
.limits { display: grid; grid-template-columns: 1fr 1fr; gap: 2.4mm; }
.limits > div { padding: 2.6mm 3mm; border: 1px solid var(--line); }
.limits b { display: block; font-family: Geologica, sans-serif; font-size: 15pt; letter-spacing: -.03em; color: var(--lime); line-height: 1.05; }
.limits p { font-size: 8pt; color: var(--soft); margin-top: .8mm; }

@media screen { body { display: grid; gap: 6mm; padding: 6mm; justify-content: center; } }
@media print { html, body { background: none; } }
`;
