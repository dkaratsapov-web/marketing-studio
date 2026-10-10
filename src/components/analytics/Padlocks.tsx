"use client";

import { useState } from "react";
import type { ANALYTICS } from "@/content/analytics";
import styles from "./Padlocks.module.css";

type Data = (typeof ANALYTICS)["refusal"];

/**
 * «Без ключей не откроем». Причины отказа — три навесных замка. Нажатие открывает замок:
 * дужка поднимается и поворачивается, корпус опускается, и под ним раскрывается причина.
 * При наведении закрытый замок покачивается.
 */
export default function Padlocks({ data }: { data: Data }) {
  const [open, setOpen] = useState<number[]>([]);
  const toggle = (i: number) => setOpen((o) => (o.includes(i) ? o.filter((x) => x !== i) : [...o, i]));

  return (
    <section className={styles.section} data-surface="dark" aria-labelledby="locks-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="locks-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <ul className={styles.list}>
          {data.locks.map((l, i) => {
            const isOpen = open.includes(i);
            return (
              <li key={l.case} className={styles.item} data-open={isOpen || undefined}>
                <button type="button" className={styles.lock} aria-expanded={isOpen} aria-controls={`lock-${i}`} onClick={() => toggle(i)}>
                  <svg className={styles.icon} viewBox="0 0 80 100" aria-hidden="true">
                    <path className={styles.shackle} d="M22 46V30a18 18 0 0 1 36 0v16" />
                    <rect className={styles.body} x="10" y="44" width="60" height="50" rx="10" />
                    <circle className={styles.hole} cx="40" cy="64" r="6" />
                    <rect className={styles.hole} x="37" y="66" width="6" height="14" rx="3" />
                  </svg>
                  <span className={styles.case}>{l.case}</span>
                </button>
                <div id={`lock-${i}`} className={styles.reason}>
                  <div>
                    <p>{l.reason}</p>
                    {l.alt ? <p className={styles.alt}>{l.alt}</p> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <p className={styles.hint}>{data.hint}</p>
      </div>
    </section>
  );
}
