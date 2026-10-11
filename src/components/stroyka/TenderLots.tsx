"use client";

import { useState } from "react";
import type { STROYKA } from "@/content/stroyka";
import { openBrief } from "@/components/brief/briefBus";
import styles from "./TenderLots.module.css";

type Data = (typeof STROYKA)["tender"];

/**
 * Цены лотами тендера. Лоты отмечаются и складываются в папку «заявка» справа, она
 * собирает список и суммы. Лот «под ключ» включает все остальные, поэтому заменяет их.
 * Кнопка открывает бриф и передаёт выбранные лоты.
 */
export default function TenderLots({ data, service }: { data: Data; service: string }) {
  const main = data.lots.find((l) => l.main)!;
  const [picked, setPicked] = useState<string[]>([main.no]);

  const toggle = (no: string) =>
    setPicked((p) => {
      if (p.includes(no)) return p.filter((x) => x !== no);
      if (no === main.no) return [no];
      return [...p.filter((x) => x !== main.no), no];
    });

  const chosen = data.lots.filter((l) => picked.includes(l.no));

  return (
    <section className={styles.section} data-surface="dark" aria-labelledby="tender-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="tender-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <ul className={styles.lots}>
          {data.lots.map((l) => {
            const on = picked.includes(l.no);
            return (
              <li key={l.no}>
                <button type="button" className={styles.lot} data-main={l.main || undefined} aria-pressed={on} onClick={() => toggle(l.no)}>
                  <span className={styles.lotNo}>Лот {l.no}</span>
                  <span className={styles.lotName}>{l.name}</span>
                  <span className={styles.lotText}>{l.text}</span>
                  <span className={styles.lotPrice}>
                    <b>{l.price}</b> {l.unit}
                  </span>
                  <span className={styles.clip} aria-hidden="true">
                    {on ? data.picked : "Добавить"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <aside className={styles.folder} aria-live="polite">
          <p className={styles.folderHead}>Заявка на участие</p>
          {chosen.length ? (
            <ol className={styles.chosen}>
              {chosen.map((l) => (
                <li key={l.no}>
                  <span>
                    Лот {l.no}. {l.name}
                  </span>
                  <b>{l.price}</b>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.empty}>Отметьте лоты слева</p>
          )}
          <button
            type="button"
            className={`btn btn--primary ${styles.cta}`}
            disabled={!chosen.length}
            onClick={() => openBrief(`${service}: ${chosen.map((l) => l.name).join(", ")}`)}
          >
            {data.cta}
            <svg className="btn__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </aside>
      </div>
    </section>
  );
}
