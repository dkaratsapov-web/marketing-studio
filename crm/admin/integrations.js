// «Подключения» (только администратор): что работает на сервере и как подключить остальное.
// Ключи хранятся в .env на сервере — здесь только «подключено / нет» и шаги.

import { h, api, app, shell, navigate, ctx, sectionAllowed } from './admin.js';
import { fill } from './docs.js';

const ENV = 'nano /opt/korp-cabinet/.env';
const APPLY = '/usr/local/sbin/korp-cabinet-update main';

export async function renderIntegrations() {
  if (ctx.me.role !== 'admin') return navigate('docs');
  const grid = h('div', { class: 'integrations' }, h('p', { class: 'muted' }, 'Проверяю…'));
  fill(
    app,
    shell('integrations', [
      h('div', { class: 'page-head' }, h('h1', {}, 'Подключения')),
      h('p', { class: 'lead-text' }, `Ключи вписываются на сервере в файл .env (${ENV}), затем: ${APPLY}. Пока сервис не подключён, кнопки в разделах подсказывают, что нужно сделать.`),
      grid,
    ]),
  );
  let s;
  try {
    s = await api('/admin/api/integrations');
  } catch (err) {
    if (err.status !== 401) fill(grid, h('p', { class: 'error' }, err.message));
    return;
  }
  const card = (title, ok, status, what, steps) =>
    h(
      'section',
      { class: `panel integration${ok ? ' on' : ''}` },
      h('div', { class: 'integration-head' }, h('h2', {}, title), h('span', { class: `status`, dataset: { s: ok ? 'won' : 'lost' } }, ok ? 'Подключено' : 'Не подключено')),
      h('p', { class: 'muted' }, what),
      status ? h('p', { class: 'integration-state' }, status) : null,
      !ok && steps ? h('ol', { class: 'steps' }, steps.map((st) => h('li', {}, st))) : null,
    );
  const code = (t) => h('code', {}, t);
  fill(
    grid,
    card(
      'ИИ-помощник',
      s.ai.enabled,
      s.ai.enabled ? `${s.ai.provider === 'yandexgpt' ? 'YandexGPT' : 'Claude'}, модель ${s.ai.model}` : null,
      'Черновики презентаций по брифу и правка слайдов. Данные клиентов в модель не уходят.',
      [
        ['В ', h('a', { href: 'https://console.yandex.cloud', target: '_blank', rel: 'noopener' }, 'Yandex Cloud'), ' создайте каталог и сервисный аккаунт с ролью ', code('ai.languageModels.user'), '.'],
        'Создайте для аккаунта API-ключ.',
        ['Впишите в .env: ', code('YANDEX_GPT_API_KEY=…'), ' и ', code('YANDEX_GPT_FOLDER_ID=…'), ' (id каталога).'],
        ['Примените: ', code(APPLY), '.'],
      ],
    ),
    card(
      'Поиск в интернете для ассистента',
      s.search,
      s.search ? 'Yandex Search API' : null,
      'Ассистент ищет свежие сведения — требования площадок, новости, данные о компаниях — и отвечает со ссылками на источники.',
      [
        ['В Yandex Cloud сервисному аккаунту YandexGPT добавьте роль ', code('search-api.webSearch.user'), ' — тот же ключ подойдёт и для поиска.'],
        ['Или впишите отдельные ', code('YANDEX_SEARCH_API_KEY=…'), ' и ', code('YANDEX_SEARCH_FOLDER_ID=…'), '.'],
        ['Примените: ', code(APPLY), '.'],
      ],
    ),
    card(
      'Яндекс Телемост',
      s.telemost,
      null,
      'Ссылка на видеовстречу кнопкой в календаре. API доступен организациям Яндекс 360 для бизнеса.',
      [
        ['На ', h('a', { href: 'https://oauth.yandex.ru/client/new', target: '_blank', rel: 'noopener' }, 'oauth.yandex.ru'), ' создайте приложение с правами Директа и Метрики; в Директе подайте заявку на доступ к API.'],
        ['Токен вставьте в разделе ', h('a', { href: '#/adstats' }, '«Статистика»'), ': кабинет проверит его и сохранит, на сервере ничего прописывать не нужно.'],
      ],
    ),
    card(
      'PDF и проверка перед выгрузкой',
      s.pdf,
      s.pdf ? 'Chromium на сервере есть' : null,
      'Проверка вёрстки и выгрузка PDF работают через встроенный браузер на сервере.',
      [['Обновите сервер: ', code(APPLY), ' — Chromium ставится в образ автоматически.']],
    ),
  );
}
