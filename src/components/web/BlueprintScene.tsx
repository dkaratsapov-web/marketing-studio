"use client";

import Image from "next/image";
import { forwardRef } from "react";
import { gsap } from "gsap";
import type { WEB } from "@/content/web";
import styles from "./BlueprintScene.module.css";

type Data = (typeof WEB)["blueprint"];

/** Координаты блоков прототипа в системе снимка 1600×1053 (верхние 50 px — рамка браузера на снимке, она обрезана) */
const BOXES = [
  { x: 20, y: 68, w: 1560, h: 66, r: 22 },
  { x: 1394, y: 79, w: 170, h: 46, r: 23 },
  { x: 272, y: 84, w: 154, h: 34, r: 17 },
  { x: 28, y: 245, w: 575, h: 70, r: 6 },
  { x: 28, y: 320, w: 500, h: 70, r: 6 },
  { x: 28, y: 395, w: 835, h: 70, r: 6 },
  { x: 28, y: 472, w: 395, h: 42, r: 6 },
  { x: 1085, y: 300, w: 380, h: 400, r: 4 },
  { x: 380, y: 975, w: 840, h: 90, r: 22 },
  { x: 27, y: 955, w: 285, h: 72, r: 36 },
];
const LINES = [
  { x: 24, y: 196, w: 350 },
  { x: 28, y: 550, w: 540 },
  { x: 28, y: 585, w: 540 },
  { x: 28, y: 620, w: 340 },
  { x: 52, y: 682, w: 380 },
  { x: 52, y: 727, w: 300 },
  { x: 52, y: 771, w: 370 },
  { x: 633, y: 880, w: 335 },
  { x: 592, y: 918, w: 416 },
];
/** Где стоят подписи прототипа, в процентах снимка */
const LABEL_AT = [
  { x: 72, y: 13 },
  { x: 30, y: 31 },
  { x: 80, y: 30 },
  { x: 52, y: 84 },
];

/**
 * Шаги сцены: поверх готовой страницы лежит её чертёж (прототип), сверху вниз идёт
 * линия сканирования: выше неё уже настоящий сайт, ниже ещё синие линии прототипа.
 * Подписи прототипа гаснут, когда линия их проходит. В конце снизу всплывает
 * уведомление о заявке с сайта. Всё обратимо: сцену можно вести скроллом.
 */
export function addBlueprintSteps(tl: gsap.core.Timeline, root: HTMLElement) {
  const q = (part: string) => root.querySelector<HTMLElement>(`[data-part="${part}"]`)!;
  const labels = root.querySelectorAll<HTMLElement>("[data-part='label']");
  const scan = { p: 0 };
  const draw = () => {
    root.style.setProperty("--scan", `${(scan.p * 100).toFixed(2)}%`);
    root.toggleAttribute("data-live", scan.p > 0.5);
  };

  tl.set(scan, { p: 0, onComplete: draw })
    .set(labels, { autoAlpha: 0, y: 8 })
    .set(q("toast"), { autoAlpha: 0, y: 30 })
    .to(labels, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.12 })
    .to(scan, { p: 1, duration: 2.4, ease: "power1.inOut", onUpdate: draw }, "+=0.3");
  // Подпись гаснет, когда линия сканирования доходит до неё
  LABEL_AT.forEach((l, i) => {
    tl.to(labels[i], { autoAlpha: 0, duration: 0.2 }, 1.06 + (l.y / 100) * 2.4);
  });
  tl.to(q("toast"), { autoAlpha: 1, y: 0, duration: 0.5, ease: "back.out(1.8)" }, "+=0.1");
  return tl;
}

/** Окно браузера: снимок сайта, прототип поверх и линия сканирования */
const BlueprintScene = forwardRef<HTMLDivElement, { data: Data }>(function BlueprintScene({ data }, ref) {
  return (
    <div ref={ref} className={styles.scene}>
      <div className={styles.chrome} aria-hidden="true">
        <span className={styles.dots}>
          <span />
          <span />
          <span />
        </span>
        <span className={styles.url}>{data.url}</span>
        <span className={styles.stage}>
          <span data-v="wire">{data.stages.wire}</span>
          <span data-v="live">{data.stages.live}</span>
        </span>
      </div>

      <div className={styles.view}>
        <Image src={data.shot} alt={data.alt} className={styles.shot} sizes="(max-width: 960px) 92vw, 46vw" priority />

        {/* Прототип: те же блоки синими линиями на миллиметровке, обрезается сверху по линии скана */}
        <svg className={styles.wire} viewBox="0 50 1600 1003" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <pattern id="bp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" fill="none" stroke="#c9d6ff" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="1600" height="1053" fill="#f2f6ff" />
          <rect width="1600" height="1053" fill="url(#bp-grid)" />
          <g fill="none" stroke="#2b47e8" strokeWidth="2.5" strokeDasharray="10 7">
            {BOXES.map((b, i) => (
              <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={b.r} />
            ))}
          </g>
          <g stroke="#2b47e8" strokeWidth="2">
            <path d="M1085 300 L1465 700 M1465 300 L1085 700" opacity="0.35" />
          </g>
          <g fill="#2b47e8" opacity="0.28">
            {LINES.map((l, i) => (
              <rect key={i} x={l.x} y={l.y - 8} width={l.w} height="16" rx="8" />
            ))}
          </g>
          <g fill="none" stroke="#2b47e8" strokeWidth="2.5">
            <circle cx="1545" cy="845" r="30" />
            <circle cx="1545" cy="920" r="30" />
            <circle cx="1545" cy="995" r="30" />
          </g>
        </svg>

        <span className={styles.scan} aria-hidden="true" />

        {data.labels.map((l, i) => (
          <span
            key={l}
            className={styles.label}
            data-part="label"
            style={{ left: `${LABEL_AT[i].x}%`, top: `${LABEL_AT[i].y}%` }}
            aria-hidden="true"
          >
            {l}
          </span>
        ))}

        <div className={styles.toast} data-part="toast" aria-hidden="true">
          <span className={styles.toastDot} />
          <span className={styles.toastBody}>
            <b>{data.toast.title}</b>
            <span>{data.toast.text}</span>
          </span>
        </div>
      </div>
    </div>
  );
});

export default BlueprintScene;
