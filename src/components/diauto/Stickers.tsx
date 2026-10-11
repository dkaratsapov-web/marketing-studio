"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { DIAUTO } from "@/content/diauto";
import styles from "./Stickers.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof DIAUTO)["task"];

/** Наклон стикеров на доске */
const TILT = [-3, 2.5, -1.5];

/**
 * Задача на стикерах. Каждый стикер приколот поверх карточки с решением: по клику
 * он отрывается от булавки и падает, открывая, чем заменили ручную работу.
 * Если человек просто листает дальше, оставшиеся стикеры срываются сами по очереди.
 */
export default function Stickers({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  // Срыв стикера: поворот вокруг булавки, падение и исчезновение
  function tear(note: HTMLElement, i: number) {
    if (note.dataset.torn) return;
    // Без анимации стикер и решение и так стоят стопкой, срывать нечего
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    note.dataset.torn = "1";
    note.setAttribute("aria-expanded", "true");
    const dir = i % 2 ? 1 : -1;
    gsap
      .timeline()
      .to(note, { rotation: TILT[i] + dir * 14, duration: 0.25, ease: "power2.out" })
      .to(note, { y: "130%", rotation: TILT[i] + dir * 38, autoAlpha: 0, duration: 0.7, ease: "power2.in" });
  }

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const notes = gsap.utils.toArray<HTMLElement>("[data-note]");
      ScrollTrigger.create({
        trigger: root.current!.querySelector("[data-board]"),
        start: "bottom 75%",
        once: true,
        onEnter: () => notes.forEach((n, i) => gsap.delayedCall(i * 0.35, () => tear(n, i))),
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="task-title">
      <div className="wrap">
        <header className={styles.head}>
          <h2 id="task-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <ol className={styles.board} data-board>
          {data.notes.map((n, i) => (
            <li key={n.problem} className={styles.slot}>
              <div className={styles.fix} id={`fix-${i}`}>
                <p className={styles.fixKicker}>Решение</p>
                <h3 className={styles.fixName}>{n.fix}</h3>
                <p className={styles.fixText}>{n.fixText}</p>
              </div>
              <button
                type="button"
                className={styles.note}
                data-note
                data-tone={i % 2 ? "pink" : "lime"}
                style={{ rotate: `${TILT[i]}deg` }}
                aria-expanded="false"
                aria-controls={`fix-${i}`}
                onClick={(e) => tear(e.currentTarget, i)}
              >
                <span className={styles.pin} aria-hidden="true" />
                <span className={styles.problem}>{n.problem}</span>
                <span className={styles.problemText}>{n.text}</span>
                <span className={styles.tear}>{data.tear} ↓</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
