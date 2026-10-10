"use client";

import { useId, useState } from "react";
import type { GEO } from "@/content/geo";
import styles from "./SearchFaq.module.css";

type Data = (typeof GEO)["faq"];

/** Подсвечивает совпадение с запросом в подсказке, как поиск по карте */
function Hit({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/**
 * Вопросы как поиск по карте: строка поиска, под ней подсказки с булавками,
 * совпадение подсвечивается. Выбранная подсказка открывает ответ справа, как карточку
 * места. Если ничего не нашлось, предлагаем задать вопрос на созвоне.
 */
export default function SearchFaq({ data }: { data: Data }) {
  const id = useId();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const query = q.trim();
  const list = data.items
    .map((it, i) => ({ ...it, i }))
    .filter((it) => !query || (it.q + " " + it.a).toLowerCase().includes(query.toLowerCase()));
  const current = list.find((it) => it.i === sel) ?? list[0];

  return (
    <section className={styles.section} data-surface="light" aria-labelledby="sfaq-title">
      <div className={`wrap ${styles.grid}`}>
        <h2 id="sfaq-title" className={styles.title}>
          {data.title}
          <span className={styles.dotMark}>.</span>
        </h2>

        <div className={styles.searchCol}>
          <div className={styles.search}>
            <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="m15 15 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <label htmlFor={`${id}-q`} className="visually-hidden">
              Поиск по вопросам
            </label>
            <input
              id={`${id}-q`}
              className={styles.input}
              type="search"
              value={q}
              placeholder={data.placeholder}
              onChange={(e) => setQ(e.target.value)}
              aria-controls={`${id}-list`}
            />
          </div>

          <ul id={`${id}-list`} className={styles.list} aria-live="polite">
            {list.map((it) => (
              <li key={it.q}>
                <button
                  type="button"
                  className={styles.row}
                  aria-pressed={current?.i === it.i}
                  onClick={() => setSel(it.i)}
                >
                  <svg viewBox="0 0 32 40" className={styles.pin} aria-hidden="true">
                    <path d="M16 39C7 27 2 21 2 14a14 14 0 1 1 28 0c0 7-5 13-14 25Z" />
                    <circle cx="16" cy="14" r="5" />
                  </svg>
                  <span>
                    <Hit text={it.q} q={query} />
                  </span>
                </button>
              </li>
            ))}
            {list.length === 0 ? <li className={styles.empty}>{data.empty}</li> : null}
          </ul>
        </div>

        <div className={styles.answerCol}>
          {current ? (
            <article key={current.i} className={styles.answer}>
              <span className={styles.answerTag}>Ответ</span>
              <h3 className={styles.answerQ}>{current.q}</h3>
              <p className={styles.answerA}>{current.a}</p>
            </article>
          ) : null}
        </div>
      </div>
    </section>
  );
}
