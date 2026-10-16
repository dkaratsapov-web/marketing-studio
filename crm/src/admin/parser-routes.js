// Раздел «Парсер»: сборы компаний из открытых карт, ключи источников, выгрузка в CSV.

import { ParserError } from '../parser/store.js';

const idParams = { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } };
const sourceParams = { type: 'object', required: ['source'], properties: { source: { type: 'string', maxLength: 20 } } };

export async function parserRoutes(api, { parser }) {
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
    { preHandler: adminOnly, config: { rateLimit: { max: 10, timeWindow: '1 minute' } }, schema: { params: sourceParams, body: { type: 'object', additionalProperties: false, required: ['key'], properties: { key: { type: 'string', maxLength: 300 } } } } },
    async (req) => ({ source: await parser.setKey(req.params.source, req.body.key, req.user) }),
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
}
