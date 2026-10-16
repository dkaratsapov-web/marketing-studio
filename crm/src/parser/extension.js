// Архив расширения «Корпорация: в CRM» для сотрудника: адрес кабинета и его личный ключ уже внутри.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zip } from './zip.js';

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../extension');
export const EXT_VERSION = '1.0.0';

export function extensionZip({ base, token }) {
  const origin = new URL(base).origin;
  const manifest = {
    manifest_version: 3,
    name: 'Корпорация: в CRM',
    version: EXT_VERSION,
    description: 'Кнопка «В CRM» на Яндекс Картах и 2ГИС: открытая карточка организации — в список в кабинете Корпорации.',
    permissions: ['storage'],
    host_permissions: [`${origin}/*`],
    background: { service_worker: 'background.js' },
    content_scripts: [
      {
        matches: ['https://yandex.ru/maps/*', 'https://yandex.com/maps/*', 'https://yandex.by/maps/*', 'https://yandex.kz/maps/*', 'https://2gis.ru/*'],
        js: ['content.js'],
        run_at: 'document_idle',
      },
    ],
  };
  return zip([
    { name: 'korp-crm/manifest.json', data: JSON.stringify(manifest, null, 2) },
    { name: 'korp-crm/config.js', data: `// Адрес кабинета и личный ключ сотрудника. Ключ можно отозвать в кабинете: «Парсер» → «Кнопка для карт».\nself.KORP = ${JSON.stringify({ base: origin, token })};\n` },
    { name: 'korp-crm/background.js', data: readFileSync(resolve(DIR, 'background.js')) },
    { name: 'korp-crm/content.js', data: readFileSync(resolve(DIR, 'content.js')) },
  ]);
}
