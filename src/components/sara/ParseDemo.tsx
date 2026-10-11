"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import type { SARA } from "@/content/sara";
import styles from "./ParseDemo.module.css";

type Data = (typeof SARA)["parse"];

/**
 * Разбор фраз. Человек выбирает фразу, она печатается, как распознанная речь, и Сара
 * раскладывает её: тип записи и поля. Индикатор показывает, что разобрано правилами,
 * без обращения к модели. Высота карточки постоянная: все варианты одинаковой формы.
 */
export default function ParseDemo({ data }: { data: Data }) {
  const [on, setOn] = useState(0);
  const text = useRef<HTMLSpanElement>(null);
  const result = useRef<HTMLDivElement>(null);
  const p = data.phrases[on];

  useEffect(() => {
    const t = text.current!;
    const rows = result.current!.querySelectorAll("[data-row]");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      t.textContent = p.text;
      return;
    }
    const v = { n: 0 };
    const tl = gsap.timeline();
    tl.set(rows, { autoAlpha: 0, x: 12 })
      .to(v, { n: p.text.length, duration: Math.min(1.4, p.text.length * 0.025), ease: "none", onUpdate: () => void (t.textContent = p.text.slice(0, Math.round(v.n))) })
      .to(rows, { autoAlpha: 1, x: 0, duration: 0.35, stagger: 0.1, ease: "power3.out" });
    return () => void tl.kill();
  }, [p]);

  return (
    <section className={styles.section} data-surface="dark" aria-labelledby="parse-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="parse-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
          <p className={styles.stat}>
            <b>{data.stat.value}</b>
            {data.stat.label}
          </p>
        </header>

        <div className={styles.demo}>
          <div className={styles.chips} role="group" aria-label="Фраза для разбора">
            {data.phrases.map((x, i) => (
              <button key={x.text} type="button" className={styles.chip} aria-pressed={i === on} onClick={() => setOn(i)}>
                {x.type}
              </button>
            ))}
          </div>

          <div className={styles.panel}>
            <p className={styles.phrase} aria-live="polite">
              <span className={styles.mic} aria-hidden="true" />
              <span>
                «<span ref={text}>{p.text}</span>»
              </span>
            </p>
            <div ref={result} className={styles.result}>
              <p className={styles.type} data-row>
                {p.type}
                <span className={styles.how}>разобрано правилами, без модели</span>
              </p>
              <dl className={styles.rows}>
                {p.rows.map(([k, v]) => (
                  <div key={k} data-row>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <p className={styles.note}>{data.note}</p>
        </div>
      </div>
    </section>
  );
}
