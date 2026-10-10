"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { GEO } from "@/content/geo";
import styles from "./CaseMap.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof GEO)["cases"];

/**
 * «Где это сработало». Схема с двумя городами: когда блок появляется, на неё падают
 * пины дел, и над каждым раскрывается балун, как у места на настоящей карте:
 * номер дела, клиент, главная цифра про карточку и что сделали.
 * На телефоне балуны стоят под схемой списком.
 */
export default function CaseMap({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const q = gsap.utils.selector(root);
      const tl = gsap.timeline({ paused: true });
      tl.from(q(`.${styles.pin}`), { y: -90, autoAlpha: 0, duration: 0.7, ease: "bounce.out", stagger: 0.25 })
        .from(q(`.${styles.balloon}`), { scale: 0.6, autoAlpha: 0, y: 20, transformOrigin: "50% 100%", duration: 0.5, ease: "back.out(2)", stagger: 0.25 }, "-=0.3");
      ScrollTrigger.create({
        trigger: q(`.${styles.map}`)[0],
        start: "top 70%",
        once: true,
        onEnter: () => tl.play(),
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="casemap-title">
      <div className={`wrap ${styles.grid}`}>
        <h2 id="casemap-title" className={styles.title}>
          {data.title}
          <span className={styles.dotMark}>.</span>
        </h2>

        <div className={styles.map}>
          <svg className={styles.river} viewBox="0 0 100 56" preserveAspectRatio="none" aria-hidden="true">
            <path d="M-2 18 C 14 12 24 30 38 24 S 58 10 70 22 S 88 44 102 38" fill="none" stroke="#cfe3ef" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M30 56 C 40 44 52 48 60 40 S 70 30 64 22" fill="none" stroke="#e4e4e8" strokeWidth="0.8" strokeDasharray="1.5 1.2" />
          </svg>
          {data.items.map((c, i) => (
            <div key={c.code} className={styles.place} style={{ left: `${c.x}%`, top: `${c.y}%` } as React.CSSProperties}>
              <article className={styles.balloon} data-i={i}>
                <span className={styles.code}>
                  Дело {c.code} · {c.city}
                </span>
                <span className={styles.client}>{c.client}</span>
                <span className={styles.value}>{c.value}</span>
                <span className={styles.label}>{c.label}</span>
                <p className={styles.text}>{c.text}</p>
              </article>
              <span className={styles.pin} aria-hidden="true">
                <svg viewBox="0 0 32 40">
                  <path d="M16 39C7 27 2 21 2 14a14 14 0 1 1 28 0c0 7-5 13-14 25Z" />
                </svg>
                <span className={styles.pinNo}>{i + 1}</span>
              </span>
              <span className={styles.city} aria-hidden="true">
                {c.city}
              </span>
            </div>
          ))}
        </div>
        <p className={styles.note}>{data.note}</p>
      </div>
    </section>
  );
}
