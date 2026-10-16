import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/storage/db.js';
import { createAdStats } from '../src/adstats/store.js';
import { parseDirectTsv, directDaily, metrikaDaily } from '../src/adstats/yandex.js';

const today = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const day = (n) => new Date(Date.parse(`${today}T12:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);

const res = (status, body, headers = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: (k) => headers[k] ?? null },
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
});

test('Директ: TSV с конверсиями по нескольким целям, пустые значения «--»', () => {
  const rows = parseDirectTsv('Date\tImpressions\tClicks\tCost\tConversions_111_AUTO\tConversions_222_AUTO\n2026-10-01\t1000\t50\t1500.5\t2\t--\n2026-10-02\t800\t40\t1200\t1\t3\n');
  assert.deepEqual(rows, [
    { date: '2026-10-01', impressions: 1000, clicks: 50, cost: 1500.5, conversions: 2 },
    { date: '2026-10-02', impressions: 800, clicks: 40, cost: 1200, conversions: 4 },
  ]);
});

test('Директ: отчёт в очереди (201), потом готов; агентский запрос с Client-Login и целями', async () => {
  const calls = [];
  const replies = [res(201, '', { retryIn: '2' }), res(200, 'Date\tImpressions\tClicks\tCost\tConversions_7_AUTO\n2026-10-01\t10\t1\t99\t1\n')];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return replies.shift();
  };
  const waits = [];
  const rows = await directDaily({ token: 't', login: 'client-login', from: '2026-10-01', to: '2026-10-01', goals: ['7'], fetchImpl, wait: async (ms) => waits.push(ms) });
  assert.equal(rows[0].conversions, 1);
  assert.ok(waits.includes(2000), 'ждём retryIn из ответа');
  assert.equal(calls[0].init.headers['Client-Login'], 'client-login');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer t');
  const body = JSON.parse(calls[0].init.body).params;
  assert.deepEqual(body.Goals, ['7']);
  assert.ok(body.FieldNames.includes('Conversions'));
});

test('Директ: ошибка API понятным текстом', async () => {
  const fetchImpl = async () => res(400, { error: { error_code: 53, error_string: 'Ошибка авторизации', error_detail: 'Неверный токен' } });
  await assert.rejects(directDaily({ token: 't', from: '2026-10-01', to: '2026-10-01', fetchImpl }), /Директ: Ошибка авторизации: Неверный токен \(код 53\)/);
});

test('Метрика: визиты, отказы из доли и сумма достижений целей', async () => {
  let url;
  const fetchImpl = async (u) => {
    url = u;
    return res(200, { data: [{ dimensions: [{ name: '2026-10-01' }], metrics: [200, 25, 3, 2] }] });
  };
  const rows = await metrikaDaily({ token: 't', counter: '123', from: '2026-10-01', to: '2026-10-01', goals: ['1', '2'], fetchImpl });
  assert.deepEqual(rows, [{ date: '2026-10-01', visits: 200, bounces: 50, goals: 5 }]);
  assert.match(url, /ym%3As%3Agoal1reaches%2Cym%3As%3Agoal2reaches/);
  const qs = new URL(url).searchParams;
  assert.equal(qs.get('attribution'), 'automatic');
  assert.equal(qs.get('filters'), "ym:s:<attribution>AdvEngine=='ya_direct'");
});

function setup(fetchImpl, token = 'tok') {
  const db = openDb(':memory:');
  db.raw.exec("INSERT INTO clients (name, agency) VALUES ('Сфера', 'korp'), ('Клиника', 'soroka'), ('Без рекламы', 'korp')");
  return { db, stats: createAdStats({ db: db.raw, token, fetchImpl, wait: async () => {} }) };
}

test('загрузка и сводка: расход, CTR, CPA, отказы, сравнение с прошлым периодом, неподключённые клиенты', async () => {
  const fetchImpl = async (url) => {
    if (String(url).includes('api.direct')) return res(200, `Date\tImpressions\tClicks\tCost\tConversions_9_AUTO\n${day(-1)}\t1000\t100\t5000\t5\n${day(-40)}\t500\t50\t2000\t2\n`);
    return res(200, { data: [{ dimensions: [{ name: day(-1) }], metrics: [400, 50, 8] }] });
  };
  const { stats } = setup(fetchImpl);
  const acc = stats.saveAccount(1, { directEnabled: true, directLogin: 'sfera', metrikaCounter: '555', goals: '9' });
  assert.equal(acc.goals, '9');
  const r = await stats.syncClient(1);
  assert.equal(r.ok, true);

  const o = stats.overview({ from: day(-29), to: day(0) });
  assert.equal(o.rows.length, 1);
  const s = o.rows[0];
  assert.equal(s.cost, 5000);
  assert.equal(s.ctr, 10);
  assert.equal(s.cpa, 1000, 'по конверсиям Директа');
  assert.equal(s.visits, 400);
  assert.equal(s.bounceRate, 50);
  assert.equal(s.cr, 2);
  assert.equal(s.prev.cost, 2000, 'прошлый период тех же 30 дней');
  assert.deepEqual(o.notConnected.map((c) => c.name).sort(), ['Без рекламы', 'Клиника']);
  assert.equal(stats.overview({ agency: 'soroka' }).rows.length, 0);

  const c = stats.clientStats(1, { from: day(-2), to: day(0) });
  assert.equal(c.days.length, 3, 'пустые дни нулями');
  assert.equal(c.total.cost, 5000);
});

test('ошибка источника сохраняется у клиента, другой источник грузится; смена счётчика стирает старые цифры', async () => {
  const fetchImpl = async (url) => (String(url).includes('api.direct') ? res(500, 'boom') : res(200, { data: [{ dimensions: [{ name: day(-1) }], metrics: [10, 0] }] }));
  const { stats } = setup(fetchImpl);
  stats.saveAccount(1, { directEnabled: true, metrikaCounter: '1' });
  const r = await stats.syncClient(1);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /^Директ/);
  assert.equal(stats.overview().rows[0].visits, 10);
  assert.match(stats.overview().rows[0].error, /Директ/);
  stats.saveAccount(1, { directEnabled: true, metrikaCounter: '2' });
  assert.equal(stats.overview().rows[0].visits, 0);
});

test('без токена: понятная ошибка, фоновая загрузка пропускается; проверка полей', async () => {
  const { stats } = setup(async () => res(200, ''), null);
  stats.saveAccount(1, { metrikaCounter: '1' });
  await assert.rejects(stats.syncClient(1), /Не подключён токен Яндекса/);
  assert.deepEqual(await stats.syncAll(), { skipped: 'нет токена' });
  assert.throws(() => stats.saveAccount(1, { metrikaCounter: 'abc' }), /только цифры/);
  assert.throws(() => stats.saveAccount(1, { goals: '1, x' }), /номера целей/);
  assert.throws(() => stats.saveAccount(99, {}), /не найден/);
});

test('токен из кабинета: проверка в Метрике, важнее .env, наружу только хвост, отключение', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push(init?.headers?.Authorization);
    if (String(url).includes('/management/v1/counters')) return init.headers.Authorization === 'OAuth y0_bad_token_value_1234567' ? res(403, { message: 'Invalid oauth_token', code: 403 }) : res(200, { rows: 3, counters: [] });
    return res(200, { data: [] });
  };
  const db = openDb(':memory:');
  const stats = createAdStats({ db: db.raw, token: 'env_token_value_abcdefghijk', fetchImpl });
  await assert.rejects(stats.setToken('MyCabinetPassword2026xyz', { name: 'Даниил' }), /не похоже на токен/, 'пароль из автозаполнения в Яндекс не уходит');
  await assert.rejects(stats.goalsFor('123', { token: 'MyCabinetPassword2026xyz' }), /браузер подставил туда пароль/);
  assert.deepEqual(stats.tokenInfo(), { set: true, source: 'env', tail: 'hijk', updatedBy: null, updatedAt: null });
  await assert.rejects(stats.setToken('abc', { name: 'Даниил' }), /не похоже на токен/);
  await assert.rejects(stats.setToken('y0_bad_token_value_1234567', { name: 'Даниил' }), /Яндекс не принял токен: Invalid oauth_token/);
  const r = await stats.setToken(' y0_good_token_value_9876543 ', { name: 'Даниил' });
  assert.equal(r.counters, 3);
  assert.equal(r.source, 'admin');
  assert.equal(r.tail, '6543');
  assert.equal(r.updatedBy, 'Даниил');
  assert.ok(!JSON.stringify(stats.tokenInfo()).includes('y0_good'), 'полный токен наружу не отдаётся');
  db.raw.exec("INSERT INTO clients (name) VALUES ('Сфера')");
  stats.saveAccount(1, { metrikaCounter: '5' });
  await stats.syncClient(1);
  assert.equal(seen.at(-1), 'OAuth y0_good_token_value_9876543', 'загрузка идёт с токеном из кабинета');
  assert.equal(stats.clearToken().source, 'env');
});

test('свой токен клиента: грузится по нему без общего токена, наружу не отдаётся, можно убрать', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push(init?.headers?.Authorization);
    return res(200, { data: [{ dimensions: [{ name: day(-1) }], metrics: [7, 0] }] });
  };
  const db = openDb(':memory:');
  db.raw.exec("INSERT INTO clients (name) VALUES ('Свой кабинет'), ('Через агентство')");
  const stats = createAdStats({ db: db.raw, token: null, fetchImpl });
  assert.throws(() => stats.saveAccount(1, { metrikaCounter: '1', token: 'short' }), /не похоже на токен/);
  const acc = stats.saveAccount(1, { metrikaCounter: '1', token: 'y0_client_own_token_123456' });
  assert.equal(acc.own_token, true);
  assert.equal(acc.token_tail, '3456');
  assert.equal(acc.token, undefined, 'токен не возвращается');
  stats.saveAccount(2, { metrikaCounter: '2' });
  const all = await stats.syncAll();
  assert.deepEqual(all, { ok: 1, failed: 0 }, 'клиент без токена пропущен');
  assert.equal(seen[0], 'OAuth y0_client_own_token_123456');
  const o = stats.overview();
  assert.equal(o.rows.find((r) => r.id === 1).ownToken, true);
  assert.equal(o.rows.find((r) => r.id === 2).noToken, true);
  assert.ok(!JSON.stringify(o).includes('y0_client'), 'в сводке токена нет');
  // пустое поле при сохранении не стирает токен; clearToken — стирает
  assert.equal(stats.saveAccount(1, { metrikaCounter: '1' }).own_token, true);
  assert.equal(stats.saveAccount(1, { metrikaCounter: '1', clearToken: true }).own_token, false);
});

test('Директ: одно имя отчёта при повторных запросах в течение часа; лимит запросов — понятный текст', async () => {
  const names = [];
  const fetchImpl = async (url, init) => {
    names.push(JSON.parse(init.body).params.ReportName);
    return names.length < 3 ? res(200, 'Date\tImpressions\tClicks\tCost\n') : res(400, { error: { error_code: 56, error_string: 'Превышен лимит запросов метода' } });
  };
  await directDaily({ token: 't', from: '2026-10-01', to: '2026-10-02', fetchImpl });
  await directDaily({ token: 't', from: '2026-10-01', to: '2026-10-02', fetchImpl });
  assert.equal(names[0], names[1]);
  await assert.rejects(directDaily({ token: 't', from: '2026-10-01', to: '2026-10-02', fetchImpl }), /временно ограничил запросы.*код 56/);
});

test('Директ: «не чаще 1 раза в 10 секунд» — пауза не меньше 11 секунд и повтор, а не ошибка', async () => {
  const replies = [
    res(400, { error: { error_code: 56, error_string: 'Превышен лимит запросов метода', error_detail: 'Данный метод можно запрашивать не чаще чем 1 раз в 10 секунд' } }),
    res(200, 'Date\tImpressions\tClicks\tCost\n2026-10-01\t1\t1\t10\n'),
  ];
  const waits = [];
  const rows = await directDaily({ token: 'throttle-test', from: '2026-10-01', to: '2026-10-01', fetchImpl: async () => replies.shift(), wait: async (ms) => waits.push(ms) });
  assert.equal(rows[0].cost, 10);
  assert.ok(waits.some((ms) => ms > 10_000), 'между запросами отчётов не меньше 10 секунд');
});

test('скрытые клиенты: не в списке неподключённых, можно вернуть', () => {
  const { stats } = setup(async () => res(200, ''));
  stats.setHidden(3, true);
  let o = stats.overview();
  assert.deepEqual(o.hidden.map((c) => c.name), ['Без рекламы']);
  assert.ok(!o.notConnected.some((c) => c.name === 'Без рекламы'));
  stats.setHidden(3, false);
  o = stats.overview();
  assert.equal(o.hidden.length, 0);
  assert.ok(o.notConnected.some((c) => c.name === 'Без рекламы'));
});

test('срезы: площадки РСЯ из Директа с фильтром, страницы входа из Метрики только по Директу; сборка в фоне и кеш', async () => {
  const bodies = [];
  const metrikaUrls = [];
  const fetchImpl = async (url, init) => {
    if (String(url).includes('api.direct')) {
      bodies.push(JSON.parse(init.body).params);
      return res(200, 'Placement\tImpressions\tClicks\tCost\tBounceRate\tConversions_9_AUTO\nmail.ru\t1000\t20\t400\t30\t2\navito.ru\t500\t10\t900\t--\t0\n');
    }
    metrikaUrls.push(new URL(url));
    return res(200, { data: [{ dimensions: [{ name: 'https://site.ru/' }], metrics: [100, 80, 20, 2.5, 90, 4] }] });
  };
  const { stats } = setup(fetchImpl);
  stats.saveAccount(1, { directEnabled: true, metrikaCounter: '5', goals: '9' });
  assert.equal(stats.slice(1, 'placements', { from: '2026-10-01', to: '2026-10-07' }).status, 'pending');
  await stats.settleSlices();
  const p = stats.slice(1, 'placements', { from: '2026-10-01', to: '2026-10-07' });
  assert.equal(p.status, 'ready');
  assert.deepEqual(p.rows.map((r) => [r.name, r.cost, r.conversions, r.cpa, r.bounceRate]), [['avito.ru', 900, 0, null, null], ['mail.ru', 400, 2, 200, 30]]);
  assert.deepEqual(bodies[0].SelectionCriteria.Filter, [{ Field: 'AdNetworkType', Operator: 'EQUALS', Values: ['AD_NETWORK'] }]);
  assert.deepEqual(bodies[0].Goals, ['9']);
  // повторный запрос — из кеша, без нового отчёта
  stats.slice(1, 'placements', { from: '2026-10-01', to: '2026-10-07' });
  assert.equal(bodies.length, 1);

  stats.slice(1, 'landing', { from: '2026-10-01', to: '2026-10-07' });
  await stats.settleSlices();
  const s = stats.slice(1, 'landing', { from: '2026-10-01', to: '2026-10-07' });
  assert.equal(s.rows[0].name, 'https://site.ru/');
  assert.equal(s.rows[0].cr, 4);
  // правило: из Метрики только визиты, которые автоматическая атрибуция относит к Директу
  assert.equal(metrikaUrls[0].searchParams.get('attribution'), 'automatic');
  assert.equal(metrikaUrls[0].searchParams.get('filters'), "ym:s:<attribution>AdvEngine=='ya_direct'");
  assert.deepEqual(Object.keys(stats.readySlices(1, { from: '2026-10-01', to: '2026-10-07' })).sort(), ['landing', 'placements']);
  // среза «Источники трафика» больше нет: при визитах только из Директа он бессмыслен
  assert.throws(() => stats.slice(1, 'sources', {}), /Неизвестный срез/);
  assert.throws(() => stats.slice(1, 'nope', {}), /Неизвестный срез/);
});

test('срез без подключённого источника — понятная ошибка в ответе', async () => {
  const { stats } = setup(async () => res(200, ''));
  stats.saveAccount(1, { metrikaCounter: '5' });
  stats.slice(1, 'campaigns', { from: '2026-10-01', to: '2026-10-07' });
  await stats.settleSlices();
  const r = stats.slice(1, 'campaigns', { from: '2026-10-01', to: '2026-10-07' });
  assert.equal(r.status, 'error');
  assert.match(r.error, /не подключён Директ/);
});
