"use client";

import Image from "next/image";
import { forwardRef } from "react";
import { gsap } from "gsap";
import coffeeThumb from "@/assets/geo/coffee-thumb.webp";
import type { GEO } from "@/content/geo";
import styles from "./MapScene.module.css";

type MapData = (typeof GEO)["map"];

/** Пины соседей по карте: серые, без названий, чтобы не изображать чужие бренды */
const PINS = [
  [118, 96], [332, 86], [196, 196], [312, 262], [58, 206], [148, 288], [340, 352], [232, 52], [86, 132], [282, 330],
];
const OURS = { x: 262, y: 142 };
const YOU = { x: 120, y: 268 };
/** Маршрут по улицам от синей точки до нашего пина */
const ROUTE = `M${YOU.x} ${YOU.y} V232 H262 V${OURS.y + 6}`;

/**
 * Шаги сцены. Человек вводит «кофе рядом», на наклонённую карту падают пины,
 * карта выпрямляется и подъезжает к нашему пину, соседи гаснут, от синей точки «Вы здесь»
 * прорисовывается маршрут, снизу выезжает карточка места, загорается «Маршрут построен».
 * Всё обратимо, поэтому последовательность можно вести и скроллом, и временем.
 */
export function addMapSteps(tl: gsap.core.Timeline, root: HTMLElement, map: MapData) {
  const q = (part: string) => root.querySelector<HTMLElement>(`[data-part="${part}"]`)!;
  const qa = (part: string) => root.querySelectorAll<SVGGElement>(`[data-part="${part}"]`);
  const query = q("query");
  const route = root.querySelector<SVGPathElement>("[data-part='route']")!;
  const len = route.getTotalLength();
  const typed = { n: 0 };

  tl.set(q("plane"), { rotateX: 46, rotateZ: -10, scale: 0.92, y: 0, x: 0 })
    .set(qa("pin"), { y: -60, autoAlpha: 0 })
    .set(q("ours"), { y: -80, autoAlpha: 0, scale: 1, transformOrigin: "50% 100%" })
    .set(qa("pin-dot"), { opacity: 1 })
    .set(route, { strokeDasharray: len, strokeDashoffset: len })
    .set([q("card"), q("chip")], { autoAlpha: 0 })
    .set(q("card"), { yPercent: 40 })
    .set(q("you"), { autoAlpha: 0, scale: 0, transformOrigin: "50% 50%" })
    // 1. Запрос печатается в строке поиска
    .to(typed, {
      n: map.query.length,
      duration: 0.8,
      ease: "none",
      onUpdate: () => {
        query.textContent = map.query.slice(0, Math.round(typed.n));
      },
    })
    // 2. Пины падают на карту
    .to(qa("pin"), { y: 0, autoAlpha: 1, duration: 0.5, ease: "bounce.out", stagger: 0.06 }, "+=0.1")
    .to(q("ours"), { y: 0, autoAlpha: 1, duration: 0.6, ease: "bounce.out" }, "-=0.3")
    // 3. Карта выпрямляется и подъезжает к нашему пину, соседи гаснут
    .to(q("plane"), { rotateX: 0, rotateZ: 0, scale: 1.18, x: "-6%", y: "-4%", duration: 1.1, ease: "power3.inOut" }, "+=0.15")
    .to(qa("pin-dot"), { opacity: 0.25, duration: 0.6 }, "<0.3")
    .to(q("ours"), { scale: 1.35, transformOrigin: "50% 100%", duration: 0.5, ease: "back.out(2.5)" }, "<0.2")
    // 4. «Вы здесь» и маршрут
    .to(q("you"), { autoAlpha: 1, scale: 1, transformOrigin: "50% 50%", duration: 0.35, ease: "back.out(2)" })
    .to(route, { strokeDashoffset: 0, duration: 1, ease: "power2.inOut" })
    // 5. Карточка места снизу и плашка маршрута
    .to(q("card"), { autoAlpha: 1, yPercent: 0, duration: 0.55, ease: "power3.out" }, "-=0.3")
    .to(q("chip"), { autoAlpha: 1, duration: 0.3 }, "-=0.1")
    .fromTo(q("call"), { scale: 1 }, { scale: 0.94, duration: 0.12, yoyo: true, repeat: 1, immediateRender: false }, "+=0.2");
  return tl;
}

/** Окно карты: строка поиска, наклонённый план города с пинами, маршрут и карточка места */
const MapScene = forwardRef<HTMLDivElement, { map: MapData }>(function MapScene({ map }, ref) {
  return (
    <div ref={ref} className={styles.scene} aria-hidden="true">
      <div className={styles.search}>
        <svg viewBox="0 0 24 24" className={styles.searchIcon}>
          <circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="m15 15 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className={styles.query} data-part="query">
          {map.query}
        </span>
        <span className={styles.caret} />
      </div>

      <div className={styles.view}>
        <div className={styles.plane} data-part="plane">
          <svg viewBox="0 0 400 400" className={styles.map}>
            {/* Кварталы, парк и река */}
            <rect width="400" height="400" fill="var(--map-bg)" />
            <rect x="178" y="248" width="76" height="54" rx="6" fill="var(--map-park)" />
            <rect x="18" y="20" width="44" height="34" rx="6" fill="var(--map-park)" />
            <path d="M-10 384 C 80 356 120 380 200 366 S 330 330 410 352 L410 410 L-10 410 Z" fill="var(--map-water)" />
            <g stroke="var(--map-street)" strokeLinecap="round" fill="none">
              <path d="M0 64 H400 M0 150 H400 M0 232 H400 M0 316 H400" strokeWidth="9" />
              <path d="M70 0 V400 M170 0 V400 M262 0 V400 M352 0 V400" strokeWidth="9" />
              <path d="M0 110 L400 10" strokeWidth="14" />
              <path d="M30 0 V400 M120 0 V340 M216 0 V340 M308 0 V340 M0 20 H400 M0 108 H400 M0 192 H400 M0 274 H400" strokeWidth="3" opacity="0.6" />
            </g>
            <path data-part="route" d={ROUTE} fill="none" stroke="var(--lime)" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
            <g data-part="you">
              <circle cx={YOU.x} cy={YOU.y} r="16" fill="rgb(61 139 253 / 0.25)" className={styles.pulse} />
              <circle cx={YOU.x} cy={YOU.y} r="7" fill="#3d8bfd" stroke="#fff" strokeWidth="2.5" />
            </g>
            {PINS.map(([x, y], i) => (
              <g key={i} data-part="pin">
                <g data-part="pin-dot">
                  <path d={`M${x} ${y} c-7 -9 -11 -14 -11 -20 a11 11 0 1 1 22 0 c0 6 -4 11 -11 20 Z`} fill="var(--map-pin)" />
                  <circle cx={x} cy={y - 21} r="4" fill="var(--map-bg)" />
                </g>
              </g>
            ))}
            <g data-part="ours">
              <path d={`M${OURS.x} ${OURS.y} c-9 -12 -15 -18 -15 -27 a15 15 0 1 1 30 0 c0 9 -6 15 -15 27 Z`} fill="var(--lime)" />
              <path d={`M${OURS.x - 6} ${OURS.y - 32} h9 a3 3 0 0 1 0 6 h-1 v2 a4 4 0 0 1 -4 4 h-2 a4 4 0 0 1 -4 -4 v-8 Z`} fill="var(--ink-950)" />
            </g>
          </svg>
        </div>

        <span className={styles.chip} data-part="chip">
          {map.route}
        </span>

        <div className={styles.card} data-part="card">
          <Image src={coffeeThumb} alt={map.place.photo} className={styles.thumb} sizes="96px" />
          <div className={styles.cardBody}>
            <span className={styles.cardName}>{map.place.name}</span>
            <span className={styles.cardMeta}>
              {map.place.kind} · {map.place.distance}
            </span>
            <span className={styles.cardOpen}>{map.place.open}</span>
            <span className={styles.actions}>
              {map.actions.map((a, i) => (
                <span key={a} className={styles.action} data-main={i === 0 || undefined} data-part={i === 1 ? "call" : undefined}>
                  {a}
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default MapScene;
