"use client";

import { useState } from "react";
import type { GEO } from "@/content/geo";
import styles from "./RoadSigns.module.css";

type Data = (typeof GEO)["refusal"];
type Kind = Data["signs"][number]["kind"];

/** Знаки рисуются целиком в SVG: «въезд запрещён», «остановка запрещена», «тупик» */
function Sign({ kind }: { kind: Kind }) {
  if (kind === "no-entry")
    return (
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="47" fill="#d6262b" stroke="#fff" strokeWidth="3" />
        <rect x="18" y="41" width="64" height="18" rx="2" fill="#fff" />
      </svg>
    );
  if (kind === "no-stop")
    return (
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="47" fill="#d6262b" stroke="#fff" strokeWidth="3" />
        <circle cx="50" cy="50" r="35" fill="#1f5fbf" />
        <path d="M25 25 75 75M75 25 25 75" stroke="#d6262b" strokeWidth="9" />
      </svg>
    );
  return (
    <svg viewBox="0 0 100 100">
      <rect x="3" y="3" width="94" height="94" rx="8" fill="#1f5fbf" stroke="#fff" strokeWidth="3" />
      <rect x="42" y="34" width="16" height="50" fill="#fff" />
      <rect x="22" y="18" width="56" height="16" fill="#d6262b" />
    </svg>
  );
}

/**
 * «Сюда не поедем». Причины отказа — дорожные знаки на столбах. Знак переворачивается
 * по нажатию (и по наведению мышью): на обороте причина. На знаке лицевой стороны
 * только короткая подпись, поэтому весь смысл в обороте, и он доступен с клавиатуры.
 */
export default function RoadSigns({ data }: { data: Data }) {
  const [open, setOpen] = useState<number[]>([]);
  const toggle = (i: number) =>
    setOpen((o) => (o.includes(i) ? o.filter((x) => x !== i) : [...o, i]));

  return (
    <section className={styles.section} data-surface="dark" aria-labelledby="signs-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="signs-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <ul className={styles.signs}>
          {data.signs.map((s, i) => (
            <li key={s.case} className={styles.item}>
              <button
                type="button"
                className={styles.flip}
                aria-expanded={open.includes(i)}
                onClick={() => toggle(i)}
              >
                <span className={styles.inner}>
                  <span className={styles.front}>
                    <span className={styles.sign}>
                      <Sign kind={s.kind} />
                    </span>
                    <span className={styles.case}>{s.case}</span>
                  </span>
                  <span className={styles.back}>
                    <span className={styles.backCase}>{s.case}</span>
                    <span className={styles.reason}>{s.reason}</span>
                  </span>
                </span>
              </button>
              <span className={styles.post} aria-hidden="true" />
            </li>
          ))}
        </ul>
        <p className={styles.hint}>{data.hint}</p>
      </div>
    </section>
  );
}
