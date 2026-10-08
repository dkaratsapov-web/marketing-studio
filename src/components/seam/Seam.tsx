"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { scramble } from "@/lib/scramble";
import styles from "./Seam.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Surface = "dark" | "light";

/**
 * Переход между тёмной и светлой секциями в языке знака: новая поверхность
 * раскрывается из вертикального шва посередине, края шва горят салатовым
 * и розовым, в шве дешифруется указатель следующего раздела.
 */
export default function Seam({ from, to, label }: { from: Surface; to: Surface; label: string }) {
  const root = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.style.setProperty("--p", "1");
        return;
      }
      let decoded = false;
      ScrollTrigger.create({
        trigger: el,
        start: "top 95%",
        end: "top 30%",
        scrub: 0.4,
        onUpdate: (self) => {
          el.style.setProperty("--p", self.progress.toFixed(4));
          if (!decoded && self.progress > 0.18 && text.current) {
            decoded = true;
            scramble(text.current, `→ ${label}`, 650);
          }
        },
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className={styles.seam} data-seam data-surface={from} aria-hidden="true">
      <div className={styles.panel} data-surface={to}>
        <span ref={text} className={styles.label}>
          → {label}
        </span>
      </div>
      <span className={styles.edge} data-side="l" />
      <span className={styles.edge} data-side="r" />
    </div>
  );
}
