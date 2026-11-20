# Справочник проекта «Корпорация»

Всё, что нужно знать, чтобы продолжить работу в новой сессии: где что лежит, как выкладывать и проверять,
какие решения принял владелец. Правила из `CLAUDE.md` (разделение с Сорокой, статистика рекламы) главнее этого файла.

Репозиторий приватный (с 20.11.2026). Ключей, токенов и паролей здесь всё равно нет и не должно быть: они только в `.env` на сервере и в кабинете.

## Что где

| | |
|---|---|
| Сайт | https://marketing-studio.pro, статика Next.js из `out/`, nginx на 194.67.101.183, папка `/var/www/marketing-studio` |
| Кабинет (CRM) | https://crm.marketing-studio.pro, папка `crm/`, контейнер `korp-cabinet-app-1`, порт 127.0.0.1:3101, подробности в `crm/README.md` |
| Проверка ветки | `.github/workflows/check.yml`: lint, типы и сборка рабочей ветки. Копии на GitHub Pages больше нет: у приватного репозитория они выключены |
| Рабочая ветка | `claude/exciting-noether-voueh3`, в `main` вливается fast-forward |
| Скрипты сервера | `deploy/`: `setup-crm.sh` ставит кабинет, `crm-update.sh` → `korp-cabinet-update` обновляет, `relay/` — ретранслятор Telegram |

## Выкладка

Пуш в `main` запускает `.github/workflows/vps.yml`: `npm ci`, lint, build, `rsync out/` на сервер, обновление
кабинета (`korp-cabinet-update <sha> <tree-hash crm>`), smoke-тест сайта, robots, sitemap и `/health` кабинета.

```bash
B=claude/exciting-noether-voueh3
git push -q -u origin $B && git fetch -q origin main && git checkout -q main \
  && git merge -q --ff-only origin/main && git merge -q --ff-only $B && git push -q origin main && git checkout -q $B
gh run list -R dkaratsapov-web/marketing-studio -w vps.yml -L 1   # дождаться success
```

### Приватный репозиторий: что важно

- Минуты GitHub Actions у приватного репозитория платные сверх бесплатного лимита аккаунта. Если задачи падают
  без запуска с сообщением «recent account payments have failed or your spending limit needs to be increased» —
  выкладки нет, чинится в настройках GitHub: Settings → Billing and plans (способ оплаты или лимит расходов на Actions).
- Сервер больше не может скачать код с GitHub без ключа. Поэтому `vps.yml` сам отправляет папку `crm/` архивом в
  `~/korp-cabinet/src.tgz` пользователя деплоя, а `korp-cabinet-update` берёт код оттуда. Новый скрипт обновления
  деплой кладёт в `~/crm-update.sh`; поставить его под root нужно один раз вручную:
  `sudo install -m 755 -o root -g root ~deploy/crm-update.sh /usr/local/sbin/korp-cabinet-update`
  (вместо `deploy` — пользователь из секрета `VPS_USER`). До этого кабинет обновится, только если папка `crm/` не менялась.
- `deploy/setup-crm.sh` для новой установки скачивает файлы с raw.githubusercontent.com — у приватного репозитория
  это не сработает, скрипты на сервер надо положить вручную.

Перед выкладкой обязательно: `npm run lint`, `npx tsc --noEmit -p .`, `npm run build`; при правках кабинета —
`cd crm && npm test` (сейчас 318 тестов).

## Проверка у себя

- Сборка: `for i in 1 2; do npm run build && break; done` — Next иногда падает с SecurityFatalError с первого раза.
- Статика: `(cd out && python3 -m http.server 3000)`.
- Режим разработки `next dev` открывать по **localhost**, не 127.0.0.1: с 127.0.0.1 Next блокирует свои скрипты, и страница не оживает.
- WebGL в безголовом Chromium: `chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })`.
- Плашку cookie убрать на скриншотах: `localStorage.setItem('cookie-consent', JSON.stringify({ v: 'necessary', t: Date.now() }))` в `addInitScript`.
- Скриншоты любой страницы: `node scripts/shot.mjs <адрес> [папка] [--full] [--mobile|--desktop]` — компьютер 1440 и iPhone 13, статус, заголовок, ошибки.
- Моушн-ревью: `scripts/motion-review.mjs` и `scripts/motion-sheet.py` (см. README).

### Облачная среда Claude

Сеть ограничена списком адресов. Для этого репозитория создана среда «marketing-studio»: открыты сайт, кабинет,
Higgsfield и GitHub. Не открыты Яндекс Метрика (`mc.yandex.ru`) и сайты клиентов, например каркаскомфорт.рф
(добавить не удалось). Часть подключений к marketing-studio.pro из облака обрывается при TLS (сброс сразу после
ClientHello) — перед выводом «сайт упал» повторить запрос несколько раз.

Временные файлы сессии (scratchpad) пропадают при смене контейнера. Всё ценное — в репозиторий или пользователю файлом.

## Формы и заявки

- Все формы шлют `submitLead` (`src/lib/lead.ts`) на `POST {CRM}/api/lead`. Источники: `hero`, `protocol`, `brief`, `service`, `estimate`, `audit`.
  Новый источник добавлять и в тип `Lead["source"]`, и в `SITE_LEAD_SOURCES` (`crm/src/crm/site-leads.js`), иначе кабинет ответит «Неизвестная форма».
- В заявке: страница, первая страница визита, источник перехода, UTM, ClientID Метрики, экран, часовой пояс, язык, IP, город по IP, устройство.
- Город по IP — база DB-IP City Lite (CC BY 4.0) на сервере, `data/geo/`, обновляется раз в месяц самим кабинетом.
- После успешной отправки — `/spasibo/?form=…&back=…`, через 3 секунды возврат на страницу заявки (только свой путь, `location.replace`).
- Копия заявки уходит в Telegram-группу. Хостинг не пускает к Telegram, поэтому запросы идут через Cloudflare Worker
  (`deploy/relay/worker.js`). Токен бота, адрес и ключ ретранслятора вводятся только в кабинете: «Подключения» → «Заявки с сайта в Telegram».
- На телефоне внизу кнопки «MAX» и «Аудит» (`src/components/mobilebar/`), окно «Записаться на аудит» — форма `audit`.

## Яндекс Метрика и Вебмастер

- Счётчик `METRIKA_ID` и мета Вебмастера — в `src/lib/seo.ts`, компонент `src/components/Metrika.tsx` в корневом layout.
- Цели (JavaScript-события): `lead_sent`, `audit_open`, `phone_79963470065`, `phone_79190690027`, `messenger_telegram`,
  `messenger_max`, `messenger_whatsapp`. Плюс цель «url содержит spasibo».
- Плашка cookie (`src/components/legal/CookieBanner.tsx`): пока посетитель не выбрал, Метрика работает;
  «Только необходимые» отключает её и удаляет cookie `_ym*`. Выбор хранится год, «Настройки cookie» в подвале открывают плашку снова.

## Документы

`/politika-konfidencialnosti/`, `/soglasie-na-obrabotku-dannyh/`, `/polzovatelskoe-soglashenie/` (noindex).
Тексты и реквизиты оператора — `src/content/legal.ts`: Карацапов Даниил Сергеевич, самозанятый, ИНН 690891391009, г. Тверь,
d.karatsapov@yandex.ru. Ссылки на согласие и политику — во всех формах через `ConsentNote`.
Владельцу осталось подать уведомление в Роскомнадзор (pd.rkn.gov.ru), с отметкой о трансграничной передаче (Telegram, Cloudflare).

## Кейсы

Архив `/kejsy/`, данные `src/content/cases.ts`. Сейчас дела: 025 «Каркас Комфорт», 004 «Сфера», 023 ДиАвто69,
010 айпапа.рф, 024 Сара. У каждого полного дела своя страница `/kejsy/<slug>/` со своими блоками.

Как добавить полное дело (по образцу 025):
1. Снимки в `src/assets/cases/<slug>/` (webp, quality 80).
2. Данные в `src/content/<slug>.ts`: тексты, цифры, снимки. Цифры только из материалов клиента; иллюстрации, придуманные для механики, подписывать «пример».
3. Блоки в `src/components/<slug>/`, общая шапка — `karkas/Block.module.css`. Анимации на GSAP + ScrollTrigger, 3D на React Three Fiber
   (сцена через `dynamic(..., { ssr: false })`, материалы, которые меняются в кадре, — на уровне модуля, иначе ругается линтер).
   Для `prefers-reduced-motion` в CSS по умолчанию стоит итоговое состояние.
4. Страница `src/app/kejsy/<slug>/page.tsx`, секции стыкуются `Seam`.
   Справа — рейка-навигация `case/CaseRail.tsx`: сама находит первый экран (`#top`) и стыки `Seam` (подпись стыка = название блока). Вид под тему дела: `variant="ruler" | "floors" | "road" | "dots" | "wave"` (Каркас, Сфера, ДиАвто69, айпапа, Сара). Новому делу — свой вариант в `CaseRail.module.css`.
5. Запись в `CASES` (с `href` и `cover`), путь в `src/app/sitemap.ts`, картинка для соцсетей `public/og/<slug>.jpg` 1200×630.

Исходники дела 025 от клиента — `docs/cases/karkas-komfort/` (текст и все снимки).

Дела 014, 013, 001 и 021 из архива убраны, но ещё упоминаются на страницах таргета (021), ресторанов (001),
разработки сайтов (014), сквозной аналитики (013, 014) и карт (013). Решение владельца, убирать ли их оттуда, не получено.

## Higgsfield (генерация картинок и видео)

```bash
npm i -g @higgsfield/cli
npx skills add higgsfield-ai/skills -g -a claude-code -y
higgsfield auth login          # в облаке браузер не откроется: ссылку из sign-in.html отдать владельцу,
                               # он присылает адрес localhost:8765/callback?..., его открыть здесь через curl
higgsfield workspace list && higgsfield workspace set <id>
higgsfield generate create gpt_image_2_6 --prompt "..." --aspect_ratio 4:3 --wait
```

Вход и CLI живут только в текущем контейнере.

## Коммерческие предложения

Исходники КП лежат в `kp/` (по папке на КП, описание — `kp/README.md`). Стиль: альбомный A4, чёрный #050505, белый,
салатовый #c4f542, розовый #d1006a, Geologica / Golos Text / IBM Plex Mono, знак из `src/components/logoGeometry.ts`.
HTML → PDF через Playwright, шрифты берутся из сборки `out/_next/static`.

Что владелец просил в КП: без воды, цифры вместо общих слов, цены «от», один телефон +7 996 347-00-65 и Telegram @Daniil_065,
без итоговых сумм по всем позициям, скидку за комплекс не обещать в тексте, порядок площадок — Авито, VK, Сбер, MAX, Telegram.
Каждую сборку проверять глазами по рендеру.

## Как работать с владельцем

- Отвечать коротко и по-русски, без внутренней кухни.
- Перед отправкой картинок и PDF смотреть рендер: обрезанные логотипы, кривые иконки и пустоты владелец замечает сразу.
- Не выдумывать цифры клиента; если цифра придумана для примера — подписать.
- Внешние действия (выкладка на сервер чужих проектов, письма, публикации) — только после согласия.
- В текстах ботов уместны эмодзи. Нули вида «0 ₽» клиенту не показывать.
