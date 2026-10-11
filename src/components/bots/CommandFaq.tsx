"use client";

import { useId, useState } from "react";
import type { BOTS } from "@/content/bots";
import styles from "./CommandFaq.module.css";

type Data = (typeof BOTS)["faq"];

/**
 * Вопросы как меню команд бота: слева список «/команда и что она делает», справа
 * ответ. Все ответы лежат в разметке, неактивные скрыты, поиск видит их целиком.
 */
export default function CommandFaq({ data }: { data: Data }) {
  const id = useId();
  const [open, setOpen] = useState(0);

  return (
    <section className={styles.section} data-surface="light" aria-labelledby="cmd-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="cmd-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.hint}>{data.hint}</p>
        </header>

        <div className={styles.menu} role="tablist" aria-orientation="vertical" aria-label="Команды">
          {data.items.map((x, i) => (
            <button
              key={x.cmd}
              type="button"
              role="tab"
              id={`${id}-t${i}`}
              aria-selected={i === open}
              aria-controls={`${id}-p${i}`}
              tabIndex={i === open ? 0 : -1}
              className={styles.cmd}
              onClick={() => setOpen(i)}
              onKeyDown={(e) => {
                const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
                if (!step) return;
                e.preventDefault();
                const next = (open + step + data.items.length) % data.items.length;
                setOpen(next);
                document.getElementById(`${id}-t${next}`)?.focus();
              }}
            >
              <span className={styles.slash}>{x.cmd}</span>
              <span className={styles.q}>{x.q}</span>
            </button>
          ))}
        </div>

        <div className={styles.screen}>
          {data.items.map((x, i) => (
            <div key={x.cmd} id={`${id}-p${i}`} role="tabpanel" aria-labelledby={`${id}-t${i}`} hidden={i !== open} className={styles.panel}>
              <p className={styles.sent}>{x.cmd}</p>
              <h3 className={styles.answerQ}>{x.q}</h3>
              <p className={styles.answer}>{x.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
