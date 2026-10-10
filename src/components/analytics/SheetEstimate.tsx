"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { ANALYTICS } from "@/content/analytics";
import styles from "./SheetEstimate.module.css";

type Data = (typeof ANALYTICS)["estimate"];

/**
 * «Смета в таблице». Смета аналитики — лист электронной таблицы: буквы столбцов, номера
 * строк, строка формул. Когда блок появляется, рамка выделения проходит по строкам сверху
 * вниз, в строке формул видно содержимое ячейки, а в конце рамка встаёт на итог,
 * и в строке формул появляется формула. По ячейкам можно щёлкать самому.
 */
export default function SheetEstimate({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const n = data.rows.length;
  // Выделение: 0..n-1 строки сметы, n и n+1 строки итогов
  const [sel, setSel] = useState(n + 1);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const st = ScrollTrigger.create({
      trigger: root.current!.querySelector(`.${styles.sheet}`),
      start: "top 70%",
      once: true,
      onEnter: () => {
        let i = 0;
        setSel(0);
        timer.current = window.setInterval(() => {
          i += 1;
          setSel(i);
          if (i >= n + 1) window.clearInterval(timer.current);
        }, 520);
      },
    });
    return () => {
      st.kill();
      window.clearInterval(timer.current);
    };
  }, [n]);

  const rowNo = (i: number) => i + 2;
  const formula =
    sel < n
      ? { ref: `B${rowNo(sel)}`, text: data.rows[sel].name }
      : sel === n
        ? { ref: `C${rowNo(n)}`, text: data.totals[0].value }
        : { ref: `C${rowNo(n) + 1}`, text: data.formula };

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="sheet-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="sheet-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
          <a href="#brief" className={`btn btn--primary ${styles.cta}`}>
            {data.cta}
            <svg className="btn__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </a>
        </header>

        <div className={styles.sheet}>
          <div className={styles.fx} aria-hidden="true">
            <span className={styles.ref}>{formula.ref}</span>
            <span className={styles.fxIcon}>fx</span>
            <span key={sel} className={styles.fxText}>
              {formula.text}
            </span>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th aria-hidden="true" />
                <th scope="col" aria-hidden="true">A</th>
                <th scope="col">
                  B <span className="visually-hidden">{data.head[1]}</span>
                </th>
                <th scope="col">
                  C <span className="visually-hidden">{data.head[2]}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className={styles.hrow}>
                <th scope="row">1</th>
                <td>№</td>
                <td>{data.head[1]}</td>
                <td>{data.head[2]}</td>
              </tr>
              {data.rows.map((r, i) => (
                <tr key={r.name} data-sel={sel === i || undefined} onClick={() => setSel(i)}>
                  <th scope="row">{rowNo(i)}</th>
                  <td>{i + 1}</td>
                  <td>{r.name}</td>
                  <td>{r.when}</td>
                </tr>
              ))}
              {data.totals.map((t, k) => (
                <tr key={t.name} className={styles.total} data-sel={sel === n + k || undefined} onClick={() => setSel(n + k)}>
                  <th scope="row">{rowNo(n) + k}</th>
                  <td />
                  <td>{t.name}</td>
                  <td data-value>{t.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
