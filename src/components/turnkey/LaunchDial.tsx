"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { TURNKEY } from "@/content/turnkey";
import styles from "./LaunchDial.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof TURNKEY)["launch"];

const C = 200;
const R0 = 60;
const STEP = 22;

/** Дуга кольца радиуса r от дня a до дня b, начало сверху, по часовой */
function arc(r: number, a: number, b: number, days: number) {
  const ang = (d: number) => (d / days) * Math.PI * 2 - Math.PI / 2;
  const p = (d: number) => [C + r * Math.cos(ang(d)), C + r * Math.sin(ang(d))];
  const [x1, y1] = p(a);
  const [x2, y2] = p(b);
  const large = (b - a) / days > 0.5 ? 1 : 0;
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/**
 * «Запуск за две недели». Циферблат на четырнадцать дней, у каждого канала своё кольцо
 * и своя дуга запуска. Когда блок появляется, стрелка обходит две недели: дуги
 * прорисовываются, как только стрелка до них доходит, в центре счётчик дня.
 */
export default function LaunchDial({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const day = useRef<HTMLSpanElement>(null);
  const n = data.days;

  useGSAP(
    () => {
      const el = root.current!;
      const hand = el.querySelector<SVGGElement>("[data-hand]")!;
      const arcs = el.querySelectorAll<SVGPathElement>("[data-arc]");
      const legend = el.querySelectorAll<HTMLElement>("[data-leg]");
      const draw = (d: number) => {
        hand.setAttribute("transform", `rotate(${(d / n) * 360} ${C} ${C})`);
        arcs.forEach((a, i) => {
          const { from, to } = data.arcs[i];
          const k = Math.min(1, Math.max(0, (d - from) / (to - from)));
          a.style.strokeDashoffset = String(1 - k);
          legend[i].toggleAttribute("data-on", d >= from);
        });
        if (day.current) day.current.textContent = String(Math.max(1, Math.ceil(d)));
      };
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        draw(n);
        return;
      }
      draw(0);
      const v = { d: 0 };
      ScrollTrigger.create({
        trigger: el.querySelector(`.${styles.dial}`),
        start: "top 70%",
        once: true,
        onEnter: () => gsap.to(v, { d: n, duration: 3.6, ease: "power1.inOut", onUpdate: () => draw(v.d) }),
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="dial-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="dial-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
          <ol className={styles.legend}>
            {data.arcs.map((a) => (
              <li key={a.name} data-leg data-tone={a.tone}>
                <span className={styles.swatch} aria-hidden="true" />
                <span className={styles.legName}>{a.name}</span>
                <span className={styles.legDays}>
                  {a.from === 0 ? "с первого дня" : `с ${a.from} дня`} до {a.to}
                </span>
              </li>
            ))}
          </ol>
        </header>

        <figure className={styles.dial}>
          <svg viewBox="0 0 400 400" className={styles.svg} aria-hidden="true">
            {data.arcs.map((_, i) => (
              <circle key={i} cx={C} cy={C} r={R0 + i * STEP} className={styles.ring} />
            ))}
            {Array.from({ length: n }, (_, d) => {
              const ang = (d / n) * Math.PI * 2 - Math.PI / 2;
              const r1 = R0 + data.arcs.length * STEP;
              return (
                <g key={d}>
                  <line x1={C + r1 * Math.cos(ang)} y1={C + r1 * Math.sin(ang)} x2={C + (r1 + 10) * Math.cos(ang)} y2={C + (r1 + 10) * Math.sin(ang)} className={styles.tick} />
                  <text x={C + (r1 + 24) * Math.cos(ang)} y={C + (r1 + 24) * Math.sin(ang)} className={styles.tickText}>
                    {d === 0 ? n : d}
                  </text>
                </g>
              );
            })}
            {data.arcs.map((a, i) => (
              <path key={a.name} data-arc data-tone={a.tone} d={arc(R0 + i * STEP, a.from, a.to, n)} pathLength={1} className={styles.arc} />
            ))}
            <g data-hand>
              <line x1={C} y1={C} x2={C} y2={C - R0 - data.arcs.length * STEP} className={styles.hand} />
              <circle cx={C} cy={C - R0 - data.arcs.length * STEP} r="5" className={styles.handTip} />
            </g>
          </svg>
          <span className={styles.center} aria-hidden="true">
            <span className={styles.centerLabel}>{data.center}</span>
            <span ref={day} className={styles.centerNum}>
              {n}
            </span>
          </span>
          <figcaption className={styles.note}>{data.note}</figcaption>
        </figure>
      </div>
    </section>
  );
}
