"use client";

import { forwardRef } from "react";
import { gsap } from "gsap";
import type { ANALYTICS } from "@/content/analytics";
import styles from "./FlowScene.module.css";

type Flow = (typeof ANALYTICS)["flow"];

/** Узлы схемы в системе 800×460: бюджет слева, каналы, заявки, продажи справа */
const CH_Y = [110, 230, 350];
const BUDGET_Y = [175, 230, 285];
const LEAD_Y = [200, 230, 260];
const SALE_Y = [214, 232, 250];
/** Толщина потоков: до и после переноса бюджета. Второй канал (индекс 1) отключается */
const W = {
  budget: [34, 30, 24],
  lead: [28, 24, 16],
  sale: [20, 3, 11],
};
const W_AFTER = { budget: [58, 0, 24], lead: [46, 0, 16], sale: [34, 0, 11] };

const bez = (x1: number, y1: number, x2: number, y2: number) => {
  const m = (x1 + x2) / 2;
  return `M${x1} ${y1} C${m} ${y1} ${m} ${y2} ${x2} ${y2}`;
};

/**
 * Шаги сцены: бюджет растекается по трём каналам, каналы дают заявки, заявки — продажи.
 * У второго канала поток продаж почти нулевой: появляется подпись, ножницы режут поток,
 * он сереет и пропадает, а освободившийся бюджет утолщает поток лучшего канала.
 * Всё обратимо: сцену можно вести скроллом.
 */
export function addFlowSteps(tl: gsap.core.Timeline, root: HTMLElement) {
  const qa = (sel: string) => root.querySelectorAll<SVGPathElement>(sel);
  const q = (part: string) => root.querySelector<HTMLElement>(`[data-part="${part}"]`)!;
  const stage = (s: string) => qa(`[data-stage="${s}"]`);
  const weak = qa("[data-ch='1']");

  tl.set(qa("[data-stage]"), { strokeDashoffset: 1 })
    .set(qa("[data-stage]"), { attr: { stroke: "#c4f542" } })
    .set([q("weak"), q("moved"), q("cut")], { autoAlpha: 0 })
    .set(qa("[data-stage='budget']"), { attr: { "stroke-width": (i: number) => W.budget[i] } })
    .set(qa("[data-stage='lead']"), { attr: { "stroke-width": (i: number) => W.lead[i] } })
    .set(qa("[data-stage='sale']"), { attr: { "stroke-width": (i: number) => W.sale[i] } })
    // 1. Потоки текут слева направо: бюджет, заявки, продажи
    .to(stage("budget"), { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut", stagger: 0.08 })
    .to(stage("lead"), { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut", stagger: 0.08 }, "-=0.3")
    .to(stage("sale"), { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut", stagger: 0.08 }, "-=0.3")
    // 2. Слабый канал: подпись и ножницы
    .to(q("weak"), { autoAlpha: 1, duration: 0.3 }, "+=0.2")
    .fromTo(q("cut"), { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(2)", immediateRender: false }, "+=0.3")
    .to(weak, { attr: { stroke: "#55555c" }, duration: 0.3 })
    .to(q("cut"), { rotate: -25, duration: 0.12, yoyo: true, repeat: 1 })
    // 3. Поток слабого канала исчезает, бюджет уходит в лучший канал
    .to(qa("[data-stage='budget']"), { attr: { "stroke-width": (i: number) => W_AFTER.budget[i] }, duration: 0.9, ease: "power2.inOut" }, "+=0.1")
    .to(qa("[data-stage='lead']"), { attr: { "stroke-width": (i: number) => W_AFTER.lead[i] }, duration: 0.9, ease: "power2.inOut" }, "<")
    .to(qa("[data-stage='sale']"), { attr: { "stroke-width": (i: number) => W_AFTER.sale[i] }, duration: 0.9, ease: "power2.inOut" }, "<")
    .to([q("weak"), q("cut")], { autoAlpha: 0, duration: 0.3 }, "<")
    .to(q("moved"), { autoAlpha: 1, duration: 0.4 }, "-=0.2");
  return tl;
}

/** Схема потоков денег: от бюджета через каналы к заявкам и продажам */
const FlowScene = forwardRef<HTMLDivElement, { flow: Flow }>(function FlowScene({ flow }, ref) {
  return (
    <div ref={ref} className={styles.scene} aria-hidden="true">
      <svg className={styles.svg} viewBox="0 0 800 460">
        {/* Узлы: столбики бюджета, заявок и продаж, точки каналов */}
        <rect x="40" y="140" width="20" height="180" rx="4" className={styles.node} />
        <rect x="560" y="180" width="16" height="100" rx="4" className={styles.node} />
        <rect x="744" y="196" width="16" height="70" rx="4" className={styles.node} data-sales />
        {CH_Y.map((y, i) => (
          <circle key={y} cx="300" cy={y} r="9" className={styles.dot} data-ch={i} />
        ))}
        <g fill="none" strokeLinecap="butt">
          {CH_Y.map((y, i) => (
            <path key={`b${i}`} data-stage="budget" data-ch={i} d={bez(60, BUDGET_Y[i], 291, y)} pathLength={1} strokeDasharray="1" />
          ))}
          {CH_Y.map((y, i) => (
            <path key={`l${i}`} data-stage="lead" data-ch={i} d={bez(309, y, 560, LEAD_Y[i])} pathLength={1} strokeDasharray="1" />
          ))}
          {SALE_Y.map((y, i) => (
            <path key={`s${i}`} data-stage="sale" data-ch={i} d={bez(576, LEAD_Y[i], 744, y)} pathLength={1} strokeDasharray="1" />
          ))}
        </g>
      </svg>

      <span className={styles.label} style={{ left: "6.25%", top: "74%" }}>
        {flow.budget} ₽
      </span>
      {flow.channels.map((c, i) => (
        <span key={c} className={styles.label} data-ch={i} style={{ left: "37.5%", top: `${(CH_Y[i] / 460) * 100 - 8}%` }}>
          {c}
        </span>
      ))}
      <span className={styles.label} style={{ left: "71%", top: "64%" }}>
        {flow.leads}
      </span>
      <span className={styles.label} data-accent style={{ left: "94%", top: "61%" }}>
        {flow.sales}
      </span>

      <span className={styles.tag} data-part="weak" style={{ left: "58%", top: "36%" }}>
        {flow.weak}
      </span>
      <span className={styles.cut} data-part="cut" style={{ left: "22%", top: "47%" }}>
        <svg viewBox="0 0 24 24">
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M8.1 8.1 20 20M8.1 15.9 20 4" />
        </svg>
        {flow.cut}
      </span>
      <span className={styles.tag} data-part="moved" data-good style={{ left: "38%", top: "0%" }}>
        {flow.moved}
      </span>
    </div>
  );
});

export default FlowScene;
