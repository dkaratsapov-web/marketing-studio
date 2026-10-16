// «База знаний»: важные и полезные файлы и ссылки команды — папки, поиск, закрепление.
// Файлы можно перетащить прямо на страницу.

import { h, api, app, shell, toast, ctx, confirmDialog, icon } from './admin.js';
import { fill, formDialog } from './docs.js';
import { uploadFile, fileUrl, fileSize, ACCEPT_ANY } from './files.js';

const EXT_LABEL = { pdf: 'PDF', docx: 'DOC', doc: 'DOC', xlsx: 'XLS', xls: 'XLS', csv: 'CSV', pptx: 'PPT', ppt: 'PPT', zip: 'ZIP', rar: 'RAR', '7z': '7Z', txt: 'TXT', rtf: 'RTF' };
const fmtDay = (s) => new Date(`${s.replace(' ', 'T')}Z`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Moscow' }).replace(' г.', '');

function badge(item) {
  if (item.kind === 'link') return h('span', { class: 'lib-badge link' }, 'ссылка');
  const f = item.file;
  if (f.kind === 'image') return h('span', { class: 'lib-badge img' }, 'фото');
  if (f.kind === 'video') return h('span', { class: 'lib-badge video' }, 'видео');
  const ext = f.name.split('.').pop().toLowerCase();
  return h('span', { class: `lib-badge doc-${EXT_LABEL[ext]?.toLowerCase() ?? 'file'}` }, EXT_LABEL[ext] ?? ext.slice(0, 4).toUpperCase());
}

const hostOf = (url) => url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/.*$/, '');

export async function renderLibrary(params) {
  const state = { folder: params.get('folder') ?? 'all', q: '' };
  let data = { folders: [], items: [] };
  const picker = h('input', { type: 'file', multiple: true, accept: ACCEPT_ANY, hidden: true, onchange: () => upload([...picker.files]).finally(() => (picker.value = '')) });
  const head = h(
    'div',
    { class: 'page-head' },
    h('h1', {}, 'База знаний'),
    h('span', { class: 'spacer' }),
    h('button', { type: 'button', class: 'btn', onclick: () => openLink() }, 'Добавить ссылку'),
    h('button', { type: 'button', class: 'btn btn-primary', onclick: () => picker.click() }, 'Загрузить файлы'),
    picker,
  );
  const aside = h('nav', { class: 'lib-folders', 'aria-label': 'Папки' });
  const search = h('input', { class: 'input', type: 'search', placeholder: 'Поиск по названию и описанию', 'aria-label': 'Поиск', oninput: () => ((state.q = search.value.trim().toLowerCase()), drawItems()) });
  const folderHead = h('div', { class: 'lib-folder-head' });
  const list = h('div', { class: 'lib-list' }, h('p', { class: 'muted' }, 'Загружаю…'));
  const progress = h('div', { class: 'lib-progress', hidden: true });
  const drop = h('div', { class: 'lib-drop', hidden: true }, h('div', {}, icon('clip'), h('b', {}, 'Отпустите файлы'), h('span', {}, 'они попадут в базу знаний')));
  const main = h('section', { class: 'lib-main' }, folderHead, h('div', { class: 'filters lib-search' }, search), progress, list);
  fill(app, shell('library', [head, h('div', { class: 'lib' }, aside, main), drop]));

  async function load() {
    try {
      data = await api('/admin/api/library');
    } catch (err) {
      if (err.status !== 401) fill(list, h('p', { class: 'error' }, err.message));
      return;
    }
    if (!['all', 'pinned', 'none'].includes(state.folder) && !data.folders.some((f) => String(f.id) === state.folder)) state.folder = 'all';
    drawFolders();
    drawItems();
  }

  const currentFolder = () => data.folders.find((f) => String(f.id) === state.folder) ?? null;

  function drawFolders() {
    const item = (id, label, count, extra = null) =>
      h('button', { type: 'button', class: 'lib-folder', 'aria-current': String(state.folder === id), onclick: () => ((state.folder = id), drawFolders(), drawItems()) }, extra, h('span', { class: 'lib-folder-name' }, label), h('span', { class: 'lib-count' }, String(count)));
    fill(
      aside,
      item('all', 'Все', data.items.length),
      data.items.some((i) => i.pinned) ? item('pinned', 'Закреплённые', data.items.filter((i) => i.pinned).length, h('span', { class: 'lib-star', 'aria-hidden': 'true' }, '★')) : null,
      h('div', { class: 'lib-sep' }),
      data.folders.map((f) => item(String(f.id), f.name, f.count, icon('folder'))),
      data.items.some((i) => !i.folderId) && data.folders.length ? item('none', 'Без папки', data.items.filter((i) => !i.folderId).length) : null,
      h('button', { type: 'button', class: 'lib-folder lib-add', onclick: newFolder }, '+ Новая папка'),
    );
  }

  function drawItems() {
    const f = currentFolder();
    fill(
      folderHead,
      h('h2', {}, f ? f.name : state.folder === 'pinned' ? 'Закреплённые' : state.folder === 'none' ? 'Без папки' : 'Все материалы'),
      f
        ? [
            h('button', { type: 'button', class: 'linkish', onclick: () => renameFolder(f) }, 'Переименовать'),
            h('button', { type: 'button', class: 'linkish danger-link', onclick: () => removeFolder(f) }, 'Удалить папку'),
          ]
        : null,
    );
    const shown = data.items.filter(
      (i) =>
        (state.folder === 'all' || (state.folder === 'pinned' ? i.pinned : state.folder === 'none' ? !i.folderId : String(i.folderId) === state.folder)) &&
        (!state.q || [i.title, i.note, i.file?.name, i.url].filter(Boolean).join(' ').toLowerCase().includes(state.q)),
    );
    if (!shown.length) {
      fill(
        list,
        h(
          'div',
          { class: 'panel empty lib-empty' },
          h('strong', {}, state.q ? 'Ничего не нашлось' : 'Здесь пока пусто'),
          state.q ? 'Попробуйте другое слово.' : 'Нажмите «Загрузить файлы» или перетащите их сюда: регламенты, шаблоны, презентации, договоры, полезные ссылки.',
        ),
      );
      return;
    }
    const folderName = (id) => data.folders.find((x) => x.id === id)?.name;
    fill(
      list,
      h(
        'ul',
        { class: 'lib-items' },
        shown.map((i) => {
          const href = i.kind === 'link' ? i.url : fileUrl(i.file);
          const mine = ctx.me.role === 'admin' || i.addedById === ctx.me.id;
          return h(
            'li',
            { class: `lib-item${i.pinned ? ' pinned' : ''}` },
            badge(i),
            h(
              'div',
              { class: 'lib-body' },
              h('a', { class: 'lib-title', href, target: '_blank', rel: 'noopener noreferrer', ...(i.kind === 'file' && i.file.kind === 'doc' && i.file.mime !== 'application/pdf' ? { download: i.file.name } : {}) }, i.title),
              i.note ? h('p', { class: 'lib-note' }, i.note) : null,
              h(
                'span',
                { class: 'lib-meta muted small' },
                [
                  state.folder === 'all' && i.folderId ? folderName(i.folderId) : null,
                  i.kind === 'link' ? hostOf(i.url) : fileSize(i.file.bytes),
                  i.addedBy,
                  fmtDay(i.createdAt),
                ].filter(Boolean).join(' · '),
              ),
            ),
            h(
              'div',
              { class: 'lib-actions' },
              h('button', { type: 'button', class: `icon-btn lib-pin${i.pinned ? ' on' : ''}`, title: i.pinned ? 'Открепить' : 'Закрепить наверху', 'aria-label': `${i.pinned ? 'Открепить' : 'Закрепить'}: ${i.title}`, 'aria-pressed': String(i.pinned), onclick: () => patch(i, { pinned: !i.pinned }) }, '★'),
              h('button', { type: 'button', class: 'icon-btn', title: 'Изменить', 'aria-label': `Изменить: ${i.title}`, onclick: () => edit(i, mine) }, icon('edit')),
              mine ? h('button', { type: 'button', class: 'icon-btn danger', title: 'Удалить', 'aria-label': `Удалить: ${i.title}`, onclick: () => remove(i) }, icon('trash')) : null,
            ),
          );
        }),
      ),
    );
  }

  const folderSelect = (value) =>
    h('select', { class: 'input', id: 'lib-folder' }, h('option', { value: '' }, 'Без папки'), data.folders.map((f) => h('option', { value: String(f.id), selected: f.id === value }, f.name)));
  const targetFolder = () => (currentFolder() ? currentFolder().id : null);

  async function upload(filesList) {
    if (!filesList.length) return;
    const ids = [];
    progress.hidden = false;
    for (const [n, file] of filesList.entries()) {
      const bar = h('span', { style: 'width:0%' });
      fill(progress, h('span', {}, `Загружаю ${n + 1} из ${filesList.length}: ${file.name}`), h('div', { class: 'parser-bar' }, bar));
      try {
        const f = await uploadFile(file, { original: true, onProgress: (p) => (bar.style.width = `${Math.round(p * 100)}%`) });
        ids.push(f.id);
      } catch (err) {
        toast(`${file.name}: ${err.message}`);
      }
    }
    progress.hidden = true;
    if (!ids.length) return;
    try {
      await api('/admin/api/library/files', { method: 'POST', body: { fileIds: ids, folderId: targetFolder() } });
      toast(ids.length === 1 ? 'Файл добавлен в базу знаний' : `Файлов добавлено: ${ids.length}`);
    } catch (err) {
      toast(err.message);
    }
    load();
  }

  function openLink() {
    const url = h('input', { class: 'input', id: 'lib-url', type: 'url', required: true, maxlength: 1000, placeholder: 'https://…' });
    const title = h('input', { class: 'input', id: 'lib-title', maxlength: 200, placeholder: 'Если пусто — адрес сайта' });
    const note = h('textarea', { class: 'input', id: 'lib-note', rows: 3, maxlength: 1000, placeholder: 'Зачем это и когда пригодится' });
    const folder = folderSelect(targetFolder());
    formDialog({
      title: 'Ссылка в базу знаний',
      submitLabel: 'Добавить',
      body: h(
        'div',
        { class: 'lib-form' },
        h('div', { class: 'field' }, h('label', { for: 'lib-url' }, 'Адрес'), url),
        h('div', { class: 'field' }, h('label', { for: 'lib-title' }, 'Название'), title),
        h('div', { class: 'field' }, h('label', { for: 'lib-note' }, 'Описание'), note),
        h('div', { class: 'field' }, h('label', { for: 'lib-folder' }, 'Папка'), folder),
      ),
      onSubmit: async () => {
        await api('/admin/api/library/links', { method: 'POST', body: { url: url.value, title: title.value, note: note.value, folderId: folder.value ? Number(folder.value) : null } });
        toast('Ссылка добавлена');
        load();
      },
    });
  }

  function edit(i, mine) {
    const title = h('input', { class: 'input', id: 'lib-title', maxlength: 200, value: i.title, disabled: !mine });
    const note = h('textarea', { class: 'input', id: 'lib-note', rows: 3, maxlength: 1000, disabled: !mine }, i.note ?? '');
    const url = i.kind === 'link' ? h('input', { class: 'input', id: 'lib-url', type: 'url', maxlength: 1000, value: i.url, disabled: !mine }) : null;
    const folder = folderSelect(i.folderId);
    formDialog({
      title: i.kind === 'link' ? 'Ссылка' : 'Файл',
      submitLabel: 'Сохранить',
      body: h(
        'div',
        { class: 'lib-form' },
        h('div', { class: 'field' }, h('label', { for: 'lib-title' }, 'Название'), title),
        url ? h('div', { class: 'field' }, h('label', { for: 'lib-url' }, 'Адрес'), url) : null,
        h('div', { class: 'field' }, h('label', { for: 'lib-note' }, 'Описание'), note),
        h('div', { class: 'field' }, h('label', { for: 'lib-folder' }, 'Папка'), folder),
        mine ? null : h('p', { class: 'muted small' }, `Название и описание меняет ${i.addedBy ?? 'тот, кто добавил'} или администратор. Переложить в другую папку можете вы.`),
        i.kind === 'file' ? h('p', { class: 'muted small' }, `Файл: ${i.file.name}, ${fileSize(i.file.bytes)}`) : null,
      ),
      onSubmit: async () => {
        const body = { folderId: folder.value ? Number(folder.value) : null };
        if (mine) Object.assign(body, { title: title.value, note: note.value }, url ? { url: url.value } : {});
        await api(`/admin/api/library/items/${i.id}`, { method: 'PUT', body });
        toast('Сохранено');
        load();
      },
    });
  }

  async function patch(i, body) {
    try {
      await api(`/admin/api/library/items/${i.id}`, { method: 'PUT', body });
      load();
    } catch (err) {
      toast(err.message);
    }
  }

  async function remove(i) {
    if (!(await confirmDialog(`Удалить «${i.title}» из базы знаний?`, { ok: 'Удалить', danger: true }))) return;
    try {
      await api(`/admin/api/library/items/${i.id}`, { method: 'DELETE' });
      toast('Удалено');
      load();
    } catch (err) {
      toast(err.message);
    }
  }

  function newFolder() {
    const name = h('input', { class: 'input', id: 'lib-fname', maxlength: 80, required: true, placeholder: 'Регламенты, Шаблоны, Презентации…' });
    formDialog({
      title: 'Новая папка',
      submitLabel: 'Создать',
      body: h('div', { class: 'field' }, h('label', { for: 'lib-fname' }, 'Название'), name),
      onSubmit: async () => {
        const { folder } = await api('/admin/api/library/folders', { method: 'POST', body: { name: name.value } });
        state.folder = String(folder.id);
        load();
      },
    });
  }

  function renameFolder(f) {
    const name = h('input', { class: 'input', id: 'lib-fname', maxlength: 80, required: true, value: f.name });
    formDialog({
      title: 'Переименовать папку',
      submitLabel: 'Сохранить',
      body: h('div', { class: 'field' }, h('label', { for: 'lib-fname' }, 'Название'), name),
      onSubmit: async () => {
        await api(`/admin/api/library/folders/${f.id}`, { method: 'PUT', body: { name: name.value } });
        load();
      },
    });
  }

  async function removeFolder(f) {
    if (!(await confirmDialog(`Удалить папку «${f.name}»? Файлы и ссылки из неё останутся в базе знаний, без папки.`, { ok: 'Удалить папку', danger: true }))) return;
    await api(`/admin/api/library/folders/${f.id}`, { method: 'DELETE' }).catch((err) => toast(err.message));
    state.folder = 'all';
    load();
  }

  // перетаскивание файлов на страницу
  let depth = 0;
  const hasFiles = (e) => [...(e.dataTransfer?.types ?? [])].includes('Files');
  const onEnter = (e) => {
    if (!hasFiles(e)) return;
    depth++;
    drop.hidden = false;
  };
  const onLeave = () => {
    depth = Math.max(0, depth - 1);
    if (!depth) drop.hidden = true;
  };
  const onOver = (e) => hasFiles(e) && e.preventDefault();
  const onDrop = (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    drop.hidden = true;
    upload([...e.dataTransfer.files]);
  };
  document.addEventListener('dragenter', onEnter);
  document.addEventListener('dragleave', onLeave);
  document.addEventListener('dragover', onOver);
  document.addEventListener('drop', onDrop);
  // ушли со страницы — снимаем обработчики
  const stop = new MutationObserver(() => {
    if (main.isConnected) return;
    stop.disconnect();
    document.removeEventListener('dragenter', onEnter);
    document.removeEventListener('dragleave', onLeave);
    document.removeEventListener('dragover', onOver);
    document.removeEventListener('drop', onDrop);
  });
  stop.observe(app, { childList: true });

  await load();
}
