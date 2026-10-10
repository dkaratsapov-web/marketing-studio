"use client";

import { forwardRef } from "react";
import { gsap } from "gsap";
import type { ABOUT } from "@/content/about";
import styles from "./BuildingScene.module.css";

type Data = (typeof ABOUT)["building"];

const WINDOWS = 5;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * Шаги сцены: лифт поднимается с первого этажа на пятый и останавливается на каждом.
 * Этаж, до которого доехала кабина, загорается окнами, и на нём проступает отдел
 * и человек, который его ведёт. Наверху зажигается вывеска. Состояние считается из
 * положения кабины, поэтому сцену можно вести скроллом в обе стороны.
 */
export function addBuildingSteps(tl: gsap.core.Timeline, root: HTMLElement) {
  // В разметке этажи идут сверху вниз, считаем снизу
  const floors = [...root.querySelectorAll<HTMLElement>("[data-floor]")].reverse();
  const cabin = root.querySelector<HTMLElement>("[data-cabin]")!;
  const display = root.querySelector<HTMLElement>("[data-display]")!;
  const n = floors.length;
  // f: положение кабины в этажах от нижнего (0) до верхнего (n − 1); до нуля кабина ещё стоит
  const v = { f: -0.4, roof: 0 };
  const sync = () => {
    const at = Math.max(0, v.f);
    cabin.style.transform = `translateY(${-at * 100}%)`;
    display.textContent = String(Math.round(at) + 1);
    floors.forEach((el, i) => el.style.setProperty("--on", clamp01((v.f - i + 0.3) / 0.3).toFixed(3)));
    root.style.setProperty("--roof", v.roof.toFixed(3));
  };

  tl.set(v, { f: -0.4, roof: 0, onComplete: sync }).to(v, { f: 0, duration: 0.45, ease: "none", onUpdate: sync });
  for (let i = 1; i < n; i++) {
    tl.to(v, { f: i, duration: 0.6, ease: "power2.inOut", onUpdate: sync }, "+=0.25");
  }
  tl.to(v, { roof: 1, duration: 0.7, ease: "none", onUpdate: sync }, "+=0.15");
  return tl;
}

/** Разрез здания: вывеска на крыше, пять этажей-отделов и шахта лифта справа */
const BuildingScene = forwardRef<HTMLDivElement, { data: Data }>(function BuildingScene({ data }, ref) {
  const floors = [...data.floors].reverse();
  const sign = data.roof.split("");
  return (
    <div ref={ref} className={styles.scene} aria-hidden="true">
      <div className={styles.roof}>
        <span className={styles.sign}>
          {sign.map((ch, i) => (
            <span key={i} style={{ "--i": i, "--n": sign.length } as React.CSSProperties}>
              {ch}
            </span>
          ))}
        </span>
        <span className={styles.display}>
          <svg viewBox="0 0 10 10">
            <path d="M5 1.5 9 7H1z" />
          </svg>
          <span data-display>1</span>
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.floors}>
          {floors.map((f) => (
            <div key={f.no} className={styles.floor} data-floor>
              <span className={styles.no}>{f.no}</span>
              <span className={styles.room}>
                <span className={styles.windows}>
                  {Array.from({ length: WINDOWS }, (_, k) => (
                    <span key={k} style={{ "--k": k } as React.CSSProperties} />
                  ))}
                </span>
                <span className={styles.name}>{f.name}</span>
                <span className={styles.who}>
                  {f.who} · {f.does}
                </span>
              </span>
            </div>
          ))}
        </div>
        <div className={styles.shaft}>
          <span className={styles.cable} />
          <span className={styles.cabin} data-cabin>
            <span className={styles.doors} />
          </span>
        </div>
      </div>
      <div className={styles.ground} />
    </div>
  );
});

export default BuildingScene;
