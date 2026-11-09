// Заявки с форм сайта marketing-studio.pro: сначала сохраняются в кабинете (раздел «Брифы» → «Заявки с сайта»),
// затем уходят в Telegram-группу. Токен бота вставляет администратор в «Подключениях»: он хранится только
// на сервере, обратно не отдаётся (видно имя бота и последние 4 символа) и в журнал не пишется.
// Не дошла до Telegram — заявка остаётся в кабинете, досылка пробует ещё раз в течение суток.

const TOKEN_KEY = 'site_leads.tg_token';
const BOT_KEY = 'site_leads.tg_bot';
const CHAT_KEY = 'site_leads.tg_chat';
const CHAT_TITLE_KEY = 'site_leads.tg_chat_title';
const TOKEN_RE = /^\d{6,12}:[A-Za-z0-9_-]{30,60}$/;

export const SITE_LEAD_SOURCES = {
  hero: 'Консультация · первый экран',
  protocol: 'Заявка · блок «Протокол»',
  brief: 'Бриф',
  service: 'Консультация · страница услуги',
  estimate: 'Смета · калькулятор на странице услуги',
};
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid', 'gclid'];

export class SiteLeadError extends Error {}

const str = (v, n) => String(v ?? '').trim().slice(0, n);
const digits = (v) => String(v ?? '').replace(/\D/g, '');
const phoneOk = (v) => digits(v).length >= 10;
const contactOk = (v) => phoneOk(v) || /^@?[A-Za-z0-9_]{4,32}$/.test(String(v ?? '').trim());
const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Номер вида +7XXXXXXXXXX: Telegram сам делает его кликабельным */
function telText(v) {
  let d = digits(v);
  if (d.length === 10) d = `7${d}`;
  if (d.length === 11 && d[0] === '8') d = `7${d.slice(1)}`;
  return d.length === 11 ? `+${d}` : esc(v);
}

const msk = (iso) => {
  const t = new Date(`${iso.replace(' ', 'T')}Z`).getTime() + 3 * 3600e3;
  const d = new Date(t).toISOString();
  return `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)} ${d.slice(11, 16)}`;
};

/** Текст заявки для Telegram (HTML-разметка, все данные экранированы). */
export function leadMessage(l) {
  const out = [`<b>${esc(SITE_LEAD_SOURCES[l.source] ?? 'Заявка с сайта')}</b>`, ''];
  if (l.phone) out.push(`Телефон: ${telText(l.phone)}`);
  if (l.contact) {
    if (phoneOk(l.contact)) out.push(`Связаться: ${telText(l.contact)}`);
    else {
      const handle = l.contact.replace(/^@/, '');
      out.push(`Telegram: <a href="https://t.me/${esc(handle)}">@${esc(handle)}</a>`);
    }
  }
  if (l.name) out.push(`Имя: ${esc(l.name)}`);
  if (l.service) out.push(`Услуга: ${esc(l.service)}`);
  const answers = Object.entries(l.answers ?? {});
  if (answers.length) {
    out.push('');
    for (const [q, a] of answers) out.push(`<b>${esc(q)}</b>\n${esc(a)}`);
  }
  const marks = Object.entries(l.utm ?? {}).map(([k, v]) => `${k}=${esc(v)}`);
  if (marks.length || l.referrer) {
    out.push('');
    if (marks.length) out.push(`Метки: ${marks.join(', ')}`);
    if (l.referrer) out.push(`Пришёл с: ${esc(l.referrer)}`);
  }
  out.push('', `<i>${msk(l.created_at)} МСК · заявка №${l.id} в кабинете</i>`);
  return out.join('\n');
}

export function createSiteLeads({ db, notify = null, fetchImpl = globalThis.fetch, apiBase = 'https://api.telegram.org', log = null }) {
  const base = String(apiBase).replace(/\/$/, '');
  const q = {
    add: db.prepare('INSERT INTO site_leads (source, name, phone, contact, service, answers, utm, referrer, page) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    get: db.prepare('SELECT * FROM site_leads WHERE id = ?'),
    list: db.prepare('SELECT * FROM site_leads ORDER BY id DESC LIMIT 300'),
    pending: db.prepare("SELECT * FROM site_leads WHERE delivered = 0 AND created_at > datetime('now', '-1 day') ORDER BY id LIMIT 20"),
    delivered: db.prepare("UPDATE site_leads SET delivered = 1, error = NULL, sent_at = datetime('now') WHERE id = ?"),
    failed: db.prepare('UPDATE site_leads SET error = ? WHERE id = ?'),
    remove: db.prepare('DELETE FROM site_leads WHERE id = ?'),
    admins: db.prepare("SELECT id FROM admin_users WHERE role = 'admin' AND disabled = 0"),
  };
  const settings = {
    get: db.prepare('SELECT value, updated_by, updated_at FROM app_settings WHERE key = ?'),
    put: db.prepare("INSERT INTO app_settings (key, value, updated_by, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at"),
    del: db.prepare('DELETE FROM app_settings WHERE key = ?'),
  };
  const setting = (k) => settings.get.get(k)?.value ?? null;
  const parse = (r) => r && { ...r, answers: JSON.parse(r.answers || '{}'), utm: JSON.parse(r.utm || '{}'), delivered: Boolean(r.delivered) };
  let notifier = notify;

  /**
   * Запрос к Bot API. В ошибку не попадают ни токен, ни адрес запроса: только ответ Telegram или причина сбоя сети.
   */
  async function tg(token, method, body = null) {
    let res;
    try {
      res = await fetchImpl(`${base}/bot${token}/${method}`, {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'content-type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      throw new SiteLeadError(err?.name === 'TimeoutError' ? 'Telegram не ответил за 10 секунд: возможно, он недоступен с сервера' : 'Нет связи с Telegram с сервера');
    }
    const data = await res.json().catch(() => null);
    if (!data?.ok) throw new SiteLeadError(`Telegram ответил: ${str(data?.description ?? `код ${res.status}`, 200)}`);
    return data.result;
  }

  /** Состояние подключения без самого токена. */
  function info() {
    const t = settings.get.get(TOKEN_KEY);
    const token = t?.value ?? null;
    return {
      set: Boolean(token),
      tail: token ? token.slice(-4) : null,
      bot: setting(BOT_KEY),
      chat: setting(CHAT_KEY),
      chatTitle: setting(CHAT_TITLE_KEY),
      updatedBy: t?.updated_by ?? null,
      updatedAt: t?.updated_at ?? null,
    };
  }

  /** Токен проверяется в Telegram до сохранения: неверный не сохраняем. */
  async function setToken(value, user) {
    const token = str(value, 100);
    if (!TOKEN_RE.test(token)) throw new SiteLeadError('Это не похоже на токен бота: скопируйте у @BotFather строку целиком, вида 1234567890:AA…');
    const me = await tg(token, 'getMe');
    settings.put.run(TOKEN_KEY, token, user?.name ?? null);
    settings.put.run(BOT_KEY, me.username ? `@${me.username}` : str(me.first_name, 64), user?.name ?? null);
    return info();
  }

  function clearToken() {
    for (const k of [TOKEN_KEY, BOT_KEY, CHAT_KEY, CHAT_TITLE_KEY]) settings.del.run(k);
    return info();
  }

  const token = () => {
    const t = setting(TOKEN_KEY);
    if (!t) throw new SiteLeadError('Сначала вставьте токен бота');
    return t;
  };

  /** Группы, куда добавлен бот: по последним сообщениям (нужно написать в группе /start). */
  async function findChats() {
    const updates = await tg(token(), 'getUpdates?allowed_updates=%5B%22message%22,%22my_chat_member%22%5D');
    const chats = new Map();
    for (const u of updates) {
      const c = u.message?.chat ?? u.my_chat_member?.chat;
      if (c && c.type !== 'private') chats.set(String(c.id), { id: String(c.id), title: str(c.title, 120) || 'Без названия' });
    }
    return [...chats.values()];
  }

  async function setChat(id, title, user) {
    const chat = str(id, 30);
    if (!/^-?\d{5,20}$/.test(chat)) throw new SiteLeadError('Неверный номер чата');
    await tg(token(), 'sendMessage', { chat_id: chat, text: 'Проверка связи: заявки с сайта marketing-studio.pro будут приходить сюда.' });
    settings.put.run(CHAT_KEY, chat, user?.name ?? null);
    settings.put.run(CHAT_TITLE_KEY, str(title, 120) || chat, user?.name ?? null);
    return info();
  }

  async function test() {
    const chat = setting(CHAT_KEY);
    if (!chat) throw new SiteLeadError('Сначала выберите группу для заявок');
    await tg(token(), 'sendMessage', { chat_id: chat, text: 'Проверка связи: бот на месте, заявки с сайта приходят сюда.' });
    return info();
  }

  async function deliver(lead) {
    const t = setting(TOKEN_KEY);
    const chat = setting(CHAT_KEY);
    if (!t || !chat) {
      q.failed.run('Telegram не подключён', lead.id);
      return false;
    }
    try {
      await tg(t, 'sendMessage', { chat_id: chat, text: leadMessage(lead), parse_mode: 'HTML', disable_web_page_preview: true });
      q.delivered.run(lead.id);
      return true;
    } catch (err) {
      q.failed.run(str(err.message, 300), lead.id);
      log?.warn({ lead: lead.id, err: err.message }, 'Заявка с сайта не ушла в Telegram');
      return false;
    }
  }

  return {
    useNotify(n) {
      notifier = n;
    },
    /** Заявка с сайта: проверяем, сохраняем, уведомляем администраторов и отправляем в Telegram. */
    async add(data) {
      const source = str(data.source, 20);
      if (!(source in SITE_LEAD_SOURCES)) throw new SiteLeadError('Неизвестная форма');
      const lead = {
        source,
        name: str(data.name, 80),
        phone: str(data.phone, 40),
        contact: str(data.contact, 60),
        service: str(data.service, 120),
        answers: Object.fromEntries(Object.entries(data.answers ?? {}).slice(0, 12).map(([k, v]) => [str(k, 120), str(v, 300)]).filter(([k, v]) => k && v)),
        utm: Object.fromEntries(UTM_KEYS.filter((k) => data.utm?.[k]).map((k) => [k, str(data.utm[k], 120)])),
        referrer: str(data.referrer, 200),
        page: str(data.page, 300),
      };
      if (!phoneOk(lead.phone) && !contactOk(lead.contact)) throw new SiteLeadError('Укажите телефон или ник в Telegram');
      const { lastInsertRowid } = q.add.run(lead.source, lead.name || null, lead.phone || null, lead.contact || null, lead.service || null, JSON.stringify(lead.answers), JSON.stringify(lead.utm), lead.referrer || null, lead.page || null);
      const saved = parse(q.get.get(lastInsertRowid));
      const who = [saved.name, saved.phone || saved.contact].filter(Boolean).join(', ');
      for (const a of q.admins.all()) notifier?.add(a.id, { kind: 'site_lead', text: `Заявка с сайта: ${who}`, href: '#/siteleads' });
      return { lead: saved, sent: await deliver(saved) };
    },
    /** Досылка: заявки за последние сутки, которые не дошли до Telegram. */
    async retryUndelivered() {
      if (!setting(TOKEN_KEY) || !setting(CHAT_KEY)) return 0;
      let sent = 0;
      for (const r of q.pending.all()) if (await deliver(parse(r))) sent += 1;
      return sent;
    },
    list: () => q.list.all().map(parse),
    remove: (id) => q.remove.run(Number(id)).changes === 1,
    info,
    setToken,
    clearToken,
    findChats,
    setChat,
    test,
  };
}
