"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { RESTAURANTS } from "@/content/restaurants";
import styles from "./BillFolder.module.css";

type Data = (typeof RESTAURANTS)["case"];

/**
 * Дело 001 в кожаной папке для счёта. Папка лежит закрытой; когда блок появляется,
 * обложка откидывается влево, как в ресторане, и внутри «счёт»: что сделали —
 * строками заказа, результаты — итогом. Кнопкой папку можно закрыть и открыть снова.
 */
export default function BillFolder({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = window.setTimeout(() => setOpen(true), 0);
      return () => window.clearTimeout(t);
    }
    const st = ScrollTrigger.create({
      trigger: root.current!.querySelector(`.${styles.folder}`),
      start: "top 65%",
      once: true,
      onEnter: () => setOpen(true),
    });
    return () => st.kill();
  }, []);

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="bill-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <p className={styles.code}>
            Дело {data.code} · {data.client}
          </p>
          <h2 id="bill-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.task}>{data.task}</p>
          <p className={styles.services}>{data.services}</p>
          <button type="button" className={styles.toggle} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? "Закрыть папку" : data.open}
          </button>
        </header>

        <figure className={styles.folder} data-open={open || undefined}>
          {/* Внутренняя страница: счёт */}
          <div className={styles.inside}>
            <p className={styles.billHead}>
              {data.folder} · дело {data.code}
            </p>
            <ol className={styles.lines}>
              {data.lines.map((l, i) => (
                <li key={l}>
                  <span>{l}</span>
                  <span className={styles.qty}>{i + 1}</span>
                </li>
              ))}
            </ol>
            <dl className={styles.totals}>
              {data.totals.map((t) => (
                <div key={t.label}>
                  <dt>{t.label}</dt>
                  <dd>{t.value}</dd>
                </div>
              ))}
            </dl>
            <p className={styles.tip}>{data.tip}</p>
          </div>
          {/* Обложка: откидывается влево вокруг корешка */}
          <div className={styles.cover} aria-hidden="true">
            <span className={styles.coverFront}>
              <span className={styles.emboss}>{data.folder}</span>
            </span>
            <span className={styles.coverBack} />
          </div>
        </figure>
      </div>
    </section>
  );
}
