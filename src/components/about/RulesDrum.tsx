"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { ABOUT } from "@/content/about";
import styles from "./RulesDrum.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof ABOUT)["rules"];

/**
 * Правила дома на барабане картотеки. Блок закреплён на время прокрутки, барабан
 * поворачивается скроллом и защёлкивается на каждой карточке. Дальние карточки темнеют
 * по косинусу угла, слева подсвечивается номер текущего правила.
 */
export default function RulesDrum({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const n = data.items.length;
  const step = 360 / n;

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const el = root.current!;
      const drum = el.querySelector<HTMLElement>("[data-drum]")!;
      const faces = el.querySelectorAll<HTMLElement>("[data-face]");
      const marks = el.querySelectorAll<HTMLElement>("[data-mark]");
      const st = { r: 0 };
      const render = () => {
        drum.style.setProperty("--r", `${st.r}deg`);
        const active = Math.round(st.r / step);
        faces.forEach((f, i) => {
          const c = Math.cos(((st.r - i * step) * Math.PI) / 180);
          f.style.opacity = c <= 0 ? "0" : (0.15 + 0.85 * c * c).toFixed(3);
          f.toggleAttribute("data-active", i === active);
        });
        marks.forEach((m, i) => m.toggleAttribute("data-active", i === active));
      };
      render();
      gsap.to(st, {
        r: (n - 1) * step,
        ease: "none",
        onUpdate: render,
        scrollTrigger: {
          trigger: el.querySelector("[data-track]"),
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          snap: { snapTo: 1 / (n - 1), duration: { min: 0.2, max: 0.5 }, delay: 0.05, ease: "power2.inOut" },
        },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="rules-title">
      <div className={styles.track} data-track style={{ "--n": n } as React.CSSProperties}>
        <div className={`wrap ${styles.sticky}`}>
          <header className={styles.head}>
            <h2 id="rules-title" className={styles.title}>
              {data.title}
              <span className={styles.dotMark}>.</span>
            </h2>
            <p className={styles.lead}>{data.lead}</p>
            <ol className={styles.index} aria-hidden="true">
              {data.items.map((r, i) => (
                <li key={r.no} data-mark data-active={i === 0 || undefined}>
                  <span>{r.no}</span>
                  {r.name}
                </li>
              ))}
            </ol>
          </header>

          <div className={styles.stage}>
            <span className={styles.axle} aria-hidden="true" />
            <ol className={styles.drum} data-drum>
              {data.items.map((r, i) => (
                <li
                  key={r.no}
                  className={styles.face}
                  data-face
                  data-active={i === 0 || undefined}
                  style={{ "--a": `${-i * step}deg` } as React.CSSProperties}
                >
                  <span className={styles.tab} aria-hidden="true">
                    {r.no}
                  </span>
                  <h3 className={styles.name}>{r.name}</h3>
                  <p className={styles.text}>{r.text}</p>
                </li>
              ))}
            </ol>
            <p className={styles.hint} aria-hidden="true">
              {data.hint}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
