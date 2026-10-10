"use client";

import { useEffect, useId, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { WEB } from "@/content/web";
import styles from "./Adaptive.module.css";

type Data = (typeof WEB)["adaptive"];

const MIN = 32;

/**
 * «Под любой экран». Окно с сайтом, у которого можно тянуть край: блоки внутри
 * перестраиваются по container queries ровно так, как перестроятся на настоящем экране
 * такой ширины. Над окном ширина в пикселях и тип устройства. Когда блок появляется,
 * окно один раз само сжимается до телефона и расширяется обратно.
 */
export default function Adaptive({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const win = useRef<HTMLDivElement>(null);
  const id = useId();
  const [pct, setPct] = useState(100);
  const [px, setPx] = useState(0);

  // Настоящая ширина окна в пикселях: от неё зависит подпись устройства
  useEffect(() => {
    const el = win.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setPx(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const v = { p: 100 };
    const st = ScrollTrigger.create({
      trigger: win.current,
      start: "top 70%",
      once: true,
      onEnter: () =>
        gsap
          .timeline({ onUpdate: () => setPct(v.p) })
          .to(v, { p: MIN, duration: 1.6, ease: "power2.inOut" }, 0.3)
          .to(v, { p: 72, duration: 1.2, ease: "power2.inOut" }, "+=0.5"),
    });
    return () => st.kill();
  }, []);

  const device = [...data.widths].reverse().find((w) => px >= w.at)?.name ?? data.widths[0].name;
  const m = data.mock;

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="adaptive-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="adaptive-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.bench}>
          <div className={styles.ruler} aria-hidden="true">
            <span className={styles.device}>{device}</span>
            <span className={styles.px}>{px} px</span>
          </div>

          <div ref={win} className={styles.window} style={{ width: `${pct}%` }} aria-hidden="true">
            <div className={styles.site}>
              <div className={styles.nav}>
                <span className={styles.logo}>{m.brand}</span>
                <span className={styles.links}>
                  <span />
                  <span />
                  <span />
                </span>
                <span className={styles.call}>{m.cta}</span>
                <span className={styles.burger}>
                  <span />
                  <span />
                </span>
              </div>
              <div className={styles.hero}>
                <div className={styles.copy}>
                  <p className={styles.h}>{m.title}</p>
                  <p className={styles.p}>{m.text}</p>
                  <span className={styles.btn}>{m.cta}</span>
                </div>
                <svg className={styles.pic} viewBox="0 0 120 100">
                  <rect x="20" y="20" width="80" height="70" fill="none" stroke="#2b47e8" strokeWidth="2" />
                  <path d="M20 37h80M20 54h80M20 71h80M40 20v70M60 20v70M80 20v70" stroke="#2b47e8" strokeWidth="1.2" />
                  <rect x="52" y="74" width="16" height="16" fill="none" stroke="#ff5a1f" strokeWidth="2" />
                </svg>
              </div>
              <div className={styles.cards}>
                {m.cards.map((c) => (
                  <span key={c} className={styles.card}>
                    <span className={styles.cardPic} />
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <span className={styles.edge} />
          </div>

          <label htmlFor={`${id}-w`} className="visually-hidden">
            {data.handle}
          </label>
          <input
            id={`${id}-w`}
            type="range"
            className={styles.range}
            min={MIN}
            max={100}
            value={Math.round(pct)}
            onChange={(e) => setPct(Number(e.target.value))}
          />
          <p className={styles.note}>{data.note}</p>
        </div>
      </div>
    </section>
  );
}
