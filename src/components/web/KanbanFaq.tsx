"use client";

import { useState } from "react";
import type { WEB } from "@/content/web";
import styles from "./KanbanFaq.module.css";

type Data = (typeof WEB)["faq"];

/**
 * Вопросы как доска задач. Слева колонка «Вопрос», справа «Ответ». Нажатая карточка
 * остаётся на месте и помечается «в ответе», а в правую колонку въезжает её копия
 * с ответом. Карточки не летают между колонками, поэтому ничего не наслаивается.
 * Ответы лежат в разметке целиком, поиск их видит.
 */
export default function KanbanFaq({ data }: { data: Data }) {
  const [open, setOpen] = useState(0);
  const it = data.items[open];

  return (
    <section className={styles.section} data-surface="light" aria-labelledby="kanban-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="kanban-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.hint}>{data.hint}</p>
        </header>

        <div className={styles.board}>
          <div className={styles.col}>
            <p className={styles.colName}>
              {data.columns.todo} <span>{data.items.length}</span>
            </p>
            <ul className={styles.cards}>
              {data.items.map((x, i) => (
                <li key={x.q}>
                  <button type="button" className={styles.card} aria-pressed={i === open} onClick={() => setOpen(i)}>
                    <span className={styles.tag}>Q{i + 1}</span>
                    <span className={styles.q}>{x.q}</span>
                    <span className={styles.moved} aria-hidden="true">
                      в ответе →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.col} data-done>
            <p className={styles.colName}>
              {data.columns.done} <span>1</span>
            </p>
            <article key={open} className={`${styles.card} ${styles.open}`} aria-live="polite">
              <span className={styles.tag}>Q{open + 1}</span>
              <h3 className={styles.q}>{it.q}</h3>
              <p className={styles.a}>
                {it.a}
              </p>
            </article>
          </div>
        </div>

        <dl className="visually-hidden">
          {data.items.map((x) => (
            <div key={x.q}>
              <dt>{x.q}</dt>
              <dd>{x.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
