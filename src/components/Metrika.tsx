"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { METRIKA_ID } from "@/lib/seo";
import { CONSENT_EVENT, metrikaAllowed, type CookieChoice } from "@/lib/consent";

const TAG = "https://mc.yandex.ru/metrika/tag.js";

/**
 * Цель Метрики по ссылке: отдельная на каждый номер телефона и каждый мессенджер.
 * Идентификаторы целей (тип «JavaScript-событие»): phone_79963470065, phone_79190690027,
 * messenger_telegram, messenger_max, messenger_whatsapp.
 */
export function contactGoal(href: string): string | null {
  if (href.startsWith("tel:")) {
    const digits = href.replace(/\D/g, "");
    return digits ? `phone_${digits}` : null;
  }
  let host = "";
  try {
    host = new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  if (host === "t.me" || host === "telegram.me") return "messenger_telegram";
  if (host === "max.ru") return "messenger_max";
  if (host === "wa.me" || host === "api.whatsapp.com") return "messenger_whatsapp";
  return null;
}

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

  const [on, setOn] = useState(false);

  // Посетитель выбрал «Только необходимые» — Метрику не загружаем; передумал — включаем
  useEffect(() => {
    // localStorage есть только в браузере: читаем выбор сразу после первой отрисовки
    const first = window.setTimeout(() => setOn(metrikaAllowed()), 0);
    const onChoice = (e: Event) => {
      const v = (e as CustomEvent<CookieChoice>).detail;
      if (v === "all") {
        // счётчик уже был запущен и отключён на этой странице — запустить заново можно только перезагрузкой
        if (!window.ym && [...document.scripts].some((s) => s.src === TAG)) return location.reload();
        return setOn(true);
      }
      // отключить уже запущенный счётчик: флаг Метрики, свои вызовы целей и cookie _ym_*
      (window as unknown as Record<string, unknown>)[`disableYaCounter${METRIKA_ID}`] = true;
      window.ym = undefined;
      for (const c of document.cookie.split(";")) {
        const name = c.split("=")[0].trim();
        if (name.startsWith("_ym")) {
          document.cookie = `${name}=; max-age=0; path=/`;
          document.cookie = `${name}=; max-age=0; path=/; domain=.${location.hostname.replace(/^www\./, "")}`;
        }
      }
      setOn(false);
    };
    window.addEventListener(CONSENT_EVENT, onChoice);
    return () => {
      window.clearTimeout(first);
      window.removeEventListener(CONSENT_EVENT, onChoice);
    };
  }, []);

  useEffect(() => {
    if (!on) return;
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
    prev.current = null;
  }, [on]);

  // клики по телефонам и мессенджерам в любом месте сайта (и колёсиком мыши — в новой вкладке)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.type === "auxclick" && e.button !== 1) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      const goal = a ? contactGoal(a.getAttribute("href") ?? "") : null;
      if (goal) window.ym?.(METRIKA_ID, "reachGoal", goal);
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, []);

  useEffect(() => {
    if (!on) return;
    const url = location.href;
    window.ym?.(METRIKA_ID, "hit", url, { referer: prev.current ?? document.referrer });
    prev.current = url;
  }, [pathname, on]);

  return null;
}
