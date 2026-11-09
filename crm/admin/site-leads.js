// «Брифы» → «Заявки с сайта»: заявки с форм marketing-studio.pro и блок подключения Telegram (администратор).
// Токен бота только вводится: кабинет его не показывает, видно имя бота и последние 4 символа.

import { h, api, app, shell, toast, confirmDialog, fmtDateTime, ctx, rowActions, rerender } from './admin.js';
import { fill } from './docs.js';

const contactText = (l) => [l.phone, l.contact].filter(Boolean).join(', ');
// ответы формы, метки и подробности визита: город, устройство, источник, вход на сайт, ClientID Метрики
const META = { source: 'Источник', geo: 'Город', device: 'Устройство', screen: 'Экран', tz: 'Часовой пояс', lang: 'Язык', landing: 'Вход на сайт', firstReferrer: 'Пришёл с', ymClientId: 'ClientID Метрики' };
const details = (l) => [
  ...Object.entries(l.answers),
  ...Object.entries(l.utm),
  ...Object.entries(META).filter(([k]) => l.meta?.[k]).map(([k, label]) => [label, l.meta[k]]),
  ...(l.ip ? [['IP', l.ip]] : []),
  ...(l.page ? [['Страница заявки', l.page]] : []),
];

export async function renderSiteLeads() {
  const box = h('div', {}, h('p', { class: 'muted' }, 'Загружаю…'));
  const head = h('div', {});
  fill(app, shell('siteleads', [h('div', { class: 'page-head' }, h('h1', {}, 'Заявки с сайта')), head, box]));
  let data;
  try {
    data = await api('/admin/api/site-leads');
  } catch (err) {
    if (err.status !== 401) fill(box, h('p', { class: 'error' }, err.message));
    return;
  }
  const t = data.telegram;
  fill(
    head,
    h(
      'p',
      { class: 'lead-text' },
      'Все заявки с форм сайта сохраняются здесь, копия уходит в Telegram-группу. ',
      t.set && t.chat
        ? `Сейчас: ${t.bot ?? 'бот'} → «${t.chatTitle}».`
        : ctx.me.role === 'admin'
          ? h('span', {}, 'Telegram пока не подключён — ', h('a', { href: '#/integrations' }, 'подключить'), '.')
          : 'Telegram пока не подключён — заявки видны только здесь.',
    ),
  );
  if (!data.leads.length) return fill(box, h('div', { class: 'empty' }, h('strong', {}, 'Заявок пока нет'), 'Как только посетитель оставит телефон в любой форме сайта, заявка появится здесь.'));
  fill(
    box,
    h(
      'div',
      { class: 'table-wrap' },
      h(
        'table',
        { class: 'leads site-leads' },
        h('thead', {}, h('tr', {}, ['Получена', 'Контакт', 'Форма', 'Ответы', 'Telegram'].map((x) => h('th', { scope: 'col' }, x)), ctx.me.role === 'admin' ? h('th', { scope: 'col' }, h('span', { class: 'sr-only' }, 'Действия')) : null)),
        h(
          'tbody',
          {},
          data.leads.map((l) =>
            h(
              'tr',
              { class: l.delivered ? null : 'hot' },
              h('td', { class: 'num nowrap' }, fmtDateTime(l.created_at)),
              h('td', {}, h('span', { class: 'company' }, l.name || 'Без имени'), h('span', { class: 'task' }, contactText(l))),
              h('td', {}, data.sources[l.source] ?? l.source, l.service ? h('span', { class: 'task' }, l.service) : null),
              h(
                'td',
                {},
                h('details', { class: 'sl-more' }, h('summary', {}, 'Подробнее'), h('dl', { class: 'answers' }, details(l).map(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]))),
              ),
              h('td', {}, l.delivered ? h('span', { class: 'sl-ok' }, 'Отправлена') : h('span', { class: 'sl-fail', title: l.error ?? '' }, l.error ?? 'Не отправлена')),
              ctx.me.role === 'admin'
                ? rowActions({
                    name: l.name || 'заявка',
                    onDelete: async () => {
                      if (!(await confirmDialog(`Удалить заявку «${l.name || contactText(l)}»?`))) return;
                      await api(`/admin/api/site-leads/${l.id}`, { method: 'DELETE' });
                      toast('Заявка удалена');
                      rerender();
                    },
                  })
                : null,
            ),
          ),
        ),
      ),
    ),
  );
}

/** Блок «Заявки с сайта в Telegram» для «Подключений»: токен, группа, проверка связи. */
export function siteLeadsTelegramPanel() {
  const box = h('section', { class: 'panel integration sl-tg' }, h('p', { class: 'muted' }, 'Проверяю…'));
  const run = async (btn, fn) => {
    btn.disabled = true;
    try {
      await fn();
    } catch (err) {
      toast(err.message);
    } finally {
      btn.disabled = false;
    }
  };
  // Ретранслятор: если хостинг не пускает к Telegram. Ключ только вводится, обратно не показывается
  function relayBlock(t) {
    if (t.relay) {
      const drop = h('button', { type: 'button', class: 'btn btn-s' }, 'Убрать');
      drop.onclick = () => run(drop, async () => draw((await api('/admin/api/site-leads/telegram/relay', { method: 'DELETE' })).telegram));
      return h('p', { class: 'integration-state sl-relay' }, `Через ретранслятор ${t.relay}. `, drop);
    }
    const url = h('input', { id: 'sl-relay-url', type: 'url', class: 'input', autocomplete: 'off', placeholder: 'https://имя.workers.dev', maxlength: 200 });
    const key = h('input', { id: 'sl-relay-key', type: 'text', class: 'input secret-input', autocomplete: 'off', 'data-lpignore': 'true', 'data-1p-ignore': 'true', 'data-bwignore': 'true', 'data-form-type': 'other', spellcheck: 'false', maxlength: 200, placeholder: 'ключ RELAY_KEY' });
    const save = h('button', { type: 'submit', class: 'btn' }, 'Подключить ретранслятор');
    return h(
      'details',
      { class: 'sl-relay' },
      h('summary', {}, 'Telegram недоступен с сервера? Подключите ретранслятор'),
      h('p', { class: 'muted' }, 'Ретранслятор стоит за границей и передаёт запросы в Telegram. Адрес и ключ — из Cloudflare Worker; ключ после сохранения не показывается.'),
      h(
        'form',
        {
          class: 'sl-form',
          onsubmit: (e) => {
            e.preventDefault();
            run(save, async () => {
              const r = (await api('/admin/api/site-leads/telegram/relay', { method: 'PUT', body: { url: url.value, key: key.value } })).telegram;
              key.value = '';
              toast('Ретранслятор подключён');
              draw(r);
            });
          },
        },
        h('label', { for: 'sl-relay-url', class: 'sr-only' }, 'Адрес ретранслятора'),
        url,
        h('label', { for: 'sl-relay-key', class: 'sr-only' }, 'Ключ ретранслятора'),
        key,
        save,
      ),
    );
  }
  async function draw(t) {
    if (!t) {
      try {
        t = (await api('/admin/api/site-leads/telegram')).telegram;
      } catch (err) {
        return fill(box, h('p', { class: 'error' }, err.message));
      }
    }
    const ok = t.set && t.chat;
    const head = h('div', { class: 'integration-head' }, h('h2', {}, 'Заявки с сайта в Telegram'), h('span', { class: 'status', dataset: { s: ok ? 'won' : 'lost' } }, ok ? 'Подключено' : 'Не подключено'));
    const what = h('p', { class: 'muted' }, 'Заявки с форм сайта приходят в кабинет и копией — в Telegram-группу. Токен хранится только на сервере: после сохранения его не видно никому, в том числе здесь.');
    if (!t.set) {
      const input = h('input', { id: 'sl-token', type: 'text', class: 'input secret-input', autocomplete: 'off', 'data-lpignore': 'true', 'data-1p-ignore': 'true', 'data-bwignore': 'true', 'data-form-type': 'other', spellcheck: 'false', maxlength: 200, placeholder: '1234567890:AA…' });
      const save = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Проверить и сохранить');
      return fill(
        box,
        head,
        what,
        h('ol', { class: 'steps' }, h('li', {}, 'В @BotFather создайте бота и скопируйте токен.'), h('li', {}, 'Вставьте токен сюда — кабинет проверит его в Telegram.'), h('li', {}, 'Добавьте бота в группу с менеджерами и напишите там /start.')),
        h(
          'form',
          {
            class: 'sl-form',
            onsubmit: (e) => {
              e.preventDefault();
              run(save, async () => {
                const r = (await api('/admin/api/site-leads/telegram', { method: 'PUT', body: { token: input.value } })).telegram;
                input.value = '';
                toast(`Бот ${r.bot} подключён`);
                draw(r);
              });
            },
          },
          h('label', { for: 'sl-token', class: 'sr-only' }, 'Токен бота'),
          input,
          save,
        ),
        relayBlock(t),
      );
    }
    const chatsBox = h('div', { class: 'sl-chats' });
    const find = h('button', { type: 'button', class: 'btn' }, t.chat ? 'Сменить группу' : 'Найти группу');
    find.onclick = () =>
      run(find, async () => {
        const { chats } = await api('/admin/api/site-leads/telegram/chats', { method: 'POST' });
        if (!chats.length) return fill(chatsBox, h('p', { class: 'muted' }, `Бот не видит групп. Добавьте ${t.bot} в группу, напишите там /start и нажмите «Найти группу» ещё раз.`));
        fill(
          chatsBox,
          h('p', { class: 'muted' }, 'Куда отправлять заявки:'),
          chats.map((c) => {
            const b = h('button', { type: 'button', class: 'btn' }, c.title);
            b.onclick = () =>
              run(b, async () => {
                const r = (await api('/admin/api/site-leads/telegram/chat', { method: 'PUT', body: c })).telegram;
                toast(`Заявки пойдут в «${r.chatTitle}», в группу отправлена проверка`);
                draw(r);
              });
            return b;
          }),
        );
      });
    const testBtn = h('button', { type: 'button', class: 'btn' }, 'Отправить проверку');
    testBtn.onclick = () => run(testBtn, async () => (await api('/admin/api/site-leads/telegram/test', { method: 'POST' }), toast('Проверка отправлена в группу')));
    const off = h('button', { type: 'button', class: 'btn' }, 'Отключить');
    off.onclick = () =>
      run(off, async () => {
        if (!(await confirmDialog('Отключить Telegram для заявок? Токен будет удалён с сервера, заявки продолжат сохраняться в кабинете.'))) return;
        draw((await api('/admin/api/site-leads/telegram', { method: 'DELETE' })).telegram);
      });
    fill(
      box,
      head,
      what,
      h(
        'p',
        { class: 'integration-state' },
        `Бот ${t.bot ?? ''}, токен …${t.tail}${t.updatedBy ? `, сохранил ${t.updatedBy}` : ''}${t.updatedAt ? ` ${fmtDateTime(t.updatedAt)}` : ''}. `,
        t.chat ? `Группа: «${t.chatTitle}».` : 'Группа ещё не выбрана: добавьте бота в группу, напишите там /start и нажмите «Найти группу».',
      ),
      h('div', { class: 'sl-actions' }, find, t.chat ? testBtn : null, off),
      chatsBox,
      relayBlock(t),
    );
  }
  draw();
  return box;
}
