import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/storage/db.js';
import { createQualifier } from '../src/core/qualifier.js';
import { buildServer } from '../src/http/server.js';
import { loadConfig } from '../src/config.js';
import { createAuth } from '../src/admin/auth.js';
import { createReports } from '../src/admin/reports.js';
import { createBriefs } from '../src/crm/briefs.js';
import { createNotifications } from '../src/notify/store.js';
import { rules, staticSource, silentLog } from './helpers.js';

const PASSWORD = 'correct-horse-battery';
const SITE = 'https://marketing-studio.pro';

async function setup() {
  const config = loadConfig({ DB_PATH: ':memory:', ALLOWED_ORIGINS: 'https://crm.marketing-studio.pro', ADMIN_SECTIONS: 'tasks,calendar,docs,staff' });
  const db = openDb(':memory:');
  const auth = createAuth(db.raw);
  auth.addUser('anna', 'Анна', { password: PASSWORD, role: 'admin' });
  auth.addUser('oleg', 'Олег', { password: PASSWORD });
  const briefs = createBriefs({ db: db.raw });
  const qualifier = createQualifier({ db, scenarioSource: staticSource(), rules, log: silentLog });
  const app = await buildServer({
    config, qualifier, logger: false, briefs,
    admin: { auth, reports: createReports(db.raw), db, scenarioSource: staticSource(), briefs },
  });
  const login = async (who) => {
    const res = await app.inject({ method: 'POST', url: '/admin/api/login', payload: { login: who, password: PASSWORD } });
    return { cookie: `kval_admin=${res.cookies.find((c) => c.name === 'kval_admin').value}` };
  };
  return { app, db, briefs, login, notify: createNotifications({ db: db.raw }) };
}

const brief = {
  company: 'Ди Авто 69',
  contactName: 'Иван',
  phone: '+7 900 000-00-00',
  consent: true,
  page: '/brif/?company=diauto',
  answers: [
    { section: 'Информация о компании', q: 'Название компании', a: 'Ди Авто 69' },
    { section: 'Финансы и сроки', q: 'Предполагаемый бюджет', a: '100 000 ₽' },
    { section: 'Финансы и сроки', q: 'Дата начала', a: '   ' },
  ],
};

test('бриф с сайта: приём, CORS основного сайта, раздел «Брифы» и уведомление администратору', async () => {
  const { app, login, notify, db } = await setup();

  // сайт может отправлять бриф, чужой адрес — нет; остальные адреса API — только кабинет
  const pre = await app.inject({ method: 'OPTIONS', url: '/api/briefs', headers: { origin: SITE, 'access-control-request-method': 'POST' } });
  assert.equal(pre.headers['access-control-allow-origin'], SITE);
  const evil = await app.inject({ method: 'OPTIONS', url: '/api/briefs', headers: { origin: 'https://evil.example', 'access-control-request-method': 'POST' } });
  assert.equal(evil.headers['access-control-allow-origin'], undefined);
  const other = await app.inject({ url: '/health', headers: { origin: SITE } });
  assert.equal(other.headers['access-control-allow-origin'], undefined);

  assert.equal((await app.inject({ method: 'POST', url: '/api/briefs', payload: { ...brief, consent: false } })).statusCode, 400, 'без согласия');
  assert.equal((await app.inject({ method: 'POST', url: '/api/briefs', payload: { ...brief, phone: '' } })).statusCode, 400, 'без контакта');
  // бот заполнил скрытое поле — ответ «ок», но ничего не сохраняется
  assert.equal((await app.inject({ method: 'POST', url: '/api/briefs', payload: { ...brief, website: 'http://spam' } })).json().ok, true);

  const res = await app.inject({ method: 'POST', url: '/api/briefs', headers: { origin: SITE }, payload: brief });
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['access-control-allow-origin'], SITE);

  const anna = await login('anna');
  const oleg = await login('oleg');
  const list = (await app.inject({ url: '/admin/api/briefs', headers: oleg })).json();
  assert.deepEqual(list.briefs.map((b) => [b.company, b.status]), [['Ди Авто 69', 'new']]);
  const id = list.briefs[0].id;

  const annaId = db.raw.prepare("SELECT id FROM admin_users WHERE email = 'anna'").get().id;
  const olegId = db.raw.prepare("SELECT id FROM admin_users WHERE email = 'oleg'").get().id;
  assert.deepEqual(notify.list(annaId).map((n) => [n.kind, n.text, n.href]), [['brief', 'Новый бриф: Ди Авто 69, Иван', `#/brief?id=${id}`]]);
  assert.equal(notify.list(olegId).length, 0, 'менеджеру уведомление не приходит');

  const one = (await app.inject({ url: `/admin/api/briefs/${id}`, headers: oleg })).json().brief;
  assert.equal(one.status, 'seen', 'открытый бриф — просмотрен');
  assert.deepEqual(one.answers.map((a) => a.a), ['Ди Авто 69', '100 000 ₽'], 'пустые ответы не хранятся');

  assert.equal((await app.inject({ method: 'PATCH', url: `/admin/api/briefs/${id}`, headers: oleg, payload: { status: 'done' } })).statusCode, 200);
  assert.equal((await app.inject({ method: 'PATCH', url: `/admin/api/briefs/${id}`, headers: oleg, payload: { status: 'lost' } })).statusCode, 400);
  assert.equal((await app.inject({ method: 'DELETE', url: `/admin/api/briefs/${id}`, headers: oleg })).statusCode, 403);
  assert.equal((await app.inject({ method: 'DELETE', url: `/admin/api/briefs/${id}`, headers: anna })).statusCode, 200);
  assert.equal((await app.inject({ url: '/admin/api/briefs', headers: anna })).json().briefs.length, 0);
  assert.equal((await app.inject({ url: '/admin/api/briefs', headers: {} })).statusCode, 401);
});
