"use client";

import { useState } from "react";
import type { AVTO } from "@/content/avtobiznes";
import styles from "./OwnerManual.module.css";

type Data = (typeof AVTO)["faq"];

/**
 * Вопросы как руководство владельца: слева оглавление с номерами глав, справа открытая
 * страница. Смена главы перелистывает страницу (поворот по корешку слева).
 */
export default function OwnerManual({ data }: { data: Data }) {
  const [on, setOn] = useState(0);
  const it = data.items[on];

  return (
    <section className={styles.section} data-surface="light" aria-labelledby="manual-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="manual-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
        </header>

        <div className={styles.book}>
          <ol className={styles.toc} role="tablist" aria-label="Вопросы">
            {data.items.map((x, i) => (
              <li key={x.q} role="presentation">
                <button
                  type="button"
                  role="tab"
                  id={`man-tab-${i}`}
                  aria-selected={i === on}
                  aria-controls="man-page"
                  className={styles.chapter}
                  onClick={() => setOn(i)}
                >
                  <span className={styles.chNo}>Глава {i + 1}</span>
                  <span>{x.q}</span>
                </button>
              </li>
            ))}
          </ol>
          <article id="man-page" role="tabpanel" aria-labelledby={`man-tab-${on}`} className={styles.page} key={on}>
            <p className={styles.pageNo}>
              Глава {on + 1} из {data.items.length}
            </p>
            <h3 className={styles.q}>{it.q}</h3>
            <p className={styles.a}>{it.a}</p>
          </article>
        </div>
      </div>
    </section>
  );
}
