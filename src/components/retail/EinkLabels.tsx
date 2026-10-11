"use client";

import { useEffect, useRef, useState } from "react";
import type { RETAIL } from "@/content/retail";
import styles from "./EinkLabels.module.css";

type Data = (typeof RETAIL)["labels"];

/**
 * Цены электронными ценниками, как на полке магазина техники. Когда полка въезжает
 * в экран, ценники по очереди обновляются с характерным миганием электронной бумаги.
 */
export default function EinkLabels({ data }: { data: Data }) {
  const shelf = useRef<HTMLUListElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = shelf.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es[es.length - 1].isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className={styles.section} data-surface="dark" aria-labelledby="labels-title">
      <div className="wrap">
        <header className={styles.head}>
          <h2 id="labels-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <ul ref={shelf} className={styles.shelf} data-on={on || undefined}>
          {data.items.map((it, i) => (
            <li key={it.name} className={styles.label} data-main={("main" in it && it.main) || undefined} style={{ "--i": i } as React.CSSProperties}>
              <span className={styles.screen}>
                <span className={styles.name}>{it.name}</span>
                <span className={styles.note}>{it.note}</span>
                <span className={styles.price}>{it.price}</span>
                <span className={styles.unit}>{it.unit}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
