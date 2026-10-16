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
 * Отчёт Директа по дням: показы, клики, расход (с НДС, в валюте аккаунта) и конверсии по целям Метрики.
 * Директ готовит отчёт в фоне: ответы 201/202 — ждём retryIn секунд и спрашиваем снова.
 */
export async function directDaily({ token, login = null, from, to, goals = [], fetchImpl = fetch, wait = sleep, attempts = 30 }) {
  const fields = ['Date', 'Impressions', 'Clicks', 'Cost'];
  if (goals.length) fields.push('Conversions');
  const params = {
    SelectionCriteria: { DateFrom: from, DateTo: to },
    FieldNames: fields,
    // Имя отчёта постоянно в пределах часа: повторный запрос (кнопка, фоновая загрузка) получает тот же
    // отчёт из очереди Директа, а не ставит новый. С уникальным именем на каждый вызов очередь
    // переполнялась и Директ отвечал «Превышен лимит запросов метода».
    ReportName: `korp-${login ?? 'own'}-${from}-${to}-${goals.join('.')}-${new Date().toISOString().slice(0, 13)}`.slice(0, 250),
    ReportType: 'CUSTOM_REPORT',
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
    const res = await fetchImpl(DIRECT_URL, { method: 'POST', headers, body: JSON.stringify({ params }) });
    if (res.status === 200) return parseDirectTsv(await res.text());
    if (res.status === 201 || res.status === 202) {
      const retry = Number(res.headers.get('retryIn')) || 5;
      await wait(Math.min(retry, 30) * 1000);
      continue;
    }
    throw new AdApiError(`Директ: ${await directError(res)}`);
  }
  throw new AdApiError('Директ слишком долго готовит отчёт, попробуйте обновить позже');
}

// Ограничения Директа временные: очередь отчётов, лимит запросов, баллы — понятный текст вместо кода
const DIRECT_LIMITS = {
  56: 'Директ временно ограничил запросы отчётов. Цифры подтянутся при следующей загрузке, через 3 часа, или нажмите «Обновить» позже',
  152: 'У аккаунта Директа закончились баллы API на сегодня. Цифры подтянутся при следующей загрузке',
  9000: 'Директ сейчас готовит слишком много отчётов. Цифры подтянутся при следующей загрузке',
};

async function directError(res) {
  const text = await res.text().catch(() => '');
  try {
    const e = JSON.parse(text).error;
    // пояснение Директа оставляем: по нему видно, какой именно лимит сработал и когда он снимется
    if (e && DIRECT_LIMITS[Number(e.error_code)]) return `${DIRECT_LIMITS[Number(e.error_code)]} (код ${e.error_code}${e.error_detail ? `, Директ: «${e.error_detail}»` : ''})`;
    if (e) return `${e.error_string ?? 'ошибка'}${e.error_detail ? `: ${e.error_detail}` : ''} (код ${e.error_code})`;
  } catch {
    /* не JSON */
  }
  return `ответ ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`;
}

/** TSV Директа: первая строка — названия колонок; конверсии по нескольким целям приходят отдельными колонками. */
export function parseDirectTsv(text) {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const head = lines[0].split('\t');
  const at = (name) => head.indexOf(name);
  const conv = head.map((h, i) => (h.startsWith('Conversions') ? i : -1)).filter((i) => i >= 0);
  return lines.slice(1).map((line) => {
    const c = line.split('\t');
    return {
      date: c[at('Date')],
      impressions: num(c[at('Impressions')]),
      clicks: num(c[at('Clicks')]),
      cost: num(c[at('Cost')]),
      conversions: conv.reduce((s, i) => s + num(c[i]), 0),
    };
  });
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
