"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { STROYKA } from "@/content/stroyka";
import styles from "./CostLayers.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof STROYKA)["layers"];

/**
 * Цена за квадрат врёт. Изометрическая стопка плит: сначала лежит одна розовая «Коробка», это
 * и есть цена за квадрат. По скроллу сверху падают остальные статьи затрат из калькулятора
 * дела 004, в легенде слева загорается каждая. В конце стопка подписывается как бюджет объекта.
 */
export default function CostLayers({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const parts = [...data.parts].reverse(); // снизу вверх: коробка первая
  const STEP = 34;

  useGSAP(
    () => {
      const el = root.current!;
      const slabs = gsap.utils.toArray<HTMLElement>("[data-slab]");
      const legend = gsap.utils.toArray<HTMLElement>("[data-leg]");
      const total = el.querySelector<HTMLElement>("[data-total]")!;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const tl = gsap.timeline({ defaults: { ease: "power2.in" } });
      slabs.forEach((s, i) => {
        if (i === 0) return;
        tl.fromTo(s, { "--z": i * STEP + 260, autoAlpha: 0 }, { "--z": i * STEP, autoAlpha: 1, duration: 0.6 }, (i - 1) * 0.5).fromTo(
          legend[i],
          { autoAlpha: 0.35 },
          { autoAlpha: 1, duration: 0.2 },
          "<+0.45",
        );
      });
      tl.fromTo(total, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" });
      if (reduce) {
        tl.progress(1);
        return;
      }
      ScrollTrigger.create({ trigger: el.querySelector("[data-iso]"), start: "top 75%", end: "bottom 45%", scrub: 0.6, animation: tl });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="layers-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="layers-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
          <ol className={styles.legend}>
            {parts.map((p, i) => (
              <li key={p} data-leg data-box={i === 0 || undefined}>
                <span className={styles.swatch} aria-hidden="true" />
                {p}
                {i === 0 ? <em>{data.box}</em> : null}
              </li>
            ))}
          </ol>
          <p className={styles.note}>{data.note}</p>
        </header>

        <div className={styles.iso} data-iso aria-hidden="true">
          <div className={styles.tower}>
            {parts.map((p, i) => (
              <span key={p} className={styles.slab} data-slab data-box={i === 0 || undefined} style={{ "--z": i * STEP, "--i": i } as React.CSSProperties} />
            ))}
          </div>
          <p className={styles.total} data-total>
            {data.all}
          </p>
        </div>
      </div>
    </section>
  );
}
