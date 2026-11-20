# Корпорация

Лендинг маркетингового агентства «Корпорация». Next.js 16, React 19, GSAP + ScrollTrigger, Lenis, Three.js / React Three Fiber.

## Запуск

```bash
npm install
npm run dev     # http://localhost:3000
npm run lint
npm run build   # статика в out/
```

## Деплой

Пуш в `main` собирает статику и выкладывает её на https://marketing-studio.pro (`.github/workflows/vps.yml`), там же
обновляется кабинет crm.marketing-studio.pro. Копия уходит на GitHub Pages (`.github/workflows/pages.yml`).
Подробно, вместе с проверками и решениями владельца, — `docs/handbook.md`.

## Структура

- `src/app/globals.css` — дизайн-токены: палитра, шрифты, шкала типографики, поверхности `data-surface="dark|light"`.
- `src/components/Header.tsx` — шапка, подстраивается под тему секции под ней.
- `src/components/hero/` — первый экран: DOM-слой, WebGL-монолит (`HeroScene.tsx`) и шейдеры.

## Моушн-ревью

Прокручивает страницу колесом как пользователь, снимает кадры с прогрессом скролла и видимостью текста,
собирает раскадровку. Помогает ловить косяки анимации без ручного просмотра.

```bash
npm run build && (cd out && python3 -m http.server 4321 &)
node scripts/motion-review.mjs /tmp/review desktop 170 80   # или mobile
python3 scripts/motion-sheet.py /tmp/review 6 360           # /tmp/review/sheet.png
```
