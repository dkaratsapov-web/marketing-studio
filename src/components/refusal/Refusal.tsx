"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { REFUSALS } from "@/content/offer";
import styles from "./Refusal.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Refusal() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>(`.${styles.card}`);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        cards.forEach((c) => (c.dataset.stamped = "true"));
        return;
      }
      // Печать падает, когда заявление прочитано: карточка поднялась выше середины экрана
      cards.forEach((card) => {
        ScrollTrigger.create({
          trigger: card,
          start: "center 62%",
          onEnter: () => (card.dataset.stamped = "true"),
          onLeaveBack: () => delete card.dataset.stamped,
        });
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="refuse"
      className={styles.refusal}
      data-surface="light"
    >
      <div className="wrap">
        <header className={styles.head}>
          <h2 className={styles.heading}>Когда мы откажем</h2>
          <p className={styles.lead}>
            Дешевле сказать это на первом созвоне, чем через три месяца
            объяснять, почему не сработало.
          </p>
        </header>

        <ol className={styles.grid}>
          {REFUSALS.map((r, i) => (
            <li key={r.case} className={styles.card}>
              <p className={`label ${styles.number}`}>Заявление {i + 1}</p>
              <h3 className={styles.case}>{r.case}</h3>
              <p className={styles.reason}>{r.reason}</p>
              {r.alt ? <p className={styles.alt}>{r.alt}</p> : null}
              <span className={styles.stamp}>Отказано</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
