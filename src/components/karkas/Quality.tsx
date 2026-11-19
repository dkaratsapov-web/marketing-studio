"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { KARKAS } from "@/content/karkas";
import b from "./Block.module.css";
import styles from "./Quality.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Контроль качества. Поле 69 × 5 клеток — все страницы на пяти ширинах экрана: по скроллу
 * они загораются одна за другой, как идёт визуальный прогон. Рядом отчёт печатается строками.
 */
export default function Quality({ data }: { data: typeof KARKAS.quality }) {
  const root = useRef<HTMLElement>(null);
  const total = data.pages * data.widths;

  useGSAP(
    () => {
      const el = root.current!;
      const cells = [...el.querySelectorAll<HTMLElement>(`.${styles.cell}`)];
      const lines = [...el.querySelectorAll<HTMLElement>(`.${styles.log} li`)];
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const st = { n: 0 };
      const counter = el.querySelector<HTMLElement>(`.${styles.done}`)!;
      const apply = () => {
        const n = Math.round(st.n);
        cells.forEach((c, i) => c.toggleAttribute("data-on", i < n));
        counter.textContent = `${n}/${total}`;
        lines.forEach((l, i) => l.toggleAttribute("data-on", n >= ((i + 1) / lines.length) * total * 0.98));
      };
      apply();
      gsap.to(st, { n: total, ease: "none", onUpdate: apply, scrollTrigger: { trigger: el.querySelector(`.${styles.board}`), start: "top 75%", end: "bottom 50%", scrub: 0.5 } });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={b.section} data-surface="dark" aria-labelledby="kk-quality">
      <div className="wrap">
        <div className={b.head}>
          <h2 id="kk-quality" className={b.title}>
            {data.title}
            <span className={b.dot}>.</span>
          </h2>
          <p className={b.lead}>{data.lead}</p>
        </div>

        <div className={styles.grid}>
          <figure className={styles.board}>
            <div className={styles.cells} aria-hidden="true">
              {Array.from({ length: total }, (_, i) => (
                <span key={i} className={styles.cell} data-on />
              ))}
            </div>
            <figcaption className={styles.boardCap}>
              <span>{data.pages} страниц × {data.widths} ширин экрана</span>
              <b className={styles.done}>
                {total}/{total}
              </b>
            </figcaption>
          </figure>

          <div className={styles.side}>
            <ul className={styles.checks}>
              {data.checks.map((c) => (
                <li key={c.value}>
                  <b>{c.value}</b>
                  <span>{c.label}</span>
                </li>
              ))}
            </ul>
            <figure className={styles.term}>
              <ol className={styles.log}>
                {data.log.map((l) => (
                  <li key={l} data-on>
                    <span aria-hidden="true">✓</span> {l}
                  </li>
                ))}
              </ol>
              <figcaption>{data.logNote}</figcaption>
            </figure>
          </div>
        </div>

        <p className={styles.stack}>{data.stack}</p>
      </div>
    </section>
  );
}
