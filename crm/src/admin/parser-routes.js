// Раздел «Парсер»: сборы компаний из открытых карт, ключи источников, выгрузка в CSV.

import { ParserError } from '../parser/store.js';
import { extensionZip } from '../parser/extension.js';

const idParams = { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } };
const sourceParams = { type: 'object', required: ['source'], properties: { source: { type: 'string', maxLength: 20 } } };

export async function parserRoutes(api, { parser, config }) {
  api.setErrorHandler((err, req, reply) => {
    if (err instanceof ParserError) return reply.code(400).send({ error: err.message });
    throw err;
  });

  api.get('/admin/api/parser/sources', async () => ({ sources: parser.sources() }));

  // ключи источников задаёт администратор; обратно — только последние 4 символа
  const adminOnly = async (req, reply) => {
    if (req.user.role !== 'admin') return reply.code(403).send({ error: 'Ключи источников подключает администратор' });
  };
  api.put(
    '/admin/api/parser/sources/:source/key',
    { preHandler: adminOnly, config: { rateLimit: { max: 10, timeWindow: '1 minute' } }, schema: { params: sourceParams, body: { type: 'object', additionalProperties: false, required: ['key'], properties: { key: { type: 'string', maxLength: 300 }, folderId: { type: ['string', 'null'], maxLength: 60 } } } } },
    async (req) => ({ source: await parser.setKey(req.params.source, req.body.key, req.user, req.body.folderId) }),
  );
  api.delete('/admin/api/parser/sources/:source/key', { preHandler: adminOnly, schema: { params: sourceParams } }, async (req) => ({ source: parser.clearKey(req.params.source) }));

  api.get('/admin/api/parser/jobs', async () => ({ jobs: parser.list() }));
  api.post(
    '/admin/api/parser/jobs',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['query', 'geo', 'sources'],
          properties: {
            query: { type: 'string', maxLength: 200 },
            geo: { type: 'string', maxLength: 200 },
            sources: { type: 'array', maxItems: 10, items: { type: 'string', maxLength: 20 } },
            perSource: { type: 'integer', minimum: 1, maximum: 1000 },
            enrich: { type: 'boolean' },
            filters: {
              type: 'object',
              additionalProperties: false,
              properties: Object.fromEntries(['phone', 'site', 'email', 'social'].map((k) => [k, { type: ['string', 'null'], enum: ['yes', 'no', null] }])),
            },
          },
        },
      },
    },
    async (req) => ({ job: parser.create(req.body, req.user) }),
  );
  api.get('/admin/api/parser/jobs/:id', { schema: { params: idParams } }, async (req, reply) => {
    const job = parser.job(req.params.id);
    if (!job) return reply.code(404).send({ error: 'Сбор не найден' });
    return { job, places: job.status === 'done' || job.status === 'error' ? parser.places(req.params.id) : [] };
  });
  api.delete('/admin/api/parser/jobs/:id', { schema: { params: idParams } }, async (req) => {
    parser.remove(req.params.id);
    return { ok: true };
  });
  api.get('/admin/api/parser/jobs/:id/csv', { schema: { params: idParams } }, async (req, reply) => {
    const { name, body } = parser.csv(req.params.id);
    return reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', `attachment; filename="parser.csv"; filename*=UTF-8''${encodeURIComponent(name)}.csv`)
      .header('cache-control', 'no-store')
      .send(body);
  });

  // ---------- расширение «В CRM»: архив с личным ключом, ключи сотрудника ----------
  api.get('/admin/api/parser/extension', async (req) => ({ tokens: parser.tokens(req.user), lists: parser.lists() }));
  api.post('/admin/api/parser/extension', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    const base = config.publicUrl || `${req.protocol}://${req.headers.host}`;
    const body = extensionZip({ base, token: parser.issueToken(req.user) });
    return reply.header('content-type', 'application/zip').header('content-disposition', 'attachment; filename="korp-crm.zip"').header('cache-control', 'no-store').send(body);
  });
  api.delete('/admin/api/parser/extension/tokens/:id', { schema: { params: idParams } }, async (req) => {
    parser.revokeToken(req.params.id, req.user);
    return { ok: true };
  });
}

/** Запросы расширения: вход по личному ключу сотрудника (Authorization: Bearer korp_…), без сессии кабинета. */
export async function parserExtRoutes(app, { parser }) {
  app.addHook('onRequest', async (req, reply) => {
    const m = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? '');
    req.user = m ? parser.userByToken(m[1]) : null;
    if (!req.user) return reply.code(401).send({ error: 'Ключ расширения не подходит' });
  });
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ParserError) return reply.code(400).send({ error: err.message });
    throw err;
  });
  app.get('/ext/api/me', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req) => ({ user: { name: req.user.name }, lists: parser.lists() }));
  const str = (n) => ({ type: ['string', 'null'], maxLength: n });
  app.post(
    '/ext/api/places',
    {
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['place'],
          properties: {
            listId: { type: ['integer', 'null'] },
            listName: str(120),
            place: {
              type: 'object',
              properties: {
                source: str(10), orgId: str(40), link: str(500), name: str(200), category: str(200), address: str(300), website: str(300), hours: str(300),
                phones: { type: 'array', maxItems: 20, items: { type: 'string', maxLength: 40 } },
                emails: { type: 'array', maxItems: 20, items: { type: 'string', maxLength: 120 } },
                socials: { type: 'object', additionalProperties: { type: 'string', maxLength: 300 } },
                rating: { type: ['number', 'null'] }, reviews: { type: ['number', 'null'] }, lat: { type: ['number', 'null'] }, lon: { type: ['number', 'null'] },
              },
            },
          },
        },
      },
    },
    async (req) => parser.addManual(req.body, req.user),
  );
}
