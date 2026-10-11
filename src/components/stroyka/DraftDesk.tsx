"use client";

import Image from "next/image";
import { useState } from "react";
import type { STROYKA } from "@/content/stroyka";
import styles from "./DraftDesk.module.css";

type Data = (typeof STROYKA)["desk"];

/** Наклон листов в стопке */
const TILT = [-4, 3, -2, 5, -3, 2];

/**
 * Чертёжный стол: слева стопка листов с экранами «Сферы», каждый приклеен уголком скотча.
 * Выбранный лист вытягивается из стопки на стол (выезжает с поворотом), под ним подпись,
 * что это за экран и зачем он проектной компании.
 */
export default function DraftDesk({ data }: { data: Data }) {
  const [on, setOn] = useState(0);
  const s = data.sheets[on];

  return (
    <section className={styles.section} data-surface="dark" aria-labelledby="desk-title">
      <div className="wrap">
        <header className={styles.head}>
          <h2 id="desk-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.mat}>
          <ul className={styles.stack}>
            {data.sheets.map((x, i) => (
              <li key={x.key} style={{ "--t": `${TILT[i % TILT.length]}deg`, "--i": i } as React.CSSProperties}>
                <button type="button" className={styles.tab} aria-pressed={i === on} onClick={() => setOn(i)}>
                  <span className={styles.tabImg}>
                    <Image src={x.img} alt="" sizes="9rem" />
                  </span>
                  <span className={styles.tabName}>
                    <span className={styles.tabNo}>Лист {i + 1}</span>
                    {x.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <figure key={s.key} className={styles.sheet} data-phone={s.phone || undefined}>
            <span className={styles.tape} data-c="a" aria-hidden="true" />
            <span className={styles.tape} data-c="b" aria-hidden="true" />
            <div className={styles.paper}>
              <Image src={s.img} alt={s.alt} className={styles.img} sizes="(max-width: 960px) 92vw, 55vw" />
            </div>
            <figcaption className={styles.caption}>
              <b>
                Лист {on + 1} · {s.name}
              </b>
              <span>{s.text}</span>
            </figcaption>
          </figure>
        </div>
        <p className={styles.note}>{data.note}</p>
      </div>
    </section>
  );
}
