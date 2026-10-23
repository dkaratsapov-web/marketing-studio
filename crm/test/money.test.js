import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/storage/db.js';
import { createAuth } from '../src/admin/auth.js';
import { createCrm } from '../src/crm/store.js';
import { createNotifications } from '../src/notify/store.js';
import { createMoney } from '../src/crm/money.js';

const msk = (s) => new Date(Date.parse(`${s}T12:00:00+03:00`));

function setup() {
  const db = openDb(':memory:');
  const auth = createAuth(db.raw);
  const anna = auth.addUser('anna', 'Анна', { password: 'correct-horse-battery', role: 'admin' }).user;
  const oleg = auth.addUser('oleg', 'Олег', { password: 'correct-horse-battery' }).user;
  const ira = auth.addUser('ira', 'Ира', { password: 'correct-horse-battery' }).user;
  const crm = createCrm({ db: db.raw });
  const notify = createNotifications({ db: db.raw });
  const money = createMoney({ db: db.raw, notify });
  const talle = crm.createClient({ name: 'Таллер', managerId: oleg.id }, anna);
  const romashka = crm.createClient({ name: 'Ромашка', managerId: ira.id }, anna);
  return { crm, money, notify, anna, oleg, ira, talle, romashka };
}

test('деньги: счёт за ведение каждый месяц, оплаты, долг, права менеджера', () => {
  const { crm, money, anna, oleg, ira, talle, romashka } = setup();
  money.setBilling(talle.id, { fee: 80000, payDay: 10 }, oleg);
  assert.throws(() => money.setBilling(talle.id, { fee: 1 }, ira), /менеджер и администратор/, 'чужой клиент');

  let list = money.list(oleg, { clientId: talle.id, now: msk('2026-10-05') });
  assert.deepEqual(list.map((p) => [p.label, p.amount, p.due, p.status, p.auto]), [['Ведение за октябрь 2026', 80000, '2026-10-10', 'open', true]]);
  money.list(oleg, { clientId: talle.id, now: msk('2026-10-20') });
  assert.equal(money.list(oleg, { clientId: talle.id, now: msk('2026-10-20') }).length, 1, 'один счёт на месяц');
  assert.equal(money.list(oleg, { clientId: talle.id, now: msk('2026-10-20') })[0].status, 'overdue');

  // бюджет на рекламу и разовая работа
  const budget = money.add(talle.id, { kind: 'budget', amount: 300000, due: '2026-10-25' }, oleg, msk('2026-10-20'));
  money.add(romashka.id, { kind: 'other', title: 'Аудит РК', amount: 40000, due: '2026-10-15', paid: true }, ira, msk('2026-10-20'));
  assert.throws(() => money.add(romashka.id, { amount: 10 }, oleg), /менеджер/);
  assert.throws(() => money.add(talle.id, { amount: -5 }, oleg), /положительное/);

  let sum = money.summary(anna, msk('2026-10-20'));
  assert.deepEqual([sum.overdue.sum, sum.expected.sum, sum.received.sum], [80000, 300000, 40000]);
  assert.deepEqual(sum.debtors.map((d) => [d.client_name, d.sum, d.days]), [['Таллер', 80000, 10]]);
  assert.equal(money.summary(ira, msk('2026-10-20')).overdue.sum, 0, 'Ира видит только своих клиентов');
  assert.equal(crm.listClients().find((c) => c.id === talle.id).debt > 0, true, 'долг — в списке клиентов');

  const paid = money.update(list[0].id, { paid: true }, oleg, msk('2026-10-21'));
  assert.deepEqual([paid.status, paid.paid_at], ['paid', '2026-10-21']);
  sum = money.summary(anna, msk('2026-10-21'));
  assert.deepEqual([sum.overdue.sum, sum.received.sum], [0, 120000]);
  money.remove(budget.id, anna);
  assert.equal(money.list(anna, { clientId: talle.id, now: msk('2026-10-21') }).length, 1);
});

test('деньги: напоминания менеджеру за 3 дня и при просрочке — по одному разу', () => {
  const { money, notify, oleg, anna, talle } = setup();
  money.add(talle.id, { kind: 'budget', amount: 150000, due: '2026-10-15' }, oleg, msk('2026-10-10'));
  assert.equal(money.remind(msk('2026-10-10')), 0, 'рано');
  assert.equal(money.remind(msk('2026-10-12')), 1);
  assert.match(notify.list(oleg.id)[0].text, /^Скоро оплата: Таллер — 150\s000 ₽, рекламный бюджет/);
  assert.equal(money.remind(msk('2026-10-13')), 0, 'повторно не напоминаем');
  assert.equal(money.remind(msk('2026-10-16')), 1);
  assert.match(notify.list(oleg.id)[0].text, /^Просрочена оплата: Таллер/);
  assert.equal(money.remind(msk('2026-10-17')), 0);
  assert.equal(notify.list(anna.id).length, 0, 'у клиента есть менеджер — администратора не дёргаем');
});

test('платёжный календарь: счета месяца, долги до периода, план абонплаты на будущие месяцы', () => {
  const { money, anna, oleg, ira, talle, romashka } = setup();
  money.setBilling(talle.id, { fee: 80000, payDay: 31 }, oleg);
  money.add(talle.id, { kind: 'budget', amount: 50000, due: '2026-09-20' }, oleg, msk('2026-09-01'));
  money.add(romashka.id, { kind: 'other', amount: 40000, due: '2026-11-05', receipt: 'https://lknpd.nalog.ru/api/v1/receipt/123/print' }, ira, msk('2026-10-20'));
  money.add(romashka.id, { kind: 'other', amount: 7000, paid: true }, ira, msk('2026-10-03'));

  const cal = money.calendar(anna, { from: '2026-10', months: 3, now: msk('2026-10-20') });
  assert.deepEqual(cal.periods, ['2026-10', '2026-11', '2026-12']);
  assert.deepEqual(
    cal.items.map((p) => [p.client_name, p.amount, p.due ?? p.paid_at, p.status]),
    [
      ['Ромашка', 7000, '2026-10-03', 'paid'],
      ['Таллер', 80000, '2026-10-31', 'open'],
      ['Ромашка', 40000, '2026-11-05', 'open'],
      ['Таллер', 80000, '2026-11-30', 'plan'],
      ['Таллер', 80000, '2026-12-31', 'plan'],
    ],
    'текущий месяц — настоящий счёт, дальше план; день оплаты 31 сжимается до конца месяца',
  );
  assert.equal(cal.items.find((p) => p.amount === 40000).receipt, 'https://lknpd.nalog.ru/api/v1/receipt/123/print');
  assert.deepEqual(cal.carry.map((p) => [p.client_name, p.amount, p.status]), [['Таллер', 50000, 'overdue']], 'долг сентября — отдельно');

  // счёт за ноябрь появился сам — план на ноябрь больше не показывается
  money.list(oleg, { now: msk('2026-11-02') });
  const nov = money.calendar(oleg, { from: '2026-11', months: 1, now: msk('2026-11-02') });
  assert.deepEqual(nov.items.map((p) => [p.amount, p.status, p.planned ?? false]), [[80000, 'open', false]], 'Олег не видит клиентов Иры');
  assert.equal(money.calendar(ira, { from: '2026-11', months: 1, now: msk('2026-11-02') }).items.length, 1);
});

test('ежемесячные счета: появляются сами каждый месяц, удалённый не возвращается, повтор можно остановить', () => {
  const { money, anna, oleg, ira, talle } = setup();
  const first = money.add(talle.id, { kind: 'other', title: 'Хостинг', amount: 3000, due: '2026-10-15', repeat: true }, oleg, msk('2026-10-05'));
  assert.deepEqual([first.label, first.period, first.repeats], ['Хостинг за октябрь 2026', '2026-10', true]);
  assert.throws(() => money.add(talle.id, { amount: 10, repeat: true }, oleg), /срок оплаты/);
  assert.throws(() => money.add(talle.id, { amount: 10, due: '2026-10-15', repeat: true }, ira), /менеджер/);

  // в ноябре счёт появился сам, день оплаты тот же
  const nov = money.list(oleg, { clientId: talle.id, now: msk('2026-11-02') }).filter((p) => p.recurring_id);
  assert.deepEqual(nov.map((p) => [p.label, p.due, p.amount]).sort((a, b) => a[1].localeCompare(b[1])), [['Хостинг за октябрь 2026', '2026-10-15', 3000], ['Хостинг за ноябрь 2026', '2026-11-15', 3000]]);
  money.list(oleg, { clientId: talle.id, now: msk('2026-11-20') });
  assert.equal(money.list(oleg, { clientId: talle.id, now: msk('2026-11-20') }).filter((p) => p.recurring_id).length, 2, 'один счёт на месяц');

  // календарь показывает план на следующие месяцы
  const cal = money.calendar(anna, { from: '2026-11', months: 3, now: msk('2026-11-20') });
  assert.deepEqual(cal.items.filter((p) => p.repeats).map((p) => [p.label, p.status]), [['Хостинг за ноябрь 2026', 'overdue'], ['Хостинг за декабрь 2026', 'plan'], ['Хостинг за январь 2027', 'plan']]);

  // удалённый счёт месяца не возвращается
  const novBill = money.list(oleg, { clientId: talle.id, now: msk('2026-11-20') }).find((p) => p.period === '2026-11' && p.recurring_id);
  money.remove(novBill.id, oleg);
  assert.equal(money.list(oleg, { clientId: talle.id, now: msk('2026-11-21') }).some((p) => p.period === '2026-11' && p.recurring_id), false);

  // новая сумма и для следующих месяцев; снятый повтор — счёт декабря последний
  const dec = money.list(oleg, { clientId: talle.id, now: msk('2026-12-01') }).find((p) => p.period === '2026-12' && p.recurring_id);
  money.update(dec.id, { amount: 3500, applyToNext: true }, oleg, msk('2026-12-01'));
  const decStop = money.update(dec.id, { repeat: false }, oleg, msk('2026-12-01'));
  assert.equal(decStop.repeats, false);
  const jan = money.list(oleg, { clientId: talle.id, now: msk('2027-01-10') }).filter((p) => p.recurring_id);
  assert.deepEqual(jan.map((p) => [p.period, p.amount]).sort(), [['2026-10', 3000], ['2026-12', 3500]]);

  // обычный счёт можно сделать ежемесячным позже
  const once = money.add(talle.id, { kind: 'budget', amount: 50000, due: '2027-01-20' }, oleg, msk('2027-01-10'));
  assert.equal(once.repeats, false);
  const again = money.update(once.id, { repeat: true }, oleg, msk('2027-01-10'));
  assert.deepEqual([again.repeats, again.label], [true, 'Рекламный бюджет за январь 2027']);
  assert.equal(money.list(oleg, { clientId: talle.id, now: msk('2027-02-01') }).filter((p) => p.recurring_id === again.recurring_id).length, 2);
});
