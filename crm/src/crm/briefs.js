// Брифы на рекламу: клиент заполняет анкету на marketing-studio.pro/brif/ (страница не индексируется),
// ответы приходят сюда и видны в разделе «Брифы». Администраторам — уведомление о новом брифе.

export const BRIEF_STATUSES = { new: 'Новый', seen: 'Просмотрен', done: 'Обработан' };

const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) || null : null);

export function createBriefs({ db, notify = null }) {
  const q = {
    add: db.prepare('INSERT INTO briefs (company, contact_name, phone, email, answers, page) VALUES (?, ?, ?, ?, ?, ?)'),
    list: db.prepare('SELECT id, company, contact_name, phone, email, status, created_at FROM briefs ORDER BY id DESC LIMIT 500'),
    get: db.prepare('SELECT * FROM briefs WHERE id = ?'),
    status: db.prepare('UPDATE briefs SET status = ? WHERE id = ?'),
    remove: db.prepare('DELETE FROM briefs WHERE id = ?'),
    fresh: db.prepare("SELECT COUNT(*) AS n FROM briefs WHERE status = 'new'"),
    admins: db.prepare("SELECT id FROM admin_users WHERE role = 'admin' AND disabled = 0"),
  };
  const parse = (row) => row && { ...row, answers: JSON.parse(row.answers) };
  let notifier = notify;

  return {
    useNotify(n) {
      notifier = n;
    },
    /** Бриф с сайта. answers — [{ section, q, a }]; пустые ответы не храним. */
    add({ company, contactName, phone, email, answers, page }) {
      const clean = answers
        .map((x) => ({ section: clip(x.section, 200) ?? '', q: clip(x.q, 300), a: clip(x.a, 3000) }))
        .filter((x) => x.q && x.a);
      const id = Number(q.add.run(clip(company, 200), clip(contactName, 200), clip(phone, 40), clip(email, 200), JSON.stringify(clean), clip(page, 500)).lastInsertRowid);
      const who = [clip(company, 200), clip(contactName, 200)].filter(Boolean).join(', ') || 'без названия';
      for (const a of q.admins.all()) notifier?.add(a.id, { kind: 'brief', text: `Новый бриф: ${who}`, href: `#/brief?id=${id}` });
      return id;
    },
    list: () => q.list.all(),
    fresh: () => q.fresh.get().n,
    /** Открытый впервые бриф помечается просмотренным. */
    get(id) {
      const b = parse(q.get.get(id));
      if (b?.status === 'new') {
        q.status.run('seen', id);
        b.status = 'seen';
      }
      return b ?? null;
    },
    setStatus: (id, status) => q.status.run(status, id).changes === 1,
    remove: (id) => q.remove.run(id).changes === 1,
  };
}
