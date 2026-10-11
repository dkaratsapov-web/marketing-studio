"use client";

import { forwardRef } from "react";
import { gsap } from "gsap";
import type { AVTO } from "@/content/avtobiznes";
import styles from "./DashScene.module.css";

type Dash = (typeof AVTO)["dash"];

/** Шкала прибора: полукруг от −90° до +90° в системе 400×240, центр внизу */
const CX = 200;
const CY = 210;
const R = 160;
const pt = (deg: number, r = R) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r };
};

/**
 * Шаги сцены: на приборной панели горят пять жёлтых ламп неисправностей. Они гаснут
 * по одной, и с каждой стрелка прибора проходит деление шкалы от поста до сделки.
 * Когда погасла последняя, табло внизу загорается «Система в норме». Всё обратимо.
 */
export function addDashSteps(tl: gsap.core.Timeline, root: HTMLElement) {
  const lamps = root.querySelectorAll<HTMLElement>("[data-lamp]");
  const needle = root.querySelector<SVGGElement>("[data-needle]")!;
  const ready = root.querySelector<HTMLElement>("[data-ready]")!;
  const n = lamps.length;
  tl.set(lamps, { "--off": 0 })
    .set(needle, { rotation: -90, svgOrigin: `${CX} ${CY}` })
    .set(ready, { "--ok": 0 });
  lamps.forEach((l, i) => {
    tl.to(l, { "--off": 1, duration: 0.25 }, i ? "+=0.2" : 0.3).to(
      needle,
      { rotation: -90 + (180 * (i + 1)) / n, duration: 0.45, ease: "back.out(1.4)" },
      "<",
    );
  });
  tl.to(ready, { "--ok": 1, duration: 0.3 }, "+=0.1");
  return tl;
}

/** Приборная панель: шкала со стрелкой, лампы и табло */
const DashScene = forwardRef<HTMLDivElement, { dash: Dash }>(function DashScene({ dash }, ref) {
  const n = dash.scale.length;
  return (
    <div ref={ref} className={styles.scene} aria-hidden="true">
      <svg className={styles.gauge} viewBox="0 0 400 240">
        <path d={`M${pt(-90).x} ${pt(-90).y} A${R} ${R} 0 0 1 ${pt(90).x} ${pt(90).y}`} className={styles.arc} />
        {Array.from({ length: 31 }, (_, k) => {
          const deg = -90 + k * 6;
          const a = pt(deg, R - 4);
          const b = pt(deg, k % 6 === 0 ? R - 22 : R - 12);
          return <line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={k % 6 === 0 ? styles.tickMain : styles.tick} />;
        })}
        {dash.scale.map((s, i) => {
          const p = pt(-90 + (180 * (i + 1)) / n, R - 44);
          return (
            <text key={s} x={p.x} y={p.y} className={styles.scaleText}>
              {s}
            </text>
          );
        })}
        <g data-needle>
          <path d={`M${CX - 4} ${CY} L${CX} ${CY - R + 18} L${CX + 4} ${CY} Z`} className={styles.needle} />
        </g>
        <circle cx={CX} cy={CY} r="12" className={styles.hub} />
      </svg>

      <ul className={styles.lamps}>
        {dash.lamps.map((l) => (
          <li key={l} className={styles.lamp} data-lamp>
            <span className={styles.bulb}>
              <svg viewBox="0 0 24 24">
                <path d="M12 3 2.5 20h19L12 3Zm0 6v5m0 3v.5" />
              </svg>
            </span>
            <span className={styles.lampText}>{l}</span>
          </li>
        ))}
      </ul>

      <p className={styles.ready} data-ready>
        {dash.ready}
      </p>
    </div>
  );
});

export default DashScene;
