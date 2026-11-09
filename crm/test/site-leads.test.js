import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/storage/db.js';
import { createQualifier } from '../src/core/qualifier.js';
import { buildServer } from '../src/http/server.js';
import { loadConfig } from '../src/config.js';
import { createAuth } from '../src/admin/auth.js';
import { createReports } from '../src/admin/reports.js';
import { createSiteLeads, leadMessage } from '../src/crm/site-leads.js';
import { createNotifications } from '../src/notify/store.js';
import { rules, staticSource, silentLog } from './helpers.js';

const PASSWORD = 'correct-horse-battery';
const SITE = 'https://marketing-studio.pro';
const TOKEN = '1234567890:AAH_test_token_value_abcdefghijklmnopq';

// Bot API без сети: getMe, getUpdates и sendMessage; offline — нет связи с Telegram
function fakeTelegram() {
  const t = { calls: [], offline: false };
  t.fetch = async (url, init) => {
    // ретранслятор: отвечает «relay ok» и пускает только с ключом
    if (url.startsWith('https://relay.example.dev')) {
      if (url === 'https://relay.example.dev/') return { status: 200, text: async () => 'relay ok' };
      if (init?.headers?.['x-relay-key'] !== 'relay-key-0123456789abcdef') return { status: 403, json: async () => null, text: async () => 'forbidden' };
      t.relayed = (t.relayed ?? 0) + 1;
      url = url.replace('https://relay.example.dev', 'https://api.telegram.org');
      if (url.includes('/bot0:check/')) return { status: 401, json: async () => ({ ok: false }) };
    }
    if (t.offline) throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ETIMEDOUT' } });
    const [, token, method] = /\/bot([^/]+)\/([A-Za-z]+)/.exec(url);
    t.calls.push({ token, method, body: init?.body ? JSON.parse(init.body) : null });
    const json = (data, status = 200) => ({ status, json: async () => data });
    if (token !== TOKEN) return json({ ok: false, description: 'Unauthorized' }, 401);
    if (method === 'getMe') return json({ ok: true, result: { username: 'Marketing_Studio_Pro_Bot', first_name: 'Корпорация' } });
    if (method === 'getUpdates') return json({ ok: true, result: [{ message: { chat: { id: -1001234567890, type: 'supergroup', title: 'Заявки Корпорации' } } }, { message: { chat: { id: 555, type: 'private' } } }] });
    if (method === 'sendMessage') return json({ ok: true, result: { message_id: 1 } });
    return json({ ok: false, description: 'Not Found' }, 404);
  };
  return t;
}

async function setup() {
  const config = loadConfig({ DB_PATH: ':memory:', ALLOWED_ORIGINS: 'https://crm.marketing-studio.pro', ADMIN_SECTIONS: 'tasks,calendar,docs,staff' });
  const db = openDb(':memory:');
  const auth = createAuth(db.raw);
  auth.addUser('anna', 'Анна', { password: PASSWORD, role: 'admin' });
  auth.addUser('oleg', 'Олег', { password: PASSWORD });
  const tg = fakeTelegram();
  const siteLeads = createSiteLeads({ db: db.raw, fetchImpl: tg.fetch });
  const qualifier = createQualifier({ db, scenarioSource: staticSource(), rules, log: silentLog });
  const app = await buildServer({
    config, qualifier, logger: false, siteLeads,
    admin: { auth, reports: createReports(db.raw), db, scenarioSource: staticSource(), siteLeads },
  });
  const login = async (who) => {
    const res = await app.inject({ method: 'POST', url: '/admin/api/login', payload: { login: who, password: PASSWORD } });
    return { cookie: `kval_admin=${res.cookies.find((c) => c.name === 'kval_admin').value}` };
  };
  return { app, db, tg, siteLeads, login, notify: createNotifications({ db: db.raw }) };
}

const lead = { source: 'service', service: 'Контекстная реклама', name: 'Иван <b>', phone: '+7 (900) 123-45-67', answers: { 'Бюджет в месяц': '50–150 000 ₽' }, utm: { utm_source: 'yandex', evil: 'x' }, page: `${SITE}/uslugi/kontekstnaya-reklama/` };

test('заявка с сайта: сохраняется в кабинете, даже если Telegram не подключён; CORS только для сайта', async () => {
  const { app, login, notify, db } = await setup();
  const pre = await app.inject({ method: 'OPTIONS', url: '/api/lead', headers: { origin: SITE, 'access-control-request-method': 'POST' } });
  assert.equal(pre.headers['access-control-allow-origin'], SITE);
  const evil = await app.inject({ method: 'OPTIONS', url: '/api/lead', headers: { origin: 'https://evil.example', 'access-control-request-method': 'POST' } });
  assert.equal(evil.headers['access-control-allow-origin'], undefined);

  assert.equal((await app.inject({ method: 'POST', url: '/api/lead', payload: { ...lead, phone: '123' } })).statusCode, 400, 'без контакта');
  assert.equal((await app.inject({ method: 'POST', url: '/api/lead', payload: { ...lead, source: 'other' } })).statusCode, 400, 'чужая форма');
  assert.equal((await app.inject({ method: 'POST', url: '/api/lead', payload: { ...lead, website: 'spam' } })).json().ok, true, 'ловушка для ботов');

  const res = await app.inject({ method: 'POST', url: '/api/lead', headers: { origin: SITE }, payload: lead });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().ok, true);

  const anna = await login('anna');
  const list = (await app.inject({ url: '/admin/api/site-leads', headers: await login('oleg') })).json();
  assert.equal(list.leads.length, 1, 'бот-ловушка не сохранён');
  assert.deepEqual([list.leads[0].name, list.leads[0].delivered, list.leads[0].error], ['Иван <b>', false, 'Telegram не подключён']);
  assert.deepEqual(list.leads[0].utm, { utm_source: 'yandex' }, 'только известные метки');
  const annaId = db.raw.prepare("SELECT id FROM admin_users WHERE email = 'anna'").get().id;
  assert.deepEqual(notify.list(annaId).map((n) => [n.kind, n.href]), [['site_lead', '#/siteleads']]);
  assert.equal((await app.inject({ method: 'DELETE', url: `/admin/api/site-leads/${list.leads[0].id}`, headers: await login('oleg') })).statusCode, 403);
  assert.equal((await app.inject({ method: 'DELETE', url: `/admin/api/site-leads/${list.leads[0].id}`, headers: anna })).statusCode, 200);
});

test('Telegram для заявок: токен вставляет администратор, обратно не отдаётся; заявка уходит в группу, досылка после сбоя', async () => {
  const { app, login, tg, siteLeads } = await setup();
  const anna = await login('anna');
  const oleg = await login('oleg');

  assert.equal((await app.inject({ method: 'PUT', url: '/admin/api/site-leads/telegram', headers: oleg, payload: { token: TOKEN } })).statusCode, 403, 'менеджер не может');
  assert.match((await app.inject({ method: 'PUT', url: '/admin/api/site-leads/telegram', headers: anna, payload: { token: 'пароль123' } })).json().error, /не похоже на токен/);
  const wrong = await app.inject({ method: 'PUT', url: '/admin/api/site-leads/telegram', headers: anna, payload: { token: '1234567890:AAH_wrong_token_value_abcdefghijklmn' } });
  assert.match(wrong.json().error, /Telegram ответил: Unauthorized/);

  const saved = await app.inject({ method: 'PUT', url: '/admin/api/site-leads/telegram', headers: anna, payload: { token: ` ${TOKEN} ` } });
  assert.equal(saved.statusCode, 200);
  assert.deepEqual([saved.json().telegram.bot, saved.json().telegram.tail], ['@Marketing_Studio_Pro_Bot', 'mnopq'.slice(-4)]);
  // токен нигде не возвращается: ни в настройках, ни в списке заявок
  for (const url of ['/admin/api/site-leads/telegram', '/admin/api/site-leads']) {
    assert.ok(!(await app.inject({ url, headers: anna })).body.includes(TOKEN.slice(0, 20)), url);
  }

  const chats = (await app.inject({ method: 'POST', url: '/admin/api/site-leads/telegram/chats', headers: anna })).json().chats;
  assert.deepEqual(chats, [{ id: '-1001234567890', title: 'Заявки Корпорации' }], 'только группы, без личных чатов');
  const chat = await app.inject({ method: 'PUT', url: '/admin/api/site-leads/telegram/chat', headers: anna, payload: chats[0] });
  assert.equal(chat.json().telegram.chatTitle, 'Заявки Корпорации');
  assert.equal(tg.calls.at(-1).method, 'sendMessage', 'при выборе группы — проверка связи');

  // заявка уходит в группу; данные посетителя экранированы
  await app.inject({ method: 'POST', url: '/api/lead', payload: lead });
  const sent = tg.calls.at(-1);
  assert.equal(sent.body.chat_id, '-1001234567890');
  assert.match(sent.body.text, /Имя: Иван &lt;b&gt;/);
  assert.match(sent.body.text, /Телефон: \+79001234567/);
  assert.equal((await app.inject({ url: '/admin/api/site-leads', headers: anna })).json().leads[0].delivered, true);

  // Telegram недоступен: заявка сохранена, ответ сайту «принято», в ошибке нет токена; потом досылается
  tg.offline = true;
  const off = await app.inject({ method: 'POST', url: '/api/lead', payload: { ...lead, name: 'Пётр' } });
  assert.equal(off.json().ok, true);
  let last = (await app.inject({ url: '/admin/api/site-leads', headers: anna })).json().leads[0];
  assert.deepEqual([last.name, last.delivered], ['Пётр', false]);
  assert.match(last.error, /Нет связи с Telegram с сервера \(ETIMEDOUT\)/);
  assert.ok(!last.error.includes(TOKEN));
  tg.offline = false;
  assert.equal(await siteLeads.retryUndelivered(), 1);
  last = (await app.inject({ url: '/admin/api/site-leads', headers: anna })).json().leads[0];
  assert.equal(last.delivered, true);

  // ретранслятор: неверный ключ не сохраняется; с верным запросы идут через него, ключ обратно не отдаётся
  const relay = (key) => app.inject({ method: 'PUT', url: '/admin/api/site-leads/telegram/relay', headers: anna, payload: { url: 'https://relay.example.dev/', key } });
  assert.match((await relay('wrong-key-0123456789')).json().error, /не принял ключ/);
  const ok = await relay('relay-key-0123456789abcdef');
  assert.equal(ok.json().telegram.relay, 'https://relay.example.dev');
  assert.ok(!ok.body.includes('relay-key-0123456789abcdef'));
  assert.equal((await app.inject({ method: 'PUT', url: '/admin/api/site-leads/telegram/relay', headers: oleg, payload: { url: 'https://relay.example.dev', key: 'x'.repeat(20) } })).statusCode, 403);
  const before = tg.relayed ?? 0;
  await app.inject({ method: 'POST', url: '/admin/api/site-leads/telegram/test', headers: anna });
  assert.equal(tg.relayed, before + 1, 'проверка связи ушла через ретранслятор');

  assert.equal((await app.inject({ method: 'DELETE', url: '/admin/api/site-leads/telegram', headers: anna })).json().telegram.set, false);
});

test('текст заявки для Telegram: ник, метки, номер заявки', () => {
  const text = leadMessage({ id: 7, source: 'hero', contact: '@ivan_petrov', answers: {}, utm: { utm_campaign: 'tg' }, referrer: 'https://ya.ru/', created_at: '2026-11-09 07:30:00' });
  assert.match(text, /<b>Консультация · первый экран<\/b>/);
  assert.match(text, /Telegram: <a href="https:\/\/t.me\/ivan_petrov">@ivan_petrov<\/a>/);
  assert.match(text, /Метки: utm_campaign=tg/);
  assert.match(text, /09\.11\.2026 10:30 МСК · заявка №7/);
});
