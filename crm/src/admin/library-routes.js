// Раздел «База знаний»: папки, файлы и ссылки команды.

import { LibraryError } from '../library/store.js';

const idParams = { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } };
const folderRef = { type: ['integer', 'null'] };

export async function libraryRoutes(api, { library, files }) {
  api.setErrorHandler((err, req, reply) => {
    if (err instanceof LibraryError) return reply.code(400).send({ error: err.message });
    throw err;
  });

  api.get('/admin/api/library', async () => library.list());

  api.post('/admin/api/library/folders', { schema: { body: { type: 'object', required: ['name'], additionalProperties: false, properties: { name: { type: 'string', maxLength: 80 } } } } }, async (req) => ({
    folder: library.createFolder(req.body.name, req.user),
  }));
  api.put('/admin/api/library/folders/:id', { schema: { params: idParams, body: { type: 'object', required: ['name'], additionalProperties: false, properties: { name: { type: 'string', maxLength: 80 } } } } }, async (req) => {
    library.renameFolder(req.params.id, req.body.name);
    return { ok: true };
  });
  api.delete('/admin/api/library/folders/:id', { schema: { params: idParams } }, async (req) => {
    library.removeFolder(req.params.id);
    return { ok: true };
  });

  api.post(
    '/admin/api/library/files',
    { schema: { body: { type: 'object', required: ['fileIds'], additionalProperties: false, properties: { fileIds: { type: 'array', minItems: 1, maxItems: 50, items: { type: 'integer' } }, folderId: folderRef, note: { type: 'string', maxLength: 1000 } } } } },
    async (req) => ({ items: library.addFiles(req.body, req.user) }),
  );
  api.post(
    '/admin/api/library/links',
    { schema: { body: { type: 'object', required: ['url'], additionalProperties: false, properties: { url: { type: 'string', maxLength: 1000 }, title: { type: 'string', maxLength: 200 }, note: { type: 'string', maxLength: 1000 }, folderId: folderRef } } } },
    async (req) => ({ item: library.addLink(req.body, req.user) }),
  );
  api.put(
    '/admin/api/library/items/:id',
    { schema: { params: idParams, body: { type: 'object', additionalProperties: false, properties: { title: { type: 'string', maxLength: 200 }, note: { type: 'string', maxLength: 1000 }, url: { type: 'string', maxLength: 1000 }, folderId: folderRef, pinned: { type: 'boolean' } } } } },
    async (req) => ({ item: library.update(req.params.id, req.body, req.user) }),
  );
  api.delete('/admin/api/library/items/:id', { schema: { params: idParams } }, async (req) => {
    const fileId = library.remove(req.params.id, req.user);
    if (fileId) files?.removeIfUnused(fileId);
    return { ok: true };
  });
}
