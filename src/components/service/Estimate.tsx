"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { CONTEXT } from "@/content/services";
import styles from "./Estimate.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { estimate: (typeof CONTEXT)["estimate"]; head: string; department: string };

// Штрихкод чека: тот же приём, что у пропуска на главной, но свой узор
const BARCODE = "2131213412311421321241132".split("").map(Number);

/**
 * «Смета отдела». Справа из щели принтера по мере прокрутки печатается чек со всем,
 * что входит в работу, и итогами. Печатающая головка светится салатовым, пока чек идёт.
 */
export default function Estimate({ estimate, head, department }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const tl = gsap.timeline({
        scrollTrigger: {
          // Печать начинается, как только принтер показался снизу, и заканчивается, пока он ещё в верхней трети:
          // к моменту, когда блок встаёт по центру, чек уже целиком
          trigger: `.${styles.printer}`,
          start: "top 95%",
          end: "top 32%",
          scrub: 0.5,
        },
      });
      // Верх чека прикреплён к щели, строки проявляются сверху вниз, как при настоящей печати
      tl.fromTo(
        `.${styles.receipt}`,
        { clipPath: "inset(0% 0% 100% 0%)", y: -18 },
        { clipPath: "inset(0% 0% 0% 0%)", y: 0, ease: "none", duration: 1 },
      )
        .fromTo(`.${styles.head}`, { opacity: 1 }, { opacity: 0.25, ease: "none", duration: 0.15 }, 0.85)
        .fromTo(`.${styles.total}`, { backgroundSize: "0% 100%" }, { backgroundSize: "100% 100%", ease: "power2.out", duration: 0.15 }, 0.82);
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="estimate-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.intro}>
          <p className="label">{estimate.label}</p>
          <h2 id="estimate-title" className={styles.title}>
            {estimate.title}
          </h2>
          <p className={styles.text}>{estimate.text}</p>
        </header>

        <div className={styles.printer}>
          <div className={styles.slot} aria-hidden="true">
            <span className={styles.head} />
          </div>
          <div className={styles.paperClip}>
            <article className={styles.receipt} aria-label="Смета работ отдела контекста">
              <p className={styles.rTop}>
                <span>Корпорация</span>
                <span>{department}</span>
              </p>
              <p className={styles.rNo}>Смета № 001</p>

              <ul className={styles.items}>
                {estimate.items.map((it) => (
                  <li key={it.name} className={styles.item}>
                    <span className={styles.itemName}>{it.name}</span>
                    <span className={styles.dots} aria-hidden="true" />
                    <span className={styles.itemWhen}>{it.when}</span>
                  </li>
                ))}
              </ul>

              <dl className={styles.totals}>
                {estimate.totals.map((t, i) => (
                  <div key={t.name} className={`${styles.totalRow} ${i === 1 ? styles.total : ""}`}>
                    <dt>{t.name}</dt>
                    <dd>{t.value}</dd>
                  </div>
                ))}
              </dl>

              <p className={styles.signed}>Ведёт отдел: {head}</p>
              <div className={styles.barcode} aria-hidden="true">
                {BARCODE.map((w, i) => (
                  <span key={i} style={{ flexGrow: w }} data-gap={i % 2 === 1 || undefined} />
                ))}
              </div>
              <p className={styles.thanks}>Спасибо за спрос.</p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
