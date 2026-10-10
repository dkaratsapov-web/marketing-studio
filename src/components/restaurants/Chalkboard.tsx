"use client";

import { useId, useState } from "react";
import type { RESTAURANTS } from "@/content/restaurants";
import styles from "./Chalkboard.module.css";

type Data = (typeof RESTAURANTS)["faq"];

/**
 * Вопросы на меловой доске, как «блюда дня» у входа. Слева вопросы мелом, нажатый
 * подчёркивается; справа на доске появляется ответ: мел «пишется» слева направо
 * (маска протягивается), а прежний ответ стирается.
 */
export default function Chalkboard({ data }: { data: Data }) {
  const id = useId();
  const [open, setOpen] = useState(0);
  const it = data.items[open];

  return (
    <section className={styles.section} data-surface="light" aria-labelledby="chalk-title">
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.board}>
          <h2 id="chalk-title" className={styles.title}>
            {data.title}
          </h2>
          <div className={styles.cols}>
            <ul className={styles.qs} role="tablist" aria-label="Вопросы">
              {data.items.map((x, i) => (
                <li key={x.q}>
                  <button
                    type="button"
                    role="tab"
                    id={`${id}-t${i}`}
                    aria-selected={i === open}
                    aria-controls={`${id}-p`}
                    className={styles.q}
                    onClick={() => setOpen(i)}
                  >
                    {x.q}
                  </button>
                </li>
              ))}
            </ul>
            <div id={`${id}-p`} role="tabpanel" aria-labelledby={`${id}-t${open}`} className={styles.answer}>
              <p key={open} className={styles.chalk}>
                {it.a}
              </p>
            </div>
          </div>
          <span className={styles.ledge} aria-hidden="true">
            <span />
            <span />
          </span>
        </div>
      </div>
    </section>
  );
}
