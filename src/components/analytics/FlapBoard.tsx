"use client";

import { useRef } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import type { ANALYTICS } from "@/content/analytics";
import styles from "./FlapBoard.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof ANALYTICS)["cases"];

const GLYPHS = "0123456789%+−";
const WIDTH = 5;

/** Значение, выровненное по правому краю табло: пустые ячейки слева */
const pad = (v: string) => v.padStart(WIDTH, " ").slice(-WIDTH).split("");

/**
 * «Что показала аналитика». Результаты дел на механическом табло, как на вокзале:
 * когда строка появляется, каждая ячейка перещёлкивается через случайные знаки
 * и встаёт на свою цифру, слева направо. Ячейки — Web Animations API, без перерисовки React.
 */
export default function FlapBoard({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const rows = gsap.utils.toArray<HTMLElement>(`.${styles.row}`, root.current);
      rows.forEach((row, r) => {
        const cells = Array.from(row.querySelectorAll<HTMLElement>("[data-flap]"));
        const finals = cells.map((c) => c.textContent ?? "");
        cells.forEach((c) => (c.textContent = " "));
        ScrollTrigger.create({
          trigger: row,
          start: "top 85%",
          once: true,
          onEnter: () => {
            cells.forEach((c, i) => {
              const steps = 6 + i * 2;
              for (let k = 0; k <= steps; k++) {
                window.setTimeout(() => {
                  c.textContent = k === steps ? finals[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
                  c.animate([{ transform: "rotateX(-90deg)" }, { transform: "rotateX(0)" }], { duration: 70, easing: "ease-out" });
                }, r * 200 + k * 70);
              }
            });
          },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="flap-title">
      <div className={`wrap ${styles.grid}`}>
        <h2 id="flap-title" className={styles.title}>
          {data.title}
          <span className={styles.dotMark}>.</span>
        </h2>

        <div className={styles.board}>
          <p className={styles.boardName}>{data.board}</p>
          <ul className={styles.rows}>
            {data.items.map((c) => (
              <li key={c.code} className={styles.row}>
                <span className={styles.code}>Дело {c.code}</span>
                <span className={styles.flaps} aria-label={`${c.value} ${c.label}`} role="img">
                  {pad(c.value).map((ch, i) => (
                    <span key={i} className={styles.cell} aria-hidden="true">
                      <span data-flap>{ch}</span>
                    </span>
                  ))}
                </span>
                <span className={styles.what}>
                  <span className={styles.label}>{c.label}</span>
                  <span className={styles.client}>{c.client}</span>
                </span>
                <p className={styles.text}>{c.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
