// API раздела «Брифы»: анкеты клиентов с marketing-studio.pro/brif/.
// Смотрят все сотрудники, удаляет администратор.

import { BRIEF_STATUSES } from '../crm/briefs.js';

const idParams = { type: 'object', properties: { id: { type: 'integer' } } };

export async function briefsRoutes(api, { briefs }) {
  api.get('/admin/api/briefs', async () => ({ briefs: briefs.list(), statuses: BRIEF_STATUSES }));

  api.get('/admin/api/briefs/:id', { schema: { params: idParams } }, async (req, reply) => {
    const brief = briefs.get(req.params.id);
    if (!brief) return reply.code(404).send({ error: 'Бриф не найден' });
    return { brief, statuses: BRIEF_STATUSES };
  });

  api.patch(
    '/admin/api/briefs/:id',
    {
      schema: {
        params: idParams,
        body: { type: 'object', additionalProperties: false, required: ['status'], properties: { status: { type: 'string', enum: Object.keys(BRIEF_STATUSES) } } },
      },
    },
    async (req, reply) => {
      if (!briefs.setStatus(req.params.id, req.body.status)) return reply.code(404).send({ error: 'Бриф не найден' });
      return { ok: true };
    },
  );

  api.delete('/admin/api/briefs/:id', { schema: { params: idParams } }, async (req, reply) => {
    if (req.user.role !== 'admin') return reply.code(403).send({ error: 'Удалить бриф может администратор' });
    if (!briefs.remove(req.params.id)) return reply.code(404).send({ error: 'Бриф не найден' });
    return { ok: true };
  });
}
