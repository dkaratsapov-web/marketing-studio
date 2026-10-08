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

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return null;
}
