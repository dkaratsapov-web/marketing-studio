import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { openDb } from '../src/storage/db.js';
import { createLibrary } from '../src/library/store.js';
import { createFiles } from '../src/files/store.js';

function setup() {
  const db = openDb(':memory:').raw;
  db.prepare("INSERT INTO admin_users (id, email, name, role) VALUES (1, 'a@k.test', 'Админ', 'admin'), (2, 'm@k.test', 'Маша', 'manager'), (3, 'p@k.test', 'Петя', 'manager')").run();
  const files = createFiles({ db, dir: mkdtempSync(`${tmpdir()}/lib-`) });
  return { db, files, lib: createLibrary({ db }), admin: { id: 1, name: 'Админ', role: 'admin' }, masha: { id: 2, name: 'Маша', role: 'manager' }, petya: { id: 3, name: 'Петя', role: 'manager' } };
}
const pdf = (files, user, name = 'Регламент ведения рекламы.pdf') => files.save(Readable.from([Buffer.from('%PDF-1.4 test')]), { mime: 'application/pdf', name, user });

test('База знаний: папки, файлы, ссылки, закрепление; файл виден всем сотрудникам', async () => {
  const { files, lib, masha, petya } = setup();
  const folder = lib.createFolder('Регламенты', masha);
  assert.throws(() => lib.createFolder('регламенты', masha), /уже есть/);
  const f = await pdf(files, masha);
  assert.equal(files.canRead(f.id, petya), false, 'пока файл только загружен — он личный');
  const [item] = lib.addFiles({ fileIds: [f.id], folderId: folder.id, note: 'Как ведём Директ' }, masha);
  assert.deepEqual([item.title, item.folderId, item.note, item.file.name], ['Регламент ведения рекламы', folder.id, 'Как ведём Директ', 'Регламент ведения рекламы.pdf']);
  assert.equal(files.canRead(f.id, petya), true, 'в базе знаний — доступен всем');

  const link = lib.addLink({ url: 'docs.google.com/document/d/1', note: 'Бриф' }, petya);
  assert.deepEqual([link.url, link.title, link.folderId], ['https://docs.google.com/document/d/1', 'docs.google.com', null]);
  assert.throws(() => lib.addLink({ url: 'javascript:alert(1)' }, petya), /Нужна ссылка|не похожа/);

  lib.update(link.id, { pinned: true, folderId: folder.id }, masha); // закрепить и переложить может любой
  assert.throws(() => lib.update(link.id, { title: 'Чужое' }, masha), /тот, кто добавил/);
  const { folders, items } = lib.list();
  assert.equal(items[0].id, link.id, 'закреплённое — первым');
  assert.deepEqual(folders.map((x) => [x.name, x.count]), [['Регламенты', 2]]);

  lib.removeFolder(folder.id);
  assert.ok(lib.list().items.every((i) => i.folderId === null), 'файлы из удалённой папки остались без папки');
});

test('База знаний: чужой файл добавить нельзя, удаляет автор или администратор', async () => {
  const { files, lib, admin, masha, petya } = setup();
  const f = await pdf(files, masha, 'личное.pdf');
  assert.throws(() => lib.addFiles({ fileIds: [f.id] }, petya), /только файлы, которые вы загрузили/);
  const [item] = lib.addFiles({ fileIds: [f.id] }, masha);
  assert.throws(() => lib.remove(item.id, petya), /Удалить может тот, кто добавил/);
  const fileId = lib.remove(item.id, admin);
  assert.equal(fileId, f.id);
  files.removeIfUnused(fileId);
  assert.throws(() => files.get(f.id), /не найден/);
});
