"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { METRIKA_ID } from "@/lib/seo";

const TAG = "https://mc.yandex.ru/metrika/tag.js";

type Ym = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
declare global {
  interface Window {
    ym?: Ym;
  }
}

/**
 * Метрика с вебвизором и картой кликов. Сайт открывает страницы без перезагрузки,
 * поэтому просмотр отправляется вручную при каждой смене адреса (defer: true — без двойного первого хита).
 */
export default function Metrika() {
  const pathname = usePathname();
  const prev = useRef<string | null>(null);

  useEffect(() => {
    if (!window.ym) {
      const ym: Ym = (...args: unknown[]) => {
        (ym.a = ym.a || []).push(args);
      };
      ym.l = Date.now();
      window.ym = ym;
    }
    if (![...document.scripts].some((s) => s.src === TAG)) {
      const s = document.createElement("script");
      s.async = true;
      s.src = TAG;
      document.head.appendChild(s);
    }
    window.ym(METRIKA_ID, "init", {
      defer: true,
      webvisor: true,
      clickmap: true,
      referrer: document.referrer,
      url: location.href,
      accurateTrackBounce: true,
      trackLinks: true,
    });
  }, []);

  useEffect(() => {
    const url = location.href;
    window.ym?.(METRIKA_ID, "hit", url, { referer: prev.current ?? document.referrer });
    prev.current = url;
  }, [pathname]);

  return null;
}
