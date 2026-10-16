// «База знаний»: важные и полезные файлы и ссылки команды — по папкам, с описанием и закреплением.
// Файлы лежат в общем хранилище (data/files), здесь — только каталог.

export class LibraryError extends Error {}

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export function createLibrary({ db }) {
  const q = {
    folders: db.prepare('SELECT f.id, f.name, (SELECT COUNT(*) FROM kb_items i WHERE i.folder_id = f.id) AS count FROM kb_folders f ORDER BY lower(f.name)'),
    folder: db.prepare('SELECT * FROM kb_folders WHERE id = ?'),
    allFolders: db.prepare('SELECT * FROM kb_folders'),
    addFolder: db.prepare('INSERT INTO kb_folders (name, created_by) VALUES (?, ?)'),
    renameFolder: db.prepare('UPDATE kb_folders SET name = ? WHERE id = ?'),
    dropFolder: db.prepare('DELETE FROM kb_folders WHERE id = ?'),
    unfolder: db.prepare('UPDATE kb_items SET folder_id = NULL WHERE folder_id = ?'),
    items: db.prepare(
      `SELECT i.*, f.mime, f.kind AS file_kind, f.bytes, f.name AS file_name FROM kb_items i LEFT JOIN files f ON f.id = i.file_id
       ORDER BY i.pinned DESC, i.created_at DESC, i.id DESC`,
    ),
    item: db.prepare('SELECT i.*, f.mime, f.kind AS file_kind, f.bytes, f.name AS file_name FROM kb_items i LEFT JOIN files f ON f.id = i.file_id WHERE i.id = ?'),
    insert: db.prepare('INSERT INTO kb_items (folder_id, kind, file_id, url, title, note, added_by, added_by_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
    update: db.prepare("UPDATE kb_items SET folder_id = ?, title = ?, note = ?, url = ?, pinned = ?, updated_at = datetime('now') WHERE id = ?"),
    remove: db.prepare('DELETE FROM kb_items WHERE id = ?'),
    file: db.prepare('SELECT id, name, uploaded_by_id FROM files WHERE id = ?'),
  };

  // lower() в SQLite не знает кириллицу — сравниваем названия здесь
  const folderByName = (n) => q.allFolders.all().find((f) => f.name.toLowerCase() === n.toLowerCase());

  const pub = (r) => ({
    id: r.id,
    kind: r.kind,
    folderId: r.folder_id,
    title: r.title,
    note: r.note,
    url: r.url,
    pinned: Boolean(r.pinned),
    addedBy: r.added_by,
    addedById: r.added_by_id,
    createdAt: r.created_at,
    file: r.file_id ? { id: r.file_id, mime: r.mime, kind: r.file_kind, bytes: r.bytes, name: r.file_name } : null,
  });

  function folderId(v) {
    if (v == null || v === '') return null;
    if (!q.folder.get(Number(v))) throw new LibraryError('Папка не найдена');
    return Number(v);
  }

  function linkUrl(v) {
    const s = clean(v, 1000);
    let u;
    try {
      u = new URL(/^[a-z]+:\/\//i.test(s) ? s : `https://${s}`);
    } catch {
      throw new LibraryError('Ссылка не похожа на адрес сайта');
    }
    if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.')) throw new LibraryError('Нужна ссылка вида https://…');
    return u.href;
  }

  const canEdit = (r, user) => user.role === 'admin' || r.added_by_id === user.id;

  return {
    list: () => ({ folders: q.folders.all(), items: q.items.all().map(pub) }),

    createFolder(name, user) {
      const n = clean(name, 80);
      if (!n) throw new LibraryError('Назовите папку');
      if (folderByName(n)) throw new LibraryError('Такая папка уже есть');
      return q.folder.get(Number(q.addFolder.run(n, user?.name ?? null).lastInsertRowid));
    },
    renameFolder(id, name) {
      const n = clean(name, 80);
      if (!n) throw new LibraryError('Назовите папку');
      const same = folderByName(n);
      if (same && same.id !== Number(id)) throw new LibraryError('Такая папка уже есть');
      if (!q.renameFolder.run(n, Number(id)).changes) throw new LibraryError('Папка не найдена');
    },
    /** Папку удаляем, а её файлы и ссылки остаются — переезжают в «Без папки». */
    removeFolder(id) {
      db.exec('BEGIN');
      try {
        q.unfolder.run(Number(id));
        q.dropFolder.run(Number(id));
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },

    /** Загруженные файлы — в базу знаний: название по умолчанию — имя файла без расширения. */
    addFiles({ fileIds, folderId: folder = null, note = '' }, user) {
      const fid = folderId(folder);
      const added = [];
      for (const id of fileIds) {
        const f = q.file.get(Number(id));
        if (!f) throw new LibraryError('Файл не найден: загрузите его ещё раз');
        // только свои загрузки: иначе по номеру можно было бы вынести в общий доступ чужое вложение из чата
        if (f.uploaded_by_id !== user?.id) throw new LibraryError('Можно добавить только файлы, которые вы загрузили сами');
        const title = f.name.replace(/\.[a-z0-9]{2,5}$/i, '') || f.name;
        added.push(Number(q.insert.run(fid, 'file', f.id, null, clean(title, 200), clean(note, 1000) || null, user?.name ?? null, user?.id ?? null).lastInsertRowid));
      }
      return added.map((id) => pub(q.item.get(id)));
    },

    addLink({ url, title = '', note = '', folderId: folder = null }, user) {
      const href = linkUrl(url);
      const t = clean(title, 200) || new URL(href).hostname.replace(/^www\./, '');
      const id = Number(q.insert.run(folderId(folder), 'link', null, href, t, clean(note, 1000) || null, user?.name ?? null, user?.id ?? null).lastInsertRowid);
      return pub(q.item.get(id));
    },

    update(id, patch, user) {
      const r = q.item.get(Number(id));
      if (!r) throw new LibraryError('Не найдено');
      // закрепить и переложить в папку может любой; переименовать и удалить — кто добавил или администратор
      const textChange = ('title' in patch && clean(patch.title, 200) !== r.title) || ('note' in patch && (clean(patch.note, 1000) || null) !== r.note) || ('url' in patch && r.kind === 'link');
      if (textChange && !canEdit(r, user)) throw new LibraryError('Изменить название и описание может тот, кто добавил, или администратор');
      const title = 'title' in patch ? clean(patch.title, 200) : r.title;
      if (!title) throw new LibraryError('Название не может быть пустым');
      q.update.run(
        'folderId' in patch ? folderId(patch.folderId) : r.folder_id,
        title,
        'note' in patch ? clean(patch.note, 1000) || null : r.note,
        r.kind === 'link' && 'url' in patch ? linkUrl(patch.url) : r.url,
        'pinned' in patch ? (patch.pinned ? 1 : 0) : r.pinned,
        r.id,
      );
      return pub(q.item.get(r.id));
    },

    /** Удалить запись; вернуть id файла, чтобы хранилище убрало его, если он больше нигде не нужен. */
    remove(id, user) {
      const r = q.item.get(Number(id));
      if (!r) throw new LibraryError('Не найдено');
      if (!canEdit(r, user)) throw new LibraryError('Удалить может тот, кто добавил, или администратор');
      q.remove.run(r.id);
      return r.file_id;
    },
  };
}
