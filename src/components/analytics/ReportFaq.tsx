"use client";

import { useId, useState } from "react";
import type { ANALYTICS } from "@/content/analytics";
import styles from "./ReportFaq.module.css";

type Data = (typeof ANALYTICS)["faq"];

/**
 * Вопросы строками отчёта: номер, вопрос и столбик-индикатор справа. Раскрытая строка
 * подсвечивается, столбик дорастает до конца, а слева прочерчивается салатовая линия
 * по высоте ответа. Открыта одна строка за раз.
 */
export default function ReportFaq({ data }: { data: Data }) {
  const id = useId();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className={styles.section} data-surface="light" aria-labelledby="rfaq-title">
      <div className={`wrap ${styles.grid}`}>
        <h2 id="rfaq-title" className={styles.title}>
          {data.title}
          <span className={styles.dotMark}>.</span>
        </h2>

        <ul className={styles.list}>
          {data.items.map((it, i) => {
            const isOpen = open === i;
            return (
              <li key={it.q} className={styles.row} data-open={isOpen || undefined}>
                <h3 className={styles.h}>
                  <button
                    type="button"
                    className={styles.q}
                    aria-expanded={isOpen}
                    aria-controls={`${id}-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    <span className={styles.num}>{String(i + 1).padStart(2, "0")}</span>
                    <span className={styles.text}>{it.q}</span>
                    <span className={styles.bar} aria-hidden="true">
                      <span style={{ "--w": `${40 + ((i * 37) % 50)}%` } as React.CSSProperties} />
                    </span>
                  </button>
                </h3>
                <div id={`${id}-${i}`} className={styles.answer} role="region" aria-label={it.q}>
                  <div>
                    <p>{it.a}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
