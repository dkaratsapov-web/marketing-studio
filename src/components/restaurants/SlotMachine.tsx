"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { RESTAURANTS } from "@/content/restaurants";
import styles from "./SlotMachine.module.css";

type Data = (typeof RESTAURANTS)["slots"];

const LOOPS = 6;

/**
 * «Гость ищет повод». Однорукий бандит: в окне барабан с поисковыми запросами-поводами.
 * Рычаг прокручивает барабан, он останавливается на следующем поводе с отскоком,
 * а под окном выезжает объявление под этот повод. Первый раз барабан крутится сам,
 * когда блок появляется на экране.
 */
export default function SlotMachine({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const n = data.reels.length;
  // Позиция на длинной ленте: растёт с каждым прокручиванием, лента не отматывается назад
  const [pos, setPos] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const idx = pos % n;

  const spin = () => {
    if (spinning) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSpinning(!still);
    setPos((p) => (p + n * 2 + 1 >= n * LOOPS ? (p % n) + 1 : p + n * 2 + 1));
  };

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const st = ScrollTrigger.create({
      trigger: root.current!.querySelector(`.${styles.machine}`),
      start: "top 65%",
      once: true,
      onEnter: () => window.setTimeout(() => {
        setSpinning(true);
        setPos(n * 2 + 1);
      }, 400),
    });
    return () => st.kill();
  }, [n]);

  const reel = Array.from({ length: n * LOOPS }, (_, i) => data.reels[i % n].query);
  const r = data.reels[idx];

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="slots-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="slots-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <figure className={styles.machine}>
          <div className={styles.cabinet}>
            <div className={styles.window}>
              <span className={styles.search} aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="m15 15 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <div
                className={styles.reel}
                style={{ "--pos": pos } as React.CSSProperties}
                data-spin={spinning || undefined}
                onTransitionEnd={() => setSpinning(false)}
                aria-hidden="true"
              >
                {reel.map((q, i) => (
                  <span key={i} className={styles.item}>
                    {q}
                  </span>
                ))}
              </div>
              <span className="visually-hidden" aria-live="polite">
                {r.query}
              </span>
            </div>
            <div key={pos} className={styles.ad} data-wait={spinning || undefined}>
              <span className={styles.adLabel}>{data.adLabel}</span>
              <span className={styles.adText}>{r.ad}</span>
            </div>
          </div>

          <button type="button" className={styles.lever} onClick={spin} disabled={spinning} aria-label={`${data.lever}: следующий повод`}>
            <span className={styles.stick} data-pull={spinning || undefined} />
            <span className={styles.leverText}>{data.lever}</span>
          </button>
          <figcaption className={styles.note}>{data.note}</figcaption>
        </figure>
      </div>
    </section>
  );
}
