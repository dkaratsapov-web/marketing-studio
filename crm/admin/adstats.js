// «Статистика»: расход и результаты рекламы всех клиентов из Яндекс Директа и Метрики за период,
// сравнение с прошлым таким же периодом, динамика клиента по дням и настройки подключения.

import { h, api, app, shell, toast, navigate, ctx, confirmDialog } from './admin.js';
import { fill, formDialog } from './docs.js';

const nf0 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const int = (v) => (v ? nf0.format(v) : '0');
const money = (v) => (v == null ? '-' : `${nf0.format(v)} ₽`);
const money2 = (v) => (v == null ? '-' : `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: v < 100 ? 1 : 0 }).format(v)} ₽`);
const pct = (v) => (v == null ? '-' : `${nf1.format(v)} %`);
const mskToday = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const shift = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);
const AGENCY = { korp: 'Корпорация', soroka: 'Сорока' };

/** Готовые периоды: последние 7 и 30 дней, этот и прошлый месяц. */
function presets() {
  const t = mskToday();
  const first = `${t.slice(0, 7)}-01`;
  const prevEnd = shift(first, -1);
  return [
    ['7', '7 дней', shift(t, -6), t],
    ['30', '30 дней', shift(t, -29), t],
    ['month', 'Этот месяц', first, t],
    ['prev', 'Прошлый месяц', `${prevEnd.slice(0, 7)}-01`, prevEnd],
  ];
}

function periodOf(params) {
  const p = presets();
  const key = params.get('p') ?? '30';
  const hit = p.find(([k]) => k === key);
  if (hit && key !== 'custom') return { key, from: hit[2], to: hit[3] };
  return { key: 'custom', from: params.get('from') ?? p[1][2], to: params.get('to') ?? p[1][3] };
}

/** Панель периода и агентства; меняет адрес страницы, страница перерисовывается сама. */
function controls(route, params, extra = {}) {
  const per = periodOf(params);
  const go = (patch) => {
    const next = new URLSearchParams({ ...Object.fromEntries(params), ...patch });
    for (const [k, v] of [...next]) if (!v) next.delete(k);
    navigate(route, next);
  };
  const from = h('input', { class: 'input', type: 'date', value: per.from, 'aria-label': 'С', onchange: () => go({ p: 'custom', from: from.value, to: to.value }) });
  const to = h('input', { class: 'input', type: 'date', value: per.to, 'aria-label': 'По', onchange: () => go({ p: 'custom', from: from.value, to: to.value }) });
  return h(
    'div',
    { class: 'filters ads-controls' },
    h('div', { class: 'rating-filter', role: 'group', 'aria-label': 'Период' }, presets().map(([k, label]) => h('button', { type: 'button', 'aria-pressed': String(per.key === k), onclick: () => go({ p: k, from: '', to: '' }) }, label))),
    h('div', { class: 'ads-dates' }, from, h('span', { class: 'muted' }, '-'), to),
    extra.agency !== false
      ? h(
          'div',
          { class: 'rating-filter', role: 'group', 'aria-label': 'Чьи клиенты' },
          [['', 'Все'], ['korp', 'Корпорация'], ['soroka', 'Сорока']].map(([v, label]) => h('button', { type: 'button', 'aria-pressed': String((params.get('agency') ?? '') === v), onclick: () => go({ agency: v }) }, label)),
        )
      : null,
  );
}

// inverse — меньше значит лучше (цена клика, цена конверсии); neutral — без оценки (расход)
const delta = (cur, prev, { inverse = false, neutral = false } = {}) => {
  if (!prev || cur == null) return null;
  const d = ((cur - prev) / prev) * 100;
  if (!Number.isFinite(d) || Math.abs(d) < 0.5) return h('span', { class: 'ads-delta' }, '0 %');
  const good = inverse ? d < 0 : d > 0;
  return h('span', { class: `ads-delta${neutral ? '' : good ? ' up' : ' down'}` }, `${d > 0 ? '+' : ''}${nf0.format(d)} %`);
};

function tiles(t, p) {
  const tile = (label, value, d = null) => h('div', { class: 'home-stat ads-tile' }, h('b', { class: 'num' }, value), h('span', {}, label, d ? [' ', d] : null));
  return h(
    'div',
    { class: 'ads-tiles' },
    tile('расход с НДС', money(t.cost), delta(t.cost, p?.cost, { neutral: true })),
    tile('кликов', int(t.clicks), delta(t.clicks, p?.clicks)),
    tile('CTR', pct(t.ctr)),
    tile('цена клика', money2(t.cpc), delta(t.cpc, p?.cpc, { inverse: true })),
    tile('конверсий в Директе', int(t.conversions), delta(t.conversions, p?.conversions)),
    tile('цена конверсии', money2(t.cpa), delta(t.cpa, p?.cpa, { inverse: true })),
    tile('визитов в Метрике', int(t.visits), delta(t.visits, p?.visits)),
    tile('достижений целей', int(t.goals), delta(t.goals, p?.goals)),
  );
}

const OAUTH_LINK = 'https://oauth.yandex.ru/authorize?response_type=token&client_id=';

/**
 * Токен Яндекса для статистики: администратор вставляет его здесь, кабинет проверяет его в Метрике
 * и сохраняет. Обратно показываются только последние 4 символа.
 */
function tokenPanel(onChange) {
  const box = h('section', { class: 'panel ads-token' }, h('p', { class: 'muted' }, 'Проверяю подключение…'));
  if (ctx.me.role !== 'admin') {
    fill(box, h('h2', {}, 'Яндекс не подключён'), h('p', { class: 'muted' }, 'Токен Яндекса для статистики подключает администратор кабинета в этом разделе.'));
    return box;
  }
  async function draw(editing = false) {
    let t;
    try {
      t = (await api('/admin/api/ad-stats/token')).token;
    } catch (err) {
      fill(box, h('p', { class: 'error' }, err.message));
      return;
    }
    if (t.set && !editing) {
      const when = t.updatedAt ? new Date(`${t.updatedAt.replace(' ', 'T')}Z`).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' }) : null;
      fill(
        box,
        h(
          'div',
          { class: 'ads-token-row' },
          h('span', { class: 'ads-token-ok', 'aria-hidden': 'true' }),
          h('span', {}, h('b', {}, 'Токен Яндекса подключён'), h('span', { class: 'muted small' }, ` …${t.tail}${t.source === 'env' ? ', из настроек сервера' : when ? `, ${t.updatedBy ?? ''} ${when}` : ''}`)),
          h('span', { class: 'spacer' }),
          h('button', { type: 'button', class: 'btn btn-s', onclick: () => draw(true) }, 'Заменить'),
          t.source === 'admin'
            ? h('button', {
                type: 'button', class: 'btn btn-s',
                onclick: async () => {
                  if (!(await confirmDialog('Отключить токен Яндекса? Загрузка статистики остановится, уже загруженные цифры останутся.', { ok: 'Отключить' }))) return;
                  await api('/admin/api/ad-stats/token', { method: 'DELETE' });
                  toast('Токен отключён');
                  onChange();
                },
              }, 'Отключить')
            : null,
        ),
      );
      return;
    }
    const clientId = h('input', { class: 'input', id: 'ads-client-id', maxlength: 64, placeholder: 'ClientID приложения', autocomplete: 'off' });
    const open = h('button', {
      type: 'button', class: 'btn',
      onclick: () => {
        const id = clientId.value.trim();
        if (!/^[0-9a-f]{32}$/i.test(id)) return toast('ClientID — 32 латинские буквы и цифры со страницы приложения');
        window.open(OAUTH_LINK + id, '_blank', 'noopener');
      },
    }, 'Получить токен');
    const input = h('input', { class: 'input', id: 'ads-token', type: 'password', maxlength: 400, placeholder: 'y0_…', autocomplete: 'off', spellcheck: 'false' });
    const save = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Проверить и сохранить');
    fill(
      box,
      h('h2', {}, t.set ? 'Заменить токен Яндекса' : 'Подключите Яндекс'),
      h(
        'ol',
        { class: 'ads-steps' },
        h('li', {}, 'В приложении на oauth.yandex.ru должны быть права Директа и Метрики и Redirect URI https://oauth.yandex.ru/verification_code.'),
        h('li', {}, 'Вставьте ClientID приложения и нажмите «Получить токен». Войдите под аккаунтом агентства с доступом к кабинетам и счётчикам клиентов, нажмите «Разрешить».'),
        h('li', {}, 'Скопируйте токен со страницы Яндекса и вставьте ниже.'),
      ),
      h('div', { class: 'ads-token-form' }, clientId, open),
      h(
        'form',
        {
          class: 'ads-token-form',
          onsubmit: async (e) => {
            e.preventDefault();
            save.disabled = true;
            save.textContent = 'Проверяю в Яндексе…';
            try {
              const r = (await api('/admin/api/ad-stats/token', { method: 'PUT', body: { token: input.value } })).token;
              toast(`Токен подключён. Счётчиков Метрики доступно: ${r.counters}`);
              onChange();
            } catch (err) {
              toast(err.message);
              save.disabled = false;
              save.textContent = 'Проверить и сохранить';
            }
          },
        },
        input,
        save,
        t.set ? h('button', { type: 'button', class: 'btn', onclick: () => draw(false) }, 'Отмена') : null,
      ),
      h('p', { class: 'muted small' }, 'Токен хранится на сервере кабинета, видит его только администратор (последние 4 символа). Директ начнёт отдавать цифры после одобрения заявки на доступ к API.'),
    );
  }
  draw();
  return box;
}

/** Настройки клиента: Директ (логин клиента у агентского аккаунта), счётчик Метрики, цели-конверсии. */
export function openAccountDialog(client, account, onSaved, { token = true } = {}) {
  const ownToken = h('input', { class: 'input', id: 'ads-own-token', type: 'password', maxlength: 400, autocomplete: 'off', spellcheck: 'false', placeholder: account?.own_token ? `сохранён …${account.token_tail}, вставьте новый, чтобы заменить` : 'y0_…' });
  const dropToken = h('input', { type: 'checkbox' });
  const direct = h('input', { type: 'checkbox', checked: Boolean(account?.direct_enabled) });
  const login = h('input', { class: 'input', id: 'ads-login', maxlength: 100, value: account?.direct_login ?? '', placeholder: 'client-login' });
  const counter = h('input', { class: 'input', id: 'ads-counter', inputmode: 'numeric', maxlength: 12, value: account?.metrika_counter ?? '', placeholder: '12345678' });
  const goals = h('input', { class: 'input', id: 'ads-goals', maxlength: 400, value: (account?.goals ?? '').replace(/,/g, ', '), placeholder: '123456, 234567' });
  const goalList = h('div', { class: 'ads-goal-list' });
  const loadGoals = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-s',
      onclick: async () => {
        loadGoals.disabled = true;
        try {
          const { goals: list } = await api('/admin/api/ad-stats/goals', { method: 'POST', body: { counter: counter.value.trim(), clientId: client.id, token: ownToken.value.trim() || null } });
          const chosen = new Set(goals.value.split(/[\s,;]+/).filter(Boolean));
          fill(
            goalList,
            list.length
              ? list.map((g) =>
                  h(
                    'label',
                    { class: 'check' },
                    h('input', {
                      type: 'checkbox',
                      checked: chosen.has(String(g.id)),
                      onchange: (e) => {
                        if (e.target.checked) chosen.add(String(g.id));
                        else chosen.delete(String(g.id));
                        goals.value = [...chosen].join(', ');
                      },
                    }),
                    `${g.name} (${g.id})`,
                  ),
                )
              : h('p', { class: 'muted' }, 'У счётчика нет целей.'),
          );
        } catch (err) {
          toast(err.message);
        } finally {
          loadGoals.disabled = false;
        }
      },
    },
    'Загрузить цели',
  );
  formDialog({
    title: `Статистика: ${client.name}`,
    submitLabel: 'Сохранить и загрузить',
    body: h(
      'div',
      { class: 'ads-form' },
      token || account?.own_token
        ? null
        : h('p', { class: 'ads-note' }, 'Общий токен агентства вставляется вверху раздела «Статистика». Если у клиента свой доступ, вставьте его токен ниже, в поле «Свой токен клиента».'),
      h('label', { class: 'check' }, direct, 'Яндекс Директ'),
      h('div', { class: 'field' }, h('label', { for: 'ads-login' }, 'Логин клиента в Директе'), login, h('span', { class: 'hint' }, 'Для агентского аккаунта. Если токен выдан на кабинет самого клиента, оставьте пустым.')),
      h('div', { class: 'field' }, h('label', { for: 'ads-counter' }, 'Счётчик Яндекс Метрики'), counter),
      h(
        'div',
        { class: 'field' },
        h('label', { for: 'ads-own-token' }, 'Свой токен клиента'),
        ownToken,
        h('span', { class: 'hint' }, 'Если доступ к Директу и Метрике клиента не через ваш агентский аккаунт: токен под аккаунтом клиента. Пусто — используется общий токен агентства.'),
        account?.own_token ? h('label', { class: 'check' }, dropToken, 'Убрать свой токен, использовать общий') : null,
      ),
      h('div', { class: 'field' }, h('label', { for: 'ads-goals' }, 'Цели-конверсии'), h('div', { class: 'ads-goal-row' }, goals, loadGoals), h('span', { class: 'hint' }, 'Номера целей Метрики через запятую: по ним считаются конверсии и их цена.'), goalList),
    ),
    onSubmit: async () => {
      const r = await api(`/admin/api/ad-stats/clients/${client.id}/account`, {
        method: 'PUT',
        body: { directEnabled: direct.checked, directLogin: login.value.trim() || null, metrikaCounter: counter.value.trim() || null, goals: goals.value.trim() || null, token: ownToken.value.trim() || null, clearToken: dropToken.checked },
      });
      if (r.sync && !r.sync.ok) toast(`Сохранено, но загрузка не удалась: ${r.sync.errors.join('; ')}`);
      else toast(r.sync ? 'Сохранено, статистика загружена' : 'Сохранено');
      onSaved?.();
    },
  });
}

export async function renderAdStats(params) {
  const body = h('div', { class: 'ads' }, h('p', { class: 'muted' }, 'Загружаю…'));
  const refresh = h('button', { type: 'button', class: 'btn', onclick: syncAll }, 'Обновить данные');
  fill(app, shell('adstats', [h('div', { class: 'page-head' }, h('h1', {}, 'Статистика'), h('span', { class: 'spacer' }), refresh), controls('adstats', params), body]));

  async function syncAll() {
    refresh.disabled = true;
    refresh.textContent = 'Загружаю из Яндекса…';
    try {
      const { sync } = await api('/admin/api/ad-stats/sync', { method: 'POST' });
      toast(sync.skipped ? 'Токен Яндекса не подключён' : `Обновлено: ${sync.ok}${sync.failed ? `, с ошибкой: ${sync.failed}` : ''}`);
      load();
    } catch (err) {
      toast(err.message);
    } finally {
      refresh.disabled = false;
      refresh.textContent = 'Обновить данные';
    }
  }

  async function load() {
    const per = periodOf(params);
    let d;
    try {
      d = await api(`/admin/api/ad-stats?${new URLSearchParams({ from: per.from, to: per.to, ...(params.get('agency') ? { agency: params.get('agency') } : {}) })}`);
    } catch (err) {
      if (err.status !== 401) fill(body, h('p', { class: 'error' }, err.message));
      return;
    }
    refresh.hidden = !d.token;
    const cols = ['Клиент', 'Расход', 'Показы', 'Клики', 'CTR', 'Цена клика', 'Конверсии', 'Цена конверсии', 'Визиты', 'Отказы', 'Цели', 'Конверсия сайта'];
    const row = (r) =>
      h(
        'tr',
        { onclick: () => navigate('adclient', new URLSearchParams({ id: String(r.id), ...Object.fromEntries(params) })) },
        h(
          'td',
          {},
          h('a', { class: 'row-link company', href: `#/adclient?id=${r.id}` }, r.name),
          h('span', { class: 'ads-sources' }, h('span', { class: `agency-tag agency-${r.agency}` }, AGENCY[r.agency]), r.sources.direct ? h('span', { class: 'ads-src' }, 'Директ') : null, r.sources.metrika ? h('span', { class: 'ads-src' }, 'Метрика') : null, r.ownToken ? h('span', { class: 'ads-src', title: 'Цифры грузятся по токену клиента' }, 'свой токен') : null),
          r.noToken ? h('span', { class: 'muted small' }, 'Нет токена: общего или своего') : r.error ? h('span', { class: 'ads-error', title: r.error }, `Ошибка загрузки: ${r.error}`) : !r.syncedAt ? h('span', { class: 'muted small' }, 'Ещё не загружено') : null,
        ),
        h('td', { class: 'num nowrap' }, money(r.cost), ' ', delta(r.cost, r.prev.cost, { neutral: true })),
        h('td', { class: 'num' }, int(r.impressions)),
        h('td', { class: 'num' }, int(r.clicks)),
        h('td', { class: 'num' }, pct(r.ctr)),
        h('td', { class: 'num nowrap' }, money2(r.cpc)),
        h('td', { class: 'num' }, int(r.conversions), ' ', delta(r.conversions, r.prev.conversions)),
        h('td', { class: 'num nowrap' }, money2(r.cpa)),
        h('td', { class: 'num' }, int(r.visits)),
        h('td', { class: 'num' }, pct(r.bounceRate)),
        h('td', { class: 'num' }, int(r.goals)),
        h('td', { class: 'num' }, pct(r.cr)),
      );
    const t = d.total;
    fill(
      body,
      ctx.me.role === 'admin' || !d.token ? tokenPanel(load) : null,
      d.rows.length ? tiles(d.total, d.prevTotal) : null,
      d.rows.length
        ? h(
            'div',
            { class: 'table-wrap' },
            h(
              'table',
              { class: 'leads docs ads-table' },
              h('thead', {}, h('tr', {}, cols.map((c) => h('th', { scope: 'col' }, c)))),
              h('tbody', {}, d.rows.map(row)),
              h(
                'tfoot',
                {},
                h('tr', {}, h('td', {}, 'Итого'), h('td', { class: 'num nowrap' }, money(t.cost)), h('td', { class: 'num' }, int(t.impressions)), h('td', { class: 'num' }, int(t.clicks)), h('td', { class: 'num' }, pct(t.ctr)), h('td', { class: 'num nowrap' }, money2(t.cpc)), h('td', { class: 'num' }, int(t.conversions)), h('td', { class: 'num nowrap' }, money2(t.cpa)), h('td', { class: 'num' }, int(t.visits)), h('td', { class: 'num' }, pct(t.bounceRate)), h('td', { class: 'num' }, int(t.goals)), h('td', { class: 'num' }, pct(t.cr))),
              ),
            ),
          )
        : h('div', { class: 'panel empty' }, h('strong', {}, 'Ни один клиент ещё не подключён'), 'Нажмите «Подключить» у клиента ниже: укажите кабинет Директа и счётчик Метрики.'),
      h('p', { class: 'muted small' }, `Период ${fmtDate(d.period.from)} - ${fmtDate(d.period.to)}; сравнение с ${fmtDate(d.prev.from)} - ${fmtDate(d.prev.to)}. Расход с НДС. Конверсии считаются по выбранным целям Метрики.`),
      d.notConnected.length
        ? h(
            'section',
            { class: 'panel ads-off' },
            h('h2', {}, `Не подключены: ${d.notConnected.length}`),
            h('ul', { class: 'ads-off-list' }, d.notConnected.map((c) => h('li', {}, h('span', { class: 'ads-off-name' }, c.name), h('span', { class: `agency-tag agency-${c.agency}` }, AGENCY[c.agency]), h('button', { type: 'button', class: 'btn btn-s', onclick: () => openAccountDialog(c, null, load, { token: d.token }) }, 'Подключить')))),
          )
        : null,
    );
  }
  await load();
}

const fmtDate = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace('.', '');

/** График по дням: столбцы — расход, линия — конверсии (или достижения целей, если Директа нет). */
function chart(days) {
  const W = 960;
  const H = 240;
  const pad = { l: 8, r: 8, t: 16, b: 28 };
  const maxCost = Math.max(1, ...days.map((x) => x.cost));
  const conv = days.map((x) => x.conversions || x.goals);
  const maxConv = Math.max(1, ...conv);
  const bw = (W - pad.l - pad.r) / days.length;
  const y = (v, max) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const bars = days.map((x, i) => `<rect x="${pad.l + i * bw + bw * 0.15}" y="${y(x.cost, maxCost)}" width="${Math.max(1, bw * 0.7)}" height="${H - pad.b - y(x.cost, maxCost)}" rx="2" class="ads-bar"><title>${x.date}: ${Math.round(x.cost)} ₽</title></rect>`).join('');
  const line = conv.map((v, i) => `${i ? 'L' : 'M'}${pad.l + i * bw + bw / 2},${y(v, maxConv)}`).join(' ');
  const dots = conv.map((v, i) => (v ? `<circle cx="${pad.l + i * bw + bw / 2}" cy="${y(v, maxConv)}" r="3" class="ads-dot"><title>${days[i].date}: ${v}</title></circle>` : '')).join('');
  const step = Math.ceil(days.length / 10);
  const labels = days.map((x, i) => (i % step === 0 ? `<text x="${pad.l + i * bw + bw / 2}" y="${H - 8}" text-anchor="middle" class="ads-label">${Number(x.date.slice(8))}.${x.date.slice(5, 7)}</text>` : '')).join('');
  const box = h('div', { class: 'ads-chart' });
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Расход и конверсии по дням" preserveAspectRatio="none">${bars}<path d="${line}" class="ads-line" fill="none"/>${dots}${labels}</svg>`;
  return h('div', {}, box, h('p', { class: 'ads-legend muted small' }, h('span', { class: 'ads-key bar' }), 'Расход', h('span', { class: 'ads-key line' }), days.some((x) => x.conversions) ? 'Конверсии в Директе' : 'Достижения целей в Метрике'));
}

export async function renderAdClient(params) {
  const id = Number(params.get('id'));
  if (!id) return navigate('adstats');
  const body = h('div', { class: 'ads' }, h('p', { class: 'muted' }, 'Загружаю…'));
  const head = h('div', { class: 'doc-head' });
  const back = new URLSearchParams(params);
  back.delete('id');
  fill(app, shell('adclient', [head, controls('adclient', params, { agency: false }), body]));
  const per = periodOf(params);
  let d;
  let client;
  try {
    [d, { client }] = await Promise.all([api(`/admin/api/ad-stats/clients/${id}?${new URLSearchParams({ from: per.from, to: per.to })}`), api(`/admin/api/clients/${id}`)]);
  } catch (err) {
    if (err.status !== 401) fill(body, h('p', { class: 'error' }, err.message));
    return;
  }
  const reload = () => renderAdClient(params);
  const sync = h(
    'button',
    {
      type: 'button',
      class: 'btn',
      onclick: async () => {
        sync.disabled = true;
        try {
          const r = (await api(`/admin/api/ad-stats/clients/${id}/sync`, { method: 'POST' })).sync;
          toast(r.busy ? 'Загрузка уже идёт, обновите страницу через минуту' : r.ok ? 'Статистика обновлена' : `Ошибка: ${r.errors.join('; ')}`);
          reload();
        } catch (err) {
          toast(err.message);
          sync.disabled = false;
        }
      },
    },
    'Обновить',
  );
  fill(
    head,
    h('a', { class: 'back', href: `#/adstats${back.toString() ? `?${back}` : ''}` }, 'Статистика'),
    h('h1', { class: 'ads-title' }, client.name),
    h('span', { class: 'spacer' }),
    h('a', { class: 'btn', href: `#/tasks?project=${id}` }, 'Задачи проекта'),
    h('button', { type: 'button', class: 'btn', onclick: () => openAccountDialog(client, d.account, reload, { token: d.token }) }, 'Настроить'),
    d.account ? sync : null,
  );
  const a = d.account;
  fill(
    body,
    !a || (!a.direct_enabled && !a.metrika_counter)
      ? h('div', { class: 'panel empty' }, h('strong', {}, 'Статистика не подключена'), 'Нажмите «Настроить»: кабинет Директа и счётчик Метрики клиента.')
      : [
          h(
            'p',
            { class: 'muted small' },
            [a.direct_enabled ? `Директ${a.direct_login ? `: ${a.direct_login}` : ''}` : null, a.metrika_counter ? `Метрика: ${a.metrika_counter}` : null, a.goals ? `цели: ${a.goals.replace(/,/g, ', ')}` : 'цели не выбраны', a.synced_at ? `обновлено ${new Date(`${a.synced_at.replace(' ', 'T')}Z`).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' })}` : 'ещё не загружено'].filter(Boolean).join(' · '),
          ),
          a.error ? h('p', { class: 'ads-error' }, `Ошибка загрузки: ${a.error}`) : null,
          tiles(d.total),
          h('section', { class: 'panel' }, h('h2', {}, 'По дням'), chart(d.days)),
          h(
            'div',
            { class: 'table-wrap' },
            h(
              'table',
              { class: 'leads docs ads-table' },
              h('thead', {}, h('tr', {}, ['Дата', 'Расход', 'Показы', 'Клики', 'CTR', 'Цена клика', 'Конверсии', 'Цена конверсии', 'Визиты', 'Отказы', 'Цели'].map((c) => h('th', { scope: 'col' }, c)))),
              h(
                'tbody',
                {},
                [...d.days].reverse().filter((x) => x.cost || x.visits || x.impressions).map((x) =>
                  h('tr', {}, h('td', { class: 'nowrap' }, fmtDate(x.date)), h('td', { class: 'num nowrap' }, money(x.cost)), h('td', { class: 'num' }, int(x.impressions)), h('td', { class: 'num' }, int(x.clicks)), h('td', { class: 'num' }, pct(x.ctr)), h('td', { class: 'num nowrap' }, money2(x.cpc)), h('td', { class: 'num' }, int(x.conversions)), h('td', { class: 'num nowrap' }, money2(x.cpa)), h('td', { class: 'num' }, int(x.visits)), h('td', { class: 'num' }, pct(x.bounceRate)), h('td', { class: 'num' }, int(x.goals))),
                ),
              ),
            ),
          ),
        ],
  );
}
