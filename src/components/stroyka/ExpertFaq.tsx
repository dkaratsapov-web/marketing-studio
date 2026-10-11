"use client";

import { useState } from "react";
import type { STROYKA } from "@/content/stroyka";
import styles from "./ExpertFaq.module.css";

type Data = (typeof STROYKA)["faq"];

/**
 * Вопросы как заключение экспертизы: таблица замечаний. Раскрытое замечание получает ответ
 * и меняет статус с «Открыто» на «Устранено», внизу растёт счётчик снятых замечаний.
 */
export default function ExpertFaq({ data }: { data: Data }) {
  const [open, setOpen] = useState<number | null>(0);
  const [seen, setSeen] = useState<number[]>([0]);

  const toggle = (i: number) => {
    setOpen((o) => (o === i ? null : i));
    setSeen((s) => (s.includes(i) ? s : [...s, i]));
  };

  return (
    <section className={styles.section} data-surface="light" aria-labelledby="expert-title">
      <div className="wrap">
        <header className={styles.head}>
          <h2 id="expert-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.counter} aria-live="polite">
            Снято {seen.length} из {data.items.length}
          </p>
        </header>

        <ol className={styles.list}>
          {data.items.map((it, i) => {
            const isOpen = open === i;
            const done = seen.includes(i);
            return (
              <li key={it.q} className={styles.item} data-open={isOpen || undefined}>
                <h3 className={styles.qWrap}>
                  <button type="button" className={styles.q} aria-expanded={isOpen} aria-controls={`exp-a-${i}`} onClick={() => toggle(i)}>
                    <span className={styles.no}>{i + 1}</span>
                    <span className={styles.qText}>{it.q}</span>
                    <span className={styles.status} data-done={done || undefined}>
                      {done ? data.status : "Открыто"}
                    </span>
                  </button>
                </h3>
                <div id={`exp-a-${i}`} className={styles.a} role="region" aria-label={it.q}>
                  <div className={styles.aIn}>
                    <p>{it.a}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
