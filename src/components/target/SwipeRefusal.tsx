"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { TARGET } from "@/content/target";
import styles from "./SwipeRefusal.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof TARGET)["refusal"];

const SWIPE_PX = 90;

/**
 * «Когда мы откажем». Причины отказа — стопка карточек, которую смахивают пальцем,
 * как анкеты в приложении: верхнюю можно утащить влево или вправо, кнопки делают то же.
 * Когда стопка кончилась, карточки возвращаются. При появлении верхняя карточка
 * один раз покачивается, подсказывая, что её можно смахнуть. Слева условия работы.
 */
export default function SwipeRefusal({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const [top, setTop] = useState(0);
  const drag = useRef<{ x: number; dx: number; el: HTMLElement } | null>(null);
  const n = data.cards.length;

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const first = root.current!.querySelector<HTMLElement>(`[data-pos="0"] .${styles.inner}`);
      ScrollTrigger.create({
        trigger: root.current!.querySelector(`.${styles.stack}`),
        start: "top 70%",
        once: true,
        onEnter: () => {
          gsap.timeline({ delay: 0.4 })
            .to(first, { x: -38, rotate: -4, duration: 0.35, ease: "power2.out" })
            .to(first, { x: 0, rotate: 0, duration: 0.9, ease: "elastic.out(1, 0.45)" });
        },
      });
    },
    { scope: root },
  );

  const go = (d: number) => setTop((t) => (t + d + n + 1) % (n + 1));

  const down = (e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, dx: 0, el };
    el.style.transition = "none";
  };
  const move = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    d.dx = e.clientX - d.x;
    d.el.style.transform = `translateX(${d.dx}px) rotate(${d.dx / 18}deg)`;
  };
  const up = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    d.el.style.transition = "";
    d.el.style.transform = "";
    if (Math.abs(d.dx) > SWIPE_PX) go(1);
  };

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="refusal-title">
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.text}>
          <h2 id="refusal-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
          <div className={styles.terms}>
            <h3 className={styles.termsTitle}>{data.terms.title}</h3>
            <ul className={styles.termsList}>
              {data.terms.items.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.stackWrap}>
          <ol className={styles.stack}>
            {data.cards.map((c, i) => {
              // Позиция относительно верхней карточки: меньше нуля — уже смахнута
              const pos = i - top;
              return (
                <li
                  key={c.case}
                  className={styles.card}
                  data-pos={Math.max(-1, Math.min(pos, 3))}
                  style={{ zIndex: n - i }}
                >
                  <article
                    className={styles.inner}
                    onPointerDown={pos === 0 ? down : undefined}
                    onPointerMove={pos === 0 ? move : undefined}
                    onPointerUp={pos === 0 ? up : undefined}
                    onPointerCancel={pos === 0 ? up : undefined}
                  >
                    <span className={styles.count}>
                      {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
                    </span>
                    <span className={styles.cross} aria-hidden="true" />
                    <h3 className={styles.case}>{c.case}</h3>
                    <p className={styles.reason}>{c.reason}</p>
                    {c.alt ? <p className={styles.alt}>{c.alt}</p> : null}
                  </article>
                </li>
              );
            })}
            <li className={styles.end} data-on={top === n || undefined}>
              <p>Это все причины. Остальное обсудим на созвоне.</p>
            </li>
          </ol>
          <div className={styles.controls}>
            <button type="button" className={styles.ctrl} onClick={() => go(-1)} aria-label={data.prev} disabled={top === 0}>
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M15 8H2M7 3 2 8l5 5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            <span className={styles.progress} aria-live="polite">
              {top < n ? `${top + 1} из ${n}` : "все причины"}
            </span>
            <button type="button" className={styles.ctrl} onClick={() => go(1)} aria-label={data.next}>
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
