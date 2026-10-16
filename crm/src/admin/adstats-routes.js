// Раздел «Статистика»: сводка по клиентам из Яндекс Директа и Метрики, динамика клиента, настройки подключения.

import { AdStatsError } from '../adstats/store.js';

const idParams = { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } };
const periodQuery = {
  type: 'object',
  properties: { from: { type: 'string', maxLength: 10 }, to: { type: 'string', maxLength: 10 }, agency: { type: 'string', enum: ['korp', 'soroka'] } },
};

export async function adStatsRoutes(api, { adstats }) {
  api.setErrorHandler((err, req, reply) => {
    if (err instanceof AdStatsError) return reply.code(400).send({ error: err.message });
    throw err;
  });

  api.get('/admin/api/ad-stats', { schema: { querystring: periodQuery } }, async (req) => adstats.overview(req.query));

  // Токен Яндекса задаёт администратор; обратно отдаются только признак и последние 4 символа
  const adminOnly = async (req, reply) => {
    if (req.user.role !== 'admin') return reply.code(403).send({ error: 'Токен Яндекса подключает администратор' });
  };
  api.get('/admin/api/ad-stats/token', { preHandler: adminOnly }, async () => ({ token: adstats.tokenInfo() }));
  api.put(
    '/admin/api/ad-stats/token',
    { preHandler: adminOnly, config: { rateLimit: { max: 10, timeWindow: '1 minute' } }, schema: { body: { type: 'object', additionalProperties: false, required: ['token'], properties: { token: { type: 'string', maxLength: 400 } } } } },
    async (req) => {
      const token = await adstats.setToken(req.body.token, req.user);
      // сразу подтягиваем цифры подключённых клиентов, не дожидаясь фоновой загрузки
      adstats.syncAll().catch(() => {});
      return { token };
    },
  );
  api.delete('/admin/api/ad-stats/token', { preHandler: adminOnly }, async () => ({ token: adstats.clearToken() }));

  api.get('/admin/api/ad-stats/clients/:id', { schema: { params: idParams, querystring: periodQuery } }, async (req) => adstats.clientStats(req.params.id, req.query));

  api.put(
    '/admin/api/ad-stats/clients/:id/account',
    {
      schema: {
        params: idParams,
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            directEnabled: { type: 'boolean' },
            directLogin: { type: ['string', 'null'], maxLength: 100 },
            metrikaCounter: { type: ['string', 'null'], maxLength: 20 },
            goals: { type: ['string', 'null'], maxLength: 400 },
            // свой токен клиента: пустой — не менять, clearToken — убрать
            token: { type: ['string', 'null'], maxLength: 400 },
            clearToken: { type: 'boolean' },
          },
        },
      },
    },
    async (req) => {
      const account = adstats.saveAccount(req.params.id, req.body);
      // после подключения сразу грузим историю, если токен есть; ошибка видна в ответе и в сводке
      const sync = (account.own_token || adstats.hasToken()) && (account.direct_enabled || account.metrika_counter) ? await adstats.syncClient(req.params.id).catch((err) => ({ ok: false, errors: [err.message] })) : null;
      return { account: adstats.account(req.params.id), sync };
    },
  );

  api.get('/admin/api/ad-stats/slices', async () => ({ slices: adstats.sliceCatalog() }));
  api.get(
    '/admin/api/ad-stats/clients/:id/slices/:slice',
    { schema: { params: { type: 'object', required: ['id', 'slice'], properties: { id: { type: 'integer' }, slice: { type: 'string', maxLength: 30 } } }, querystring: { ...periodQuery, properties: { ...periodQuery.properties, refresh: { type: 'boolean' } } } } },
    async (req) => adstats.slice(req.params.id, req.params.slice, req.query),
  );

  api.put('/admin/api/ad-stats/clients/:id/hidden', { schema: { params: idParams, body: { type: 'object', required: ['hidden'], additionalProperties: false, properties: { hidden: { type: 'boolean' } } } } }, async (req) => {
    adstats.setHidden(req.params.id, req.body.hidden);
    return { ok: true };
  });

  api.post('/admin/api/ad-stats/clients/:id/sync', { schema: { params: idParams } }, async (req) => ({ sync: await adstats.syncClient(req.params.id) }));

  api.post('/admin/api/ad-stats/sync', { config: { rateLimit: { max: 6, timeWindow: '1 minute' } } }, async () => ({ sync: await adstats.syncAll() }));

  // POST, а не GET: токен из формы не должен попадать в адрес запроса и журналы
  api.post(
    '/admin/api/ad-stats/goals',
    { schema: { body: { type: 'object', additionalProperties: false, required: ['counter'], properties: { counter: { type: 'string', maxLength: 20 }, clientId: { type: ['integer', 'null'] }, token: { type: ['string', 'null'], maxLength: 400 } } } } },
    async (req) => ({ goals: await adstats.goalsFor(req.body.counter, { clientId: req.body.clientId, token: req.body.token }) }),
  );
}
