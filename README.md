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

Каждый пуш в `main` или `claude/exciting-noether-voueh3` собирает статику и публикует её на GitHub Pages
(`.github/workflows/pages.yml`). Путь репозитория подставляется через `PAGES_BASE_PATH`.

## Структура

- `src/app/globals.css` — дизайн-токены: палитра, шрифты, шкала типографики, поверхности `data-surface="dark|light"`.
- `src/components/Header.tsx` — шапка, подстраивается под тему секции под ней.
- `src/components/hero/` — первый экран: DOM-слой, WebGL-монолит (`HeroScene.tsx`) и шейдеры.
