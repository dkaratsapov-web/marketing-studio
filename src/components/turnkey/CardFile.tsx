"use client";

import { useId, useState } from "react";
import type { TURNKEY } from "@/content/turnkey";
import styles from "./CardFile.module.css";

type Data = (typeof TURNKEY)["faq"];

/**
 * Вопросы картотекой: карточки стоят в ящике одна за другой, у каждой торчит
 * свой язычок с темой. Нажатый язычок вытягивает карточку вверх и вперёд, на ней
 * вопрос и ответ. Язычки — вкладки (tablist), ими можно пройти с клавиатуры.
 */
export default function CardFile({ data }: { data: Data }) {
  const id = useId();
  const [open, setOpen] = useState(0);
  const n = data.items.length;

  return (
    <section className={styles.section} data-surface="dark" aria-labelledby="cardfile-title">
      <div className={`wrap ${styles.grid}`}>
        <h2 id="cardfile-title" className={styles.title}>
          {data.title}
          <span className={styles.dotMark}>.</span>
        </h2>

        <div className={styles.drawer}>
          <div className={styles.tabs} role="tablist" aria-label="Темы вопросов">
            {data.items.map((it, i) => (
              <button
                key={it.tab}
                type="button"
                role="tab"
                id={`${id}-t${i}`}
                aria-selected={i === open}
                aria-controls={`${id}-p${i}`}
                className={styles.tab}
                style={{ "--i": i, "--n": n } as React.CSSProperties}
                onClick={() => setOpen(i)}
              >
                {it.tab}
              </button>
            ))}
          </div>

          <div className={styles.cards}>
            {data.items.map((it, i) => (
              <article
                key={it.tab}
                id={`${id}-p${i}`}
                role="tabpanel"
                aria-labelledby={`${id}-t${i}`}
                hidden={i !== open}
                className={styles.card}
                data-depth={i === open ? 0 : 1 + ((i - open + n) % n)}
              >
                <h3 className={styles.q}>{it.q}</h3>
                <p className={styles.a}>{it.a}</p>
              </article>
            ))}
            {/* Задние карточки: только края, показывают, что ящик полный */}
            {Array.from({ length: 3 }, (_, k) => (
              <span key={k} className={styles.back} style={{ "--k": k + 1 } as React.CSSProperties} aria-hidden="true" />
            ))}
          </div>
          <span className={styles.box} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
