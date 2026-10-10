"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { GEO } from "@/content/geo";
import styles from "./Reviews.module.css";

type Data = (typeof GEO)["reviews"];

/**
 * «Отвечаем за вас». Три типа отзывов: благодарность, жалоба, вопрос. Отзыв уже висит
 * в карточке, а ответ владельца набирается на глазах, буква за буквой, с курсором.
 * Ответ начинает печататься, когда блок появился, и заново при смене вкладки.
 * Полный текст ответа лежит рядом для экранных дикторов, печать для них скрыта.
 */
export default function Reviews({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const out = useRef<HTMLSpanElement>(null);
  const seen = useRef(false);
  const [active, setActive] = useState(0);
  const [typing, setTyping] = useState(false);
  const it = data.tabs[active];

  // Печать ответа: при первом появлении блока и при каждой смене вкладки
  useEffect(() => {
    const el = out.current;
    if (!el) return;
    const text = data.tabs[active].reply;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let tween: gsap.core.Tween | null = null;
    const type = () => {
      if (still) {
        el.textContent = text;
        return;
      }
      const v = { n: 0 };
      setTyping(true);
      tween = gsap.to(v, {
        n: text.length,
        duration: Math.min(3.2, text.length * 0.028),
        ease: "none",
        delay: 0.5,
        onUpdate: () => {
          el.textContent = text.slice(0, Math.round(v.n));
        },
        onComplete: () => setTyping(false),
      });
    };
    el.textContent = "";
    if (seen.current) {
      type();
      return () => {
        tween?.kill();
      };
    }
    const st = ScrollTrigger.create({
      trigger: root.current,
      start: "top 60%",
      once: true,
      onEnter: () => {
        seen.current = true;
        type();
      },
    });
    return () => {
      st.kill();
      tween?.kill();
    };
  }, [active, data.tabs]);

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="reviews-title">
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.side}>
          <h2 id="reviews-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
          <div className={styles.tabs} role="group" aria-label="Тип отзыва">
            {data.tabs.map((t, i) => (
              <button
                key={t.key}
                type="button"
                className={styles.tab}
                aria-pressed={i === active}
                onClick={() => setActive(i)}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <figure className={styles.thread}>
          <div key={it.key} className={styles.review}>
            <span className={styles.ava} aria-hidden="true">
              {it.author[0]}
            </span>
            <div className={styles.body}>
              <span className={styles.author}>{it.author}</span>
              <span className={styles.stars} role="img" aria-label={`Оценка ${it.stars} из 5`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <svg key={i} viewBox="0 0 24 24" data-on={i < it.stars || undefined}>
                    <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9Z" />
                  </svg>
                ))}
              </span>
              <p className={styles.text}>{it.text}</p>
            </div>
          </div>

          <div className={styles.answer}>
            <span className={styles.owner}>{data.owner}</span>
            <p className={styles.reply}>
              <span className="visually-hidden">{it.reply}</span>
              <span ref={out} aria-hidden="true" />
              <span className={styles.caret} data-on={typing || undefined} aria-hidden="true" />
            </p>
          </div>
          <figcaption className={styles.note}>{data.note}</figcaption>
        </figure>
      </div>
    </section>
  );
}
