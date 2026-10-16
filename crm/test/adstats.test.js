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
  assert.deepEqual(waits, [2000]);
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
});

function setup(fetchImpl, token = 'tok') {
  const db = openDb(':memory:');
  db.raw.exec("INSERT INTO clients (name, agency) VALUES ('Сфера', 'korp'), ('Клиника', 'soroka'), ('Без рекламы', 'korp')");
  return { db, stats: createAdStats({ db: db.raw, token, fetchImpl }) };
}

test('загрузка и сводка: расход, CTR, CPA, отказы, сравнение с прошлым периодом, неподключённые клиенты', async () => {
  const fetchImpl = async (url) => {
    if (String(url).includes('direct')) return res(200, `Date\tImpressions\tClicks\tCost\tConversions_9_AUTO\n${day(-1)}\t1000\t100\t5000\t5\n${day(-40)}\t500\t50\t2000\t2\n`);
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
  const fetchImpl = async (url) => (String(url).includes('direct') ? res(500, 'boom') : res(200, { data: [{ dimensions: [{ name: day(-1) }], metrics: [10, 0] }] }));
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
  await assert.rejects(stats.syncClient(1), /YANDEX_ADS_TOKEN/);
  assert.deepEqual(await stats.syncAll(), { skipped: 'нет токена' });
  assert.throws(() => stats.saveAccount(1, { metrikaCounter: 'abc' }), /только цифры/);
  assert.throws(() => stats.saveAccount(1, { goals: '1, x' }), /номера целей/);
  assert.throws(() => stats.saveAccount(99, {}), /не найден/);
});
