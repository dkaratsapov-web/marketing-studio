// «Заявки с сайта»: список для сотрудников и подключение Telegram (только администратор).
// Токен бота принимается, проверяется в Telegram и сохраняется; обратно отдаются только имя бота и 4 последних символа.

import { SiteLeadError, SITE_LEAD_SOURCES } from '../crm/site-leads.js';

const idParams = { type: 'object', properties: { id: { type: 'integer' } } };

export async function siteLeadsRoutes(api, { siteLeads }) {
  const adminOnly = async (req, reply) => {
    if (req.user.role !== 'admin') return reply.code(403).send({ error: 'Telegram для заявок подключает администратор' });
  };
  api.setErrorHandler((err, req, reply) => {
    if (err instanceof SiteLeadError) return reply.code(400).send({ error: err.message });
    throw err;
  });

  api.get('/admin/api/site-leads', async () => ({ leads: siteLeads.list(), sources: SITE_LEAD_SOURCES, telegram: siteLeads.info() }));
  api.delete('/admin/api/site-leads/:id', { preHandler: adminOnly, schema: { params: idParams } }, async (req, reply) => {
    if (!siteLeads.remove(req.params.id)) return reply.code(404).send({ error: 'Заявка не найдена' });
    return { ok: true };
  });

  const limit = { rateLimit: { max: 10, timeWindow: '1 minute' } };
  api.get('/admin/api/site-leads/telegram', { preHandler: adminOnly }, async () => ({ telegram: siteLeads.info() }));
  api.put(
    '/admin/api/site-leads/telegram',
    { preHandler: adminOnly, config: limit, schema: { body: { type: 'object', additionalProperties: false, required: ['token'], properties: { token: { type: 'string', maxLength: 200 } } } } },
    async (req) => ({ telegram: await siteLeads.setToken(req.body.token, req.user) }),
  );
  api.delete('/admin/api/site-leads/telegram', { preHandler: adminOnly }, async () => ({ telegram: siteLeads.clearToken() }));
  api.post('/admin/api/site-leads/telegram/chats', { preHandler: adminOnly, config: limit }, async () => ({ chats: await siteLeads.findChats() }));
  api.put(
    '/admin/api/site-leads/telegram/chat',
    { preHandler: adminOnly, config: limit, schema: { body: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string', maxLength: 30 }, title: { type: 'string', maxLength: 200 } } } } },
    async (req) => ({ telegram: await siteLeads.setChat(req.body.id, req.body.title, req.user) }),
  );
  api.post('/admin/api/site-leads/telegram/test', { preHandler: adminOnly, config: limit }, async () => ({ telegram: await siteLeads.test() }));
}
