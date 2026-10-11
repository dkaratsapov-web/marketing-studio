"use client";

import { useId, useState } from "react";
import type { STROYKA } from "@/content/stroyka";
import styles from "./StageSlider.module.css";

type Data = (typeof STROYKA)["stage"];

/**
 * Стадия готовности. Ползунок от «разбирается» до «готов заказывать» с тремя остановками.
 * Справа окно сайта перестраивается под стадию: статья с ассистентом, калькулятор, страница
 * услуги с формой. Слева запросы этой стадии, страница, инструмент и кнопка.
 */
export default function StageSlider({ data }: { data: Data }) {
  const id = useId();
  const [at, setAt] = useState(0);
  const st = data.steps[at];
  const n = data.steps.length;

  return (
    <section className={styles.section} data-surface="light" aria-labelledby="stage-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="stage-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.control}>
          <label htmlFor={`${id}-range`} className="visually-hidden">
            Стадия готовности клиента
          </label>
          <input
            id={`${id}-range`}
            type="range"
            min={0}
            max={n - 1}
            step={1}
            value={at}
            onChange={(e) => setAt(Number(e.target.value))}
            className={styles.range}
            style={{ "--p": at / (n - 1) } as React.CSSProperties}
            aria-valuetext={st.name}
          />
          <div className={styles.ticks} aria-hidden="true">
            {data.steps.map((s, i) => (
              <button key={s.name} type="button" tabIndex={-1} data-on={i === at || undefined} onClick={() => setAt(i)}>
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.info} key={`i${at}`} aria-live="polite">
          <p className={styles.kicker}>Ищет</p>
          <ul className={styles.queries}>
            {st.queries.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <dl className={styles.answer}>
            <div>
              <dt>Страница</dt>
              <dd>{st.page}</dd>
            </div>
            <div>
              <dt>Инструмент</dt>
              <dd>{st.tool}</dd>
            </div>
            <div>
              <dt>Кнопка</dt>
              <dd>
                <span className={styles.ctaChip}>{st.cta}</span>
              </dd>
            </div>
          </dl>
        </div>

        {/* Окно сайта: раскладка меняется под стадию */}
        <div className={styles.browser} aria-hidden="true">
          <div className={styles.bar}>
            <i />
            <i />
            <i />
          </div>
          <div className={styles.page} data-stage={at}>
            <span className={styles.hero} />
            <span className={styles.h1} />
            <span className={styles.lineA} />
            <span className={styles.lineB} />
            <span className={styles.lineC} />
            <span className={styles.calc}>
              <i style={{ "--v": 0.7 } as React.CSSProperties} />
              <i style={{ "--v": 0.4 } as React.CSSProperties} />
              <b />
            </span>
            <span className={styles.form}>
              <i />
              <b />
            </span>
            <span className={styles.chat}>?</span>
          </div>
        </div>

        <p className={styles.pair}>{data.pair}</p>
        <p className={styles.note}>{data.note}</p>
      </div>
    </section>
  );
}
