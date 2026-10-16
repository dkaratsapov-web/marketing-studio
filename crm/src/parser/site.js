// Контакты с сайта компании: почта, телефоны, соцсети и мессенджеры с главной и страницы «Контакты».
// Сайты чужие, поэтому осторожно: только http(s) на стандартных портах, не во внутреннюю сеть,
// не больше 1,5 МБ и 15 секунд на страницу.

import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';

const MAX_BYTES = 1_500_000;
const TIMEOUT = 15_000;
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
  // IPv4 надёжнее: у многих хостингов IPv6 в DNS есть, а сайт по нему не отвечает
  return { url: u, ip: ips.find((ip) => isIP(ip) === 4) ?? ips[0] };
}

/**
 * Страница сайта текстом; переходы проверяем на каждом шаге.
 * fetchImpl — для тестов; без него страница читается своим запросом (nativeGet).
 */
export async function fetchPage(url, { fetchImpl = null, lookup = dnsLookup } = {}) {
  let current = url;
  for (let hop = 0; hop < 5; hop++) {
    const safe = await safeUrl(current, lookup);
    if (!safe) return null;
    const res = fetchImpl ? await viaFetch(fetchImpl, safe.url) : await nativeGet(safe.url, safe.ip);
    if (!res) return null;
    if (res.status >= 300 && res.status < 400) {
      if (!res.location) return null;
      current = new URL(res.location, safe.url).href;
      continue;
    }
    if (res.status >= 400 || !/html|text/i.test(res.type || 'text/html')) return null;
    return { url: safe.url.href, html: decodeHtml(res.body, res.type) };
  }
  return null;
}

async function viaFetch(fetchImpl, u) {
  try {
    const res = await fetchImpl(u.href, { redirect: 'manual', headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT) });
    return { status: res.status, location: res.headers.get('location'), type: res.headers.get('content-type') ?? '', body: Buffer.from(await res.text()) };
  } catch {
    return null;
  }
}

const HEADERS = { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,*/*;q=0.5', 'accept-language': 'ru,en;q=0.5', 'accept-encoding': 'gzip, deflate, br' };

/**
 * GET на уже проверенный адрес: соединение идёт строго на этот IP (DNS второй раз не спрашиваем),
 * сертификат не проверяем — у многих сайтов он просрочен или выдан Минцифры, а мы только читаем
 * открытую страницу. Сжатие распаковываем, читаем не больше MAX_BYTES.
 */
export function nativeGet(u, ip) {
  return new Promise((resolve) => {
    const mod = u.protocol === 'https:' ? https : http;
    const family = isIP(ip);
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(v);
    };
    const req = mod.request(
      u,
      {
        method: 'GET',
        headers: HEADERS,
        rejectUnauthorized: false,
        servername: isIP(u.hostname) ? undefined : u.hostname,
        lookup: (host, opts, cb) => (opts?.all ? cb(null, [{ address: ip, family }]) : cb(null, ip, family)),
      },
      (res) => {
        const type = String(res.headers['content-type'] ?? '');
        if (res.statusCode >= 300 && res.statusCode < 400) {
          res.resume();
          return finish({ status: res.statusCode, location: res.headers.location ?? null, type, body: Buffer.alloc(0) });
        }
        const enc = String(res.headers['content-encoding'] ?? '').toLowerCase();
        const stream = enc === 'gzip' ? res.pipe(zlib.createGunzip()) : enc === 'deflate' ? res.pipe(zlib.createInflate()) : enc === 'br' ? res.pipe(zlib.createBrotliDecompress()) : res;
        const chunks = [];
        let size = 0;
        const end = () => finish({ status: res.statusCode, location: null, type, body: Buffer.concat(chunks) });
        stream.on('data', (c) => {
          chunks.push(c);
          size += c.length;
          if (size >= MAX_BYTES) {
            end();
            req.destroy();
          }
        });
        stream.on('end', end);
        stream.on('error', () => (chunks.length ? end() : finish(null)));
      },
    );
    const timer = setTimeout(() => {
      req.destroy();
      finish(null);
    }, TIMEOUT);
    req.on('error', () => finish(null));
    req.end();
  });
}

/** Кодировка из заголовка или из <meta charset>: старые сайты бывают в windows-1251. */
export function decodeHtml(buf, type = '') {
  const head = buf.subarray(0, 4096).toString('latin1');
  const charset = (/charset=["']?([\w-]+)/i.exec(type)?.[1] ?? /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1] ?? 'utf-8').toLowerCase();
  try {
    return new TextDecoder(charset === 'cp1251' ? 'windows-1251' : charset, { fatal: false }).decode(buf);
  } catch {
    return new TextDecoder('utf-8', { fatal: false }).decode(buf);
  }
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
