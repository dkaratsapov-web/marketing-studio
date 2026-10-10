"use client";

import { useState } from "react";
import type { TURNKEY } from "@/content/turnkey";
import styles from "./Tickets.module.css";

type Data = (typeof TURNKEY)["refusal"];

/**
 * «Когда не возьмёмся». Причины отказа — билеты с отрывным корешком по перфорации.
 * Корешок закрывает причину; нажатие отрывает его: он поворачивается и падает,
 * а под ним напечатана причина. Высота билета не меняется, поэтому ряд не прыгает.
 */
export default function Tickets({ data }: { data: Data }) {
  const [torn, setTorn] = useState<number[]>([]);

  return (
    <section className={styles.section} data-surface="light" aria-labelledby="tickets-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="tickets-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <ul className={styles.list}>
          {data.tickets.map((t, i) => {
            const isTorn = torn.includes(i);
            return (
              <li key={t.no} className={styles.ticket} data-torn={isTorn || undefined}>
                <div className={styles.main}>
                  <span className={styles.no}>Отказ № {t.no}</span>
                  <h3 className={styles.case}>{t.case}</h3>
                </div>
                <div className={styles.under} id={`ticket-${i}`}>
                  <p>{t.reason}</p>
                  {t.alt ? <p className={styles.alt}>{t.alt}</p> : null}
                </div>
                <button
                  type="button"
                  className={styles.stub}
                  aria-expanded={isTorn}
                  aria-controls={`ticket-${i}`}
                  onClick={() => setTorn((x) => (x.includes(i) ? x : [...x, i]))}
                  disabled={isTorn}
                >
                  <span className={styles.stubNo}>{t.no}</span>
                  <span className={styles.stubText}>{data.tear}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
