// HTTP API для виджета на сайте + раздача самого widget.js.

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { resolve } from 'node:path';
import { AnswerError, SessionError } from '../core/qualifier.js';
import { adminRoutes } from '../admin/routes.js';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid', 'gclid'];

const metaSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    page: { type: 'string', maxLength: 500 },
    referrer: { type: 'string', maxLength: 500 },
    // Тестовый опрос (ссылка из админки): лид помечается и не уходит менеджерам
    test: { type: 'boolean' },
    utm: {
      type: 'object',
      additionalProperties: false,
      properties: Object.fromEntries(UTM_KEYS.map((k) => [k, { type: 'string', maxLength: 200 }])),
    },
  },
};

const answerSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    stepId: { type: 'string', maxLength: 64 },
    value: { type: 'string', maxLength: 2000 },
    skip: { type: 'boolean' },
    // «Оставить контакт» на любом шаге диалога с ИИ
    action: { type: 'string', enum: ['contact'] },
  },
};

const short = (n) => ({ type: 'string', maxLength: n });
const briefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['answers', 'consent'],
  properties: {
    company: short(200),
    contactName: short(200),
    phone: short(40),
    email: short(200),
    page: short(500),
    consent: { type: 'boolean' },
    website: short(200),
    answers: {
      type: 'array',
      maxItems: 60,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['q', 'a'],
        properties: { section: short(200), q: short(300), a: short(3000) },
      },
    },
  },
};

const sessionParams = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', format: 'uuid' } },
};

/** admin — зависимости админки ({ auth, reports, db, scenarioSource }); без них админка не подключается. */
export async function buildServer({ config, qualifier, logger, admin, brand = null, briefs = null }) {
  const app = Fastify({
    ...(logger ? { loggerInstance: logger } : { logger: false }),
    trustProxy: config.trustProxy,
    bodyLimit: 16 * 1024,
  });

  // Пустой список — разрешены все источники (удобно при разработке).
  // Бриф отправляет основной сайт (marketing-studio.pro): для /api/briefs разрешены и его адреса.
  const origins = config.allowedOrigins.length ? config.allowedOrigins : true;
  const briefOrigins = origins === true ? true : [...origins, ...(config.briefOrigins ?? [])];
  await app.register(cors, {
    delegator: (req, cb) => cb(null, {
      origin: req.url.split('?')[0] === '/api/briefs' ? briefOrigins : origins,
      methods: ['GET', 'POST'],
      allowedHeaders: ['content-type', 'x-session-token'],
      maxAge: 86400,
    }),
  });
  // Лимит запросов: для посетителей сайта — по IP; для сотрудников в кабинете — по сессии и выше:
  // в офисе все выходят в интернет с одного адреса, а мессенджер и уведомления опрашивают сервер.
  const session = (req) => /(?:^|;\s*)kval_admin=([^;]+)/.exec(req.headers.cookie ?? '')?.[1] ?? null;
  await app.register(rateLimit, {
    timeWindow: '1 minute',
    keyGenerator: (req) => {
      const s = req.url.startsWith('/admin/') ? session(req) : null;
      return s ? `staff:${s.slice(0, 32)}` : req.ip;
    },
    max: (req, key) => (key.startsWith('staff:') ? 900 : 120),
  });
  // виджет и демо квалификатора раздаются, только если квалификатор включён
  if (config.leadsEnabled !== false) await app.register(fastifyStatic, {
    root: resolve(config.root, 'widget'),
    prefix: '/',
    index: false,
    // без долгого кэша: браузер каждый раз сверяет widget.js с сервером (ответ 304, если не менялся) —
    // обновления виджета на сайте видны сразу, а не через час
    maxAge: 0,
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof SessionError) return reply.code(404).send({ error: err.message });
    if (err.validation) return reply.code(400).send({ error: 'Некорректный запрос' });
    if (err.statusCode && err.statusCode < 500) return reply.code(err.statusCode).send({ error: err.message });
    req.log.error({ err }, 'Ошибка обработки запроса');
    return reply.code(500).send({ error: 'Что-то пошло не так. Попробуйте ещё раз.' });
  });

  app.get('/health', async () => ({ ok: true }));

  // Корень домена ведёт в рабочее место (виджет живёт по прямым ссылкам на файлы)
  app.get('/', (req, reply) => reply.redirect(admin || config.leadsEnabled === false ? '/admin/' : '/demo.html'));

  // Утверждённый логотип для виджета и документов (файл проверен по sha256 при загрузке бренда)
  app.get('/brand/logo/:variant', async (req, reply) => {
    const asset = brand?.logo?.[req.params.variant];
    if (!asset || !['onLight', 'onDark', 'mark'].includes(req.params.variant)) return reply.code(404).send({ error: 'Логотип не загружен' });
    return reply
      .header('content-type', asset.mime)
      .header('cache-control', 'public, max-age=3600')
      .header('access-control-allow-origin', '*')
      .header('content-security-policy', "default-src 'none'; style-src 'unsafe-inline'")
      .send(asset.data);
  });

  const handoffLinks = (session) => ({
    telegram: config.telegram.botUsername
      ? `https://t.me/${config.telegram.botUsername}?start=${session.handoff_code}`
      : null,
    max: config.max.botUsername ? `https://max.ru/${config.max.botUsername}?start=${session.handoff_code}` : null,
  });

  // API диалога квалификатора (виджет на сайте) — только если он включён
  if (config.leadsEnabled !== false) {
    app.post(
      '/api/sessions',
      {
        schema: { body: { type: 'object', additionalProperties: false, properties: { meta: metaSchema } } },
        config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      },
      async (req) => {
        const { session, reply } = qualifier.startSession({ channel: 'web', meta: req.body?.meta ?? {} });
        return {
          sessionId: session.id,
          token: session.token,
          privacyPolicyUrl: config.privacyPolicyUrl,
          handoff: handoffLinks(session),
          reply,
        };
      },
    );

    app.get('/api/sessions/:id', { schema: { params: sessionParams } }, async (req) => {
      const session = qualifier.getSession(req.params.id, tokenOf(req));
      return {
        privacyPolicyUrl: config.privacyPolicyUrl,
        handoff: session.status === 'active' ? handoffLinks(session) : null,
        reply: qualifier.resume(session),
      };
    });

    app.post(
      '/api/sessions/:id/answer',
      { schema: { params: sessionParams, body: answerSchema } },
      async (req, res) => {
        const session = qualifier.getSession(req.params.id, tokenOf(req));
        try {
          return { reply: await qualifier.answer(session.id, req.body) };
        } catch (err) {
          if (!(err instanceof AnswerError)) throw err;
          const fresh = qualifier.getSession(session.id);
          return res.code(422).send({ error: err.message, reply: qualifier.resume(fresh) });
        }
      },
    );
  }

  // Бриф на рекламу со страницы сайта /brif/ — ответы попадают в раздел «Брифы» кабинета
  if (briefs) {
    app.post(
      '/api/briefs',
      {
        bodyLimit: 64 * 1024,
        schema: { body: briefSchema },
        config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      },
      async (req, reply) => {
        // скрытое поле «website» заполняют только боты: делаем вид, что всё прошло
        if (req.body.website) return { ok: true };
        if (!req.body.consent) return reply.code(400).send({ error: 'Нужно согласие на обработку персональных данных' });
        if (!req.body.phone?.trim() && !req.body.email?.trim()) return reply.code(400).send({ error: 'Укажите телефон или почту для связи' });
        briefs.add(req.body);
        return { ok: true };
      },
    );
  }

  if (admin) {
    await app.register(adminRoutes, { config, ...admin });
    app.get('/admin', (req, reply) => reply.redirect('/admin/'));
  }

  return app;
}

function tokenOf(req) {
  const token = req.headers['x-session-token'];
  if (typeof token !== 'string' || !token) throw new SessionError('Сессия не найдена');
  return token;
}
