"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { CONTEXT } from "@/content/services";
import styles from "./NotClicks.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { report: (typeof CONTEXT)["report"] };

/**
 * «Мы не продаём клики». Метрики, которыми обычно хвастаются в отчётах, по прокрутке
 * по очереди зачёркиваются и гаснут, а последней строкой встаёт то, за что платит бизнес.
 * Родственно манифесту главной (там слова подсвечиваются), здесь наоборот: вычёркиваются.
 */
export default function NotClicks({ report }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const rows = gsap.utils.toArray<HTMLElement>(`.${styles.row}`);
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: `.${styles.list}`,
          start: "top 72%",
          end: "bottom 45%",
          scrub: 0.6,
        },
      });
      rows.forEach((row, i) => {
        tl.fromTo(row.querySelector(`.${styles.strike}`), { scaleX: 0 }, { scaleX: 1, duration: 1, ease: "power2.inOut" }, i * 0.8)
          .to(row.querySelector(`.${styles.word}`), { opacity: 0.28, duration: 0.6, ease: "none" }, i * 0.8 + 0.5)
          .to(row.querySelector(`.${styles.note}`), { opacity: 0.4, duration: 0.6, ease: "none" }, "<");
      });
      tl.fromTo(`.${styles.resultLine}`, { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: "power3.out" }, ">-0.2")
        .fromTo(`.${styles.resultMark}`, { backgroundSize: "0% 100%" }, { backgroundSize: "100% 100%", duration: 0.9, ease: "power2.out" }, ">-0.3");
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="not-clicks-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <p className="label">{report.label}</p>
          <h2 id="not-clicks-title" className={styles.title}>
            {report.title}
          </h2>
        </header>

        <div className={styles.list}>
          <ul className={styles.rows}>
            {report.struck.map((m) => (
              <li key={m.word} className={styles.row}>
                <span className={styles.wordWrap}>
                  <s className={styles.word}>{m.word}</s>
                  <span className={styles.strike} aria-hidden="true" />
                </span>
                <span className={styles.note}>{m.note}</span>
              </li>
            ))}
          </ul>
          <p className={styles.result}>
            <span className={styles.resultMask}>
              <span className={styles.resultLine}>
                <span className={styles.resultMark}>{report.result}</span>
                <span className={styles.resultDot}>.</span>
              </span>
            </span>
          </p>
        </div>

        <div className={styles.copy}>
          {report.text.map((t) => (
            <p key={t}>{t}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
