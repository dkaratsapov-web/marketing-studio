// Статистика клиентов: какие кабинеты подключены, загрузка дневных цифр из Директа и Метрики,
// сводка за период по всем клиентам и динамика по одному клиенту.

import { directDaily, metrikaDaily, metrikaGoals, metrikaCounters, AdApiError } from './yandex.js';

export class AdStatsError extends Error {}

const SYNC_DAYS = 10; // цифры за последние дни Директ и Метрика ещё уточняют — перезагружаем их
const FIRST_DAYS = 90; // после подключения — история за три месяца
const iso = (d) => d.toISOString().slice(0, 10);
const mskToday = () => iso(new Date(Date.now() + 3 * 3600e3));
const shift = (date, n) => iso(new Date(Date.parse(`${date}T12:00:00Z`) + n * 86400e3));
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const TOKEN_KEY = 'yandex_ads_token';
const TOKEN_RE = /^[\w.\-]{20,400}$/;

/** token — из .env (YANDEX_ADS_TOKEN); токен, сохранённый администратором в кабинете, важнее. */
export function createAdStats({ db, token: envToken = null, fetchImpl = fetch, log = null }) {
  const settings = {
    get: db.prepare('SELECT value, updated_by, updated_at FROM app_settings WHERE key = ?'),
    put: db.prepare("INSERT INTO app_settings (key, value, updated_by, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at"),
    del: db.prepare('DELETE FROM app_settings WHERE key = ?'),
  };
  const saved = () => settings.get.get(TOKEN_KEY);
  const currentToken = () => saved()?.value || envToken || null;
  const q = {
    account: db.prepare('SELECT * FROM ad_accounts WHERE client_id = ?'),
    accounts: db.prepare(
      `SELECT a.*, c.name AS client_name, c.agency FROM ad_accounts a JOIN clients c ON c.id = a.client_id
       WHERE c.archived = 0 AND (a.direct_enabled = 1 OR a.metrika_counter IS NOT NULL)`,
    ),
    upsertAccount: db.prepare(
      `INSERT INTO ad_accounts (client_id, direct_login, direct_enabled, metrika_counter, goals, token, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(client_id) DO UPDATE SET direct_login = excluded.direct_login, direct_enabled = excluded.direct_enabled,
         metrika_counter = excluded.metrika_counter, goals = excluded.goals, token = excluded.token, error = NULL, updated_at = datetime('now')`,
    ),
    synced: db.prepare("UPDATE ad_accounts SET synced_at = datetime('now'), error = ? WHERE client_id = ?"),
    putDaily: db.prepare(
      `INSERT INTO ad_daily (client_id, source, date, impressions, clicks, cost, conversions, visits, bounces, goals)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(client_id, source, date) DO UPDATE SET impressions = excluded.impressions, clicks = excluded.clicks, cost = excluded.cost,
         conversions = excluded.conversions, visits = excluded.visits, bounces = excluded.bounces, goals = excluded.goals`,
    ),
    dropSource: db.prepare('DELETE FROM ad_daily WHERE client_id = ? AND source = ?'),
    totals: db.prepare(
      `SELECT client_id,
              SUM(impressions) AS impressions, SUM(clicks) AS clicks, SUM(cost) AS cost, SUM(conversions) AS conversions,
              SUM(visits) AS visits, SUM(bounces) AS bounces, SUM(goals) AS goals
       FROM ad_daily WHERE date BETWEEN ? AND ? GROUP BY client_id`,
    ),
    daily: db.prepare(
      `SELECT date, SUM(impressions) AS impressions, SUM(clicks) AS clicks, SUM(cost) AS cost, SUM(conversions) AS conversions,
              SUM(visits) AS visits, SUM(bounces) AS bounces, SUM(goals) AS goals
       FROM ad_daily WHERE client_id = ? AND date BETWEEN ? AND ? GROUP BY date ORDER BY date`,
    ),
    clients: db.prepare("SELECT id, name, agency FROM clients WHERE archived = 0 ORDER BY name COLLATE NOCASE"),
    client: db.prepare('SELECT id FROM clients WHERE id = ?'),
  };

  // загруженные строки источника пишутся целиком или не пишутся вовсе
  function writeRows(fn) {
    db.exec('BEGIN');
    try {
      fn();
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
  const goalsOf = (a) => (a?.goals ? a.goals.split(',').filter(Boolean) : []);
  // у клиента может быть свой токен (его собственный кабинет); иначе — общий токен агентства
  const tokenFor = (a) => a?.token || currentToken();
  /** Аккаунт без самого токена: наружу — только признак и последние 4 символа. */
  const publicAccount = (a) => {
    if (!a) return null;
    const { token, ...rest } = a;
    return { ...rest, own_token: Boolean(token), token_tail: token ? token.slice(-4) : null };
  };
  const needToken = () => {
    const token = currentToken();
    if (!token) throw new AdStatsError('Не подключён токен Яндекса: администратор вставляет его в «Статистике» → «Токен Яндекса»');
    return token;
  };

  function period(from, to) {
    const end = ISO_DATE.test(to ?? '') ? to : mskToday();
    const start = ISO_DATE.test(from ?? '') ? from : shift(end, -29);
    if (start > end) throw new AdStatsError('Начало периода позже конца');
    return { from: start, to: end };
  }

  /** Настройки подключения клиента: логин в Директе, счётчик Метрики, цели через запятую. */
  function saveAccount(clientId, v) {
    if (!q.client.get(Number(clientId))) throw new AdStatsError('Клиент не найден');
    const login = String(v.directLogin ?? '').trim() || null;
    const counter = String(v.metrikaCounter ?? '').trim() || null;
    if (counter && !/^\d{1,12}$/.test(counter)) throw new AdStatsError('Номер счётчика Метрики — только цифры');
    if (login && !/^[\w.@-]{1,100}$/.test(login)) throw new AdStatsError('Логин Директа: латиница, цифры, точка, дефис');
    const goals = [...new Set(String(v.goals ?? '').split(/[\s,;]+/).filter(Boolean))];
    if (goals.some((g) => !/^\d{1,12}$/.test(g))) throw new AdStatsError('Цели — номера целей Метрики через запятую');
    const before = q.account.get(Number(clientId));
    const direct = v.directEnabled ? 1 : 0;
    // свой токен: пусто — оставить как был, clearToken — убрать, иначе — заменить
    const newToken = String(v.token ?? '').trim();
    if (newToken && !TOKEN_RE.test(newToken)) throw new AdStatsError('Это не похоже на токен Яндекса: скопируйте строку целиком, она начинается с y0_');
    const token = v.clearToken ? null : newToken || before?.token || null;
    q.upsertAccount.run(Number(clientId), login, direct, counter, goals.join(',') || null, token);
    if (before && (before.token ?? null) !== token) {
      q.dropSource.run(Number(clientId), 'direct');
      q.dropSource.run(Number(clientId), 'metrika');
    }
    // выключили источник или сменили кабинет — старые цифры этого источника не смешиваем с новыми
    if (before && (!direct || before.direct_login !== login)) q.dropSource.run(Number(clientId), 'direct');
    if (before && before.metrika_counter !== counter) q.dropSource.run(Number(clientId), 'metrika');
    if (before && before.goals !== (goals.join(',') || null)) {
      q.dropSource.run(Number(clientId), 'direct');
      q.dropSource.run(Number(clientId), 'metrika');
    }
    return publicAccount(q.account.get(Number(clientId)));
  }

  /** Загрузка цифр одного клиента за период; ошибка запоминается у клиента, остальные грузятся дальше. */
  async function syncClient(clientId, { days = null } = {}) {
    const a = q.account.get(Number(clientId));
    if (!a || (!a.direct_enabled && !a.metrika_counter)) throw new AdStatsError('У клиента не подключены Директ и Метрика');
    const token = a.token || needToken();
    const to = mskToday();
    const from = shift(to, -((days ?? (a.synced_at ? SYNC_DAYS : FIRST_DAYS)) - 1));
    const goals = goalsOf(a);
    const errors = [];
    if (a.direct_enabled) {
      try {
        const rows = await directDaily({ token, login: a.direct_login, from, to, goals, fetchImpl });
        writeRows(() => rows.forEach((r) => q.putDaily.run(a.client_id, 'direct', r.date, r.impressions, r.clicks, r.cost, r.conversions, 0, 0, 0)));
      } catch (err) {
        errors.push(err instanceof AdApiError ? err.message : `Директ: ${err.message}`);
      }
    }
    if (a.metrika_counter) {
      try {
        const rows = await metrikaDaily({ token, counter: a.metrika_counter, from, to, goals, fetchImpl });
        writeRows(() => rows.forEach((r) => q.putDaily.run(a.client_id, 'metrika', r.date, 0, 0, 0, 0, r.visits, r.bounces, r.goals)));
      } catch (err) {
        errors.push(err instanceof AdApiError ? err.message : `Метрика: ${err.message}`);
      }
    }
    q.synced.run(errors.join('; ') || null, a.client_id);
    return { ok: !errors.length, errors };
  }

  /** Фоновая загрузка всех подключённых клиентов по очереди. */
  async function syncAll() {
    const list = q.accounts.all().filter((a) => tokenFor(a));
    if (!list.length) return { skipped: 'нет токена' };
    let ok = 0;
    let failed = 0;
    for (const a of list) {
      const r = await syncClient(a.client_id).catch((err) => ({ ok: false, errors: [err.message] }));
      if (r.ok) ok++;
      else {
        failed++;
        log?.warn({ client: a.client_id, errors: r.errors }, 'Статистика клиента не загрузилась');
      }
    }
    return { ok, failed };
  }

  const derive = (t) => ({
    ...t,
    ctr: t.impressions ? (t.clicks / t.impressions) * 100 : null,
    cpc: t.clicks ? t.cost / t.clicks : null,
    // цена конверсии — только по конверсиям Директа (по выбранным целям); без них прочерк
    cpa: t.conversions ? t.cost / t.conversions : null,
    bounceRate: t.visits ? (t.bounces / t.visits) * 100 : null,
    cr: t.visits ? (t.goals / t.visits) * 100 : null,
  });
  const ZERO = { impressions: 0, clicks: 0, cost: 0, conversions: 0, visits: 0, bounces: 0, goals: 0 };
  const sum = (rows) => rows.reduce((acc, r) => Object.fromEntries(Object.keys(ZERO).map((k) => [k, acc[k] + (r[k] ?? 0)])), { ...ZERO });

  /** Сводка по всем клиентам за период и такой же предыдущий период для сравнения. */
  function overview({ from, to, agency = null } = {}) {
    const p = period(from, to);
    const len = Math.round((Date.parse(p.to) - Date.parse(p.from)) / 86400e3) + 1;
    const prev = { from: shift(p.from, -len), to: shift(p.from, -1) };
    const cur = new Map(q.totals.all(p.from, p.to).map((r) => [r.client_id, r]));
    const before = new Map(q.totals.all(prev.from, prev.to).map((r) => [r.client_id, r]));
    const accounts = new Map(q.accounts.all().map((a) => [a.client_id, a]));
    const rows = [];
    const notConnected = [];
    for (const c of q.clients.all()) {
      if (agency && (c.agency ?? 'korp') !== agency) continue;
      const a = accounts.get(c.id);
      if (!a) {
        notConnected.push({ id: c.id, name: c.name, agency: c.agency ?? 'korp' });
        continue;
      }
      rows.push({
        id: c.id,
        name: c.name,
        agency: c.agency ?? 'korp',
        sources: { direct: Boolean(a.direct_enabled), metrika: Boolean(a.metrika_counter) },
        ownToken: Boolean(a.token),
        noToken: !tokenFor(a),
        syncedAt: a.synced_at,
        error: a.error,
        ...derive({ ...ZERO, ...cur.get(c.id) }),
        prev: derive({ ...ZERO, ...before.get(c.id) }),
      });
    }
    rows.sort((x, y) => y.cost - x.cost || y.visits - x.visits || x.name.localeCompare(y.name, 'ru'));
    return { period: p, prev, token: Boolean(currentToken()), rows, total: derive(sum(rows)), prevTotal: derive(sum(rows.map((r) => r.prev))), notConnected };
  }

  /** Динамика клиента по дням (пустые дни — нулями, чтобы график был без провалов по датам). */
  function clientStats(clientId, { from, to } = {}) {
    const p = period(from, to);
    const a = q.account.get(Number(clientId));
    const byDate = new Map(q.daily.all(Number(clientId), p.from, p.to).map((r) => [r.date, r]));
    const days = [];
    for (let d = p.from; d <= p.to; d = shift(d, 1)) days.push(derive({ date: d, ...ZERO, ...byDate.get(d) }));
    return { period: p, account: publicAccount(a), token: Boolean(tokenFor(a)), agencyToken: Boolean(currentToken()), days, total: derive(sum(days)) };
  }

  /** Цели счётчика: по токену из формы, своему токену клиента или токену агентства. */
  async function goalsFor(counter, { clientId = null, token: typed = null } = {}) {
    const own = clientId ? q.account.get(Number(clientId))?.token : null;
    const token = String(typed ?? '').trim() || own || needToken();
    if (!/^\d{1,12}$/.test(String(counter ?? ''))) throw new AdStatsError('Укажите номер счётчика Метрики');
    try {
      return await metrikaGoals({ token, counter, fetchImpl });
    } catch (err) {
      throw new AdStatsError(err.message);
    }
  }

  /** Состояние токена без самого токена: откуда он, последние 4 символа, кто и когда сохранил. */
  function tokenInfo() {
    const s = saved();
    const t = currentToken();
    return { set: Boolean(t), source: s?.value ? 'admin' : envToken ? 'env' : null, tail: t ? t.slice(-4) : null, updatedBy: s?.updated_by ?? null, updatedAt: s?.updated_at ?? null };
  }

  /** Токен проверяется в Метрике до сохранения: неверный не сохраняем. */
  async function setToken(value, user) {
    const t = String(value ?? '').trim();
    if (!TOKEN_RE.test(t)) throw new AdStatsError('Это не похоже на токен Яндекса: скопируйте строку целиком, она начинается с y0_');
    let counters;
    try {
      counters = await metrikaCounters({ token: t, fetchImpl });
    } catch (err) {
      throw new AdStatsError(`Яндекс не принял токен: ${err.message}`);
    }
    settings.put.run(TOKEN_KEY, t, user?.name ?? null);
    return { ...tokenInfo(), counters };
  }

  function clearToken() {
    settings.del.run(TOKEN_KEY);
    return tokenInfo();
  }

  return { saveAccount, account: (id) => publicAccount(q.account.get(Number(id))), syncClient, syncAll, overview, clientStats, goalsFor, hasToken: () => Boolean(currentToken()), tokenInfo, setToken, clearToken };
}
