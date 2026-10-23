// Деньги по клиентам: абонентская плата за ведение (счёт на каждый месяц появляется сам),
// ежемесячные счета (хостинг, бюджет, подписки — тоже появляются сами), рекламные бюджеты и разовые работы;
// кто оплатил, кто должен; напоминания менеджеру клиента
// за 3 дня до срока и в день просрочки. Цифры вводят люди — система только считает и напоминает.

import { CrmError } from './store.js';

export const PAYMENT_KINDS = { fee: 'Ведение', budget: 'Рекламный бюджет', other: 'Разовые работы' };
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const todayMsk = (now = new Date()) => new Date(now.getTime() + 3 * 3600e3).toISOString().slice(0, 10);
const addDays = (iso, n) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);
export const rub = (v) => `${Math.round(Number(v) || 0).toLocaleString('ru-RU')} ₽`;
const periodLabel = (p) => (p ? `${MONTHS[Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}` : '');
const PERIOD_RE = /^\d{4}-\d{2}$/;
const lastDay = (period) => new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0)).getUTCDate();
const dueIn = (period, payDay) => `${period}-${String(Math.min(payDay, lastDay(period))).padStart(2, '0')}`;
/** Название счёта ежемесячного платежа: «Хостинг за ноябрь 2026» */
const recurringTitle = (r, period) => `${r.title || (r.kind === 'other' ? 'Ежемесячный платёж' : PAYMENT_KINDS[r.kind])} за ${periodLabel(period)}`;

export function createMoney({ db, notify = null }) {
  const q = {
    client: db.prepare('SELECT id, name, manager_id, fee, pay_day, archived FROM clients WHERE id = ?'),
    setBilling: db.prepare('UPDATE clients SET fee = ?, pay_day = ? WHERE id = ?'),
    feeClients: db.prepare('SELECT id, fee, pay_day FROM clients WHERE archived = 0 AND fee > 0 AND pay_day BETWEEN 1 AND 31'),
    feePlan: db.prepare(
      `SELECT c.id, c.name, c.fee, c.pay_day, c.manager_id FROM clients c
       WHERE c.archived = 0 AND c.fee > 0 AND c.pay_day BETWEEN 1 AND 31 AND (? IS NULL OR c.manager_id = ?)`,
    ),
    autoPeriods: db.prepare('SELECT client_id, period FROM client_payments WHERE auto = 1 AND period BETWEEN ? AND ?'),
    range: db.prepare(
      `SELECT p.*, c.name AS client_name, c.manager_id, r.end_period AS repeat_end FROM client_payments p JOIN clients c ON c.id = p.client_id
       LEFT JOIN client_recurring r ON r.id = p.recurring_id
       WHERE (? IS NULL OR c.manager_id = ?) AND (
         COALESCE(p.due, p.paid_at) BETWEEN ? AND ? OR (p.paid_at IS NULL AND p.due < ?)
       ) ORDER BY COALESCE(p.due, p.paid_at), p.id`,
    ),
    // ежемесячные счета, действующие в месяце (у клиентов не в архиве)
    recurringIn: db.prepare(
      `SELECT r.*, c.name AS client_name, c.manager_id FROM client_recurring r JOIN clients c ON c.id = r.client_id
       WHERE c.archived = 0 AND r.start_period <= ? AND (r.end_period IS NULL OR r.end_period >= ?) AND (? IS NULL OR c.manager_id = ?)`,
    ),
    recurringPeriods: db.prepare('SELECT recurring_id, period FROM client_payments WHERE recurring_id IS NOT NULL AND period BETWEEN ? AND ?'),
    recurringGet: db.prepare('SELECT * FROM client_recurring WHERE id = ?'),
    recurringAdd: db.prepare('INSERT INTO client_recurring (client_id, kind, title, amount, pay_day, start_period, end_period, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
    recurringUpdate: db.prepare('UPDATE client_recurring SET kind = ?, title = ?, amount = ?, pay_day = ? WHERE id = ?'),
    recurringEnd: db.prepare('UPDATE client_recurring SET end_period = ? WHERE id = ?'),
    recurringSkip: db.prepare('UPDATE client_recurring SET skip = ? WHERE id = ?'),
    recurringInsert: db.prepare('INSERT OR IGNORE INTO client_payments (client_id, kind, title, amount, period, due, recurring_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
    setRecurring: db.prepare('UPDATE client_payments SET recurring_id = ?, period = ?, title = ? WHERE id = ?'),
    autoInsert: db.prepare("INSERT OR IGNORE INTO client_payments (client_id, kind, title, amount, period, due, auto, created_by) VALUES (?, 'fee', ?, ?, ?, ?, 1, 'Ассистент')"),
    insert: db.prepare('INSERT INTO client_payments (client_id, kind, title, amount, period, due, invoice, receipt, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    get: db.prepare(
      `SELECT p.*, c.name AS client_name, c.manager_id, r.end_period AS repeat_end FROM client_payments p JOIN clients c ON c.id = p.client_id
       LEFT JOIN client_recurring r ON r.id = p.recurring_id WHERE p.id = ?`,
    ),
    update: db.prepare('UPDATE client_payments SET kind = ?, title = ?, amount = ?, due = ?, paid_at = ?, invoice = ?, receipt = ?, note = ? WHERE id = ?'),
    remove: db.prepare('DELETE FROM client_payments WHERE id = ?'),
    list: db.prepare(
      `SELECT p.*, c.name AS client_name, c.manager_id, u.name AS manager_name, r.end_period AS repeat_end FROM client_payments p
       JOIN clients c ON c.id = p.client_id LEFT JOIN admin_users u ON u.id = c.manager_id LEFT JOIN client_recurring r ON r.id = p.recurring_id
       WHERE (? IS NULL OR p.client_id = ?) AND (? IS NULL OR c.manager_id = ?)
       ORDER BY p.paid_at IS NOT NULL, p.due IS NULL, p.due, p.id DESC LIMIT 500`,
    ),
    unpaidDue: db.prepare(
      `SELECT p.*, c.name AS client_name, c.manager_id FROM client_payments p JOIN clients c ON c.id = p.client_id
       WHERE p.paid_at IS NULL AND p.due IS NOT NULL AND p.due <= ?`,
    ),
    remind: db.prepare('UPDATE client_payments SET reminded = ? WHERE id = ?'),
    admins: db.prepare("SELECT id FROM admin_users WHERE role = 'admin' AND disabled = 0"),
  };

  const status = (p, today) => (p.paid_at ? 'paid' : p.due && p.due < today ? 'overdue' : 'open');
  const titleOf = (p) => p.title || `${PAYMENT_KINDS[p.kind] ?? 'Оплата'}${p.period ? ` за ${periodLabel(p.period)}` : ''}`;
  // repeats — счёт ежемесячный и после него будут следующие
  const view = (p, today) => ({
    ...p,
    auto: Boolean(p.auto),
    repeats: Boolean(p.recurring_id) && (!p.repeat_end || p.repeat_end > p.period),
    status: status(p, today),
    label: titleOf(p),
  });

  /** Права: администратор видит всё; менеджер — своих клиентов. */
  const scope = (user) => (user.role === 'admin' ? null : user.id);
  function client(id, user) {
    const c = q.client.get(Number(id));
    if (!c) throw new CrmError('Клиент не найден');
    if (user && user.role !== 'admin' && c.manager_id !== user.id) throw new CrmError('Деньги клиента видит его менеджер и администратор');
    return c;
  }

  /** Счёт за ведение на текущий месяц — для всех клиентов с абонентской платой. */
  function ensureMonthly(now = new Date()) {
    const today = todayMsk(now);
    const period = today.slice(0, 7);
    const [y, m] = period.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    for (const c of q.feeClients.all()) {
      const due = `${period}-${String(Math.min(c.pay_day, last)).padStart(2, '0')}`;
      q.autoInsert.run(c.id, `Ведение за ${periodLabel(period)}`, c.fee, period, due);
    }
    for (const r of q.recurringIn.all(period, period, null, null)) {
      if (r.skip.split(',').includes(period)) continue;
      q.recurringInsert.run(r.client_id, r.kind, recurringTitle(r, period), r.amount, period, dueIn(period, r.pay_day), r.id, r.created_by);
    }
  }

  function list(user, { clientId = null, now = new Date() } = {}) {
    ensureMonthly(now);
    if (clientId) client(clientId, user);
    const today = todayMsk(now);
    const sc = scope(user);
    return q.list.all(clientId, clientId, sc, sc).map((p) => view(p, today));
  }

  /** Итоги: просрочено, ждём в этом месяце, получено в этом месяце. */
  function summary(user, now = new Date()) {
    const today = todayMsk(now);
    const month = today.slice(0, 7);
    const all = list(user, { now });
    const overdue = all.filter((p) => p.status === 'overdue');
    const expected = all.filter((p) => p.status === 'open' && p.due && p.due.slice(0, 7) <= month);
    const received = all.filter((p) => p.paid_at && p.paid_at.slice(0, 7) === month);
    const sum = (l) => l.reduce((a, p) => a + Number(p.amount), 0);
    const debtors = new Map();
    for (const p of overdue) debtors.set(p.client_id, { client_id: p.client_id, client_name: p.client_name, sum: (debtors.get(p.client_id)?.sum ?? 0) + Number(p.amount), days: Math.max(debtors.get(p.client_id)?.days ?? 0, Math.round((Date.parse(today) - Date.parse(p.due)) / 864e5)) });
    return {
      overdue: { sum: sum(overdue), count: overdue.length },
      expected: { sum: sum(expected), count: expected.length },
      received: { sum: sum(received), count: received.length },
      debtors: [...debtors.values()].sort((a, b) => b.sum - a.sum),
      soon: all.filter((p) => p.status === 'open' && p.due && p.due <= addDays(today, 7)).slice(0, 8),
    };
  }

  /**
   * Платёжный календарь: счета со сроком (или датой оплаты) в месяцах from..from+months-1,
   * неоплаченные долги до начала периода и план абонентской платы на месяцы, где счёта ещё нет.
   * План не хранится: счёт за ведение появится сам в свой месяц, до тех пор это ожидание.
   */
  function calendar(user, { from = null, months = 1, now = new Date() } = {}) {
    ensureMonthly(now);
    const today = todayMsk(now);
    const start = /^\d{4}-\d{2}$/.test(from ?? '') ? from : today.slice(0, 7);
    const n = Math.min(Math.max(Number(months) || 1, 1), 12);
    const periods = [];
    for (let i = 0; i < n; i++) {
      const d = new Date(Date.UTC(Number(start.slice(0, 4)), Number(start.slice(5, 7)) - 1 + i, 1));
      periods.push(d.toISOString().slice(0, 7));
    }
    const first = `${periods[0]}-01`;
    const [ly, lm] = periods.at(-1).split('-').map(Number);
    const last = `${periods.at(-1)}-${String(new Date(Date.UTC(ly, lm, 0)).getUTCDate()).padStart(2, '0')}`;
    const sc = scope(user);
    const rows = q.range.all(sc, sc, first, last, first).map((p) => view(p, today));
    const items = rows.filter((p) => (p.due ?? p.paid_at) >= first);
    const carry = rows.filter((p) => (p.due ?? p.paid_at) < first);
    // план: только будущие месяцы — счета текущего месяца уже созданы ensureMonthly
    const have = new Set(q.autoPeriods.all(periods[0], periods.at(-1)).map((r) => `${r.client_id}:${r.period}`));
    const plan = [];
    for (const c of q.feePlan.all(sc, sc)) {
      for (const period of periods) {
        if (period <= today.slice(0, 7) || have.has(`${c.id}:${period}`)) continue;
        const [y, m] = period.split('-').map(Number);
        const dd = Math.min(c.pay_day, new Date(Date.UTC(y, m, 0)).getUTCDate());
        plan.push({ id: null, client_id: c.id, client_name: c.name, manager_id: c.manager_id, kind: 'fee', amount: c.fee, period, due: `${period}-${String(dd).padStart(2, '0')}`, paid_at: null, status: 'plan', label: `Ведение за ${periodLabel(period)}`, planned: true });
      }
    }
    const haveRec = new Set(q.recurringPeriods.all(periods[0], periods.at(-1)).map((r) => `${r.recurring_id}:${r.period}`));
    for (const period of periods) {
      if (period <= today.slice(0, 7)) continue;
      for (const r of q.recurringIn.all(period, period, sc, sc)) {
        if (haveRec.has(`${r.id}:${period}`) || r.skip.split(',').includes(period)) continue;
        plan.push({ id: null, client_id: r.client_id, client_name: r.client_name, manager_id: r.manager_id, kind: r.kind, amount: r.amount, period, due: dueIn(period, r.pay_day), paid_at: null, status: 'plan', label: recurringTitle(r, period), planned: true, repeats: true });
      }
    }
    const all = [...items, ...plan].sort((a, b) => (a.due ?? a.paid_at).localeCompare(b.due ?? b.paid_at) || a.client_name.localeCompare(b.client_name, 'ru'));
    return { from: periods[0], periods, today, items: all, carry };
  }

  function checkFields(v, cur = null) {
    const kind = v.kind ?? cur?.kind ?? 'other';
    if (!(kind in PAYMENT_KINDS)) throw new CrmError('Неизвестный вид оплаты');
    const amount = v.amount !== undefined ? Number(v.amount) : Number(cur?.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1e10) throw new CrmError('Сумма — положительное число');
    const due = v.due !== undefined ? v.due : cur?.due ?? null;
    if (due != null && !DATE_RE.test(due)) throw new CrmError('Срок оплаты — дата ГГГГ-ММ-ДД');
    const str = (x, max) => (x == null ? null : String(x).trim().slice(0, max) || null);
    return {
      kind,
      title: v.title !== undefined ? str(v.title, 200) : cur?.title ?? null,
      amount: Math.round(amount * 100) / 100,
      due,
      invoice: v.invoice !== undefined ? str(v.invoice, 100) : cur?.invoice ?? null,
      receipt: v.receipt !== undefined ? str(v.receipt, 300) : cur?.receipt ?? null,
      note: v.note !== undefined ? str(v.note, 1000) : cur?.note ?? null,
    };
  }

  /**
   * Счёт становится ежемесячным: дальше счёт на каждый месяц с тем же днём оплаты появится сам.
   * until — последний месяц (ГГГГ-ММ) или null — без конца.
   */
  function startRepeat(p, f, until, user) {
    if (p.auto) throw new CrmError('Ведение повторяется само: сумму и день оплаты задают в карточке клиента');
    if (!f.due) throw new CrmError('Для ежемесячного счёта укажите срок оплаты: в этот день месяца он и будет');
    const period = f.due.slice(0, 7);
    if (until != null && (!PERIOD_RE.test(until) || until < period)) throw new CrmError('Последний месяц — не раньше первого счёта');
    const { lastInsertRowid } = q.recurringAdd.run(p.client_id, f.kind, f.title, f.amount, Number(f.due.slice(8, 10)), period, until ?? null, user.name);
    const r = q.recurringGet.get(lastInsertRowid);
    q.setRecurring.run(r.id, period, recurringTitle(r, period), p.id);
  }

  function add(clientId, v, user, now = new Date()) {
    const c = client(clientId, user);
    const f = checkFields(v);
    if (v.repeat && !f.due) throw new CrmError('Для ежемесячного счёта укажите срок оплаты: в этот день месяца он и будет');
    const period = v.period ?? (f.due ? f.due.slice(0, 7) : todayMsk(now).slice(0, 7));
    db.exec('BEGIN');
    let id;
    try {
      ({ lastInsertRowid: id } = q.insert.run(c.id, f.kind, f.title, f.amount, period, f.due, f.invoice, f.receipt, f.note, user.name));
      if (v.repeat) startRepeat(q.get.get(id), f, v.repeatUntil ?? null, user);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    if (v.paid) return update(id, { paid: true }, user, now);
    return view(q.get.get(id), todayMsk(now));
  }

  function update(id, v, user, now = new Date()) {
    const cur = q.get.get(Number(id));
    if (!cur) throw new CrmError('Оплата не найдена');
    client(cur.client_id, user);
    const f = checkFields(v, cur);
    const paidAt = v.paid === undefined ? cur.paid_at : v.paid ? cur.paid_at ?? (v.paidAt ?? todayMsk(now)) : null;
    const rec = cur.recurring_id ? q.recurringGet.get(cur.recurring_id) : null;
    const repeats = view(cur, todayMsk(now)).repeats;
    db.exec('BEGIN');
    try {
      q.update.run(f.kind, f.title, f.amount, f.due, paidAt, f.invoice, f.receipt, f.note, cur.id);
      if (v.repeat === true && !rec) startRepeat(cur, f, v.repeatUntil ?? null, user);
      else if (rec && v.repeat === true && !repeats) q.recurringEnd.run(v.repeatUntil ?? null, rec.id);
      // повтор снят: этот счёт — последний
      else if (rec && v.repeat === false && repeats) q.recurringEnd.run(cur.period, rec.id);
      else if (rec && v.repeatUntil !== undefined) q.recurringEnd.run(v.repeatUntil, rec.id);
      // правка суммы, вида, названия и дня оплаты и для следующих месяцев
      if (rec && v.applyToNext) {
        const base = v.title !== undefined ? (v.title ?? '').trim().replace(/ за [а-яё]+ \d{4}$/i, '') || null : rec.title;
        q.recurringUpdate.run(f.kind, base, f.amount, f.due ? Number(f.due.slice(8, 10)) : rec.pay_day, rec.id);
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    return view(q.get.get(cur.id), todayMsk(now));
  }

  function remove(id, user) {
    const cur = q.get.get(Number(id));
    if (!cur) throw new CrmError('Оплата не найдена');
    client(cur.client_id, user);
    // удалённый счёт ежемесячного платежа не появится в этом месяце снова
    if (cur.recurring_id && cur.period) {
      const r = q.recurringGet.get(cur.recurring_id);
      if (r) q.recurringSkip.run([...r.skip.split(',').filter(Boolean), cur.period].join(','), r.id);
    }
    q.remove.run(cur.id);
  }

  function setBilling(clientId, { fee = null, payDay = null }, user) {
    const c = client(clientId, user);
    if (fee != null && !(Number(fee) >= 0)) throw new CrmError('Абонентская плата — число');
    if (payDay != null && !(Number.isInteger(Number(payDay)) && payDay >= 1 && payDay <= 31)) throw new CrmError('День оплаты — число от 1 до 31');
    q.setBilling.run(fee ? Number(fee) : null, payDay ? Number(payDay) : null, c.id);
    return q.client.get(c.id);
  }

  /** Напоминания менеджеру клиента (или администраторам): за 3 дня до срока и в день просрочки. */
  function remind(now = new Date()) {
    if (!notify) return 0;
    ensureMonthly(now);
    const today = todayMsk(now);
    let sent = 0;
    for (const p of q.unpaidDue.all(addDays(today, 3))) {
      const flags = new Set(p.reminded.split(',').filter(Boolean));
      const late = p.due < today;
      const flag = late ? 'overdue' : 'before';
      if (flags.has(flag)) continue;
      const to = p.manager_id ? [p.manager_id] : q.admins.all().map((a) => a.id);
      const text = late
        ? `Просрочена оплата: ${p.client_name} — ${rub(p.amount)}, ${titleOf(p).toLowerCase()}`
        : `Скоро оплата: ${p.client_name} — ${rub(p.amount)}, ${titleOf(p).toLowerCase()}, срок ${new Date(`${p.due}T12:00:00Z`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' })}`;
      for (const uid of to) notify.add(uid, { kind: 'payment', text, href: `#/client?id=${p.client_id}` });
      flags.add(flag);
      if (late) flags.add('before');
      q.remind.run([...flags].join(','), p.id);
      sent += 1;
    }
    return sent;
  }

  return { list, summary, calendar, add, update, remove, setBilling, ensureMonthly, remind, kinds: PAYMENT_KINDS };
}
