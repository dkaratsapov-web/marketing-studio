// «Парсер»: сбор компаний по запросу и городу из открытых карт, склейка дублей между источниками,
// контакты с сайтов компаний, выгрузка в CSV. Сборы идут в фоне по одному, история хранится в базе.

import { createHash, randomBytes } from 'node:crypto';
import { SOURCES, SourceError, searchSource, normUrl, place } from './sources.js';
import { siteContacts } from './site.js';

export class ParserError extends Error {}

const KEY_PREFIX = 'parser_key_';
const KEY_RE = /^[\w.\-:]{10,300}$/;
const MAX_PER_SOURCE = 1000;
const KEEP_JOBS = 100;
const SITE_WORKERS = 5;
const SOURCE_DEADLINE = 8 * 60e3;

/** Предел времени на источник: зависший сервер не должен держать сбор и очередь. */
function deadline(promise, ms, message) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => (timer = setTimeout(() => reject(new SourceError(message)), ms)))]).finally(() => clearTimeout(timer));
}

const SOCIAL_HOSTS = [
  ['vk', /(^|\.)vk\.(com|ru)$/],
  ['telegram', /^(t|telegram)\.me$/],
  ['whatsapp', /(^|\.)(wa\.me|whatsapp\.com)$/],
  ['instagram', /(^|\.)instagram\.com$/],
  ['ok', /(^|\.)ok\.ru$/],
  ['youtube', /(^|\.)youtube\.com$/],
  ['dzen', /(^|\.)dzen\.ru$/],
];

/** Телефон для сравнения: 10 последних цифр российского номера, иначе все цифры. */
export function phoneKey(p) {
  let d = String(p ?? '').replace(/\D/g, '');
  if (d.length === 11 && (d[0] === '8' || d[0] === '7')) d = d.slice(1);
  return d.length >= 10 ? d.slice(-10) : null;
}

/**
 * Номер для показа: мобильный — +7 (900) 123-45-67; городской оставляем как в источнике (код города
 * бывает из 3, 4 и 5 цифр), только 8 в начале меняем на +7.
 */
export function formatPhone(p) {
  const raw = String(p).trim();
  const d = raw.replace(/\D/g, '');
  const n = d.length === 11 && (d[0] === '8' || d[0] === '7') ? d.slice(1) : d.length === 10 && !raw.startsWith('+') ? d : null;
  if (!n) return raw;
  if (n[0] === '9') return `+7 (${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6, 8)}-${n.slice(8)}`;
  if (/^\+?\d+$/.test(raw)) return `+7 ${n}`;
  return raw.replace(/^8(?=[\s(-])/, '+7');
}

const host = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
};
const nameKey = (p) => (p.lat != null && p.lon != null ? `${p.name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')}@${p.lat.toFixed(3)},${p.lon.toFixed(3)}` : null);

/**
 * Одна компания из разных источников — одна строка: совпали телефон, сайт или название в той же точке.
 * Поля склеиваются: телефоны и почта — все, остальное — из первого источника, где оно есть.
 */
export function mergePlaces(places) {
  const merged = [];
  const index = new Map();
  for (const p of places) {
    // соцсеть вместо сайта — переносим в соцсети
    let website = p.website;
    const socials = { ...p.socials };
    const h = website ? host(website) : null;
    const social = h ? SOCIAL_HOSTS.find(([, re]) => re.test(h)) : null;
    if (social) {
      socials[social[0]] ??= website;
      website = null;
    }
    const keys = [...p.phones.map((x) => `t:${phoneKey(x)}`).filter((k) => k !== 't:null'), website ? `w:${host(website)}` : null, nameKey(p) ? `n:${nameKey(p)}` : null].filter(Boolean);
    let m = keys.map((k) => index.get(k)).find(Boolean);
    if (!m) {
      m = { name: p.name, category: p.category, address: p.address, city: p.city, lat: p.lat, lon: p.lon, phones: [], emails: [], website: null, socials: {}, hours: p.hours, rating: null, reviews: null, sources: [], siteChecked: false };
      merged.push(m);
    }
    for (const k of keys) index.set(k, m);
    addPhones(m, p.phones);
    m.emails = [...new Set([...m.emails, ...p.emails])];
    m.website ??= website;
    for (const [k, v] of Object.entries(socials)) m.socials[k] ??= v;
    for (const f of ['category', 'address', 'city', 'lat', 'lon', 'hours']) m[f] ??= p[f];
    if (p.rating != null && (m.reviews == null || (p.reviews ?? 0) > m.reviews)) {
      m.rating = p.rating;
      m.reviews = p.reviews;
    }
    if (!m.sources.some((s) => s.source === p.source && s.id === p.sourceId)) m.sources.push({ source: p.source, id: p.sourceId, link: p.link, rating: p.rating, reviews: p.reviews });
  }
  return merged;
}

function addPhones(m, phones) {
  const have = new Set(m.phones.map(phoneKey));
  for (const raw of phones) {
    const k = phoneKey(raw);
    if (k && have.has(k)) continue;
    if (k) have.add(k);
    m.phones.push(formatPhone(raw));
  }
}

/** Город по адресу, если источник не отдал его отдельно: первая часть адреса вида «Тверь, улица …». */
function cityOf(p, geo) {
  if (p.city) return p.city.charAt(0).toUpperCase() + p.city.slice(1);
  const first = p.address?.split(',')[0]?.trim();
  if (first && !/\d|улица|ул\.|проспект|пр-т|переулок|шоссе|бульвар|площадь|набережная/i.test(first) && first.length < 40) return first;
  const g = geo.split(',')[0].trim();
  return g.charAt(0).toUpperCase() + g.slice(1);
}

const CSV_COLS = [
  ['Название', (p) => p.name],
  ['Категория', (p) => p.category],
  ['Город', (p) => p.city],
  ['Адрес', (p) => p.address],
  ['Телефоны', (p) => p.phones.join(', ')],
  ['Почта', (p) => p.emails.join(', ')],
  ['Сайт', (p) => p.website],
  ['ВКонтакте', (p) => p.socials.vk],
  ['Telegram', (p) => p.socials.telegram],
  ['WhatsApp', (p) => p.socials.whatsapp],
  ['Instagram', (p) => p.socials.instagram],
  ['Одноклассники', (p) => p.socials.ok],
  ['YouTube', (p) => p.socials.youtube],
  ['Дзен', (p) => p.socials.dzen],
  ['Часы работы', (p) => p.hours],
  ['Рейтинг', (p) => (p.rating != null ? String(p.rating).replace('.', ',') : '')],
  ['Отзывов', (p) => p.reviews],
  ['Широта', (p) => p.lat],
  ['Долгота', (p) => p.lon],
  ['Источники', (p) => p.sources.map((s) => SOURCES[s.source]?.label ?? s.source).join(', ')],
  ['Карточки на картах', (p) => p.sources.map((s) => s.link).filter(Boolean).join(' ')],
];

const csvCell = (v) => {
  let s = v == null ? '' : String(v);
  // формулы в Excel не пускаем: ячейка с = @ или + - не перед цифрой открылась бы как формула
  if (/^[=@\t\r]/.test(s) || /^[+-](?![\d (])/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV для Excel: точка с запятой, BOM — чтобы кириллица открылась без настройки. */
export function toCsv(places) {
  const lines = [CSV_COLS.map(([t]) => t).join(';'), ...places.map((p) => CSV_COLS.map(([, f]) => csvCell(f(p))).join(';'))];
  return `﻿${lines.join('\r\n')}\r\n`;
}

/** Условия сбора: у каждого поля 'yes' — должно быть, 'no' — не должно быть, нет ключа — неважно. */
export const CONDITIONS = {
  phone: { label: 'Телефон', has: (p) => p.phones.length > 0 },
  site: { label: 'Сайт', has: (p) => Boolean(p.website) },
  email: { label: 'Почта', has: (p) => p.emails.length > 0 },
  social: { label: 'Соцсети', has: (p) => Object.keys(p.socials ?? {}).length > 0 },
};

export function cleanFilters(f) {
  return Object.fromEntries(Object.keys(CONDITIONS).filter((k) => f?.[k] === 'yes' || f?.[k] === 'no').map((k) => [k, f[k]]));
}

export const matches = (p, filters, keys = Object.keys(filters)) => keys.every((k) => !filters[k] || CONDITIONS[k].has(p) === (filters[k] === 'yes'));

/** siteFetch — только для тестов: страницы сайтов без него читаются своим запросом с проверкой адреса. */
export function createParser({ db, fetchImpl = fetch, siteFetch = null, lookup = undefined, log = null, wait = undefined }) {
  const q = {
    key: db.prepare('SELECT value, updated_by, updated_at FROM app_settings WHERE key = ?'),
    putKey: db.prepare("INSERT INTO app_settings (key, value, updated_by, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at"),
    delKey: db.prepare('DELETE FROM app_settings WHERE key = ?'),
    insert: db.prepare("INSERT INTO parse_jobs (query, geo, sources, per_source, enrich, status, progress, created_by, filters) VALUES (?, ?, ?, ?, ?, 'queued', ?, ?, ?)"),
    job: db.prepare('SELECT * FROM parse_jobs WHERE id = ?'),
    jobWithCount: db.prepare('SELECT j.*, (SELECT COUNT(*) FROM parse_places p WHERE p.job_id = j.id) AS places FROM parse_jobs j WHERE j.id = ?'),
    jobs: db.prepare('SELECT j.*, (SELECT COUNT(*) FROM parse_places p WHERE p.job_id = j.id) AS places FROM parse_jobs j ORDER BY j.id DESC LIMIT ?'),
    next: db.prepare("SELECT * FROM parse_jobs WHERE status = 'queued' ORDER BY id LIMIT 1"),
    status: db.prepare('UPDATE parse_jobs SET status = ?, progress = ?, error = ?, finished_at = CASE WHEN ? THEN datetime(\'now\') ELSE finished_at END WHERE id = ?'),
    progress: db.prepare('UPDATE parse_jobs SET progress = ? WHERE id = ?'),
    interrupted: db.prepare("UPDATE parse_jobs SET status = 'error', error = 'Сбор прервался: кабинет перезапускался. Запустите заново', finished_at = datetime('now') WHERE status = 'running'"),
    addPlace: db.prepare('INSERT INTO parse_places (job_id, name, data) VALUES (?, ?, ?)'),
    places: db.prepare('SELECT data FROM parse_places WHERE job_id = ? ORDER BY id'),
    delPlaces: db.prepare('DELETE FROM parse_places WHERE job_id = ?'),
    delJob: db.prepare('DELETE FROM parse_jobs WHERE id = ?'),
    old: db.prepare('SELECT id FROM parse_jobs ORDER BY id DESC LIMIT -1 OFFSET ?'),
  };

  const keyOf = (source) => q.key.get(KEY_PREFIX + source)?.value ?? null;

  /** Источники и ключи: есть ли ключ, последние 4 символа. Самих ключей не отдаём. */
  function sources() {
    return Object.entries(SOURCES).map(([id, s]) => {
      const k = s.key ? q.key.get(KEY_PREFIX + id) : null;
      return { id, label: s.label, hint: s.hint, needsKey: s.key, needsFolder: Boolean(s.folder), manual: false, ready: !s.key || Boolean(k?.value), tail: k?.value ? k.value.slice(-4) : null, updatedBy: k?.updated_by ?? null, updatedAt: k?.updated_at ?? null };
    });
  }

  /** Ключ проверяется пробным поиском: неверный не сохраняем. */
  async function setKey(source, value, user, folderId = null) {
    if (!SOURCES[source]?.key) throw new ParserError('Этому источнику ключ не нужен');
    let key = String(value ?? '').trim();
    if (!KEY_RE.test(key)) throw new ParserError('Это не похоже на ключ API: скопируйте его целиком');
    if (SOURCES[source].folder) {
      const folder = String(folderId ?? '').trim();
      if (!/^[a-z0-9]{10,40}$/.test(folder)) throw new ParserError('Укажите ID каталога Yandex Cloud: строка вида b1g… со страницы каталога');
      key = `${folder}:${key}`;
    }
    try {
      await searchSource(source, { query: 'кафе', geo: 'Москва', limit: 1, key, fetchImpl, wait });
    } catch (err) {
      throw new ParserError(`Ключ не подошёл: ${err.message}`);
    }
    q.putKey.run(KEY_PREFIX + source, key, user?.name ?? null);
    return sources().find((s) => s.id === source);
  }

  function clearKey(source) {
    if (!SOURCES[source]) throw new ParserError('Неизвестный источник');
    q.delKey.run(KEY_PREFIX + source);
    return sources().find((s) => s.id === source);
  }

  const publicJob = (j) => (j ? { id: j.id, query: j.query, geo: j.geo, sources: j.sources.split(','), perSource: j.per_source, enrich: Boolean(j.enrich), filters: JSON.parse(j.filters ?? '{}'), status: j.status, progress: JSON.parse(j.progress ?? '{}'), error: j.error, createdBy: j.created_by, createdAt: j.created_at, finishedAt: j.finished_at, places: j.places ?? undefined } : null);

  function create({ query, geo, sources: list, perSource = 200, enrich = true, filters = {} }, user) {
    const text = String(query ?? '').trim();
    const where = String(geo ?? '').trim();
    if (text.length < 2) throw new ParserError('Напишите, что искать: например, «стоматология» или «автосервис»');
    if (where.length < 2) throw new ParserError('Укажите город или область');
    const chosen = [...new Set(list ?? [])].filter((s) => SOURCES[s]);
    if (!chosen.length) throw new ParserError('Выберите хотя бы один источник');
    const missing = chosen.filter((s) => SOURCES[s].key && !keyOf(s));
    if (missing.length) throw new ParserError(`Нет ключа API: ${missing.map((s) => SOURCES[s].label).join(', ')}. Добавьте его в «Ключи источников»`);
    const limit = Math.max(1, Math.min(MAX_PER_SOURCE, Math.round(Number(perSource) || 200)));
    const progress = { sources: Object.fromEntries(chosen.map((s) => [s, { status: 'queued', found: 0 }])), sites: null };
    const { lastInsertRowid } = q.insert.run(text.slice(0, 200), where.slice(0, 200), chosen.join(','), limit, enrich ? 1 : 0, JSON.stringify(progress), user?.name ?? null, JSON.stringify(cleanFilters(filters)));
    for (const { id } of q.old.all(KEEP_JOBS)) remove(id);
    pump();
    return job(Number(lastInsertRowid));
  }

  const job = (id) => publicJob(q.jobWithCount.get(Number(id)) ?? null);
  const list = (limit = 50) => q.jobs.all(limit).map(publicJob);

  function places(id) {
    if (!q.job.get(Number(id))) throw new ParserError('Сбор не найден');
    return q.places.all(Number(id)).map((r) => JSON.parse(r.data));
  }

  function remove(id) {
    const j = q.job.get(Number(id));
    if (!j) throw new ParserError('Сбор не найден');
    if (j.status === 'running') throw new ParserError('Сбор ещё идёт: дождитесь окончания');
    q.delPlaces.run(Number(id));
    q.delJob.run(Number(id));
  }

  function csv(id) {
    const j = q.job.get(Number(id));
    if (!j) throw new ParserError('Сбор не найден');
    return { name: `${j.query}-${j.geo}`.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 80), body: toCsv(places(id)) };
  }

  async function run(j) {
    const progress = JSON.parse(j.progress);
    const save = () => q.progress.run(JSON.stringify(progress), j.id);
    q.status.run('running', JSON.stringify(progress), null, 0, j.id);
    const found = [];
    for (const source of j.sources.split(',')) {
      progress.sources[source] = { status: 'running', found: 0, startedAt: new Date().toISOString() };
      save();
      try {
        const list = await deadline(searchSource(source, { query: j.query, geo: j.geo, limit: j.per_source, key: keyOf(source), fetchImpl, wait }), SOURCE_DEADLINE, `${SOURCES[source].label}: поиск идёт дольше 8 минут, остановлен`);
        found.push(...list);
        progress.sources[source] = { status: 'done', found: list.length };
      } catch (err) {
        log?.warn({ job: j.id, source, err: err.message }, 'Парсер: источник не ответил');
        progress.sources[source] = { status: 'error', found: 0, error: err instanceof SourceError ? err.message : `Ошибка: ${err.message}` };
      }
      save();
    }
    const filters = JSON.parse(j.filters ?? '{}');
    const all = mergePlaces(found);
    // сайт известен до захода на сайты — отсеиваем сразу; телефон, почта и соцсети могут найтись на сайте
    let merged = all.filter((m) => matches(m, filters, ['site']));
    for (const m of merged) m.city = cityOf(m, j.geo);

    if (j.enrich) {
      const todo = merged.filter((m) => m.website);
      progress.sites = { done: 0, total: todo.length, found: 0 };
      save();
      let next = 0;
      const worker = async () => {
        while (next < todo.length) {
          const m = todo[next++];
          const site = await siteContacts(normUrl(m.website), { fetchImpl: siteFetch, lookup }).catch(() => null);
          m.siteChecked = true;
          if (site) {
            const before = m.emails.length + Object.keys(m.socials).length;
            m.emails = [...new Set([...m.emails, ...site.emails])];
            addPhones(m, site.phones);
            for (const [k, v] of Object.entries(site.socials)) m.socials[k] ??= v;
            if (m.emails.length + Object.keys(m.socials).length > before) progress.sites.found++;
          } else m.siteDown = true;
          progress.sites.done++;
          if (progress.sites.done % 10 === 0) save();
        }
      };
      await Promise.all(Array.from({ length: SITE_WORKERS }, worker));
    }
    merged = merged.filter((m) => matches(m, filters));
    progress.found = all.length;
    progress.filtered = all.length - merged.length;

    db.exec('BEGIN');
    try {
      q.delPlaces.run(j.id);
      for (const m of merged) q.addPlace.run(j.id, m.name, JSON.stringify(m));
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    const failed = Object.values(progress.sources).every((s) => s.status === 'error');
    q.status.run(failed ? 'error' : 'done', JSON.stringify(progress), failed ? 'Ни один источник не ответил' : null, 1, j.id);
  }

  // Сборы по одному: источники ограничивают частоту запросов, а сайты компаний не стоит нагружать
  let running = null;
  function pump() {
    if (running) return running;
    running = (async () => {
      for (let j = q.next.get(); j; j = q.next.get()) {
        try {
          await run(j);
        } catch (err) {
          log?.error({ job: j.id, err: err.message }, 'Парсер: сбор упал');
          q.status.run('error', q.job.get(j.id)?.progress ?? '{}', `Сбор не удался: ${err.message}`, 1, j.id);
        }
      }
    })().finally(() => {
      running = null;
    });
    return running;
  }

  /** После перезапуска: прерванные сборы — с ошибкой, ждущие — продолжаем. */
  function resume() {
    q.interrupted.run();
    return pump();
  }

  // ---------- списки, которые пополняются вручную кнопкой «В CRM» на картах ----------

  const m = {
    lists: db.prepare("SELECT j.id, j.query AS name, (SELECT COUNT(*) FROM parse_places p WHERE p.job_id = j.id) AS count FROM parse_jobs j WHERE j.sources = 'manual' ORDER BY j.id DESC"),
    list: db.prepare("SELECT * FROM parse_jobs WHERE id = ? AND sources = 'manual'"),
    byName: db.prepare("SELECT * FROM parse_jobs WHERE sources = 'manual' AND lower(query) = lower(?)"),
    newList: db.prepare("INSERT INTO parse_jobs (query, geo, sources, per_source, enrich, status, progress, created_by, finished_at) VALUES (?, '', 'manual', 0, 0, 'done', '{}', ?, datetime('now'))"),
    rows: db.prepare('SELECT id, data FROM parse_places WHERE job_id = ?'),
    update: db.prepare('UPDATE parse_places SET name = ?, data = ? WHERE id = ?'),
    touch: db.prepare("UPDATE parse_jobs SET finished_at = datetime('now') WHERE id = ?"),
  };
  const lists = () => m.lists.all();

  /** Компания с открытой карточки на картах — в список (новый список создаётся по имени). Дубль — дополняется. */
  function addManual({ listId = null, listName = null, place: raw = {} }, user) {
    let list = listId ? m.list.get(Number(listId)) : null;
    if (listId && !list) throw new ParserError('Список не найден');
    if (!list) {
      const name = String(listName ?? '').trim().slice(0, 120) || 'С карт вручную';
      list = m.byName.get(name) ?? m.list.get(Number(m.newList.run(name, user?.name ?? null).lastInsertRowid));
    }
    const source = ['yandex', '2gis', 'google'].includes(raw.source) ? raw.source : 'yandex';
    const p = place({
      source,
      sourceId: raw.orgId || raw.link || raw.name,
      name: String(raw.name ?? '').slice(0, 200),
      category: String(raw.category ?? '').slice(0, 200),
      address: String(raw.address ?? '').slice(0, 300),
      city: raw.city ? String(raw.city).slice(0, 100) : null,
      lat: Number(raw.lat),
      lon: Number(raw.lon),
      phones: (raw.phones ?? []).slice(0, 10).map((x) => String(x).slice(0, 40)),
      emails: (raw.emails ?? []).slice(0, 10).map((x) => String(x).slice(0, 120)).filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)),
      website: raw.website ? String(raw.website).slice(0, 300) : null,
      socials: Object.fromEntries(Object.entries(raw.socials ?? {}).filter(([k, v]) => /^(vk|telegram|whatsapp|instagram|ok|youtube|dzen)$/.test(k) && /^https?:\/\//.test(String(v))).map(([k, v]) => [k, String(v).slice(0, 300)])),
      hours: raw.hours ? String(raw.hours).slice(0, 300) : null,
      rating: raw.rating != null && raw.rating !== '' ? Number(raw.rating) : null,
      reviews: raw.reviews != null && raw.reviews !== '' ? Number(raw.reviews) : null,
      link: /^https?:\/\//.test(String(raw.link ?? '')) ? String(raw.link).slice(0, 500) : null,
    });
    if (!raw.name || p.name === 'Без названия') throw new ParserError('Нет названия компании: откройте карточку организации');
    const rows = m.rows.all(list.id).map((r) => ({ id: r.id, data: JSON.parse(r.data) }));
    // склеиваем с тем, что уже есть в списке: тот же телефон, сайт, карточка или название в той же точке
    const merged = mergePlaces([...rows.map((r) => r.data).flatMap(asPlaces), p]);
    const target = merged.find((x) => x.sources.some((s) => s.source === p.source && s.id === p.sourceId));
    const dupRow = rows.find((r) => target.sources.some((s) => r.data.sources.some((o) => o.source === s.source && o.id === s.id)));
    target.city = cityOf(target, target.city ?? '');
    if (target.city === '') target.city = null;
    let id;
    if (dupRow) {
      target.emails = [...new Set([...dupRow.data.emails, ...target.emails])];
      m.update.run(target.name, JSON.stringify({ ...dupRow.data, ...target }), dupRow.id);
      id = dupRow.id;
    } else {
      id = Number(q.addPlace.run(list.id, target.name, JSON.stringify(target)).lastInsertRowid);
    }
    m.touch.run(list.id);
    // почта и соцсети с сайта — в фоне, ответ кнопке не задерживаем
    if (target.website && !target.siteChecked) enrichRow(id).catch((err) => log?.warn({ err: err.message }, 'Парсер: сайт не разобран'));
    return { list: { id: list.id, name: list.query }, place: target, duplicate: Boolean(dupRow) };
  }

  // сохранённая компания обратно в вид «из источников», чтобы склеить с новой
  function asPlaces(d) {
    return d.sources.map((s, i) => place({ ...d, source: s.source, sourceId: s.id, link: s.link, phones: i === 0 ? d.phones : [], emails: i === 0 ? d.emails : [], socials: i === 0 ? d.socials : {} }));
  }

  async function enrichRow(id) {
    const row = db.prepare('SELECT data FROM parse_places WHERE id = ?').get(id);
    if (!row) return;
    const d = JSON.parse(row.data);
    const site = await siteContacts(normUrl(d.website), { fetchImpl: siteFetch, lookup }).catch(() => null);
    const fresh = db.prepare('SELECT data FROM parse_places WHERE id = ?').get(id);
    if (!fresh) return;
    const cur = JSON.parse(fresh.data);
    cur.siteChecked = true;
    if (site) {
      cur.emails = [...new Set([...cur.emails, ...site.emails])];
      addPhones(cur, site.phones);
      for (const [k, v] of Object.entries(site.socials)) cur.socials[k] ??= v;
    } else cur.siteDown = true;
    m.update.run(cur.name, JSON.stringify(cur), id);
  }

  // ---------- ключи расширения «В CRM»: свои у каждого сотрудника, хранится только хеш ----------

  const sha = (t) => createHash('sha256').update(t).digest('hex');
  const t = {
    insert: db.prepare('INSERT INTO ext_tokens (user_id, token_hash, tail) VALUES (?, ?, ?)'),
    user: db.prepare('SELECT t.id AS token_id, u.id, u.name, u.role FROM ext_tokens t JOIN admin_users u ON u.id = t.user_id WHERE t.token_hash = ? AND t.revoked = 0 AND u.disabled = 0'),
    used: db.prepare("UPDATE ext_tokens SET last_used_at = datetime('now') WHERE id = ?"),
    list: db.prepare('SELECT id, tail, created_at, last_used_at FROM ext_tokens WHERE user_id = ? AND revoked = 0 ORDER BY id DESC'),
    revoke: db.prepare('UPDATE ext_tokens SET revoked = 1 WHERE id = ? AND user_id = ?'),
  };
  function issueToken(user) {
    const token = `korp_${randomBytes(24).toString('base64url')}`;
    t.insert.run(user.id, sha(token), token.slice(-4));
    return token;
  }
  function userByToken(token) {
    if (!/^korp_[\w-]{20,64}$/.test(String(token ?? ''))) return null;
    const u = t.user.get(sha(token));
    if (u) t.used.run(u.token_id);
    return u ? { id: u.id, name: u.name, role: u.role } : null;
  }
  const tokens = (user) => t.list.all(user.id);
  function revokeToken(id, user) {
    if (!t.revoke.run(Number(id), user.id).changes) throw new ParserError('Ключ не найден');
  }

  return { sources, setKey, clearKey, create, job, list, places, remove, csv, resume, settle: () => running ?? Promise.resolve(), lists, addManual, enrichRow, issueToken, userByToken, tokens, revokeToken };
}
