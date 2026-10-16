import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/storage/db.js';
import { createParser, mergePlaces, toCsv, formatPhone, phoneKey } from '../src/parser/store.js';
import { overpassQuery, osmPlace, yandexPlace, gisPlace, googlePlace, place, searchSource } from '../src/parser/sources.js';
import { extractContacts, contactsLink, privateIp, fetchPage } from '../src/parser/site.js';

const res = (status, body, headers = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
});
const publicDns = async () => [{ address: '93.184.216.34', family: 4 }];

test('OSM: запрос по названию и тегам, компания с контактами из тегов', () => {
  const ql = overpassQuery('Стоматология', 3600012345, 200);
  assert.match(ql, /area\(3600012345\)/);
  assert.match(ql, /nwr\["name"~"Стоматология",i\]/);
  assert.match(ql, /nwr\["amenity"="dentist"\]\["name"\]/);
  assert.match(overpassQuery('кафе (центр)', 1, 5), /кафе \\\\\(центр\\\\\)/, 'скобки экранированы для регулярного выражения');
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
    if (url.startsWith('https://nominatim.openstreetmap.org/')) return res(200, [{ osm_type: 'relation', osm_id: 2095259, display_name: 'Тверь' }]);
    if (url === 'https://overpass-api.de/api/interpreter') {
      assert.match(decodeURIComponent(init.body), /area\(3602095259\)/);
      return res(200, { elements: [{ type: 'node', id: 1, lat: 56.85, lon: 35.9, tags: { name: 'Улыбка', amenity: 'dentist', phone: '+7 900 123-45-67', website: 'https://ulybka.ru' } }, { type: 'node', id: 2, tags: { amenity: 'dentist' } }] });
    }
    if (url.startsWith('https://search-maps.yandex.ru/')) {
      assert.match(url, /text=%D1%81%D1%82%D0%BE%D0%BC/);
      return res(200, { features: [{ geometry: { coordinates: [35.91, 56.86] }, properties: { CompanyMetaData: { id: '9', name: 'Улыбка', address: 'Тверь, ул. Советская, 5', Phones: [{ formatted: '+7 (900) 123-45-67' }], Categories: [{ name: 'Стоматологическая клиника' }] } } }] });
    }
    if (url === 'https://ulybka.ru/') return res(200, '<a href="mailto:info@ulybka.ru">почта</a><a href="https://t.me/ulybka">tg</a>', { 'content-type': 'text/html; charset=utf-8' });
    throw new Error(`неожиданный адрес ${url}`);
  };
  const parser = createParser({ db, fetchImpl, lookup: publicDns, wait: async () => {} });
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
