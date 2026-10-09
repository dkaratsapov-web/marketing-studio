"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { CONTEXT } from "@/content/services";
import styles from "./Calendar.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { calendar: (typeof CONTEXT)["calendar"] };

const DAYS = 14;
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * «Первые две недели». Диаграмма по дням: бегунок «сегодня» идёт по скроллу с первого дня
 * по четырнадцатый, полосы этапов вырастают ровно тогда, когда он до них доходит, счётчик дня
 * в углу листается. Запуск горит салатовым, отчёты стоят розовыми отметками.
 * Без анимации диаграмма просто нарисована целиком.
 */
export default function Calendar({ calendar }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const section = root.current!;
      const gantt = section.querySelector<HTMLElement>("[data-gantt]")!;
      const rows = [...section.querySelectorAll<HTMLElement>("[data-task]")];
      const days = [...section.querySelectorAll<HTMLElement>("[data-day]")];
      const counter = section.querySelector<HTMLElement>("[data-counter]")!;
      const t = { v: 0 };
      section.setAttribute("data-ready", "");

      const update = () => {
        gantt.style.setProperty("--t", t.v.toFixed(3));
        const day = Math.min(DAYS, Math.floor(t.v) + 1);
        counter.textContent = pad(day);
        days.forEach((d, i) => d.toggleAttribute("data-now", i + 1 === day));
        rows.forEach((r) => r.toggleAttribute("data-on", t.v > Number(r.dataset.from) - 1 + 0.02));
      };

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: gantt,
          start: "top 72%",
          end: "bottom 42%",
          scrub: 0.6,
        },
      });
      tl.to(t, { v: DAYS, duration: DAYS, onUpdate: update }, 0);
      calendar.tasks.forEach((task, i) => {
        const bar = rows[i].querySelector(`.${styles.bar}`);
        tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: task.to - task.from + 1 }, task.from - 1);
      });
      update();
      return () => section.removeAttribute("data-ready");
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="calendar-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <p className="label">{calendar.label}</p>
          <h2 id="calendar-title" className={styles.title}>
            {calendar.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{calendar.lead}</p>
          <p className={styles.counter} aria-hidden="true">
            <span className={styles.counterLabel}>День</span>
            <span className={styles.counterValue} data-counter>
              {pad(DAYS)}
            </span>
          </p>
        </header>

        <div className={styles.gantt} data-gantt>
          <div className={styles.scale} aria-hidden="true">
            <div className={styles.weeks}>
              <span>Неделя 1</span>
              <span>Неделя 2</span>
            </div>
            <div className={styles.days}>
              {Array.from({ length: DAYS }, (_, i) => (
                <span key={i} className={styles.day} data-day>
                  {i + 1}
                </span>
              ))}
            </div>
          </div>

          <ol className={styles.tasks}>
            {calendar.tasks.map((task) => (
              <li
                key={`${task.name}-${task.from}`}
                className={styles.task}
                data-task
                data-from={task.from}
                data-kind={task.kind}
              >
                <p className={styles.taskName}>
                  {task.name}
                  <span className={styles.taskMeta}>
                    {task.from === task.to ? `день ${task.from}` : `дни ${task.from}–${task.to}`} · {task.who}
                  </span>
                </p>
                <div className={styles.track} aria-hidden="true">
                  <span
                    className={styles.bar}
                    style={{ gridColumn: `${task.from} / ${task.to + 1}` }}
                  />
                </div>
              </li>
            ))}
          </ol>

          <div className={styles.playhead} aria-hidden="true">
            <span className={styles.playheadLine} />
          </div>
        </div>

        <ul className={styles.legend} aria-label="Обозначения">
          <li data-kind="work">Работа отдела</li>
          <li data-kind="launch">Запуск рекламы</li>
          <li data-kind="report">Отчёт по заявкам и продажам</li>
        </ul>
      </div>
    </section>
  );
}
