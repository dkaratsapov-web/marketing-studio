import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/storage/db.js';
import { createParser, mergePlaces, toCsv, formatPhone, phoneKey, matches } from '../src/parser/store.js';
import { OVERPASS, osmArea, overpassQuery, osmPlace, yandexPlace, gisPlace, googlePlace, place, searchSource } from '../src/parser/sources.js';
import { extractContacts, contactsLink, privateIp, fetchPage, nativeGet, decodeHtml } from '../src/parser/site.js';
import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';

const res = (status, body, headers = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
});
const publicDns = async () => [{ address: '93.184.216.34', family: 4 }];

test('OSM: запрос по названию и тегам, компания с контактами из тегов', () => {
  const ql = overpassQuery('Стоматология', [56.7, 35.7, 56.95, 36.1], 200);
  assert.match(ql, /\[bbox:56\.7,35\.7,56\.95,36\.1\]/);
  assert.match(ql, /nwr\["name"~"стоматолог",i\]/, 'без окончания: найдётся и «Стоматология Улыбка», и «Стоматологический центр»');
  assert.match(ql, /nwr\["amenity"="dentist"\]\["name"\];/);
  assert.match(overpassQuery('кафе (центр)', [1, 2, 3, 4], 5), /кафе \\\\\(центр\\\\\)/, 'скобки экранированы для регулярного выражения');
  const p = osmPlace({ type: 'node', id: 7, lat: 56.85, lon: 35.9, tags: { name: 'Улыбка', amenity: 'dentist', phone: '+7 4822 11-22-33; +7 900 123 45 67', website: 'ulybka.ru', 'addr:city': 'Тверь', 'addr:street': 'улица Советская', 'addr:housenumber': '5', 'contact:vk': 'https://vk.com/ulybka' } });
  assert.equal(p.category, 'Стоматология');
  assert.equal(p.address, 'Тверь, улица Советская, 5');
  assert.deepEqual(p.phones, ['+7 4822 11-22-33', '+7 900 123 45 67']);
  assert.equal(p.website, 'https://ulybka.ru');
  assert.equal(p.socials.vk, 'https://vk.com/ulybka');
  assert.equal(p.link, 'https://www.openstreetmap.org/node/7');
});

test('Яндекс, 2ГИС, Google: ответы API в общем виде', () => {
  const y = yandexPlace({ geometry: { coordinates: [35.9, 56.85] }, properties: { CompanyMetaData: { id: '123', name: 'Кофейня', address: 'Тверь, ул. Советская, 1', url: 'http://coffee.ru/', Phones: [{ formatted: '+7 (4822) 00-00-00' }], Categories: [{ name: 'Кофейня' }], Hours: { text: 'ежедневно, 8:00–22:00' } } } });
  assert.deepEqual([y.name, y.lat, y.lon, y.website, y.phones[0], y.link], ['Кофейня', 56.85, 35.9, 'http://coffee.ru', '+7 (4822) 00-00-00', 'https://yandex.ru/maps/org/123']);

  const g = gisPlace({
    id: '70000001_abc', name: 'Автосервис', address_name: 'Ленина, 2', adm_div: [{ type: 'city', name: 'Тверь' }], point: { lat: 56.8, lon: 35.8 }, rubrics: [{ name: 'Автосервисы' }],
    contact_groups: [{ contacts: [{ type: 'phone', value: '+74822000000', text: '+7 (4822) 00-00-00' }, { type: 'website', value: 'http://link.2gis.ru/xyz', text: 'auto.ru' }, { type: 'email', value: 'a@auto.ru' }, { type: 'vkontakte', value: 'auto', url: 'https://vk.com/auto' }] }],
    reviews: { general_rating: 4.6, general_review_count: 120 },
  });
  assert.equal(g.website, 'https://auto.ru', 'сайт из text, не ссылка-переходник');
  assert.deepEqual([g.city, g.address, g.emails[0], g.socials.vk, g.rating, g.reviews, g.link], ['Тверь', 'Тверь, Ленина, 2', 'a@auto.ru', 'https://vk.com/auto', 4.6, 120, 'https://2gis.ru/firm/70000001']);

  const go = googlePlace({ id: 'g1', displayName: { text: 'Салон' }, formattedAddress: 'ул. Мира, 3, Тверь', location: { latitude: 56.1, longitude: 35.1 }, internationalPhoneNumber: '+7 900 000-00-00', websiteUri: 'https://salon.ru/', rating: 4.9, userRatingCount: 30, googleMapsUri: 'https://maps.google.com/?cid=1', addressComponents: [{ types: ['locality'], longText: 'Тверь' }] });
  assert.deepEqual([go.name, go.city, go.website, go.rating, go.link], ['Салон', 'Тверь', 'https://salon.ru', 4.9, 'https://maps.google.com/?cid=1']);
});

test('Склейка: одна компания из разных источников по телефону и сайту, соцсеть вместо сайта', () => {
  const merged = mergePlaces([
    place({ source: 'osm', sourceId: '1', name: 'Улыбка', phones: ['8 (900) 123-45-67'], website: 'ulybka.ru' }),
    place({ source: 'yandex', sourceId: '2', name: 'Стоматология Улыбка', phones: ['+79001234567', '+7 4822 11 22 33'], address: 'Тверь, ул. Советская, 5', rating: 4.8, reviews: 50 }),
    place({ source: '2gis', sourceId: '3', name: 'Улыбка', website: 'https://www.ulybka.ru/', emails: ['info@ulybka.ru'] }),
    place({ source: 'osm', sourceId: '4', name: 'Зубы', website: 'https://vk.com/zuby' }),
  ]);
  assert.equal(merged.length, 2);
  const [a, b] = merged;
  assert.deepEqual(a.phones, ['+7 (900) 123-45-67', '+7 4822 11 22 33']);
  assert.deepEqual(a.sources.map((s) => s.source), ['osm', 'yandex', '2gis']);
  assert.equal(a.address, 'Тверь, ул. Советская, 5');
  assert.deepEqual(a.emails, ['info@ulybka.ru']);
  assert.equal(a.rating, 4.8);
  assert.equal(b.website, null);
  assert.equal(b.socials.vk, 'https://vk.com/zuby');
  assert.equal(phoneKey('8 900 123 45 67'), '9001234567');
  assert.equal(formatPhone('+44 20 7946 0958'), '+44 20 7946 0958');
  assert.equal(formatPhone('8 (4822) 77-88-99'), '+7 (4822) 77-88-99');
  assert.equal(formatPhone('84822778899'), '+7 4822778899');
  assert.equal(place({ source: 'osm', sourceId: '1', name: 'x', website: 'кафе-тверь.рф' }).website, 'https://кафе-тверь.рф');
});

test('Контакты с сайта: почта, телефоны, соцсети без ссылок «поделиться»', () => {
  const html = `<a href="mailto:Hello@Firm.ru?subject=x">почта</a> sales&#64;firm.ru logo@2x.png
    <a href="tel:+7 (900) 111-22-33">звоните</a> <a href="https://vk.com/share.php?url=x">share</a> <a href="https://vk.com/firm">ВК</a>
    <a href="https://t.me/firm_bot">tg</a> <a href="https://wa.me/79001112233">wa</a> <a href="/kontakty/">Контакты</a>`;
  const c = extractContacts(html);
  assert.deepEqual(c.emails, ['hello@firm.ru', 'sales@firm.ru']);
  assert.deepEqual(c.phones, ['+79001112233']);
  assert.deepEqual(c.socials, { vk: 'https://vk.com/firm', telegram: 'https://t.me/firm_bot', whatsapp: 'https://wa.me/79001112233' });
  assert.equal(contactsLink(html, 'https://firm.ru/'), 'https://firm.ru/kontakty/');
});

test('Сайт во внутренней сети, на нестандартном порту или с переходом туда — не открываем', async () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.1', '172.20.0.1', '169.254.169.254', '100.64.0.1', '::1', 'fd00::1', '::ffff:127.0.0.1']) assert.ok(privateIp(ip), ip);
  assert.ok(!privateIp('93.184.216.34'));
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return res(200, '<html></html>', { 'content-type': 'text/html' });
  };
  assert.equal(await fetchPage('http://127.0.0.1/', { fetchImpl, lookup: publicDns }), null);
  assert.equal(await fetchPage('http://firm.ru:8080/', { fetchImpl, lookup: publicDns }), null);
  assert.equal(await fetchPage('http://inside.ru/', { fetchImpl, lookup: async () => [{ address: '10.0.0.5', family: 4 }] }), null);
  assert.equal(calls, 0);
  const redirect = async () => res(302, '', { location: 'http://169.254.169.254/latest/' });
  assert.equal(await fetchPage('https://firm.ru/', { fetchImpl: redirect, lookup: publicDns }), null);
});

test('Ключ источника обязателен, проверяется пробным поиском, отдаются только 4 символа', async () => {
  const db = openDb(':memory:').raw;
  let ok = false;
  const fetchImpl = async (url) => {
    assert.match(url, /search-maps\.yandex\.ru/);
    return ok ? res(200, { features: [] }) : res(403, { message: 'Invalid key' });
  };
  const parser = createParser({ db, fetchImpl });
  assert.throws(() => parser.create({ query: 'кафе', geo: 'Тверь', sources: ['yandex'] }), /Нет ключа API: Яндекс Карты/);
  await assert.rejects(parser.setKey('yandex', 'bad-key-0123456789'), /Ключ не подошёл: Яндекс Карты: Invalid key \(проверьте ключ\)/);
  ok = true;
  const s = await parser.setKey('yandex', 'good-key-0123456789', { name: 'Админ' });
  assert.deepEqual([s.ready, s.tail, s.updatedBy], [true, '6789', 'Админ']);
  assert.ok(!JSON.stringify(parser.sources()).includes('good-key'));
  assert.equal(parser.clearKey('yandex').ready, false);
  await assert.rejects(() => searchSource('google', { query: 'x', geo: 'y', limit: 1 }), /не задан ключ/);
});

test('Сбор: OSM и Яндекс, склейка, контакты с сайта, CSV для Excel', async () => {
  const db = openDb(':memory:').raw;
  const seen = [];
  const fetchImpl = async (url, init = {}) => {
    seen.push(url);
    if (url.startsWith('https://nominatim.openstreetmap.org/')) return res(200, [{ osm_type: 'relation', class: 'route', type: 'bus', osm_id: 1, boundingbox: ['0', '1', '0', '1'] }, { osm_type: 'relation', osm_id: 2095259, class: 'boundary', type: 'administrative', display_name: 'Тверь', boundingbox: ['56.7', '56.95', '35.7', '36.1'], lat: '56.85', lon: '35.9' }]);
    if (url === OVERPASS[0]) return res(504, 'Gateway Timeout');
    if (url === OVERPASS[1]) {
      assert.match(decodeURIComponent(init.body), /bbox:56\.7,35\.7,56\.95,36\.1/, 'граница города, не маршрут автобуса');
      return res(200, { elements: [{ type: 'node', id: 1, lat: 56.85, lon: 35.9, tags: { name: 'Улыбка', amenity: 'dentist', phone: '+7 900 123-45-67', website: 'https://ulybka.ru' } }, { type: 'node', id: 2, tags: { amenity: 'dentist' } }] });
    }
    if (url.startsWith('https://search-maps.yandex.ru/')) {
      assert.match(url, /text=%D1%81%D1%82%D0%BE%D0%BC/);
      return res(200, { features: [{ geometry: { coordinates: [35.91, 56.86] }, properties: { CompanyMetaData: { id: '9', name: 'Улыбка', address: 'Тверь, ул. Советская, 5', Phones: [{ formatted: '+7 (900) 123-45-67' }], Categories: [{ name: 'Стоматологическая клиника' }] } } }] });
    }
    if (url === 'https://ulybka.ru/') return res(200, '<a href="mailto:info@ulybka.ru">почта</a><a href="https://t.me/ulybka">tg</a>', { 'content-type': 'text/html; charset=utf-8' });
    throw new Error(`неожиданный адрес ${url}`);
  };
  const parser = createParser({ db, fetchImpl, siteFetch: fetchImpl, lookup: publicDns, wait: async () => {} });
  db.prepare("INSERT INTO app_settings (key, value, updated_at) VALUES ('parser_key_yandex', 'key-0123456789', datetime('now'))").run();
  const job = parser.create({ query: 'стоматология', geo: 'Тверь', sources: ['osm', 'yandex', 'nope'], perSource: 50 }, { name: 'Мен' });
  assert.deepEqual(job.sources, ['osm', 'yandex']);
  await parser.settle();
  const done = parser.job(job.id);
  assert.equal(done.status, 'done');
  assert.deepEqual(done.progress.sources, { osm: { status: 'done', found: 1 }, yandex: { status: 'done', found: 1 } });
  assert.deepEqual(done.progress.sites, { done: 1, total: 1, found: 1 });
  const [p, ...rest] = parser.places(job.id);
  assert.equal(rest.length, 0, 'одна компания из двух источников');
  assert.deepEqual([p.city, p.address, p.emails, p.socials.telegram, p.sources.length], ['Тверь', 'Тверь, ул. Советская, 5', ['info@ulybka.ru'], 'https://t.me/ulybka', 2]);

  const { body, name } = parser.csv(job.id);
  assert.ok(body.startsWith('﻿Название;Категория;Город;Адрес;Телефоны;Почта;Сайт'));
  assert.match(body, /Улыбка;Стоматология;Тверь;Тверь, ул\. Советская, 5;\+7 \(900\) 123-45-67;info@ulybka\.ru;https:\/\/ulybka\.ru;/);
  assert.equal(name, 'стоматология-Тверь');
  assert.equal(parser.list()[0].places, 1);
  parser.remove(job.id);
  assert.equal(parser.job(job.id), null);
});

test('Сбор: ошибка одного источника не роняет сбор, ошибка всех — сбор с ошибкой; формулы в CSV не пускаем', async () => {
  const db = openDb(':memory:').raw;
  const parser = createParser({ db, fetchImpl: async () => res(500, 'down'), lookup: publicDns });
  const job = parser.create({ query: 'кафе', geo: 'Тверь', sources: ['osm'], enrich: false });
  await parser.settle();
  const j = parser.job(job.id);
  assert.equal(j.status, 'error');
  assert.match(j.progress.sources.osm.error, /OpenStreetMap: down/);
  assert.match(parser.job(job.id).progress.sources.osm.error, /^OpenStreetMap: down/, 'Nominatim не ответил — до Overpass не дошли');
  assert.throws(() => parser.create({ query: 'к', geo: 'Тверь', sources: ['osm'] }), /Напишите, что искать/);
  assert.throws(() => parser.create({ query: 'кафе', geo: 'Тверь', sources: [] }), /хотя бы один источник/);
  const csv = toCsv(mergePlaces([place({ source: 'osm', sourceId: '1', name: '=HYPERLINK("x")', phones: ['+7 900 000 00 00'] })]));
  assert.match(csv, /"'=HYPERLINK\(""x""\)";/);
  assert.match(csv, /;\+7 \(900\) 000-00-00;/);
});

test('Перезапуск: прерванный сбор — с ошибкой, ждущий — продолжается', async () => {
  const db = openDb(':memory:').raw;
  db.prepare("INSERT INTO parse_jobs (query, geo, sources, per_source, status, progress) VALUES ('кафе', 'Тверь', 'osm', 10, 'running', '{}')").run();
  const parser = createParser({ db, fetchImpl: async () => res(500, 'down') });
  await parser.resume();
  assert.equal(parser.job(1).status, 'error');
  assert.match(parser.job(1).error, /перезапускался/);
});

test('Сайт: запрос строго на проверенный IP, сжатие и кодировка windows-1251', async () => {
  const html = Buffer.from([...Buffer.from('<meta charset="windows-1251"><p>'), 0xcf, 0xf0, 0xe8, 0xe2, 0xe5, 0xf2, ...Buffer.from(' info@firm.ru</p>')]);
  let host;
  const server = createServer((req, res) => {
    host = req.headers.host;
    res.writeHead(200, { 'content-type': 'text/html', 'content-encoding': 'gzip' });
    res.end(gzipSync(html));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    const { port } = server.address();
    const r = await nativeGet(new URL(`http://firm.test:${port}/`), '127.0.0.1');
    assert.equal(r.status, 200);
    assert.equal(host, `firm.test:${port}`, 'имя сайта в заголовке, соединение на заданный IP');
    assert.match(decodeHtml(r.body, r.type), /Привет info@firm\.ru/);
  } finally {
    server.close();
  }
  assert.equal(decodeHtml(Buffer.from('тест'), 'text/html; charset=utf-8'), 'тест');
});

test('Условия сбора: только с телефоном и без сайта', async () => {
  const p = (x) => place({ source: 'osm', sourceId: x.id, name: x.id, phones: x.phones ?? [], website: x.website ?? null });
  const list = [p({ id: 'a', phones: ['+79001112233'] }), p({ id: 'b', phones: ['+79001112234'], website: 'b.ru' }), p({ id: 'c' })];
  const f = { phone: 'yes', site: 'no' };
  assert.deepEqual(mergePlaces(list).filter((m) => matches(m, f)).map((m) => m.name), ['a']);

  const db = openDb(':memory:').raw;
  const fetchImpl = async (url) => {
    if (url.startsWith('https://nominatim')) return res(200, [{ osm_type: 'relation', osm_id: 1 }]);
    return res(200, { elements: [
      { type: 'node', id: 1, tags: { name: 'С телефоном', phone: '+7 900 111 22 33' } },
      { type: 'node', id: 2, tags: { name: 'С сайтом', phone: '+7 900 111 22 44', website: 'https://site.ru' } },
      { type: 'node', id: 3, tags: { name: 'Пусто' } },
    ] });
  };
  const parser = createParser({ db, fetchImpl, siteFetch: async () => res(500, ''), lookup: publicDns });
  const job = parser.create({ query: 'кафе', geo: 'тверь', sources: ['osm'], filters: { phone: 'yes', site: 'no', email: 'bad' } });
  assert.deepEqual(job.filters, { phone: 'yes', site: 'no' });
  await parser.settle();
  const done = parser.job(job.id);
  assert.deepEqual(parser.places(job.id).map((x) => [x.name, x.city]), [['С телефоном', 'Тверь']]);
  assert.deepEqual([done.progress.found, done.progress.filtered, done.progress.sites.total], [3, 2, 0]);
});

test('OSM: посёлок без границы — около 10 км вокруг точки', async () => {
  const fetchImpl = async () => res(200, [{ osm_type: 'node', class: 'place', type: 'village', lat: '55.68', lon: '37.28', boundingbox: ['55.67', '55.69', '37.27', '37.29'] }]);
  const { bbox } = await osmArea('Лесной Городок', fetchImpl);
  assert.ok(bbox[2] - bbox[0] > 0.15 && bbox[3] - bbox[1] > 0.25, JSON.stringify(bbox));
});

test('Яндекс Поиск: сайты компаний из выдачи без справочников и соцсетей, ключ с ID каталога', async () => {
  const { parseSearchXml } = await import('../src/parser/sources.js');
  const xml = `<?xml version="1.0"?><yandexsearch><response><results><grouping>
    <group><doc><url>https://rolf-odintsovo.ru/cars/new</url><title>Автосалон <hlword>Рольф</hlword> в Одинцово — официальный дилер</title><passages><passage>Новые авто</passage></passages></doc></group>
    <group><doc><url>https://www.avito.ru/odintsovo/avtomobili</url><title>Авито</title></doc></group>
    <group><doc><url>https://yandex.ru/maps/org/1</url><title>Яндекс Карты</title></doc></group>
    <group><doc><url>https://major-auto.ru/</url><title>Major Auto | Одинцово</title></doc></group>
  </grouping></results></response></yandexsearch>`;
  assert.deepEqual(parseSearchXml(xml).map((d) => d.host), ['rolf-odintsovo.ru', 'major-auto.ru']);
  assert.throws(() => parseSearchXml('<yandexsearch><response><error code="2">Неверный ключ</error></response></yandexsearch>'), /Яндекс Поиск: Неверный ключ/);
  assert.deepEqual(parseSearchXml('<yandexsearch><response><error code="15">Ничего не найдено</error></response></yandexsearch>'), []);

  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return res(200, { rawData: Buffer.from(xml).toString('base64') });
  };
  const db = openDb(':memory:').raw;
  const parser = createParser({ db, fetchImpl, siteFetch: async () => res(200, '<a href="tel:+79001112233">x</a>', { 'content-type': 'text/html' }), lookup: publicDns });
  await assert.rejects(parser.setKey('yandexweb', 'AQVNkey0123456789'), /ID каталога/);
  const s = await parser.setKey('yandexweb', 'AQVNkey0123456789', { name: 'Админ' }, 'b1gfolder123456');
  assert.deepEqual([s.ready, s.tail, s.needsFolder], [true, '6789', true]);
  assert.equal(calls[0].init.headers.authorization, 'Api-Key AQVNkey0123456789');
  const sent = JSON.parse(calls[0].init.body);
  assert.equal(sent.folderId, 'b1gfolder123456');
  assert.equal(sent.groupSpec.groupMode, 'GROUP_MODE_DEEP');

  const job = parser.create({ query: 'автосалон', geo: 'Одинцово', sources: ['yandexweb'], perSource: 50 });
  await parser.settle();
  const list = parser.places(job.id);
  assert.deepEqual(list.map((p) => [p.name, p.website, p.city]), [['Автосалон Рольф в Одинцово', 'https://rolf-odintsovo.ru', 'Одинцово'], ['Major Auto', 'https://major-auto.ru', 'Одинцово']]);
  assert.deepEqual(list[0].phones, ['+7 (900) 111-22-33'], 'телефон — с сайта компании');
});

test('Кнопка «В CRM»: список создаётся по имени, дубль дополняется, ключ сотрудника', async () => {
  const db = openDb(':memory:');
  db.raw.prepare("INSERT INTO admin_users (id, email, name, role) VALUES (7, 'm@korp.test', 'Менеджер', 'manager')").run();
  const parser = createParser({ db: db.raw, siteFetch: async () => res(200, '<a href="mailto:hi@salon.ru">почта</a>', { 'content-type': 'text/html' }), lookup: publicDns });
  const user = { id: 7, name: 'Менеджер' };
  const token = parser.issueToken(user);
  assert.match(token, /^korp_/);
  assert.deepEqual(parser.userByToken(token), { id: 7, name: 'Менеджер', role: 'manager' });
  assert.equal(parser.userByToken('korp_wrongwrongwrongwrongwrong'), null);

  const card = { source: 'yandex', orgId: '123456', link: 'https://yandex.ru/maps/org/123456/', name: 'Салон Лотос', category: 'Салон красоты', address: 'Одинцово, Можайское шоссе, 4', phones: ['+7 (495) 123-45-67'], website: 'https://salon.ru/?utm=1' };
  const a = parser.addManual({ listName: 'Салоны Одинцово', place: card }, user);
  assert.equal(a.duplicate, false);
  assert.equal(a.place.city, 'Одинцово');
  const b = parser.addManual({ listId: a.list.id, place: { ...card, phones: ['84951234567', '+7 916 000-00-00'] } }, user);
  assert.equal(b.duplicate, true);
  assert.deepEqual(parser.lists().map((l) => [l.name, l.count]), [['Салоны Одинцово', 1]]);
  assert.deepEqual(b.place.phones, ['+7 (495) 123-45-67', '+7 (916) 000-00-00']);
  assert.throws(() => parser.addManual({ listId: a.list.id, place: { source: 'yandex' } }, user), /Нет названия/);
  // почта с сайта подтягивается в фоне
  await new Promise((r) => setTimeout(r, 50));
  assert.deepEqual(parser.places(a.list.id)[0].emails, ['hi@salon.ru']);
  assert.equal(parser.job(a.list.id).sources[0], 'manual');

  const t = parser.tokens(user);
  assert.equal(t.length, 1);
  parser.revokeToken(t[0].id, user);
  assert.equal(parser.userByToken(token), null);
});

test('Архив расширения: манифест с адресом кабинета и личный ключ', async () => {
  const { extensionZip } = await import('../src/parser/extension.js');
  const { execFileSync } = await import('node:child_process');
  const { mkdtempSync, writeFileSync, readFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(`${tmpdir()}/ext-`);
  writeFileSync(`${dir}/x.zip`, extensionZip({ base: 'https://crm.marketing-studio.pro/admin', token: 'korp_abc' }));
  execFileSync('unzip', ['-q', `${dir}/x.zip`, '-d', dir]);
  const manifest = JSON.parse(readFileSync(`${dir}/korp-crm/manifest.json`, 'utf8'));
  assert.deepEqual(manifest.host_permissions, ['https://crm.marketing-studio.pro/*']);
  assert.equal(manifest.manifest_version, 3);
  assert.match(readFileSync(`${dir}/korp-crm/config.js`, 'utf8'), /"token":"korp_abc"/);
  assert.match(readFileSync(`${dir}/korp-crm/content.js`, 'utf8'), /В CRM/);
});
