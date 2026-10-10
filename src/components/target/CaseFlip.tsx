"use client";

import { useId, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { TARGET } from "@/content/target";
import styles from "./CaseFlip.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof TARGET)["case"];

/** Порядок, в котором клетки переворачиваются: вразброс, но одинаково на сервере и в браузере */
function order(n: number) {
  let s = 2021;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const rank = new Array<number>(n);
  idx.forEach((cell, r) => (rank[cell] = r));
  return rank;
}

/**
 * Дело 021. Сто клеток — сто записей в салон. Сначала 88 из них по телефону и только 12 онлайн;
 * когда блок появляется, клетки по одной переворачиваются телефонной трубкой вниз,
 * пока онлайн-записей не станет 77, а число рядом досчитывает с 12 до 77.
 * Переключатель «До / После» прогоняет переворот в обе стороны.
 */
export default function CaseFlip({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const num = useRef<HTMLSpanElement>(null);
  const id = useId();
  const [after, setAfter] = useState(false);
  const rank = useMemo(() => order(100), []);
  const online = after ? data.after.online : data.before.online;

  const show = (next: boolean) => {
    setAfter(next);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const to = next ? data.after.online : data.before.online;
    const v = { n: Number(num.current?.textContent ?? 0) };
    gsap.to(v, {
      n: to,
      duration: still ? 0 : 1.6,
      ease: "power2.inOut",
      onUpdate: () => {
        if (num.current) num.current.textContent = String(Math.round(v.n));
      },
    });
  };

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: root.current!.querySelector(`.${styles.board}`),
        start: "top 70%",
        once: true,
        onEnter: () => window.setTimeout(() => show(true), 350),
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="case-title">
      <svg width="0" height="0" className={styles.defs} aria-hidden="true">
        <symbol id={`${id}-phone`} viewBox="0 0 24 24">
          <path d="M6.6 3h3l1.5 4-2 1.3a11 11 0 0 0 6.6 6.6l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.2 2 2 0 0 1 6.6 3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </symbol>
        <symbol id={`${id}-online`} viewBox="0 0 24 24">
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3.5 9.5h17M8 3v4M16 3v4M9 14.5l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
      </svg>

      <div className={`wrap ${styles.grid}`}>
        <div className={styles.text}>
          <p className={styles.code}>
            Дело {data.code} <span>· {data.client}</span>
          </p>
          <h2 id="case-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <dl className={styles.brief}>
            <div>
              <dt>Задача</dt>
              <dd>{data.task}</dd>
            </div>
            <div>
              <dt>Решение</dt>
              <dd>{data.solution}</dd>
            </div>
          </dl>
          <p className={styles.services}>{data.services}</p>
          <dl className={styles.metrics}>
            {data.metrics.map((m) => (
              <div key={m.label} className={styles.metric}>
                <dt>{m.label}</dt>
                <dd>{m.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <figure className={styles.board}>
          <div className={styles.boardHead}>
            <p className={styles.big}>
              <span className={styles.bigNum}>
                <span ref={num}>{data.before.online}</span>%
              </span>
              <span className={styles.bigLabel}>{data.after.caption}</span>
            </p>
            <div className={styles.toggle} role="group" aria-label="Период">
              {data.toggle.map((t, i) => (
                <button
                  key={t}
                  type="button"
                  className={styles.toggleBtn}
                  aria-pressed={after === (i === 1)}
                  onClick={() => show(i === 1)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div
            className={styles.cells}
            role="img"
            aria-label={`${online} записей онлайн и ${100 - online} по телефону из ста`}
          >
            {rank.map((r, i) => (
              <span
                key={i}
                className={styles.cell}
                data-on={r < online || undefined}
                style={{ "--d": `${(after ? r - data.before.online : data.after.online - r) * 18}ms` } as React.CSSProperties}
              >
                <svg className={styles.face} data-face="phone">
                  <use href={`#${id}-phone`} />
                </svg>
                <svg className={styles.face} data-face="online">
                  <use href={`#${id}-online`} />
                </svg>
              </span>
            ))}
          </div>

          <figcaption className={styles.legend}>
            <span data-k="online">{data.legend.online}</span>
            <span data-k="phone">{data.legend.phone}</span>
            <span className={styles.period}>{after ? data.after.label : data.before.label}</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
