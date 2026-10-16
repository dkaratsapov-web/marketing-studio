// Контакты с сайта компании: почта, телефоны, соцсети и мессенджеры с главной и страницы «Контакты».
// Сайты чужие, поэтому осторожно: только http(s) на стандартных портах, не во внутреннюю сеть,
// не больше 1,5 МБ и 10 секунд на страницу.

import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const MAX_BYTES = 1_500_000;
const TIMEOUT = 10_000;
const UA = 'Mozilla/5.0 (compatible; KorpCabinet/1.0; +https://marketing-studio.pro)';

/** Адрес из частной, служебной или локальной сети — туда не ходим. */
export function privateIp(ip) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b < 128) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b < 32) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith('::ffff:')) return privateIp(v.slice(7));
  return v === '::' || v === '::1' || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith('ff');
}

async function safeUrl(raw, lookup) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(u.protocol) || (u.port && !['80', '443'].includes(u.port)) || u.username || u.password) return null;
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return null;
  const ips = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((x) => x.address);
  if (!ips.length || ips.some(privateIp)) return null;
  return u;
}

/** Страница сайта текстом; переходы проверяем на каждом шаге. */
export async function fetchPage(url, { fetchImpl = fetch, lookup = dnsLookup } = {}) {
  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    const u = await safeUrl(current, lookup);
    if (!u) return null;
    let res;
    try {
      res = await fetchImpl(u.href, { redirect: 'manual', headers: { 'user-agent': UA, accept: 'text/html,*/*;q=0.5', 'accept-language': 'ru' }, signal: AbortSignal.timeout(TIMEOUT) });
    } catch {
      return null;
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return null;
      current = new URL(loc, u).href;
      continue;
    }
    if (!res.ok || !/html|text/i.test(res.headers.get('content-type') ?? 'text/html')) return null;
    return { url: u.href, html: await readLimited(res) };
  }
  return null;
}

async function readLimited(res) {
  if (!res.body?.getReader) return (await res.text()).slice(0, MAX_BYTES);
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  reader.cancel().catch(() => {});
  return new TextDecoder('utf-8', { fatal: false }).decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
}

const SOCIAL = [
  ['vk', /https?:\/\/(?:m\.)?vk\.(?:com|ru)\/[\w.\-]+/i],
  ['telegram', /https?:\/\/(?:t\.me|telegram\.me)\/[\w+\-]+/i],
  ['whatsapp', /https?:\/\/(?:wa\.me\/\d+|(?:api\.)?whatsapp\.com\/send\?phone=\d+)/i],
  ['instagram', /https?:\/\/(?:www\.)?instagram\.com\/[\w.\-]+/i],
  ['ok', /https?:\/\/(?:www\.)?ok\.ru\/[\w.\-/]+/i],
  ['youtube', /https?:\/\/(?:www\.)?youtube\.com\/(?:@|c\/|channel\/)[\w.\-]+/i],
  ['dzen', /https?:\/\/dzen\.ru\/[\w.\-]+/i],
];
// ссылки «поделиться» и служебные страницы соцсетей — не аккаунт компании
const SOCIAL_NOISE = /\/(share|sharer|intent|widget|js|images?|away\.php|login|search)\b/i;
const EMAIL = /[\w.+\-]+@[\w\-]+(?:\.[\w\-]+)*\.[a-z]{2,}/gi;
const FILE_EXT = /\.(png|jpe?g|gif|svg|webp|css|js)$/i;

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#64;|&commat;/g, '@').replace(/%40/g, '@');

/** Почта, телефоны и соцсети из HTML страницы. */
export function extractContacts(html) {
  const text = decode(html);
  const emails = new Set();
  for (const m of text.matchAll(/mailto:([^"'?\s>]+)/gi)) emails.add(m[1].toLowerCase());
  for (const m of text.matchAll(EMAIL)) if (!FILE_EXT.test(m[0]) && !/example\.|sentry|wixpress|@2x|@3x/i.test(m[0])) emails.add(m[0].toLowerCase());
  const phones = new Set();
  for (const m of text.matchAll(/href=["']tel:([^"']+)["']/gi)) {
    const p = m[1].replace(/[^\d+]/g, '');
    if (p.replace(/\D/g, '').length >= 10) phones.add(p);
  }
  const socials = {};
  for (const [k, re] of SOCIAL) {
    const g = new RegExp(re.source, 'gi');
    for (const m of text.matchAll(g)) {
      if (SOCIAL_NOISE.test(m[0])) continue;
      socials[k] = m[0];
      break;
    }
  }
  return { emails: [...emails].slice(0, 5), phones: [...phones].slice(0, 5), socials };
}

/** Ссылка на страницу контактов, если она есть на главной. */
export function contactsLink(html, base) {
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi)) {
    if (/контакт|contact|kontakt/i.test(m[1]) || /контакт/i.test(m[2])) {
      try {
        const u = new URL(m[1], base);
        if (u.hostname === new URL(base).hostname) return u.href;
      } catch {
        /* битая ссылка */
      }
    }
  }
  return null;
}

/** Контакты сайта: главная и, если нашлась, страница контактов. null — сайт не открылся. */
export async function siteContacts(website, opts = {}) {
  const home = await fetchPage(website, opts);
  if (!home) return null;
  const found = extractContacts(home.html);
  const link = contactsLink(home.html, home.url);
  if (link && link !== home.url) {
    const page = await fetchPage(link, opts);
    if (page) {
      const more = extractContacts(page.html);
      found.emails = [...new Set([...found.emails, ...more.emails])].slice(0, 5);
      found.phones = [...new Set([...found.phones, ...more.phones])].slice(0, 5);
      found.socials = { ...more.socials, ...found.socials };
    }
  }
  return found;
}
