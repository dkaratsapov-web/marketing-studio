// Срезы статистики клиента за период: кампании, группы, фразы, запросы, площадки РСЯ, устройства,
// пол и возраст, регионы (Директ) и UTM, страницы входа, устройства, регионы визитов из Директа (Метрика).
// Отчёт строится по требованию в фоне и хранится 3 часа: Директ отдаёт отчёты не чаще раза в 10 секунд.

import { directReport, metrikaReport } from './yandex.js';

const TTL_MS = 3 * 3600e3;
const MAX_ROWS = 500;
const num = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const RU = {
  AdNetworkType: { SEARCH: 'Поиск', AD_NETWORK: 'РСЯ' },
  Device: { DESKTOP: 'Компьютеры', MOBILE: 'Смартфоны', TABLET: 'Планшеты' },
  Gender: { GENDER_MALE: 'Мужчины', GENDER_FEMALE: 'Женщины', UNKNOWN: 'Пол не определён' },
  Age: { AGE_0_17: 'до 18', AGE_18_24: '18-24', AGE_25_34: '25-34', AGE_35_44: '35-44', AGE_45: '45+', AGE_45_54: '45-54', AGE_55: '55+', UNKNOWN: 'Возраст не определён' },
  CriterionType: { KEYWORD: 'Фраза', AUTOTARGETING: 'Автотаргетинг', AUDIENCE_TARGET: 'Аудитория', DYNAMIC_TEXT_AD_TARGET: 'Динамические', SMART_AD_TARGET: 'Смарт-баннеры', FEED_FILTER: 'Фид', OFFER_RETARGETING: 'Ретаргетинг на товары' },
};
const ru = (field, v) => RU[field]?.[v] ?? (v || 'Не определено');

/** Срезы Директа: колонки-группировки (что показываем в названии строки) и тип отчёта. */
export const DIRECT_SLICES = {
  campaigns: { label: 'Кампании', group: ['CampaignName', 'CampaignId'], title: (r) => r.CampaignName, sub: (r) => `№ ${r.CampaignId}` },
  adgroups: { label: 'Группы', group: ['CampaignName', 'AdGroupName', 'AdGroupId'], title: (r) => r.AdGroupName, sub: (r) => r.CampaignName },
  criteria: { label: 'Фразы и условия', group: ['CampaignName', 'AdGroupName', 'Criterion', 'CriterionType', 'CriterionId'], title: (r) => r.Criterion, sub: (r) => `${ru('CriterionType', r.CriterionType)} · ${r.CampaignName} · ${r.AdGroupName}` },
  queries: { label: 'Поисковые запросы', reportType: 'SEARCH_QUERY_PERFORMANCE_REPORT', group: ['Query', 'CampaignName', 'Criterion'], noBounce: true, title: (r) => r.Query, sub: (r) => `по фразе «${r.Criterion}» · ${r.CampaignName}` },
  network: { label: 'Поиск и РСЯ', group: ['AdNetworkType'], title: (r) => ru('AdNetworkType', r.AdNetworkType) },
  placements: { label: 'Площадки РСЯ', group: ['Placement'], filter: [{ Field: 'AdNetworkType', Operator: 'EQUALS', Values: ['AD_NETWORK'] }], title: (r) => r.Placement || 'Не определено' },
  devices: { label: 'Устройства', group: ['Device'], title: (r) => ru('Device', r.Device) },
  demography: { label: 'Пол и возраст', group: ['Gender', 'Age'], title: (r) => `${ru('Gender', r.Gender)}, ${ru('Age', r.Age)}` },
  regions: { label: 'Регионы', group: ['LocationOfPresenceName'], title: (r) => r.LocationOfPresenceName || 'Не определено' },
};

/** Срезы Метрики: измерения отчёта. Только визиты из Директа (METRIKA_DIRECT_ONLY), поэтому среза по источникам нет. */
export const METRIKA_SLICES = {
  utm: { label: 'UTM-метки', dimensions: ['ym:s:UTMSource', 'ym:s:UTMCampaign'] },
  landing: { label: 'Страницы входа', dimensions: ['ym:s:startURL'] },
  sitedevices: { label: 'Устройства на сайте', dimensions: ['ym:s:deviceCategory'] },
  siteregions: { label: 'Регионы на сайте', dimensions: ['ym:s:regionCity'] },
};

export function sliceCatalog() {
  return {
    direct: Object.entries(DIRECT_SLICES).map(([id, s]) => ({ id, label: s.label })),
    metrika: Object.entries(METRIKA_SLICES).map(([id, s]) => ({ id, label: s.label })),
  };
}

/** Строки Директа со срезом: суммы по строке и производные показатели. */
export async function fetchDirectSlice(slice, { token, login, from, to, goals, fetchImpl, wait }) {
  const def = DIRECT_SLICES[slice];
  const metrics = def.noBounce ? ['Impressions', 'Clicks', 'Cost'] : ['Impressions', 'Clicks', 'Cost', 'BounceRate'];
  const rows = await directReport({ token, login, from, to, goals, fields: [...def.group, ...metrics], reportType: def.reportType, filter: def.filter ?? [], fetchImpl, wait });
  return rows
    .map((r) => {
      const impressions = num(r.Impressions);
      const clicks = num(r.Clicks);
      const cost = num(r.Cost);
      const conversions = num(r.Conversions);
      return {
        name: def.title(r),
        sub: def.sub ? def.sub(r) : null,
        ids: Object.fromEntries(def.group.filter((g) => g.endsWith('Id')).map((g) => [g, r[g]])),
        impressions,
        clicks,
        cost,
        conversions,
        ctr: impressions ? (clicks / impressions) * 100 : null,
        cpc: clicks ? cost / clicks : null,
        cpa: conversions ? cost / conversions : null,
        bounceRate: def.noBounce || r.BounceRate === '' ? null : num(r.BounceRate),
      };
    })
    .sort((a, b) => b.cost - a.cost || b.clicks - a.clicks)
    .slice(0, MAX_ROWS);
}

export async function fetchMetrikaSlice(slice, { token, counter, from, to, goals, fetchImpl }) {
  const rows = await metrikaReport({ token, counter, from, to, goals, dimensions: METRIKA_SLICES[slice].dimensions, limit: MAX_ROWS, fetchImpl });
  return rows.map((r) => ({ ...r, cr: r.visits ? (r.goals / r.visits) * 100 : null }));
}

/**
 * Кеш срезов в базе и фоновая сборка: первый запрос ставит отчёт в работу и отвечает «готовится»,
 * следующие — отдают готовые строки или ошибку.
 */
export function createSlices({ db, getAccount, tokenFor, fetchImpl = fetch, wait, log = null }) {
  const q = {
    get: db.prepare('SELECT rows, error, fetched_at FROM ad_slices WHERE client_id = ? AND slice = ? AND date_from = ? AND date_to = ?'),
    put: db.prepare(
      `INSERT INTO ad_slices (client_id, slice, date_from, date_to, rows, error, fetched_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(client_id, slice, date_from, date_to) DO UPDATE SET rows = excluded.rows, error = excluded.error, fetched_at = excluded.fetched_at`,
    ),
    // старые срезы не копим: оставляем последние сутки
    prune: db.prepare("DELETE FROM ad_slices WHERE fetched_at < datetime('now', '-1 day')"),
  };
  const running = new Map();

  async function build(clientId, slice, from, to) {
    const a = getAccount(clientId);
    const token = tokenFor(a);
    if (!token) throw new Error('Не подключён токен Яндекса: общий или свой у клиента');
    const goals = a.goals ? a.goals.split(',').filter(Boolean) : [];
    if (DIRECT_SLICES[slice]) {
      if (!a.direct_enabled) throw new Error('У клиента не подключён Директ');
      return fetchDirectSlice(slice, { token, login: a.direct_login, from, to, goals, fetchImpl, wait });
    }
    if (!a.metrika_counter) throw new Error('У клиента не указан счётчик Метрики');
    return fetchMetrikaSlice(slice, { token, counter: a.metrika_counter, from, to, goals, fetchImpl });
  }

  /** Срез клиента: { status: 'ready' | 'pending' | 'error', rows, error, fetchedAt }. */
  function get(clientId, slice, { from, to, refresh = false }) {
    // «Источники трафика» убраны вместе с правилом «Метрика только по Директу»: старая вкладка кабинета
    // может ещё спросить этот срез — просим обновить страницу
    if (slice === 'sources') throw new Error('Этот срез убран: Метрика теперь считает только визиты из Директа. Обновите страницу (Ctrl+F5)');
    if (!DIRECT_SLICES[slice] && !METRIKA_SLICES[slice]) throw new Error('Неизвестный срез');
    const key = `${clientId}:${slice}:${from}:${to}`;
    const cached = q.get.get(Number(clientId), slice, from, to);
    const fresh = cached && Date.now() - Date.parse(`${cached.fetched_at.replace(' ', 'T')}Z`) < TTL_MS;
    if (running.has(key)) return { status: 'pending' };
    if (cached && fresh && !refresh) {
      return cached.error ? { status: 'error', error: cached.error, fetchedAt: cached.fetched_at } : { status: 'ready', rows: JSON.parse(cached.rows), fetchedAt: cached.fetched_at };
    }
    const job = build(Number(clientId), slice, from, to)
      .then((rows) => q.put.run(Number(clientId), slice, from, to, JSON.stringify(rows), null))
      .catch((err) => {
        log?.warn({ client: clientId, slice, err: err.message }, 'Срез статистики не собран');
        q.put.run(Number(clientId), slice, from, to, '[]', err.message);
      })
      .finally(() => {
        running.delete(key);
        q.prune.run();
      });
    running.set(key, job);
    return { status: 'pending' };
  }

  /** Все готовые срезы клиента за период — для разбора ИИ. */
  function ready(clientId, { from, to }) {
    const out = {};
    for (const slice of [...Object.keys(DIRECT_SLICES), ...Object.keys(METRIKA_SLICES)]) {
      const c = q.get.get(Number(clientId), slice, from, to);
      if (c && !c.error) out[slice] = JSON.parse(c.rows);
    }
    return out;
  }

  /** Дождаться сборки (для тестов и ИИ-разбора). */
  const settle = () => Promise.all(running.values());

  return { get, ready, settle };
}
