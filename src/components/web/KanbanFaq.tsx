"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import type { WEB } from "@/content/web";
import styles from "./KanbanFaq.module.css";

gsap.registerPlugin(Flip);

type Data = (typeof WEB)["faq"];

/**
 * Вопросы как доска задач. Слева колонка «Вопрос», справа «Ответ». Нажатая карточка
 * переезжает в колонку ответа и раскрывается (GSAP Flip по data-flip-id), а прежняя
 * возвращается на своё место в списке. Ответы лежат в разметке целиком, поиск их видит.
 */
export default function KanbanFaq({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const flip = useRef<Flip.FlipState | null>(null);
  const [open, setOpen] = useState(0);

  const pick = (i: number) => {
    if (i === open) return;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      flip.current = Flip.getState(root.current!.querySelectorAll("[data-flip-id]"));
    }
    setOpen(i);
  };

  useLayoutEffect(() => {
    const state = flip.current;
    if (!state) return;
    flip.current = null;
    Flip.from(state, {
      targets: root.current!.querySelectorAll("[data-flip-id]"),
      duration: 0.6,
      ease: "power3.inOut",
      scale: false,
      absolute: true,
    });
  }, [open]);

  const it = data.items[open];

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="kanban-title">
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
              {data.columns.todo} <span>{data.items.length - 1}</span>
            </p>
            <ul className={styles.cards}>
              {data.items.map((x, i) =>
                i === open ? null : (
                  <li key={x.q}>
                    <button type="button" className={styles.card} data-flip-id={`q${i}`} onClick={() => pick(i)}>
                      <span className={styles.tag}>Q{i + 1}</span>
                      <span className={styles.q}>{x.q}</span>
                    </button>
                  </li>
                ),
              )}
            </ul>
          </div>

          <div className={styles.col} data-done>
            <p className={styles.colName}>
              {data.columns.done} <span>1</span>
            </p>
            <article className={`${styles.card} ${styles.open}`} data-flip-id={`q${open}`} aria-live="polite">
              <span className={styles.tag}>Q{open + 1}</span>
              <h3 className={styles.q}>{it.q}</h3>
              <p key={open} className={styles.a}>
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
