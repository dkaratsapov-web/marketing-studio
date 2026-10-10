"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { TURNKEY } from "@/content/turnkey";
import styles from "./Tangle.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof TURNKEY)["tangle"];

const Y = [70, 150, 230, 310, 390];
/** Хаос: у каждой линии свои петли, часть линий не доходит до продаж */
const CHAOS = [
  "M60 70 C220 10 260 330 380 250 C500 170 520 40 700 120",
  "M60 150 C200 380 330 -20 420 200 C520 420 600 300 740 230",
  "M60 230 C160 60 300 420 400 120 C470 -60 640 90 660 330",
  "M60 310 C260 300 220 60 360 330 C480 520 620 140 740 230",
  "M60 390 C200 420 380 260 300 160 C240 80 560 420 620 400",
];
/** Порядок: все линии плавно сходятся в одну точку продаж */
const ORDER = Y.map((y) => `M60 ${y} C200 ${y} 260 ${y} 380 ${y} C540 ${y} 560 230 740 230`);

/**
 * «Пять подрядчиков или одна команда». Пять каналов слева, продажи справа. В режиме
 * подрядчиков линии путаются, петляют и не все доходят до продаж; в режиме команды
 * те же линии распрямляются и сходятся в одну точку (GSAP тянет атрибут d).
 * Когда блок появляется, переключение один раз происходит само.
 */
export default function Tangle({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const [mode, setMode] = useState(0);

  const switchTo = (m: number) => {
    setMode(m);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const paths = root.current!.querySelectorAll<SVGPathElement>("[data-line]");
    paths.forEach((p, i) =>
      gsap.to(p, { attr: { d: m ? ORDER[i] : CHAOS[i] }, duration: still ? 0 : 1.2, ease: "power3.inOut", delay: still ? 0 : i * 0.06 }),
    );
  };

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      ScrollTrigger.create({
        trigger: root.current!.querySelector(`.${styles.figure}`),
        start: "top 60%",
        once: true,
        onEnter: () => window.setTimeout(() => switchTo(1), 900),
      });
    },
    { scope: root },
  );

  const notes = mode ? data.order : data.chaos;

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="tangle-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="tangle-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
          <div className={styles.switch} role="group" aria-label="Как ведутся каналы">
            {data.modes.map((m, i) => (
              <button key={m} type="button" className={styles.opt} aria-pressed={mode === i} onClick={() => switchTo(i)}>
                {m}
              </button>
            ))}
          </div>
        </header>

        <figure className={styles.figure} data-mode={mode}>
          <svg viewBox="0 0 800 460" className={styles.svg} aria-hidden="true">
            {CHAOS.map((d, i) => (
              <path key={i} data-line d={d} className={styles.line} style={{ "--i": i } as React.CSSProperties} />
            ))}
            {Y.map((y) => (
              <circle key={y} cx="60" cy={y} r="8" className={styles.node} />
            ))}
            <circle cx="740" cy="230" r="16" className={styles.target} />
          </svg>
          {data.sources.map((s, i) => (
            <span key={s} className={styles.src} style={{ top: `${(Y[i] / 460) * 100}%` }} aria-hidden="true">
              {s}
            </span>
          ))}
          <span className={styles.tgt} aria-hidden="true">
            {data.target}
          </span>
          <figcaption className={styles.notes}>
            {notes.map((n) => (
              <span key={n} className={styles.note}>
                {n}
              </span>
            ))}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
