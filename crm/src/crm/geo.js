// Город посетителя по IP для заявок с сайта. База DB-IP «IP to City Lite» (CC BY 4.0, https://db-ip.com)
// лежит на нашем сервере в data/geo и обновляется раз в месяц: IP посетителей никуда не отправляются.
// Нет базы или не удалось скачать — заявка просто приходит без города.

import { mkdirSync, existsSync, statSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import { Reader } from 'mmdb-lib';

const FILE = 'dbip-city-lite.mmdb';
const MAX_AGE_MS = 35 * 86400e3;
const url = (d) => `https://download.db-ip.com/free/dbip-city-lite-${d.toISOString().slice(0, 7)}.mmdb.gz`;
const name = (n) => n?.names?.ru ?? n?.names?.en ?? null;
const PRIVATE = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|f[cd]|fe80:)/i;

export function createGeo({ dir, fetchImpl = globalThis.fetch, log = null, reader = null }) {
  const path = join(dir, FILE);
  let db = reader;
  let loadedAt = 0;

  function load() {
    if (reader || !existsSync(path)) return;
    const mtime = statSync(path).mtimeMs;
    if (db && mtime === loadedAt) return;
    try {
      db = new Reader(readFileSync(path));
      loadedAt = mtime;
    } catch (err) {
      log?.warn({ err: err.message }, 'База городов по IP не читается');
      db = null;
    }
  }

  /** «Тверь, Тверская область, Россия» или null. */
  function lookup(ip) {
    if (!ip || PRIVATE.test(ip)) return null;
    load();
    if (!db) return null;
    try {
      const r = db.get(ip.replace(/^::ffff:/, ''));
      if (!r) return null;
      const parts = [name(r.city), name(r.subdivisions?.[0]), name(r.country)].filter(Boolean);
      return [...new Set(parts)].join(', ') || null;
    } catch {
      return null;
    }
  }

  /** Скачать свежую базу, если её нет или ей больше 35 дней. Пробуем текущий и прошлый месяц. */
  async function update(now = new Date()) {
    if (reader) return false;
    if (existsSync(path) && now - statSync(path).mtimeMs < MAX_AGE_MS) return false;
    mkdirSync(dir, { recursive: true });
    const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15));
    for (const d of [now, prev]) {
      try {
        const res = await fetchImpl(url(d), { signal: AbortSignal.timeout(180_000) });
        if (!res.ok) continue;
        const data = gunzipSync(Buffer.from(await res.arrayBuffer()));
        new Reader(data); // проверка, что это база, а не страница с ошибкой
        const tmp = `${path}.tmp`;
        await writeFile(tmp, data);
        renameSync(tmp, path);
        db = null;
        log?.info({ month: d.toISOString().slice(0, 7) }, 'База городов по IP обновлена');
        return true;
      } catch (err) {
        rmSync(`${path}.tmp`, { force: true });
        log?.warn({ err: err.message }, 'База городов по IP не скачалась');
      }
    }
    return false;
  }

  return { lookup, update, ready: () => (load(), Boolean(db)) };
}

/** Устройство по User-Agent: «Телефон · Android 14 · Яндекс Браузер». Без точных версий браузера. */
export function deviceFromUa(ua = '') {
  const s = String(ua);
  if (!s) return null;
  const tablet = /iPad|Tablet|SM-T\d|Tab(?!le)/i.test(s) || (/Android/i.test(s) && !/Mobile/i.test(s));
  const type = tablet ? 'Планшет' : /Mobi|iPhone|Android/i.test(s) ? 'Телефон' : 'Компьютер';
  const os =
    /iPhone|iPad|iPod/.test(s) ? `iOS ${(s.match(/OS (\d+)[_.]/) ?? [])[1] ?? ''}`.trim()
    : /Android/.test(s) ? `Android ${(s.match(/Android (\d+)/) ?? [])[1] ?? ''}`.trim()
    : /Windows NT 10/.test(s) ? 'Windows'
    : /Windows/.test(s) ? 'Windows'
    : /Mac OS X/.test(s) ? 'macOS'
    : /CrOS/.test(s) ? 'ChromeOS'
    : /Linux/.test(s) ? 'Linux'
    : null;
  const browser =
    /YaBrowser|YaApp|YandexSearch/.test(s) ? 'Яндекс Браузер'
    : /Telegram/i.test(s) ? 'Telegram'
    : /Edg\//.test(s) ? 'Edge'
    : /OPR\/|Opera/.test(s) ? 'Opera'
    : /SamsungBrowser/.test(s) ? 'Samsung Internet'
    : /Firefox|FxiOS/.test(s) ? 'Firefox'
    : /CriOS|Chrome\//.test(s) ? 'Chrome'
    : /Safari\//.test(s) ? 'Safari'
    : null;
  return [type, os, browser].filter(Boolean).join(' · ');
}

/** Откуда пришёл: по меткам и адресу, с которого перешли на сайт. */
export function sourceOf({ utm = {}, referrer = '' } = {}) {
  if (utm.yclid) return 'Яндекс Директ';
  if (utm.gclid) return 'Google Ads';
  const src = String(utm.utm_source ?? '').toLowerCase();
  if (src) {
    if (/yandex|direct|ya\b/.test(src)) return `Реклама: ${utm.utm_source}`;
    if (/vk|vkontakte/.test(src)) return `Реклама VK: ${utm.utm_source}`;
    if (/tg|telegram/.test(src)) return `Реклама Telegram: ${utm.utm_source}`;
    return `Метка: ${utm.utm_source}`;
  }
  let host = '';
  try {
    host = new URL(referrer).hostname.replace(/^www\./, '');
  } catch {
    return 'Прямой заход';
  }
  if (!host || host === 'marketing-studio.pro') return 'Прямой заход';
  if (/(^|\.)yandex\.|(^|\.)ya\.ru$/.test(host)) return 'Поиск Яндекса';
  if (/(^|\.)google\./.test(host)) return 'Поиск Google';
  if (/(^|\.)(vk\.com|vk\.ru|ok\.ru)$/.test(host)) return `Соцсеть: ${host}`;
  if (/(^|\.)(t\.me|telegram\.org)$/.test(host)) return 'Telegram';
  if (/2gis\./.test(host)) return '2ГИС';
  return `Переход с ${host}`;
}
