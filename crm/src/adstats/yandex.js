// Яндекс Директ (API v5, отчёты) и Яндекс Метрика (API отчётов) — дневная статистика по клиенту.
// Один OAuth-токен агентства с правами direct:api и metrika:read (YANDEX_ADS_TOKEN).
// У агентского аккаунта Директа отчёт клиента запрашивается с заголовком Client-Login.

const DIRECT_URL = 'https://api.direct.yandex.com/json/v5/reports';
const METRIKA_URL = 'https://api-metrika.yandex.net';

export class AdApiError extends Error {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (v) => {
  if (v == null || v === '' || v === '--') return 0;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Отчёт Директа (API v5 Reports) за период: строки TSV как объекты «колонка → значение».
 * Директ готовит отчёт в фоне: ответы 201/202 — ждём retryIn секунд и спрашиваем снова.
 * Конверсии по нескольким целям приходят отдельными колонками — складываем их в conversions.
 */
export async function directReport({ token, login = null, from, to, goals = [], fields, reportType = 'CUSTOM_REPORT', filter = [], fetchImpl = fetch, wait = sleep, attempts = 30 }) {
  const names = goals.length ? [...fields, 'Conversions'] : fields;
  const params = {
    SelectionCriteria: { DateFrom: from, DateTo: to, ...(filter.length ? { Filter: filter } : {}) },
    FieldNames: names,
    // Имя отчёта постоянно в пределах часа: повторный запрос (кнопка, фоновая загрузка) получает тот же
    // отчёт из очереди Директа, а не ставит новый. С уникальным именем на каждый вызов очередь
    // переполнялась и Директ отвечал «Превышен лимит запросов метода».
    ReportName: `korp-${login ?? 'own'}-${reportType}-${fields.join('.')}-${from}-${to}-${goals.join('.')}-${new Date().toISOString().slice(0, 13)}`.slice(0, 250),
    ReportType: reportType,
    DateRangeType: 'CUSTOM_DATE',
    Format: 'TSV',
    IncludeVAT: 'YES',
    ...(goals.length ? { Goals: goals.map(String), AttributionModels: ['AUTO'] } : {}),
  };
  const headers = {
    Authorization: `Bearer ${token}`,
    'Accept-Language': 'ru',
    'Content-Type': 'application/json; charset=utf-8',
    processingMode: 'auto',
    returnMoneyInMicros: 'false',
    skipReportHeader: 'true',
    skipReportSummary: 'true',
    ...(login ? { 'Client-Login': login } : {}),
  };
  for (let i = 0; i < attempts; i++) {
    await throttle(token, wait);
    const res = await fetchImpl(DIRECT_URL, { method: 'POST', headers, body: JSON.stringify({ params }) });
    if (res.status === 200) return parseTsvRows(await res.text());
    if (res.status === 201 || res.status === 202) {
      const retry = Number(res.headers.get('retryIn')) || 5;
      await wait(Math.min(retry, 30) * 1000);
      continue;
    }
    const error = await directError(res);
    // «не чаще 1 раза в 10 секунд» — не ошибка отчёта: ждём и спрашиваем снова
    if (error.code === 56 && /секунд/i.test(error.detail ?? '')) continue;
    throw new AdApiError(`Директ: ${error.text}`);
  }
  throw new AdApiError('Директ слишком долго готовит отчёт, попробуйте обновить позже');
}

/** TSV Директа → объекты; первая строка — названия колонок, «--» — пусто. */
export function parseTsvRows(text) {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const head = lines[0].split('\t');
  const conv = head.map((h, i) => (h.startsWith('Conversions') ? i : -1)).filter((i) => i >= 0);
  return lines.slice(1).map((line) => {
    const c = line.split('\t');
    const row = {};
    head.forEach((h, i) => {
      if (!h.startsWith('Conversions')) row[h] = c[i] === '--' ? '' : c[i];
    });
    row.Conversions = conv.reduce((s, i) => s + num(c[i]), 0);
    return row;
  });
}

/** Отчёт Директа по дням: показы, клики, расход (с НДС, в валюте аккаунта) и конверсии по целям Метрики. */
export async function directDaily(opts) {
  const rows = await directReport({ ...opts, fields: ['Date', 'Impressions', 'Clicks', 'Cost'] });
  return rows.map((r) => ({ date: r.Date, impressions: num(r.Impressions), clicks: num(r.Clicks), cost: num(r.Cost), conversions: r.Conversions }));
}

// Ограничения Директа временные: очередь отчётов, лимит запросов, баллы — понятный текст вместо кода
const DIRECT_LIMITS = {
  56: 'Директ временно ограничил запросы отчётов. Цифры подтянутся при следующей загрузке, через 3 часа, или нажмите «Обновить» позже',
  152: 'У аккаунта Директа закончились баллы API на сегодня. Цифры подтянутся при следующей загрузке',
  9000: 'Директ сейчас готовит слишком много отчётов. Цифры подтянутся при следующей загрузке',
};

// Отчёты Директа можно запрашивать не чаще раза в 10 секунд — на всех клиентов с одним токеном вместе
const REPORT_GAP_MS = 11_000;
const lastReportAt = new Map();
async function throttle(token, wait) {
  const left = (lastReportAt.get(token) ?? 0) + REPORT_GAP_MS - Date.now();
  if (left > 0) await wait(left);
  lastReportAt.set(token, Date.now());
}

async function directError(res) {
  const text = await res.text().catch(() => '');
  try {
    const e = JSON.parse(text).error;
    if (e) {
      const code = Number(e.error_code);
      // пояснение Директа оставляем: по нему видно, какой именно лимит сработал и когда он снимется
      const friendly = DIRECT_LIMITS[code] ? `${DIRECT_LIMITS[code]} (код ${code}${e.error_detail ? `, Директ: «${e.error_detail}»` : ''})` : null;
      return { code, detail: e.error_detail ?? null, text: friendly ?? `${e.error_string ?? 'ошибка'}${e.error_detail ? `: ${e.error_detail}` : ''} (код ${code})` };
    }
  } catch {
    /* не JSON */
  }
  return { code: null, detail: null, text: `ответ ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}` };
}

/** TSV Директа по дням (Date, Impressions, Clicks, Cost, Conversions_*) → дневные строки. */
export function parseDirectTsv(text) {
  return parseTsvRows(text).map((r) => ({ date: r.Date, impressions: num(r.Impressions), clicks: num(r.Clicks), cost: num(r.Cost), conversions: r.Conversions }));
}

/** Метрика по дням: визиты, отказы (визиты × доля отказов) и достижения выбранных целей. */
export async function metrikaDaily({ token, counter, from, to, goals = [], fetchImpl = fetch }) {
  const metrics = ['ym:s:visits', 'ym:s:bounceRate', ...goals.slice(0, 18).map((g) => `ym:s:goal${g}reaches`)];
  const qs = new URLSearchParams({ ids: String(counter), metrics: metrics.join(','), dimensions: 'ym:s:date', date1: from, date2: to, limit: '1000', accuracy: 'full' });
  const res = await fetchImpl(`${METRIKA_URL}/stat/v1/data?${qs}`, { headers: { Authorization: `OAuth ${token}` } });
  if (!res.ok) throw new AdApiError(`Метрика: ${await metrikaError(res)}`);
  const json = await res.json();
  return (json.data ?? []).map((row) => {
    const [visits = 0, bounceRate = 0, ...reaches] = row.metrics ?? [];
    return {
      date: row.dimensions?.[0]?.name,
      visits: num(visits),
      bounces: Math.round((num(visits) * num(bounceRate)) / 100),
      goals: reaches.reduce((s, v) => s + num(v), 0),
    };
  });
}

/** Метрика: отчёт со срезом (источники, страницы входа, устройства, регионы, UTM) за период. */
export async function metrikaReport({ token, counter, from, to, goals = [], dimensions, limit = 200, fetchImpl = fetch }) {
  const metrics = ['ym:s:visits', 'ym:s:users', 'ym:s:bounceRate', 'ym:s:pageDepth', 'ym:s:avgVisitDurationSeconds', ...goals.slice(0, 15).map((g) => `ym:s:goal${g}reaches`)];
  const qs = new URLSearchParams({ ids: String(counter), metrics: metrics.join(','), dimensions: dimensions.join(','), date1: from, date2: to, limit: String(limit), sort: '-ym:s:visits', accuracy: 'full' });
  const res = await fetchImpl(`${METRIKA_URL}/stat/v1/data?${qs}`, { headers: { Authorization: `OAuth ${token}` } });
  if (!res.ok) throw new AdApiError(`Метрика: ${await metrikaError(res)}`);
  const json = await res.json();
  return (json.data ?? []).map((row) => {
    const [visits = 0, users = 0, bounceRate = 0, depth = 0, duration = 0, ...reaches] = row.metrics ?? [];
    return {
      name: (row.dimensions ?? []).map((d) => d?.name ?? 'Не определено').join(' · '),
      visits: num(visits),
      users: num(users),
      bounceRate: num(bounceRate),
      depth: num(depth),
      duration: num(duration),
      goals: reaches.reduce((s, v) => s + num(v), 0),
    };
  });
}

/** Цели счётчика — чтобы в настройках выбрать, что считать конверсией. */
export async function metrikaGoals({ token, counter, fetchImpl = fetch }) {
  const res = await fetchImpl(`${METRIKA_URL}/management/v1/counter/${encodeURIComponent(counter)}/goals`, { headers: { Authorization: `OAuth ${token}` } });
  if (!res.ok) throw new AdApiError(`Метрика: ${await metrikaError(res)}`);
  return ((await res.json()).goals ?? []).map((g) => ({ id: g.id, name: g.name, type: g.type }));
}

/** Сколько счётчиков видно по токену: проверка, что токен рабочий и с правом на Метрику. */
export async function metrikaCounters({ token, fetchImpl = fetch }) {
  const res = await fetchImpl(`${METRIKA_URL}/management/v1/counters?per_page=1`, { headers: { Authorization: `OAuth ${token}` } });
  if (!res.ok) throw new AdApiError(await metrikaError(res));
  const json = await res.json();
  return json.rows ?? json.counters?.length ?? 0;
}

async function metrikaError(res) {
  const text = await res.text().catch(() => '');
  try {
    const j = JSON.parse(text);
    if (j.message) return `${j.message} (код ${j.code ?? res.status})`;
  } catch {
    /* не JSON */
  }
  return `ответ ${res.status}`;
}
