"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { BOTS } from "@/content/bots";
import styles from "./Levels.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof BOTS)["levels"];

/** Из чего сложен каждый уровень: снизу вверх, верхний блок новый */
const BRICKS = ["Бот", "Мини-приложение", "CRM и синхронизация"];

/**
 * Три уровня как три стопки блоков. Каждый следующий уровень стоит на предыдущем:
 * по скроллу блоки падают в стопки один за другим, и стопки складываются в лестницу.
 */
export default function Levels({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      // Десктоп: все три стопки складываются одним движением по скроллу
      mm.add("(min-width: 861px) and (prefers-reduced-motion: no-preference)", () => {
        const bricks = gsap.utils.toArray<HTMLElement>("[data-brick]");
        gsap.set(bricks, { yPercent: -260, opacity: 0 });
        gsap
          .timeline({ scrollTrigger: { trigger: "[data-stairs]", start: "top 85%", end: "top 30%", scrub: 0.6 } })
          .to(bricks, { yPercent: 0, opacity: 1, ease: "bounce.out", duration: 1, stagger: 0.55 });
      });
      // Телефон: уровни идут столбиком, каждая стопка падает, когда доезжает до экрана
      mm.add("(max-width: 860px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>("[data-stack]").forEach((stack) => {
          const bricks = stack.querySelectorAll("[data-brick]");
          gsap.set(bricks, { yPercent: -200, opacity: 0 });
          gsap.to(bricks, { yPercent: 0, opacity: 1, ease: "bounce.out", duration: 0.9, stagger: 0.18, scrollTrigger: { trigger: stack, start: "top 85%", once: true } });
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="levels-title">
      <div className="wrap">
        <header className={styles.head}>
          <h2 id="levels-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <ol className={styles.stairs} data-stairs>
          {data.items.map((it, i) => (
            <li key={it.name} className={styles.level}>
              {/* Стопка: в разметке снизу вверх, чтобы блоки падали в порядке укладки */}
              <div className={styles.stack} data-stack aria-hidden="true">
                {BRICKS.slice(0, i + 1).map((b, k) => (
                  <span key={b} className={styles.brick} data-brick data-new={k === i || undefined}>
                    {b}
                  </span>
                ))}
              </div>
              <div className={styles.body}>
                <h3 className={styles.name}>
                  <span className={styles.num}>{i + 1}</span>
                  {it.name}
                </h3>
                <p className={styles.text}>{it.text}</p>
                <p className={styles.fits}>
                  <span>Подходит, если</span>
                  {it.fits}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
