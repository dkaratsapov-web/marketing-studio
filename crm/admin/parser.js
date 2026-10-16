// «Парсер»: компании по запросу и городу из открытых карт (OpenStreetMap, Яндекс Карты, 2ГИС, Google Maps)
// с контактами, сайтами, соцсетями и адресами; история сборов, фильтры, выгрузка в CSV.

import { h, api, app, shell, toast, navigate, ctx, confirmDialog, plural } from './admin.js';
import { fill } from './docs.js';

const STATUS = { queued: 'В очереди', running: 'Идёт сбор', done: 'Готово', error: 'Ошибка' };
const SOCIAL = { vk: 'ВК', telegram: 'Telegram', whatsapp: 'WhatsApp', instagram: 'Instagram', ok: 'ОК', youtube: 'YouTube', dzen: 'Дзен' };
const PER_SOURCE = [50, 100, 200, 500, 1000];
// условия сбора и фильтры результатов: у поля «есть» или «нет»
const CONDS = [
  ['phone', 'Телефон', 'с телефоном', 'без телефона', (p) => p.phones.length > 0],
  ['site', 'Сайт', 'с сайтом', 'без сайта', (p) => Boolean(p.website)],
  ['email', 'Почта', 'с почтой', 'без почты', (p) => p.emails.length > 0],
  ['social', 'Соцсети', 'с соцсетями', 'без соцсетей', (p) => Object.keys(p.socials ?? {}).length > 0],
];
const condText = (filters = {}) => CONDS.filter(([k]) => filters[k]).map(([k, , yes, no]) => (filters[k] === 'yes' ? yes : no)).join(', ');
const fmtWhen = (s) => (s ? new Date(`${s.replace(' ', 'T')}Z`).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' }) : '');
const companies = (n) => `${n} ${plural(n, 'компания', 'компании', 'компаний')}`;
const elapsed = (iso) => {
  const sec = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  return sec < 60 ? `${sec} с` : `${Math.floor(sec / 60)} мин ${sec % 60} с`;
};
const busy = (j) => j.status === 'queued' || j.status === 'running';
let sourcesCache = null;

async function loadSources(force = false) {
  if (!sourcesCache || force) sourcesCache = (await api('/admin/api/parser/sources')).sources;
  return sourcesCache;
}

/** Окно ключей источников: администратор вставляет ключ, кабинет проверяет его пробным поиском. */
function openKeysDialog(onChange) {
  const list = h('div', { class: 'parser-keys' }, h('p', { class: 'muted' }, 'Загружаю…'));
  const dlg = h('dialog', { class: 'dialog parser-keys-dialog', 'aria-labelledby': 'parser-keys-title' }, h('h2', { id: 'parser-keys-title' }, 'Ключи источников'), list, h('div', { class: 'work-actions' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.close() }, 'Закрыть')));
  dlg.addEventListener('close', () => {
    dlg.remove();
    onChange();
  });
  document.body.append(dlg);
  dlg.showModal();

  async function draw() {
    const sources = await loadSources(true);
    fill(
      list,
      h('p', { class: 'muted small' }, 'OpenStreetMap работает без ключа. Для остальных нужен ключ API: он хранится на сервере кабинета, здесь видны только последние 4 символа.'),
      sources.filter((s) => s.needsKey).map((s) => {
        const input = h('input', { type: 'text', class: 'input secret-input', autocomplete: 'off', 'data-lpignore': 'true', 'data-1p-ignore': 'true', 'data-bwignore': 'true', 'data-form-type': 'other', maxlength: 300, placeholder: 'Ключ API', spellcheck: 'false', 'aria-label': `Ключ ${s.label}` });
        const save = h('button', { type: 'submit', class: 'btn btn-primary btn-s' }, 'Проверить и сохранить');
        return h(
          'section',
          { class: 'parser-key' },
          h('div', { class: 'parser-key-head' }, h('b', {}, s.label), s.ready ? h('span', { class: 'parser-ok' }, `подключён …${s.tail}`) : h('span', { class: 'muted small' }, 'не подключён'), h('span', { class: 'spacer' }),
            s.ready ? h('button', { type: 'button', class: 'btn btn-s', onclick: async () => {
              if (!(await confirmDialog(`Отключить ключ ${s.label}? Новые сборы из этого источника станут недоступны, собранное останется.`, { ok: 'Отключить' }))) return;
              await api(`/admin/api/parser/sources/${s.id}/key`, { method: 'DELETE' });
              toast('Ключ отключён');
              draw();
            } }, 'Отключить') : null),
          h('p', { class: 'muted small' }, s.hint),
          h(
            'form',
            {
              class: 'ads-token-form',
              onsubmit: async (e) => {
                e.preventDefault();
                save.disabled = true;
                save.textContent = 'Проверяю…';
                try {
                  await api(`/admin/api/parser/sources/${s.id}/key`, { method: 'PUT', body: { key: input.value } });
                  toast(`${s.label}: ключ подключён`);
                  draw();
                } catch (err) {
                  toast(err.message);
                  save.disabled = false;
                  save.textContent = 'Проверить и сохранить';
                }
              },
            },
            input,
            save,
          ),
        );
      }),
    );
  }
  draw().catch((err) => fill(list, h('p', { class: 'error' }, err.message)));
}

function sourceChips(job) {
  return h('span', { class: 'ads-sources' }, job.sources.map((id) => {
    const p = job.progress.sources?.[id];
    const label = sourcesCache?.find((s) => s.id === id)?.label ?? id;
    return h('span', { class: `ads-src parser-src${p?.status === 'error' ? ' bad' : ''}`, title: p?.error ?? '' }, p?.status === 'done' ? `${label}: ${p.found}` : label);
  }));
}

export async function renderParser() {
  const head = h('div', { class: 'page-head' }, h('h1', {}, 'Парсер'), h('span', { class: 'spacer' }), ctx.me.role === 'admin' ? h('button', { type: 'button', class: 'btn', onclick: () => openKeysDialog(drawForm) }, 'Ключи источников') : null);
  const form = h('section', { class: 'panel parser-form' }, h('p', { class: 'muted' }, 'Загружаю…'));
  const jobs = h('section', { class: 'parser-jobs' });
  fill(app, shell('parser', [head, form, jobs]));
  let timer = null;

  async function drawForm() {
    const sources = await loadSources(true);
    const query = h('input', { class: 'input', id: 'parser-query', maxlength: 200, required: true, placeholder: 'стоматология, автосервис, кофейня', autocomplete: 'off' });
    const geo = h('input', { class: 'input', id: 'parser-geo', maxlength: 200, required: true, placeholder: 'Тверь или Тверская область', autocomplete: 'off' });
    const boxes = sources.map((s) => {
      const box = h('input', { type: 'checkbox', value: s.id, checked: s.ready && (s.id !== 'google' || !sources.some((x) => x.id !== 'google' && x.needsKey && x.ready)), disabled: !s.ready });
      return h('label', { class: `check parser-source${s.ready ? '' : ' off'}`, title: s.hint }, box, s.label, s.ready ? null : h('span', { class: 'muted small' }, ctx.me.role === 'admin' ? 'нужен ключ' : 'не подключён'));
    });
    const per = h('select', { class: 'input', id: 'parser-per' }, PER_SOURCE.map((n) => h('option', { value: String(n), selected: n === 200 }, `до ${n}`)));
    const enrich = h('input', { type: 'checkbox', checked: true });
    const filters = {};
    const conds = h(
      'fieldset',
      { class: 'parser-conds' },
      h('legend', {}, 'Какие компании оставить'),
      CONDS.map(([k, label]) =>
        h(
          'div',
          { class: 'parser-cond' },
          h('span', {}, label),
          h('div', { class: 'rating-filter', role: 'group', 'aria-label': label }, [['', 'неважно'], ['yes', 'есть'], ['no', 'нет']].map(([v, t]) => h('button', { type: 'button', 'aria-pressed': String(v === ''), onclick: (e) => {
            if (v) filters[k] = v;
            else delete filters[k];
            for (const b of e.currentTarget.parentNode.children) b.setAttribute('aria-pressed', String(b === e.currentTarget));
          } }, t))),
        ),
      ),
    );
    const submit = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Начать сбор');
    fill(
      form,
      h(
        'form',
        {
          class: 'parser-grid',
          onsubmit: async (e) => {
            e.preventDefault();
            const chosen = boxes.map((l) => l.querySelector('input')).filter((b) => b.checked).map((b) => b.value);
            submit.disabled = true;
            try {
              const { job } = await api('/admin/api/parser/jobs', { method: 'POST', body: { query: query.value, geo: geo.value, sources: chosen, perSource: Number(per.value), enrich: enrich.checked, filters } });
              navigate('parsejob', new URLSearchParams({ id: String(job.id) }));
            } catch (err) {
              toast(err.message);
              submit.disabled = false;
            }
          },
        },
        h('div', { class: 'field' }, h('label', { for: 'parser-query' }, 'Что ищем'), query),
        h('div', { class: 'field' }, h('label', { for: 'parser-geo' }, 'Где'), geo),
        h('div', { class: 'field parser-per' }, h('label', { for: 'parser-per' }, 'С каждого источника'), per),
        h('fieldset', { class: 'parser-sources' }, h('legend', {}, 'Источники'), boxes),
        conds,
        h('label', { class: 'check parser-enrich' }, enrich, 'Зайти на сайты компаний за почтой и соцсетями'),
        h('div', { class: 'parser-submit' }, submit),
      ),
    );
  }

  async function drawJobs() {
    clearTimeout(timer);
    let list;
    try {
      list = (await api('/admin/api/parser/jobs')).jobs;
    } catch (err) {
      if (err.status !== 401) fill(jobs, h('p', { class: 'error' }, err.message));
      return;
    }
    if (!jobs.isConnected) return;
    fill(
      jobs,
      list.length
        ? h(
            'div',
            { class: 'table-wrap' },
            h(
              'table',
              { class: 'leads docs parser-table' },
              h('thead', {}, h('tr', {}, ['Запрос', 'Где', 'Источники', 'Найдено', 'Статус', 'Запущен'].map((c) => h('th', { scope: 'col' }, c)))),
              h(
                'tbody',
                {},
                list.map((j) =>
                  h(
                    'tr',
                    { onclick: () => navigate('parsejob', new URLSearchParams({ id: String(j.id) })) },
                    h('td', {}, h('a', { class: 'row-link company', href: `#/parsejob?id=${j.id}` }, j.query), condText(j.filters) ? h('span', { class: 'muted small parser-cond-note' }, condText(j.filters)) : null),
                    h('td', {}, j.geo),
                    h('td', {}, sourceChips(j)),
                    h('td', { class: 'num' }, busy(j) ? '' : String(j.places)),
                    h('td', {}, h('span', { class: `parser-status ps-${j.status}` }, STATUS[j.status]), j.error ? h('span', { class: 'ads-error', title: j.error }, j.error) : null),
                    h('td', { class: 'nowrap muted' }, fmtWhen(j.createdAt), j.createdBy ? h('span', { class: 'small' }, `, ${j.createdBy}`) : null),
                  ),
                ),
              ),
            ),
          )
        : h('div', { class: 'panel empty' }, h('strong', {}, 'Сборов ещё не было'), 'Напишите, что искать и где, и нажмите «Начать сбор». Найденные компании появятся здесь.'),
    );
    if (list.some(busy)) timer = setTimeout(drawJobs, 4000);
  }

  await Promise.all([drawForm().catch((err) => fill(form, h('p', { class: 'error' }, err.message))), drawJobs()]);
}

/** Карточки компании на картах и точка на Яндекс Картах. */
function placeLinks(p) {
  const names = { osm: 'OSM', yandex: 'Яндекс', '2gis': '2ГИС', google: 'Google' };
  return h(
    'span',
    { class: 'parser-links' },
    p.sources.map((s) => (s.link ? h('a', { href: s.link, target: '_blank', rel: 'noopener noreferrer' }, names[s.source] ?? s.source) : h('span', {}, names[s.source] ?? s.source))),
  );
}

// адрес сайта без протокола; не через URL — он превратил бы кириллический домен в xn--
// город с большой буквы: «тверь» из запроса и «Тверь» из карточки — один город
const cityOf = (p) => (p.city ? p.city.charAt(0).toUpperCase() + p.city.slice(1) : 'Без города');
const hostOf = (url) => url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

export async function renderParserJob(params) {
  const id = Number(params.get('id'));
  if (!id) return navigate('parser');
  const head = h('div', { class: 'doc-head' });
  const body = h('div', { class: 'parser-job' }, h('p', { class: 'muted' }, 'Загружаю…'));
  fill(app, shell('parsejob', [head, body]));
  await loadSources().catch(() => null);

  let data;
  try {
    data = await api(`/admin/api/parser/jobs/${id}`);
  } catch (err) {
    if (err.status !== 401) fill(body, h('p', { class: 'error' }, err.message));
    return;
  }
  const { job, places } = data;
  const again = async () => {
    try {
      const r = await api('/admin/api/parser/jobs', { method: 'POST', body: { query: job.query, geo: job.geo, sources: job.sources, perSource: job.perSource, enrich: job.enrich, filters: job.filters } });
      navigate('parsejob', new URLSearchParams({ id: String(r.job.id) }));
    } catch (err) {
      toast(err.message);
    }
  };
  fill(
    head,
    h('a', { class: 'back', href: '#/parser' }, 'Парсер'),
    h('h1', { class: 'ads-title' }, `${job.query}, ${job.geo}`),
    h('span', { class: 'spacer' }),
    !busy(job) && places.length ? h('a', { class: 'btn btn-primary', href: `/admin/api/parser/jobs/${id}/csv`, download: '' }, 'Скачать CSV') : null,
    !busy(job) ? h('button', { type: 'button', class: 'btn', onclick: again }, 'Собрать заново') : null,
    !busy(job)
      ? h('button', { type: 'button', class: 'btn', onclick: async () => {
          if (!(await confirmDialog('Удалить сбор и найденные компании?', { ok: 'Удалить' }))) return;
          try {
            await api(`/admin/api/parser/jobs/${id}`, { method: 'DELETE' });
            toast('Сбор удалён');
            navigate('parser');
          } catch (err) {
            toast(err.message);
          }
        } }, 'Удалить')
      : null,
  );

  const meta = h('p', { class: 'muted small' }, [`${STATUS[job.status]}`, job.createdBy ? `запустил ${job.createdBy}` : null, fmtWhen(job.createdAt), `до ${job.perSource} с источника`, job.enrich ? 'с сайтами компаний' : 'без сайтов', condText(job.filters) ? `только ${condText(job.filters)}` : null, job.progress.filtered ? `не подошли под условия: ${job.progress.filtered} из ${job.progress.found}` : null].filter(Boolean).join(' · '));
  const progress = h(
    'section',
    { class: 'panel parser-progress' },
    h('ul', { class: 'parser-steps' }, job.sources.map((sid) => {
      const p = job.progress.sources?.[sid] ?? {};
      const label = sourcesCache?.find((s) => s.id === sid)?.label ?? sid;
      return h('li', { class: `ps-${p.status ?? 'queued'}` }, h('b', {}, label), h('span', {}, p.status === 'done' ? companies(p.found) : p.status === 'error' ? p.error : p.status === 'running' ? `ищу…${p.startedAt ? ` ${elapsed(p.startedAt)}` : ''}` : 'ждёт'));
    }), job.enrich ? h('li', { class: job.progress.sites ? (job.progress.sites.done >= job.progress.sites.total ? 'ps-done' : 'ps-running') : 'ps-queued' }, h('b', {}, 'Сайты компаний'), h('span', {}, job.progress.sites ? `${job.progress.sites.done} из ${job.progress.sites.total}, новые контакты у ${job.progress.sites.found}` : 'после поиска')) : null),
    job.progress.sites?.total ? h('div', { class: 'parser-bar' }, h('span', { style: `width:${Math.round((job.progress.sites.done / job.progress.sites.total) * 100)}%` })) : null,
    job.error ? h('p', { class: 'ads-error' }, job.error) : null,
  );
  if (busy(job)) {
    fill(body, meta, progress, h('p', { class: 'muted' }, 'Сбор идёт в фоне: можно уйти со страницы, результат сохранится. Страница обновляется сама.'));
    setTimeout(() => body.isConnected && renderParserJob(params), 3000);
    return;
  }
  fill(body, meta, progress, places.length ? results(places) : h('div', { class: 'panel empty' }, h('strong', {}, 'Ничего не нашлось'), 'Попробуйте запрос короче («стоматология» вместо «стоматологическая клиника») или другой источник.'));
}

/** Сводка, город, фильтры и таблица компаний. */
function results(places) {
  const state = { q: '', city: '', has: {}, source: '', limit: 100 };
  const count = (f) => places.filter(f).length;
  const hasSocial = (p) => Object.keys(p.socials ?? {}).length > 0;
  const FILTERS = [
    ['phone', 'с телефоном', (p) => p.phones.length > 0],
    ['site', 'с сайтом', (p) => Boolean(p.website)],
    ['email', 'с почтой', (p) => p.emails.length > 0],
    ['social', 'с соцсетями', hasSocial],
  ];
  const cities = Object.entries(places.reduce((m, p) => ((m[cityOf(p)] = (m[cityOf(p)] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
  const usedSources = [...new Set(places.flatMap((p) => p.sources.map((s) => s.source)))];

  const sum = h(
    'section',
    { class: 'ads-sum parser-sum' },
    h('div', { class: 'ads-sum-item' }, h('b', { class: 'num' }, String(places.length)), h('span', {}, 'компаний без дублей')),
    FILTERS.map(([, label, f]) => h('div', { class: 'ads-sum-item' }, h('b', { class: 'num' }, String(count(f))), h('span', {}, label))),
  );
  const search = h('input', { class: 'input', type: 'search', placeholder: 'Название, адрес, телефон', 'aria-label': 'Поиск', oninput: () => ((state.q = search.value.trim().toLowerCase()), (state.limit = 100), draw()) });
  // каждая кнопка по кругу: неважно → «с …» → «без …» → неважно
  const toggles = h('div', { class: 'rating-filter parser-toggles', role: 'group', 'aria-label': 'Только' }, CONDS.map(([k, , yes, no]) => h('button', { type: 'button', 'aria-pressed': 'false', title: 'Нажмите ещё раз: «без», третий раз — снять', onclick: (e) => {
    const next = { undefined: 'yes', yes: 'no', no: undefined }[state.has[k]];
    if (next) state.has[k] = next;
    else delete state.has[k];
    const b = e.currentTarget;
    b.setAttribute('aria-pressed', String(Boolean(next)));
    b.dataset.mode = next ?? '';
    b.textContent = next === 'no' ? no : yes;
    state.limit = 100;
    draw();
  } }, yes)));
  const sourceSel = usedSources.length > 1
    ? h('select', { class: 'input parser-select', 'aria-label': 'Источник', onchange: (e) => ((state.source = e.target.value), draw()) }, h('option', { value: '' }, 'Все источники'), usedSources.map((s) => h('option', { value: s }, sourcesCache?.find((x) => x.id === s)?.label ?? s)))
    : null;
  const geo = cities.length > 1
    ? h('div', { class: 'parser-geo' }, h('span', { class: 'ads-slice-src' }, 'География'), h('div', { class: 'parser-cities' }, [['', `Все ${places.length}`], ...cities.slice(0, 30).map(([c, n]) => [c, `${c} ${n}`])].map(([c, label]) => h('button', { type: 'button', class: 'parser-city', 'aria-pressed': String(state.city === c), onclick: (e) => {
        state.city = c;
        for (const b of e.currentTarget.parentNode.children) b.setAttribute('aria-pressed', String(b === e.currentTarget));
        state.limit = 100;
        draw();
      } }, label))))
    : null;
  const table = h('div', { class: 'parser-results' });
  const box = h('div', { class: 'parser-res' }, sum, geo, h('div', { class: 'filters parser-filters' }, search, toggles, sourceSel), table);

  function draw() {
    const list = places.filter(
      (p) =>
        (!state.city || (cityOf(p)) === state.city) &&
        (!state.source || p.sources.some((s) => s.source === state.source)) &&
        CONDS.every(([k, , , , f]) => !state.has[k] || f(p) === (state.has[k] === 'yes')) &&
        (!state.q || [p.name, p.address, p.category, ...p.phones, p.website, ...p.emails].filter(Boolean).join(' ').toLowerCase().includes(state.q)),
    );
    const row = (p) =>
      h(
        'tr',
        {},
        h('td', { class: 'parser-name' }, h('b', {}, p.name), p.category ? h('span', { class: 'muted small' }, p.category) : null, p.rating != null ? h('span', { class: 'small parser-rating' }, `★ ${p.rating.toFixed(1).replace('.', ',')}${p.reviews ? ` (${p.reviews} ${plural(p.reviews, 'отзыв', 'отзыва', 'отзывов')})` : ''}`) : null),
        h('td', { class: 'parser-addr' }, p.address ?? p.city ?? '-', p.lat != null ? h('a', { class: 'small', href: `https://yandex.ru/maps/?pt=${p.lon},${p.lat}&z=17&l=map`, target: '_blank', rel: 'noopener noreferrer' }, 'на карте') : null),
        h('td', { class: 'parser-phones' }, p.phones.length ? p.phones.map((t) => h('a', { href: `tel:${t.replace(/[^\d+]/g, '')}` }, t)) : h('span', { class: 'muted' }, '-')),
        h(
          'td',
          { class: 'parser-web' },
          p.website ? h('a', { href: p.website, target: '_blank', rel: 'noopener noreferrer nofollow' }, hostOf(p.website)) : null,
          p.emails.map((e) => h('a', { href: `mailto:${e}` }, e)),
          p.siteDown ? h('span', { class: 'muted small' }, 'сайт не открылся') : null,
          !p.website && !p.emails.length ? h('span', { class: 'muted' }, '-') : null,
        ),
        h('td', {}, Object.keys(p.socials ?? {}).length ? h('span', { class: 'parser-social' }, Object.entries(p.socials).filter(([, url]) => /^https?:\/\//.test(url)).map(([k, url]) => h('a', { class: 'ads-src', href: url, target: '_blank', rel: 'noopener noreferrer nofollow' }, SOCIAL[k] ?? k))) : h('span', { class: 'muted' }, '-')),
        h('td', {}, placeLinks(p)),
      );
    fill(
      table,
      list.length
        ? [
            h('div', { class: 'table-wrap' }, h('table', { class: 'leads docs parser-table parser-places' }, h('thead', {}, h('tr', {}, ['Компания', 'Адрес', 'Телефоны', 'Сайт и почта', 'Соцсети', 'На картах'].map((c) => h('th', { scope: 'col' }, c)))), h('tbody', {}, list.slice(0, state.limit).map(row)))),
            h('p', { class: 'muted small ads-slice-foot' }, `Показано ${Math.min(state.limit, list.length)} из ${list.length}. `, list.length > state.limit ? h('button', { type: 'button', class: 'linkish', onclick: () => ((state.limit += 200), draw()) }, 'Показать ещё') : null, ' В CSV попадают все найденные компании.'),
          ]
        : h('p', { class: 'muted' }, 'Под фильтр ничего не подходит.'),
    );
  }
  draw();
  return box;
}
