// Источники «Парсера»: компании по запросу и городу из открытых карт.
// OpenStreetMap — бесплатно и без ключа (Nominatim + Overpass). Яндекс Карты, 2ГИС и Google Maps —
// через их официальные API с ключом, который администратор вводит в кабинете.
// Каждый источник возвращает компании в одном виде: см. place().

import { domainToUnicode } from 'node:url';

export class SourceError extends Error {}

const UA = 'KorpCabinet/1.0 (+https://marketing-studio.pro)';
const TIMEOUT = 60_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const SOURCES = {
  osm: { label: 'OpenStreetMap', key: false, hint: 'Бесплатно и без ключа. Данных меньше, чем в коммерческих картах, но часто есть телефон и сайт.' },
  yandex: { label: 'Яндекс Карты', key: true, hint: 'Ключ «API Поиска по организациям» в кабинете разработчика Яндекса (developer.tech.yandex.ru).' },
  '2gis': { label: '2ГИС', key: true, hint: 'Ключ Catalog API 2ГИС (platform.2gis.ru). Контакты компаний отдаются на платном ключе.' },
  google: { label: 'Google Maps', key: true, hint: 'Ключ Places API (New) в Google Cloud Console.' },
};

/** Компания в общем виде; пустые поля — null и пустые списки. */
export function place(p) {
  return {
    source: p.source,
    sourceId: String(p.sourceId),
    name: clean(p.name) || 'Без названия',
    category: clean(p.category) || null,
    address: clean(p.address) || null,
    city: clean(p.city) || null,
    lat: Number.isFinite(p.lat) ? p.lat : null,
    lon: Number.isFinite(p.lon) ? p.lon : null,
    phones: uniq((p.phones ?? []).map(clean).filter(Boolean)),
    emails: uniq((p.emails ?? []).map((e) => clean(e)?.toLowerCase()).filter(Boolean)),
    website: normUrl(p.website),
    socials: p.socials ?? {},
    hours: clean(p.hours) || null,
    rating: Number.isFinite(p.rating) ? p.rating : null,
    reviews: Number.isFinite(p.reviews) ? p.reviews : null,
    link: p.link ?? null,
  };
}

const clean = (v) => (v == null ? null : String(v).replace(/\s+/g, ' ').trim());
const uniq = (list) => [...new Set(list)];

/** Ссылка на сайт: с протоколом, без ссылок-переходников карт. */
export function normUrl(v) {
  let s = clean(v);
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s.replace(/^\/+/, '')}`;
  try {
    const u = new URL(s);
    if (!/\./.test(u.hostname)) return null;
    // кириллический домен показываем по-русски, а не в виде xn--
    return u.href.replace(u.hostname, domainToUnicode(u.hostname)).replace(/\/$/, '');
  } catch {
    return null;
  }
}

async function getJson(fetchImpl, url, init, name, timeout = TIMEOUT) {
  let res;
  try {
    res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeout) });
  } catch (err) {
    throw new SourceError(`${name} не ответил: ${err.name === 'TimeoutError' ? `нет ответа ${Math.round(timeout / 1000)} с` : err.message}`);
  }
  const text = await res.text().catch(() => '');
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    /* не JSON */
  }
  if (!res.ok) {
    const msg = body?.error?.message ?? body?.message ?? body?.meta?.error?.message ?? (typeof body?.error === 'string' ? body.error : null) ?? text.slice(0, 200);
    throw new SourceError(`${name}: ${msg || `ответ ${res.status}`}${res.status === 403 || res.status === 401 ? ' (проверьте ключ)' : ''}`);
  }
  if (body == null) throw new SourceError(`${name}: ответ не в формате JSON`);
  return body;
}

// ---------- OpenStreetMap ----------

// Частые запросы → теги OSM: по одному названию «кафе» не найти кафе без этого слова в имени
const OSM_TAGS = [
  [/кофе|кафе|кофейн/, ['amenity=cafe']],
  [/ресторан/, ['amenity=restaurant']],
  [/бар\b|паб/, ['amenity=bar', 'amenity=pub']],
  [/пицц/, ['cuisine=pizza']],
  [/суши|роллы/, ['cuisine=sushi']],
  [/фастфуд|бургер|шаурм/, ['amenity=fast_food']],
  [/пекарн|хлеб/, ['shop=bakery']],
  [/стоматолог|зубн/, ['amenity=dentist', 'healthcare=dentist']],
  [/клиник|медцентр|медицинск/, ['amenity=clinic', 'healthcare=clinic']],
  [/аптек/, ['amenity=pharmacy']],
  [/ветеринар|ветклиник/, ['amenity=veterinary']],
  [/салон красоты|косметолог|маникюр|ногт/, ['shop=beauty']],
  [/парикмахер|барбер/, ['shop=hairdresser']],
  [/фитнес|спортзал|тренажер/, ['leisure=fitness_centre']],
  [/бассейн/, ['leisure=swimming_pool']],
  [/йог/, ['sport=yoga']],
  [/автосервис|автомастерск|ремонт авто|сто\b/, ['shop=car_repair']],
  [/шиномонтаж|шины/, ['shop=tyres']],
  [/автомойк/, ['amenity=car_wash']],
  [/автосалон|автодилер/, ['shop=car']],
  [/автозапчаст/, ['shop=car_parts']],
  [/азс|заправк/, ['amenity=fuel']],
  [/гостиниц|отел|хостел/, ['tourism=hotel', 'tourism=hostel', 'tourism=guest_house']],
  [/цвет/, ['shop=florist']],
  [/мебел/, ['shop=furniture']],
  [/одежд/, ['shop=clothes']],
  [/обув/, ['shop=shoes']],
  [/строймат|стройматериал|строительн.*магазин|хозтовар/, ['shop=doityourself', 'shop=hardware']],
  [/строительн.*компан|застройщик/, ['office=construction_company']],
  [/недвижим|риелтор|риэлтор/, ['office=estate_agent']],
  [/юрист|юридическ|адвокат/, ['office=lawyer']],
  [/нотариус/, ['office=notary']],
  [/бухгалтер/, ['office=accountant']],
  [/банк/, ['amenity=bank']],
  [/школ/, ['amenity=school']],
  [/детск.*сад/, ['amenity=kindergarten']],
  [/кинотеатр/, ['amenity=cinema']],
  [/супермаркет|продукт/, ['shop=supermarket', 'shop=convenience']],
  [/оптик/, ['shop=optician']],
  [/ювелир/, ['shop=jewelry']],
  [/зоомагазин|зоотовар/, ['shop=pet']],
];

const OSM_KIND = {
  cafe: 'Кафе', restaurant: 'Ресторан', bar: 'Бар', pub: 'Паб', fast_food: 'Фастфуд', bakery: 'Пекарня', dentist: 'Стоматология', clinic: 'Клиника',
  pharmacy: 'Аптека', veterinary: 'Ветклиника', beauty: 'Салон красоты', hairdresser: 'Парикмахерская', fitness_centre: 'Фитнес', swimming_pool: 'Бассейн',
  car_repair: 'Автосервис', tyres: 'Шиномонтаж', car_wash: 'Автомойка', car: 'Автосалон', car_parts: 'Автозапчасти', fuel: 'АЗС', hotel: 'Гостиница',
  hostel: 'Хостел', guest_house: 'Гостевой дом', florist: 'Цветы', furniture: 'Мебель', clothes: 'Одежда', shoes: 'Обувь', doityourself: 'Стройматериалы',
  hardware: 'Хозтовары', construction_company: 'Строительная компания', estate_agent: 'Недвижимость', lawyer: 'Юристы', notary: 'Нотариус',
  accountant: 'Бухгалтерия', bank: 'Банк', school: 'Школа', kindergarten: 'Детский сад', cinema: 'Кинотеатр', supermarket: 'Супермаркет',
  convenience: 'Продукты', optician: 'Оптика', jewelry: 'Ювелирный', pet: 'Зоотовары', company: 'Компания', yoga: 'Йога',
};

// кавычки и обратную косую черту убираем, спецсимволы регулярного выражения экранируем для строки Overpass
const osmEscape = (s) => s.replace(/[\\"]/g, '').replace(/[.*+?^${}()|[\]]/g, '\\\\$&');

/** Основа слова без окончания: «рестораны» → «ресторан», «кофейни» → «кофейн» — чтобы найти «Ресторан Волга». */
export function stem(query) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 5 ? w.replace(/(ами|ями|ов|ев|ей|ия|ие|ий|ая|ые|ый|ой|ам|ям|ах|ях|[аяыиеоуюь])$/, '') : w))
    .join(' ');
}

/** Запрос Overpass: компании с запросом в названии или с подходящим тегом, внутри границ города. */
export function overpassQuery(query, bbox, limit) {
  const q = query.toLowerCase();
  const tags = [...new Set(OSM_TAGS.filter(([re]) => re.test(q)).flatMap(([, t]) => t))];
  const parts = [`nwr["name"~"${osmEscape(stem(query))}",i];`, ...tags.map((t) => {
    const [k, v] = t.split('=');
    return `nwr["${k}"="${v}"]["name"];`;
  })];
  // прямоугольник вокруг города, а не «область»: области есть не на всех серверах Overpass,
  // и без них запрос молча возвращает пусто
  return `[out:json][timeout:100][bbox:${bbox.join(',')}];(${parts.join('')});out center tags ${limit};`;
}

/** Город → область поиска Overpass (id области из отношения или линии OSM). */
export async function osmArea(geo, fetchImpl) {
  const qs = new URLSearchParams({ q: geo, format: 'json', limit: '10', 'accept-language': 'ru' });
  const list = await getJson(fetchImpl, `https://nominatim.openstreetmap.org/search?${qs}`, { headers: { 'user-agent': UA } }, 'OpenStreetMap');
  // граница города, района или области, потом населённый пункт — а не маршрут автобуса или улица с тем же названием
  const hit =
    list.find((x) => x.class === 'boundary' && x.type === 'administrative') ??
    list.find((x) => x.class === 'place') ??
    list.find((x) => x.osm_type === 'relation') ??
    list[0];
  if (!hit) throw new SourceError(`OpenStreetMap не нашёл «${geo}»: укажите город или область`);
  let [south, north, west, east] = (hit.boundingbox ?? []).map(Number);
  const lat = Number(hit.lat);
  const lon = Number(hit.lon);
  // у посёлка без границы в OSM только точка: берём примерно 10 км вокруг
  if (![south, north, west, east].every(Number.isFinite) || north - south < 0.02) {
    const dLat = 0.09;
    const dLon = 0.09 / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
    [south, north, west, east] = [lat - dLat, lat + dLat, lon - dLon, lon + dLon];
  }
  const r = (v) => Math.round(v * 1e5) / 1e5;
  return { bbox: [r(south), r(west), r(north), r(east)], name: hit.display_name };
}

const split = (v) => (v ? String(v).split(/\s*[;,]\s*/).filter(Boolean) : []);

export function osmPlace(el) {
  const t = el.tags ?? {};
  const kind = t.amenity ?? t.shop ?? t.office ?? t.healthcare ?? t.leisure ?? t.tourism ?? t.craft ?? t.sport ?? null;
  const street = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(', ');
  const social = (k) => t[`contact:${k}`] ?? null;
  return place({
    source: 'osm',
    sourceId: `${el.type}/${el.id}`,
    name: t.name,
    category: kind ? OSM_KIND[kind] ?? kind.replace(/_/g, ' ') : null,
    address: [t['addr:city'], street].filter(Boolean).join(', ') || null,
    city: t['addr:city'] ?? null,
    lat: el.lat ?? el.center?.lat,
    lon: el.lon ?? el.center?.lon,
    phones: [...split(t.phone), ...split(t['contact:phone']), ...split(t['contact:mobile'])],
    emails: [...split(t.email), ...split(t['contact:email'])],
    website: t.website ?? t['contact:website'] ?? t.url ?? null,
    socials: Object.fromEntries(
      [['vk', social('vk')], ['telegram', social('telegram')], ['whatsapp', social('whatsapp')], ['instagram', social('instagram')], ['ok', social('ok')]].filter(([, v]) => v),
    ),
    hours: t.opening_hours ?? null,
    link: `https://www.openstreetmap.org/${el.type}/${el.id}`,
  });
}

// Публичные серверы Overpass бывают перегружены: пробуем по очереди, первым — зеркало VK в России
export const OVERPASS = ['https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

async function searchOsm({ query, geo, limit, fetchImpl }) {
  const area = await osmArea(geo, fetchImpl);
  const data = new URLSearchParams({ data: overpassQuery(query, area.bbox, limit) }).toString();
  let body = null;
  const errors = [];
  for (const url of OVERPASS) {
    try {
      body = await getJson(fetchImpl, url, { method: 'POST', headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded' }, body: data }, `OpenStreetMap (${new URL(url).hostname})`, 110_000);
      break;
    } catch (err) {
      errors.push(err.message);
    }
  }
  if (!body) throw new SourceError(`Серверы OpenStreetMap не ответили, попробуйте позже. ${errors.join('; ')}`);
  return (body.elements ?? []).filter((e) => e.tags?.name).map(osmPlace);
}

// ---------- Яндекс Карты: API Поиска по организациям ----------

export function yandexPlace(f) {
  const m = f.properties?.CompanyMetaData ?? {};
  const [lon, lat] = f.geometry?.coordinates ?? [];
  return place({
    source: 'yandex',
    sourceId: m.id,
    name: m.name ?? f.properties?.name,
    category: (m.Categories ?? []).map((c) => c.name).join(', '),
    address: m.address ?? f.properties?.description,
    city: null,
    lat,
    lon,
    phones: (m.Phones ?? []).map((p) => p.formatted),
    website: m.url,
    hours: m.Hours?.text,
    link: m.id ? `https://yandex.ru/maps/org/${m.id}` : null,
  });
}

async function searchYandex({ query, geo, limit, key, fetchImpl }) {
  const out = [];
  for (let skip = 0; out.length < limit && skip < 1000; skip += 50) {
    const qs = new URLSearchParams({ apikey: key, text: `${query}, ${geo}`, lang: 'ru_RU', type: 'biz', results: String(Math.min(50, limit - out.length)), skip: String(skip) });
    const body = await getJson(fetchImpl, `https://search-maps.yandex.ru/v1/?${qs}`, {}, 'Яндекс Карты');
    const list = body.features ?? [];
    out.push(...list.map(yandexPlace));
    if (list.length < 50) break;
  }
  return out;
}

// ---------- 2ГИС: Catalog API ----------

const GIS_SOCIAL = { vkontakte: 'vk', telegram: 'telegram', whatsapp: 'whatsapp', instagram: 'instagram', odnoklassniki: 'ok', youtube: 'youtube' };

export function gisPlace(it) {
  const contacts = (it.contact_groups ?? []).flatMap((g) => g.contacts ?? []);
  const of = (type) => contacts.filter((c) => c.type === type);
  const socials = {};
  for (const c of contacts) if (GIS_SOCIAL[c.type] && !socials[GIS_SOCIAL[c.type]]) socials[GIS_SOCIAL[c.type]] = c.url ?? c.value;
  const city = (it.adm_div ?? []).find((d) => d.type === 'city')?.name ?? null;
  return place({
    source: '2gis',
    sourceId: it.id,
    name: it.name,
    category: (it.rubrics ?? []).map((r) => r.name).join(', '),
    address: [city, it.address_name].filter(Boolean).join(', ') || it.full_name,
    city,
    lat: it.point?.lat,
    lon: it.point?.lon,
    phones: of('phone').map((c) => c.text ?? c.value),
    emails: of('email').map((c) => c.value),
    // у сайта в 2ГИС value — ссылка-переходник, адрес сайта в text
    website: of('website')[0]?.text ?? null,
    socials,
    hours: it.schedule?.comment ?? null,
    rating: it.reviews?.general_rating != null ? Number(it.reviews.general_rating) : null,
    reviews: it.reviews?.general_review_count ?? null,
    link: it.id ? `https://2gis.ru/firm/${String(it.id).split('_')[0]}` : null,
  });
}

async function searchGis({ query, geo, limit, key, fetchImpl }) {
  const out = [];
  const fields = 'items.point,items.adm_div,items.contact_groups,items.rubrics,items.reviews,items.schedule,items.full_address_name';
  for (let page = 1; out.length < limit && page <= 50; page++) {
    const qs = new URLSearchParams({ q: `${query} ${geo}`, key, type: 'branch', page: String(page), page_size: '10', fields, locale: 'ru_RU' });
    let body;
    try {
      body = await getJson(fetchImpl, `https://catalog.api.2gis.com/3.0/items?${qs}`, {}, '2ГИС');
    } catch (err) {
      // демо-ключ отдаёт только первые страницы: то, что уже нашли, оставляем
      if (out.length) break;
      throw err;
    }
    if (body.meta?.code === 404) break;
    if (body.meta?.code && body.meta.code >= 400) {
      if (out.length) break;
      throw new SourceError(`2ГИС: ${body.meta.error?.message ?? `код ${body.meta.code}`}`);
    }
    const items = body.result?.items ?? [];
    out.push(...items.map(gisPlace));
    if (items.length < 10 || out.length >= (body.result?.total ?? Infinity)) break;
  }
  return out.slice(0, limit);
}

// ---------- Google Maps: Places API (New), Text Search ----------

const GOOGLE_FIELDS = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.location', 'places.nationalPhoneNumber', 'places.internationalPhoneNumber',
  'places.websiteUri', 'places.rating', 'places.userRatingCount', 'places.googleMapsUri', 'places.primaryTypeDisplayName', 'places.addressComponents',
  'places.regularOpeningHours.weekdayDescriptions', 'nextPageToken',
].join(',');

export function googlePlace(p) {
  const city = (p.addressComponents ?? []).find((c) => c.types?.includes('locality'))?.longText ?? null;
  return place({
    source: 'google',
    sourceId: p.id,
    name: p.displayName?.text,
    category: p.primaryTypeDisplayName?.text,
    address: p.formattedAddress,
    city,
    lat: p.location?.latitude,
    lon: p.location?.longitude,
    phones: [p.internationalPhoneNumber ?? p.nationalPhoneNumber].filter(Boolean),
    website: p.websiteUri,
    hours: p.regularOpeningHours?.weekdayDescriptions?.join('; '),
    rating: p.rating,
    reviews: p.userRatingCount,
    link: p.googleMapsUri,
  });
}

async function searchGoogle({ query, geo, limit, key, fetchImpl, wait = sleep }) {
  const out = [];
  let pageToken = null;
  // Google отдаёт по запросу не больше 60 мест: 3 страницы по 20
  for (let i = 0; i < 3 && out.length < limit; i++) {
    const body = await getJson(
      fetchImpl,
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key, 'x-goog-fieldmask': GOOGLE_FIELDS },
        body: JSON.stringify({ textQuery: `${query}, ${geo}`, languageCode: 'ru', pageSize: 20, ...(pageToken ? { pageToken } : {}) }),
      },
      'Google Maps',
    );
    out.push(...(body.places ?? []).map(googlePlace));
    pageToken = body.nextPageToken;
    if (!pageToken) break;
    await wait(1500);
  }
  return out.slice(0, limit);
}

const SEARCH = { osm: searchOsm, yandex: searchYandex, '2gis': searchGis, google: searchGoogle };

/** Компании из одного источника. */
export async function searchSource(source, opts) {
  const fn = SEARCH[source];
  if (!fn) throw new SourceError('Неизвестный источник');
  if (SOURCES[source].key && !opts.key) throw new SourceError(`${SOURCES[source].label}: не задан ключ API`);
  return fn(opts);
}
