// Деньги по клиентам: абонентская плата за ведение, счета, оплаты и долги.
// Вкладка «Оплаты» в «Задачах» и блок «Деньги» в карточке клиента.

import { h, api, app, shell, toast, confirmDialog, navigate, ctx, icon } from './admin.js';
import { fill, formDialog } from './docs.js';

const STATUS = { overdue: 'Просрочено', open: 'Ждём', paid: 'Оплачено' };
const KINDS = { fee: 'Ведение', budget: 'Рекламный бюджет', other: 'Разовые работы' };
export const rub = (v) => `${Math.round(Number(v) || 0).toLocaleString('ru-RU')} ₽`;
const day = (iso) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '—');
const todayIso = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const parseSum = (s) => Number(String(s ?? '').replace(/[\s ₽]/g, '').replace(',', '.'));

/** Окно «Новый счёт / оплата»; clients — для выбора клиента, если он не задан. */
function paymentDialog({ clientId = null, clients = [], payment = null, onSaved }) {
  const client = clientId ? null : h('select', { class: 'select', id: 'pm-client', required: true }, h('option', { value: '' }, 'Выберите клиента'), clients.map((c) => h('option', { value: c.id }, c.name)));
  const kind = h('select', { class: 'select', id: 'pm-kind' }, Object.entries(KINDS).map(([k, l]) => h('option', { value: k, selected: k === (payment?.kind ?? 'other') }, l)));
  const amount = h('input', { class: 'input num', id: 'pm-amount', inputmode: 'decimal', required: true, value: payment ? String(payment.amount) : '', placeholder: '50 000' });
  const due = h('input', { class: 'input', id: 'pm-due', type: 'date', value: payment?.due ?? '' });
  const title = h('input', { class: 'input', id: 'pm-title', maxlength: 200, value: payment?.title ?? '', placeholder: 'Например: Ведение за октябрь' });
  const invoice = h('input', { class: 'input', id: 'pm-invoice', maxlength: 100, value: payment?.invoice ?? '', placeholder: '№ счёта' });
  const receipt = h('input', { class: 'input', id: 'pm-receipt', maxlength: 300, value: payment?.receipt ?? '', placeholder: 'Ссылка или номер чека' });
  const paid = h('input', { type: 'checkbox', checked: Boolean(payment?.paid_at) });
  const row = (id, label, el) => h('div', { class: 'field' }, h('label', { for: id }, label), el);
  formDialog({
    title: payment ? 'Изменить оплату' : 'Новый счёт',
    submitLabel: 'Сохранить',
    body: [
      h('div', { class: 'dialog-grid' },
        client ? row('pm-client', 'Клиент', client) : null,
        row('pm-kind', 'За что', kind),
        row('pm-amount', 'Сумма, ₽', amount),
        row('pm-due', 'Срок оплаты', due),
        row('pm-title', 'Название', title),
        row('pm-invoice', 'Счёт', invoice),
        row('pm-receipt', 'Чек «Мой налог»', receipt),
      ),
      h('label', { class: 'check' }, paid, 'Уже оплачено'),
    ],
    onSubmit: async () => {
      const sum = parseSum(amount.value);
      if (!(sum > 0)) throw new Error('Укажите сумму');
      const body = { kind: kind.value, amount: sum, due: due.value || null, title: title.value.trim() || null, invoice: invoice.value.trim() || null, receipt: receipt.value.trim() || null, paid: paid.checked };
      if (payment) await api(`/admin/api/payments/${payment.id}`, { method: 'PATCH', body });
      else {
        const cid = clientId ?? Number(client.value);
        if (!cid) throw new Error('Выберите клиента');
        await api(`/admin/api/clients/${cid}/payments`, { method: 'POST', body });
      }
      toast('Сохранено');
      onSaved();
    },
  });
}

// Чек: ссылку из «Мой налог» открываем, номер показываем как есть
const receiptLink = (v) => (/^https:\/\//.test(v) ? h('a', { href: v, target: '_blank', rel: 'noopener' }, 'чек') : `чек ${v}`);

function paymentRows(list, { reload, showClient = false }) {
  const pay = async (p, value) => {
    try {
      await api(`/admin/api/payments/${p.id}`, { method: 'PATCH', body: { paid: value } });
      toast(value ? `Оплата ${rub(p.amount)} отмечена` : 'Отметка об оплате снята');
      reload();
    } catch (err) {
      toast(err.message);
    }
  };
  return h(
    'ul',
    { class: 'pay-list' },
    list.map((p) =>
      h(
        'li',
        { class: `pay-row s-${p.status}` },
        h('span', { class: `pay-status s-${p.status}` }, STATUS[p.status]),
        h(
          'div',
          { class: 'pay-main' },
          h('strong', {}, showClient ? h('a', { href: `#/client?id=${p.client_id}` }, p.client_name) : p.label),
          h('span', { class: 'muted small' }, [showClient ? p.label : null, p.invoice ? `счёт ${p.invoice}` : null, p.paid_at ? `оплачено ${day(p.paid_at)}` : p.due ? `срок ${day(p.due)}` : 'без срока'].filter(Boolean).join(' · '), p.receipt ? [' · ', receiptLink(p.receipt)] : null),
        ),
        h('b', { class: 'pay-sum num' }, rub(p.amount)),
        p.status === 'paid'
          ? h('button', { type: 'button', class: 'btn btn-s', onclick: () => pay(p, false) }, 'Снять оплату')
          : h('button', { type: 'button', class: 'btn btn-s btn-primary', onclick: () => pay(p, true) }, 'Оплачено'),
        h('details', { class: 'menu' },
          h('summary', { class: 'icon-btn', 'aria-label': 'Действия', title: 'Действия' }, '⋮'),
          h('div', { class: 'menu-list', role: 'menu' },
            h('button', { type: 'button', role: 'menuitem', onclick: (e) => (e.target.closest('details').removeAttribute('open'), paymentDialog({ clientId: p.client_id, payment: p, onSaved: reload })) }, 'Изменить'),
            h('button', {
              type: 'button', role: 'menuitem', class: 'danger',
              onclick: async (e) => {
                e.target.closest('details').removeAttribute('open');
                if (!(await confirmDialog(`Удалить «${p.label}» на ${rub(p.amount)}?`))) return;
                await api(`/admin/api/payments/${p.id}`, { method: 'DELETE' }).catch((err) => toast(err.message));
                reload();
              },
            }, 'Удалить'),
          ),
        ),
      ),
    ),
  );
}

/** Блок «Деньги» в карточке клиента. */
export function clientMoney(client) {
  const box = h('div', { class: 'client-money' }, h('h2', {}, 'Деньги'), h('p', { class: 'muted small' }, 'Загружаю…'));
  async function load() {
    let data;
    try {
      data = await api(`/admin/api/money?client=${client.id}`);
    } catch (err) {
      // деньги клиента видит его менеджер и администратор — остальным блок не показываем
      if (err.status === 400) return box.remove();
      return fill(box, h('h2', {}, 'Деньги'), h('p', { class: 'error' }, err.message));
    }
    const fee = h('input', { class: 'input num', id: 'cm-fee', inputmode: 'decimal', value: client.fee ? String(client.fee) : '', placeholder: 'нет' });
    const payDay = h('input', { class: 'input num', id: 'cm-day', type: 'number', min: 1, max: 31, value: client.pay_day ?? '', placeholder: '10' });
    const saveBilling = async () => {
      const f = fee.value.trim() ? parseSum(fee.value) : null;
      const d = payDay.value ? Number(payDay.value) : null;
      if (f != null && !(f >= 0)) return toast('Абонентская плата — число');
      try {
        const res = await api(`/admin/api/clients/${client.id}/billing`, { method: 'PATCH', body: { fee: f, payDay: d } });
        Object.assign(client, res.client);
        toast(f && d ? `Счёт за ведение будет появляться каждый месяц ${d} числа` : 'Сохранено');
        load();
      } catch (err) {
        toast(err.message);
      }
    };
    fee.addEventListener('change', saveBilling);
    payDay.addEventListener('change', saveBilling);
    const debt = data.payments.filter((p) => p.status === 'overdue').reduce((a, p) => a + Number(p.amount), 0);
    fill(
      box,
      h('div', { class: 'checklist-head' }, h('h2', {}, 'Деньги'), debt ? h('span', { class: 'chip due overdue' }, `долг ${rub(debt)}`) : null, h('span', { class: 'spacer' }), h('button', { type: 'button', class: 'btn btn-s', onclick: () => paymentDialog({ clientId: client.id, onSaved: load }) }, '+ Счёт')),
      h('div', { class: 'money-billing' },
        h('div', { class: 'field' }, h('label', { for: 'cm-fee' }, 'Ведение, ₽ в месяц'), fee),
        h('div', { class: 'field' }, h('label', { for: 'cm-day' }, 'Оплата до, число'), payDay),
      ),
      data.payments.length ? paymentRows(data.payments.slice(0, 12), { reload: load }) : h('p', { class: 'muted small' }, 'Счетов пока нет. Укажите абонентскую плату — счёт за ведение будет появляться каждый месяц сам.'),
    );
  }
  load();
  return box;
}

/** Вкладка «Оплаты»: кто должен, чего ждём, что пришло. */
export async function renderMoney(params) {
  const filter = params.get('status') ?? '';
  const body = h('div', { class: 'money' }, h('p', { class: 'muted' }, 'Загружаю…'));
  const addBtn = h('button', { type: 'button', class: 'btn btn-primary' }, 'Новый счёт');
  fill(app, shell('money', [h('div', { class: 'page-head' }, h('h1', {}, 'Оплаты'), h('span', { class: 'spacer' }), addBtn), body]));
  let clients = [];
  api('/admin/api/clients').then((d) => (clients = d.clients ?? [])).catch(() => {});
  addBtn.addEventListener('click', () => paymentDialog({ clients, onSaved: load }));
  async function load() {
    let data;
    try {
      data = await api('/admin/api/money');
    } catch (err) {
      if (err.status !== 401) fill(body, h('p', { class: 'error' }, err.message));
      return;
    }
    const s = data.summary;
    const tile = (label, v, tone, status) => h('a', { class: `home-stat ${tone}`, href: `#/money${status ? `?status=${status}` : ''}`, 'aria-current': status === filter && filter ? 'true' : null }, h('b', { class: 'num' }, rub(v.sum)), h('span', {}, `${label} · ${v.count}`));
    const list = filter ? data.payments.filter((p) => p.status === filter) : data.payments;
    fill(
      body,
      h('div', { class: 'home-stats money-stats' }, tile('просрочено', s.overdue, s.overdue.sum ? 'bad' : '', 'overdue'), tile('ждём в этом месяце', s.expected, 'accent', 'open'), tile('получено в этом месяце', s.received, 'good', 'paid')),
      s.debtors.length
        ? h('section', { class: 'panel home-card' }, h('div', { class: 'home-card-head' }, h('h2', {}, 'Должники')), h('ul', { class: 'home-list' }, s.debtors.map((d) => h('li', { class: 'home-recent' }, icon('person'), h('a', { class: 'task-link', href: `#/client?id=${d.client_id}` }, d.client_name), h('span', { class: 'due overdue num' }, `${rub(d.sum)} · ${d.days} дн.`)))))
        : null,
      h(
        'section',
        { class: 'panel home-card' },
        h('div', { class: 'home-card-head' }, h('h2', {}, filter ? STATUS[filter] : 'Все счета'), h('span', { class: 'spacer' }),
          h('div', { class: 'rating-filter', role: 'group', 'aria-label': 'Статус' }, [['', 'Все'], ['overdue', 'Просрочено'], ['open', 'Ждём'], ['paid', 'Оплачено']].map(([k, l]) => h('button', { type: 'button', 'aria-pressed': String(k === filter), onclick: () => navigate('money', k ? new URLSearchParams({ status: k }) : undefined) }, l)))),
        list.length ? paymentRows(list, { reload: load, showClient: true }) : h('p', { class: 'home-quiet' }, filter ? 'Здесь пусто.' : 'Счетов пока нет. Укажите в карточке клиента абонентскую плату — счёт за ведение будет появляться каждый месяц сам, — или добавьте счёт кнопкой «Новый счёт».'),
      ),
    );
  }
  load();
}

// ---------- платёжный календарь ----------

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const shiftMonth = (ym, n) => new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + n, 1)).toISOString().slice(0, 7);
const monthTitle = (ym) => `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const monthShort = (ym) => `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1].slice(0, 3).toLowerCase()} ${ym.slice(2, 4)}`;
const dateOf = (p) => p.due ?? p.paid_at;
const sumOf = (list) => list.reduce((a, p) => a + Number(p.amount), 0);
// худший статус в ячейке определяет её цвет
const RANK = { overdue: 3, open: 2, plan: 1, paid: 0 };
const CAL_STATUS = { ...STATUS, plan: 'План' };

/** Окно счёта по оплате из календаря; у плановых платежей счёта ещё нет — ведём в карточку клиента. */
function openItem(p, reload) {
  if (p.planned) return navigate('client', new URLSearchParams({ id: p.client_id }));
  paymentDialog({ clientId: p.client_id, payment: p, onSaved: reload });
}

function monthGrid(month, items, today, reload) {
  const [y, m] = month.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const byDay = new Map();
  for (const p of items) byDay.set(dateOf(p), [...(byDay.get(dateOf(p)) ?? []), p]);
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(h('div', { class: 'pc-day pc-blank', 'aria-hidden': 'true' }));
  for (let d = 1; d <= days; d++) {
    const date = `${month}-${String(d).padStart(2, '0')}`;
    const list = byDay.get(date) ?? [];
    const dow = (lead + d - 1) % 7;
    cells.push(
      h(
        'div',
        { class: `pc-day${date === today ? ' today' : ''}${dow > 4 ? ' weekend' : ''}${list.length ? '' : ' empty'}` },
        h('div', { class: 'pc-dhead' }, h('b', { class: 'num' }, d), h('span', { class: 'pc-wd' }, WEEKDAYS[dow]), list.length ? h('span', { class: 'pc-dsum num' }, rub(sumOf(list))) : null),
        list.map((p) =>
          h('button', {
            type: 'button', class: `pc-chip s-${p.status}`,
            title: `${p.client_name}: ${p.label}, ${rub(p.amount)} — ${CAL_STATUS[p.status].toLowerCase()}`,
            onclick: () => openItem(p, reload),
          }, h('span', { class: 'pc-cname' }, p.client_name), h('b', { class: 'num' }, rub(p.amount))),
        ),
      ),
    );
  }
  return h('div', { class: 'pc-month' }, WEEKDAYS.map((w, i) => h('div', { class: `pc-wdname${i > 4 ? ' weekend' : ''}` }, w)), cells);
}

function clientMatrix(periods, items, carry, month, go) {
  const clients = new Map();
  for (const p of [...carry, ...items]) clients.set(p.client_id, p.client_name);
  const rows = [...clients].sort((a, b) => a[1].localeCompare(b[1], 'ru'));
  const cell = (list, onclick) => {
    if (!list.length) return h('td', { class: 'pc-empty' }, '—');
    const worst = list.reduce((w, p) => (RANK[p.status] > RANK[w] ? p.status : w), 'paid');
    return h('td', { class: `pc-cell s-${worst}`, title: list.map((p) => `${p.label}: ${rub(p.amount)}, ${CAL_STATUS[p.status].toLowerCase()}`).join('\n') },
      h('button', { type: 'button', onclick }, h('b', { class: 'num' }, rub(sumOf(list))), h('span', {}, CAL_STATUS[worst])));
  };
  const hasCarry = carry.length > 0;
  return h(
    'div',
    { class: 'pc-matrix-wrap' },
    h(
      'table',
      { class: 'pc-matrix' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Клиент'), hasCarry ? h('th', { class: 'num' }, 'Долг раньше') : null, periods.map((ym) => h('th', { class: `num${ym === month ? ' sel' : ''}` }, monthShort(ym))), h('th', { class: 'num' }, 'Итого'))),
      h('tbody', {}, rows.map(([id, name]) => {
        const mine = items.filter((p) => p.client_id === id);
        return h('tr', {},
          h('th', {}, h('a', { href: `#/client?id=${id}` }, name)),
          hasCarry ? cell(carry.filter((p) => p.client_id === id), () => go({ view: 'list' })) : null,
          periods.map((ym) => cell(mine.filter((p) => dateOf(p).slice(0, 7) === ym), () => go({ view: 'month', m: ym }))),
          h('td', { class: 'num pc-total' }, rub(sumOf(mine))));
      })),
      h('tfoot', {}, h('tr', {}, h('th', {}, 'Всего'), hasCarry ? h('td', { class: 'num' }, rub(sumOf(carry))) : null, periods.map((ym) => h('td', { class: `num${ym === month ? ' sel' : ''}` }, rub(sumOf(items.filter((p) => dateOf(p).slice(0, 7) === ym))))), h('td', { class: 'num pc-total' }, rub(sumOf(items))))),
    ),
  );
}

/** Платёжный календарь: когда и сколько платят клиенты — по дням месяца и по клиентам на полгода. */
export async function renderPayCalendar(params) {
  const today = todayIso();
  const month = /^\d{4}-\d{2}$/.test(params.get('m') ?? '') ? params.get('m') : today.slice(0, 7);
  const view = params.get('view') === 'clients' ? 'clients' : 'month';
  const go = (patch) => {
    const next = { m: month, view, ...patch };
    if (next.view === 'list') return navigate('money', new URLSearchParams({ status: 'overdue' }));
    const q = new URLSearchParams();
    if (next.m !== today.slice(0, 7)) q.set('m', next.m);
    if (next.view !== 'month') q.set('view', next.view);
    navigate('paycal', q);
  };
  const body = h('div', { class: 'paycal' }, h('p', { class: 'muted' }, 'Загружаю…'));
  const addBtn = h('button', { type: 'button', class: 'btn btn-primary' }, 'Новый счёт');
  const nav = h(
    'div',
    { class: 'pc-nav' },
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Предыдущий месяц', onclick: () => go({ m: shiftMonth(month, -1) }) }, '‹'),
    h('b', { class: 'pc-title' }, monthTitle(month)),
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Следующий месяц', onclick: () => go({ m: shiftMonth(month, 1) }) }, '›'),
    month !== today.slice(0, 7) ? h('button', { type: 'button', class: 'btn btn-s', onclick: () => go({ m: today.slice(0, 7) }) }, 'Сегодня') : null,
  );
  const views = h('div', { class: 'rating-filter', role: 'group', 'aria-label': 'Вид' }, [['month', 'По дням'], ['clients', 'По клиентам']].map(([k, l]) => h('button', { type: 'button', 'aria-pressed': String(k === view), onclick: () => go({ view: k }) }, l)));
  fill(app, shell('paycal', [h('div', { class: 'page-head' }, h('h1', {}, 'Платёжный календарь'), h('span', { class: 'spacer' }), addBtn), h('div', { class: 'pc-bar' }, nav, views), body]));
  let clients = [];
  api('/admin/api/clients').then((d) => (clients = d.clients ?? [])).catch(() => {});
  addBtn.addEventListener('click', () => paymentDialog({ clients, onSaved: load }));

  async function load() {
    let data;
    const from = view === 'clients' ? shiftMonth(month, -1) : month;
    try {
      data = await api(`/admin/api/money/calendar?from=${from}&months=${view === 'clients' ? 6 : 1}`);
    } catch (err) {
      if (err.status !== 401) fill(body, h('p', { class: 'error' }, err.message));
      return;
    }
    const inMonth = data.items.filter((p) => dateOf(p).slice(0, 7) === month);
    const by = (st) => inMonth.filter((p) => st.includes(p.status));
    // долг на выбранный месяц: всё просроченное с его сроком и раньше, в обоих видах одинаково
    const debt = [...data.carry, ...data.items].filter((p) => p.status === 'overdue' && dateOf(p).slice(0, 7) <= month);
    const stat = (label, list, tone) => h('div', { class: `home-stat ${tone}` }, h('b', { class: 'num' }, rub(sumOf(list))), h('span', {}, `${label} · ${list.length}`));
    const real = inMonth.filter((p) => !p.planned);
    fill(
      body,
      h('div', { class: 'home-stats pc-stats' },
        stat(`всего за ${monthTitle(month).split(' ')[0].toLowerCase()}`, inMonth, ''),
        stat('получено', by(['paid']), 'good'),
        stat('ждём и в плане', by(['open', 'plan']), 'accent'),
        stat('просрочено, с прошлыми', debt, sumOf(debt) ? 'bad' : '')),
      view === 'month' ? monthGrid(month, inMonth, data.today, load) : clientMatrix(data.periods, data.items, data.carry, month, go),
      h('p', { class: 'pc-legend muted small' }, ['overdue', 'open', 'plan', 'paid'].map((st) => h('span', { class: `pc-key s-${st}` }, CAL_STATUS[st])),
        'План — абонентская плата из карточки клиента: счёт появится сам в свой месяц.'),
      view === 'month' && data.carry.length
        ? h('section', { class: 'panel home-card' }, h('div', { class: 'home-card-head' }, h('h2', {}, 'Долги прошлых месяцев'), h('span', { class: 'due overdue num' }, rub(sumOf(data.carry)))), paymentRows(data.carry, { reload: load, showClient: true }))
        : null,
      view === 'month' && real.length
        ? h('section', { class: 'panel home-card' }, h('div', { class: 'home-card-head' }, h('h2', {}, `Счета за ${monthTitle(month).toLowerCase()}`)), paymentRows(real, { reload: load, showClient: true }))
        : null,
      !data.items.length && !data.carry.length
        ? h('p', { class: 'home-quiet' }, 'В этом периоде платежей нет. Укажите в карточке клиента абонентскую плату и день оплаты — платежи появятся в календаре на месяцы вперёд.')
        : null,
    );
  }
  load();
}

export { todayIso };
