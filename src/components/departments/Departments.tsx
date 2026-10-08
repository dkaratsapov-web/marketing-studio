"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { DEPARTMENTS } from "@/content/departments";
import styles from "./Departments.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const DIGITS = Array.from({ length: 10 }, (_, i) => i);

/** Табло лифта: каждая цифра — колонка 0–9, которая прокручивается к нужному значению */
function FloorBoard({ floor }: { floor: string }) {
  return (
    <span className={styles.board} aria-label={`Этаж ${floor}`}>
      {floor.split("").map((d, i) => (
        <span key={i} className={styles.digitWindow} aria-hidden="true">
          <span
            className={styles.digitReel}
            style={{ transform: `translateY(${-Number(d) * 10}%)`, transitionDelay: `${i * 70}ms` }}
          >
            {DIGITS.map((n) => (
              <span key={n} className={styles.digit}>
                {n}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

export default function Departments() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const current = DEPARTMENTS[active];

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(`.${styles.row}`, {
        yPercent: 40,
        autoAlpha: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.09,
        scrollTrigger: { trigger: `.${styles.list}`, start: "top 80%", once: true },
      });
      gsap.from(`.${styles.heading}`, {
        yPercent: 30,
        autoAlpha: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 75%", once: true },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="departments" className={styles.departments} data-surface="light">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <p className="label">Табло лобби</p>
          <h2 className={styles.heading}>Отделы</h2>
        </header>

        <ul className={styles.list}>
          {DEPARTMENTS.map((d, i) => {
            const open = i === active;
            return (
              <li key={d.name} className={styles.row} data-open={open} data-tone={d.tone}>
                <button
                  type="button"
                  className={styles.trigger}
                  aria-expanded={open}
                  aria-controls={`dept-${i}`}
                  onClick={() => setActive(i)}
                  onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
                  onFocus={() => setActive(i)}
                >
                  <span className={`label ${styles.floor}`}>Этаж {d.floor}</span>
                  <span className={styles.name}>
                    <span className={styles.nameText}>{d.name}</span>
                  </span>
                </button>
                <div id={`dept-${i}`} className={styles.panel} role="region" aria-label={d.name}>
                  <div className={styles.panelInner}>
                    <ul className={styles.services}>
                      {d.services.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                    <p className={styles.outcomeMobile}>
                      <span className="label">На выходе</span>
                      {d.outcome}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className={styles.elevator} aria-live="polite">
          <div className={styles.elevatorBox} data-tone={current.tone}>
            <p className="label">Вы на этаже</p>
            <FloorBoard floor={current.floor} />
            <p className={styles.elevatorName}>{current.name}</p>
            <div className={styles.outcome}>
              <span className="label">На выходе</span>
              <p key={current.name} className={styles.outcomeText}>
                {current.outcome}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
