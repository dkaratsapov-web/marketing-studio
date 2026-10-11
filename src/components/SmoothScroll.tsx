"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Доступ к Lenis из других компонентов: поп-ап ставит прокрутку страницы на паузу */
export const lenisRef: { current: Lenis | null } = { current: null };

export default function SmoothScroll() {
  useEffect(() => {
    // Сцена hero рассчитана на просмотр с начала: не восстанавливаем прокрутку при перезагрузке
    if (!window.location.hash) {
      history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
    }

    // Страница растёт после загрузки: картинки, шрифты, тяжёлые блоки монтируются позже.
    // Без пересчёта триггеры ниже по странице срабатывают по старым координатам, раньше
    // или позже нужного. Следим за высотой документа и пересчитываем, когда она меняется.
    // Первый замер всегда пересчитывает: между созданием триггеров и этим эффектом высота могла уйти
    let lastH = -1;
    let t = 0;
    const settle = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        const h = document.documentElement.scrollHeight;
        if (Math.abs(h - lastH) < 2) return;
        ScrollTrigger.refresh();
        lastH = document.documentElement.scrollHeight;
      }, 200);
    };
    const ro = new ResizeObserver(settle);
    ro.observe(document.body);
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    const stop = () => {
      window.clearTimeout(t);
      ro.disconnect();
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return stop;

    const lenis = new Lenis({
      lerp: 0.085,
      anchors: { offset: -72 },
      autoRaf: false,
    });

    lenisRef.current = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      stop();
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return null;
}
