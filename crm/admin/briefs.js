// «Брифы»: анкеты клиентов со страницы marketing-studio.pro/brif/ (страница закрыта от поисковиков,
// ссылку отправляют клиенту). Список и карточка брифа с ответами по разделам.

import { h, api, app, shell, toast, confirmDialog, navigate, fmtDateTime, ctx, icon, rowActions, rerender } from './admin.js';
import { fill } from './docs.js';

const BRIEF_URL = 'https://marketing-studio.pro/brif/';

const statusChip = (status, statuses) => h('span', { class: 'brief-status', dataset: { s: status } }, statuses[status] ?? status);

async function copy(text, done) {
  try {
    await navigator.clipboard.writeText(text);
    toast(done);
  } catch {
    toast('Не удалось скопировать — выделите текст вручную');
  }
}

function linkPanel() {
  return h(
    'div',
    { class: 'panel brief-link' },
    h('div', {}, h('strong', {}, 'Ссылка для клиента'), h('p', { class: 'muted' }, 'Страница не видна в поиске. Ответы клиента появятся здесь, администраторам придёт уведомление.')),
    h('code', {}, BRIEF_URL),
    h('button', { type: 'button', class: 'btn', onclick: () => copy(BRIEF_URL, 'Ссылка скопирована') }, icon('copy'), 'Скопировать'),
  );
}

export async function renderBriefs() {
  const box = h('div', {}, h('p', { class: 'muted' }, 'Загружаю…'));
  fill(app, shell('briefs', [h('div', { class: 'page-head' }, h('h1', {}, 'Брифы')), linkPanel(), box]));
  let data;
  try {
    data = await api('/admin/api/briefs');
  } catch (err) {
    if (err.status !== 401) fill(box, h('p', { class: 'error' }, err.message));
    return;
  }
  if (!data.briefs.length) {
    return fill(box, h('div', { class: 'empty' }, h('strong', {}, 'Брифов пока нет'), 'Отправьте клиенту ссылку выше: заполненный бриф появится в этом списке.'));
  }
  fill(
    box,
    h(
      'div',
      { class: 'table-wrap' },
      h(
        'table',
        { class: 'leads briefs' },
        h('thead', {}, h('tr', {}, ['Компания', 'Контакт', 'Получен', 'Статус'].map((t) => h('th', { scope: 'col' }, t)), ctx.me.role === 'admin' ? h('th', { scope: 'col' }, h('span', { class: 'sr-only' }, 'Действия')) : null)),
        h(
          'tbody',
          {},
          data.briefs.map((b) => {
            const href = `#/brief?id=${b.id}`;
            return h(
              'tr',
              { class: b.status === 'new' ? 'hot' : null, onclick: () => (location.hash = href) },
              h('td', {}, h('a', { class: 'row-link company', href }, b.company || 'Без названия')),
              h('td', {}, b.contact_name || h('span', { class: 'muted' }, '—'), h('span', { class: 'task' }, [b.phone, b.email].filter(Boolean).join(', '))),
              h('td', { class: 'num nowrap' }, fmtDateTime(b.created_at)),
              h('td', {}, statusChip(b.status, data.statuses)),
              ctx.me.role === 'admin' ? rowActions({ name: b.company || 'бриф', onDelete: () => removeBrief(b, rerender) }) : null,
            );
          }),
        ),
      ),
    ),
  );
}

async function removeBrief(b, after) {
  if (!(await confirmDialog(`Удалить бриф «${b.company || 'без названия'}»? Ответы клиента пропадут.`))) return;
  await api(`/admin/api/briefs/${b.id}`, { method: 'DELETE' });
  toast('Бриф удалён');
  after();
}

// Текст брифа целиком — чтобы вставить в задачу, документ или письмо
function briefText(b) {
  const lines = [`Бриф: ${b.company || 'без названия'} (${fmtDateTime(b.created_at)})`];
  let section = null;
  for (const a of b.answers) {
    if (a.section !== section) lines.push('', a.section.toUpperCase());
    section = a.section;
    lines.push(`${a.q}: ${a.a}`);
  }
  return lines.join('\n');
}

export async function renderBrief(params) {
  const id = Number(params.get('id'));
  const box = h('div', {}, h('p', { class: 'muted' }, 'Загружаю…'));
  fill(app, shell('brief', [box]));
  let data;
  try {
    data = await api(`/admin/api/briefs/${id}`);
  } catch (err) {
    if (err.status !== 401) fill(box, h('p', { class: 'error' }, err.message));
    return;
  }
  const b = data.brief;
  const sections = [];
  for (const a of b.answers) {
    const last = sections.at(-1);
    if (last?.title === a.section) last.items.push(a);
    else sections.push({ title: a.section, items: [a] });
  }
  const status = h(
    'select',
    {
      class: 'select',
      'aria-label': 'Статус брифа',
      onchange: async (e) => {
        try {
          await api(`/admin/api/briefs/${id}`, { method: 'PATCH', body: { status: e.target.value } });
          toast('Статус сохранён');
        } catch (err) {
          toast(err.message);
        }
      },
    },
    Object.entries(data.statuses).map(([k, label]) => h('option', { value: k, selected: k === b.status }, label)),
  );
  const contacts = [
    ['Контактное лицо', b.contact_name],
    ['Телефон', b.phone],
    ['Почта', b.email],
  ].filter(([, v]) => v);
  fill(
    box,
    h('a', { class: 'back-link', href: '#/briefs' }, 'Все брифы'),
    h(
      'div',
      { class: 'page-head' },
      h('h1', {}, b.company || 'Бриф без названия'),
      h(
        'div',
        { class: 'brief-actions' },
        status,
        h('button', { type: 'button', class: 'btn', onclick: () => copy(briefText(b), 'Бриф скопирован') }, icon('copy'), 'Скопировать текст'),
        ctx.me.role === 'admin'
          ? h('button', { type: 'button', class: 'btn brief-delete', onclick: () => removeBrief(b, () => navigate('briefs')).catch((err) => toast(err.message)) }, icon('trash'), 'Удалить')
          : null,
      ),
    ),
    h('p', { class: 'muted' }, `Получен ${fmtDateTime(b.created_at)}`),
    contacts.length ? h('section', { class: 'panel brief-section' }, h('h2', {}, 'Контакты'), h('dl', { class: 'answers' }, contacts.map(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]))) : null,
    sections.map((s) =>
      h('section', { class: 'panel brief-section' }, h('h2', {}, s.title || 'Ответы'), h('dl', { class: 'answers' }, s.items.map((a) => [h('dt', {}, a.q), h('dd', {}, a.a)]))),
    ),
  );
}
