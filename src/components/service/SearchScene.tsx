"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { SearchQuery } from "@/content/services";
import styles from "./SearchScene.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Когда первый экран идёт кинематографичной сценой по скроллу (десктоп), а когда сцена крутится сама */
export const CINEMATIC_MQ = "(min-width: 961px) and (min-height: 640px)";

type Parts = {
  query: HTMLElement;
  results: HTMLElement[];
  ad: HTMLElement;
  pointer: HTMLElement;
  pill: HTMLElement;
  count: HTMLElement;
  enter: HTMLElement;
};

export function sceneParts(el: HTMLElement): Parts {
  const one = (part: string) => el.querySelector<HTMLElement>(`[data-part="${part}"]`)!;
  return {
    query: one("query"),
    results: [...el.querySelectorAll<HTMLElement>('[data-part="result"]')],
    ad: one("ad"),
    pointer: one("pointer"),
    pill: one("pill"),
    count: one("count"),
    enter: one("enter"),
  };
}

export function fillAd(el: HTMLElement, item: SearchQuery) {
  const set = (part: string, text: string) => {
    el.querySelector<HTMLElement>(`[data-part="${part}"]`)!.textContent = text;
  };
  set("ad-title", item.ad.title);
  set("ad-who", item.ad.who);
  set("ad-text", item.ad.text);
  set("case", item.caseCode);
}

/**
 * Шаги одного запроса: набор, выдача, подсветка, клик, заявка в счётчик.
 * Все изменения обратимые (без call), поэтому тот же таймлайн можно и проигрывать по времени,
 * и прокручивать скроллом в обе стороны. Координаты считаются в системе сцены с поправкой
 * на её масштаб, так что курсор попадает в объявление, даже когда сцену увеличили.
 */
export function addQuerySteps(
  tl: gsap.core.Timeline,
  el: HTMLElement,
  item: SearchQuery,
  opts: { base?: number; onType?: (text: string) => void; hold?: number } = {},
) {
  const p = sceneParts(el);
  const at = (target: Element, dx: number, dy: number) => {
    const s = el.getBoundingClientRect();
    const k = s.width / el.offsetWidth || 1;
    const r = target.getBoundingClientRect();
    return { x: (r.left - s.left + r.width * dx) / k, y: (r.top - s.top + r.height * dy) / k };
  };
  const typed = { n: 0 };
  const lead = { v: 0 };
  const base = opts.base ?? 0;

  tl.set(p.results, { autoAlpha: 0, y: 14 })
    .set(el, { "--lit": 0 })
    .set(p.pointer, { autoAlpha: 0, x: () => el.offsetWidth * 0.82, y: () => el.offsetHeight * 0.92 })
    .to(typed, {
      n: item.query.length,
      duration: item.query.length * 0.045,
      ease: "none",
      onUpdate: () => {
        const text = item.query.slice(0, Math.round(typed.n));
        p.query.textContent = text;
        // Как в настоящем поле: длинный запрос сдвигается, курсор остаётся на виду
        p.query.parentElement!.scrollLeft = p.query.parentElement!.scrollWidth;
        opts.onType?.(text);
      },
    })
    .to(p.enter, { scale: 0.92, duration: 0.09, yoyo: true, repeat: 1, ease: "power2.out" }, "+=0.15")
    .to(p.results, { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.07, ease: "power3.out" })
    .to(el, { "--lit": 1, duration: 0.45, ease: "power2.out" }, "-=0.2")
    .to(p.pointer, { autoAlpha: 1, duration: 0.2 }, "+=0.3")
    .to(p.pointer, { x: () => at(p.ad, 0.62, 0.55).x, y: () => at(p.ad, 0.62, 0.55).y, duration: 0.75, ease: "power3.inOut" }, "<")
    .to(p.pointer, { scale: 0.82, duration: 0.08, yoyo: true, repeat: 1, ease: "power2.out" })
    .to(p.ad, { scale: 0.985, duration: 0.08, yoyo: true, repeat: 1, ease: "power2.out" }, "<")
    .set(p.pill, { xPercent: -50, yPercent: -50, x: () => at(p.ad, 0.62, 0.55).x, y: () => at(p.ad, 0.62, 0.55).y, autoAlpha: 0, scale: 0.7 })
    .to(p.pill, { autoAlpha: 1, scale: 1, duration: 0.25, ease: "back.out(2)" })
    .to(p.pill, { x: () => at(p.count, 0.5, 0.5).x, y: () => at(p.count, 0.5, 0.5).y, duration: 0.75, ease: "power3.in" }, "+=0.15")
    .to(p.pill, { autoAlpha: 0, scale: 0.6, duration: 0.15 })
    .to(lead, {
      v: 1,
      duration: 0.01,
      onUpdate: () => {
        p.count.textContent = String(base + Math.round(lead.v));
      },
    }, "<")
    .fromTo(p.count, { scale: 1.3 }, { scale: 1, duration: 0.45, ease: "back.out(2.4)", immediateRender: false }, "<")
    .to(p.pointer, { autoAlpha: 0, duration: 0.25 }, "<");
  if (opts.hold) tl.to({}, { duration: opts.hold });
  return tl;
}

type Props = { queries: SearchQuery[] };

/**
 * Живая сцена «Контекста»: человек вводит запрос, собирается выдача, наше объявление первое
 * и горит, по нему кликают, и «+1 заявка» уходит в счётчик. Это иллюстрация механики, а не данные:
 * примеры запросов взяты из наших дел. На десктопе сценой управляет скролл первого экрана
 * (ServiceHero), здесь же она крутится сама: на телефоне и на невысоких экранах.
 */
export default function SearchScene({ queries }: Props) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      fillAd(el, queries[0]);

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        // Статичный кадр: запрос набран, выдача собрана, объявление подсвечено
        const p = sceneParts(el);
        p.query.textContent = queries[0].query;
        p.query.parentElement!.scrollLeft = p.query.parentElement!.scrollWidth;
        gsap.set(el, { "--lit": 1 });
        p.count.textContent = "1";
        return;
      }

      const mm = gsap.matchMedia();
      mm.add(`not all and ${CINEMATIC_MQ}`, () => {
        const master = gsap.timeline({ repeat: -1, paused: true });
        queries.forEach((item, i) => {
          const tl = gsap.timeline();
          tl.call(() => fillAd(el, item));
          addQuerySteps(tl, el, item, { base: i, hold: 1.3 });
          tl.to(sceneParts(el).results, { autoAlpha: 0, y: -10, duration: 0.35, stagger: 0.04, ease: "power2.in" });
          master.add(tl);
        });
        // Цикл крутится, только пока сцена на экране
        ScrollTrigger.create({
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => (self.isActive ? master.play() : master.pause()),
        });
      });
    },
    { scope: root, dependencies: [queries] },
  );

  return (
    <div ref={root} className={styles.scene} data-scene aria-hidden="true">
      <div className={styles.bar}>
        <svg className={styles.loupe} viewBox="0 0 20 20" fill="none">
          <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="m13 13 4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className={styles.queryWrap}>
          <span className={styles.query} data-part="query" />
          <span className={styles.caret} />
        </span>
        <span className={styles.enter} data-part="enter">
          Найти
        </span>
      </div>

      <div className={styles.results}>
        <article className={`${styles.result} ${styles.ad}`} data-part="result">
          <div data-part="ad" className={styles.adInner}>
            <p className={styles.adMeta}>
              <span className={styles.adBadge}>Реклама</span>
              <span className={styles.adWho} data-part="ad-who" />
            </p>
            <p className={styles.adTitle} data-part="ad-title" />
            <p className={styles.adText} data-part="ad-text" />
          </div>
        </article>
        {[0.92, 0.78, 0.86].map((w, i) => (
          <div key={i} className={`${styles.result} ${styles.organic}`} data-part="result">
            <span style={{ width: `${w * 60}%` }} />
            <span style={{ width: `${w * 100}%` }} />
            <span style={{ width: `${w * 72}%` }} />
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <p className={styles.caption}>
          Пример из дела <span className={styles.caseCode} data-part="case" />
        </p>
        <p className={styles.count}>
          <span className={styles.countLabel}>Заявки</span>
          <span className={styles.countValue} data-part="count">
            0
          </span>
        </p>
      </div>

      <span className={styles.pill} data-part="pill">
        +1 заявка
      </span>
      <svg className={styles.pointer} data-part="pointer" viewBox="0 0 24 24">
        <path d="M5 3l14 8-6.2 1.6L10 19z" fill="#fff" stroke="#050505" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
