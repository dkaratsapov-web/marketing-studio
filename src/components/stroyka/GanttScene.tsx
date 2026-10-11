"use client";

import { forwardRef } from "react";
import { gsap } from "gsap";
import type { STROYKA } from "@/content/stroyka";
import styles from "./GanttScene.module.css";

type Gantt = (typeof STROYKA)["gantt"];

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * Шаги сцены: по графику работ идёт линия «сегодня». Полосы этапов заполняются, когда она
 * их проходит, а в нужные моменты над графиком всплывают вопросы клиента и ответ сайта.
 * Состояние считается из положения линии, поэтому сцену можно вести скроллом в обе стороны.
 */
export function addGanttSteps(tl: gsap.core.Timeline, root: HTMLElement, gantt: Gantt) {
  const bars = root.querySelectorAll<HTMLElement>("[data-bar]");
  const asks = root.querySelectorAll<HTMLElement>("[data-ask]");
  const now = root.querySelector<HTMLElement>("[data-now]")!;
  const v = { t: 0 };
  const render = () => {
    now.style.left = `${(v.t / gantt.span) * 100}%`;
    gantt.stages.forEach((s, i) => bars[i].style.setProperty("--fill", clamp01((v.t - s.from) / (s.to - s.from)).toFixed(3)));
    // Вопрос виден, пока линия не ушла далеко вперёд; последний остаётся
    gantt.asks.forEach((a, i) => {
      const next = gantt.asks[i + 1]?.at ?? Infinity;
      asks[i].toggleAttribute("data-on", v.t >= a.at && v.t < next + 0.6);
    });
  };
  tl.set(v, { t: 0, onComplete: render }).to(v, { t: gantt.span, duration: 3.4, ease: "none", onUpdate: render });
  return tl;
}

/** График работ: полосы этапов, линия «сегодня», пузыри вопросов */
const GanttScene = forwardRef<HTMLDivElement, { gantt: Gantt }>(function GanttScene({ gantt }, ref) {
  return (
    <div ref={ref} className={styles.scene} aria-hidden="true">
      <div className={styles.asks}>
        {gantt.asks.map((a) => (
          <div key={a.q} className={styles.ask} data-ask style={{ left: `${(a.at / gantt.span) * 100}%` }}>
            <p className={styles.q}>{a.q}</p>
            <p className={styles.a}>
              <i />
              {a.a}
            </p>
          </div>
        ))}
      </div>

      <div className={styles.chart}>
        <div className={styles.grid}>
          {Array.from({ length: gantt.span }, (_, k) => (
            <span key={k} />
          ))}
        </div>
        <ol className={styles.rows}>
          {gantt.stages.map((s) => (
            <li key={s.name} className={styles.row}>
              <span className={styles.name}>{s.name}</span>
              <span className={styles.track}>
                <span
                  className={styles.bar}
                  data-bar
                  style={{ left: `${(s.from / gantt.span) * 100}%`, width: `${((s.to - s.from) / gantt.span) * 100}%` }}
                />
              </span>
            </li>
          ))}
        </ol>
        <div className={styles.lane}>
          <span className={styles.now} data-now>
            <b>сегодня</b>
          </span>
        </div>
      </div>
    </div>
  );
});

export default GanttScene;
