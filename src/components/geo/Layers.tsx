"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { GEO } from "@/content/geo";
import styles from "./Layers.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof GEO)["layers"];

/**
 * «Один адрес, три карты». Три площадки — три прозрачных слоя карты, сложенных стопкой
 * в изометрии. Когда блок появляется, стопка раскрывается, как чертёж в разобранном виде,
 * и сквозь все слои проходит одна ось с пином: адрес один. Слева площадки списком:
 * выбранная площадка поднимает свой слой и подсвечивает его, остальные бледнеют.
 */
export default function Layers({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const el = root.current!;
      const stack = el.querySelector<HTMLElement>(`.${styles.iso}`)!;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        stack.dataset.open = "";
        return;
      }
      ScrollTrigger.create({
        trigger: stack,
        start: "top 75%",
        once: true,
        onEnter: () => {
          stack.dataset.open = "";
        },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="layers-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="layers-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <ul className={styles.list}>
          {data.items.map((it, i) => (
            <li key={it.key}>
              <button
                type="button"
                className={styles.item}
                aria-pressed={i === active}
                onClick={() => setActive(i)}
                onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
                style={{ "--c": it.color } as React.CSSProperties}
              >
                <span className={styles.itemName}>
                  <span className={styles.swatch} aria-hidden="true" />
                  {it.name}
                </span>
                <span className={styles.itemWhere}>{it.where}</span>
                <span className={styles.itemText}>
                  <span>{it.text}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <figure className={styles.figure} aria-hidden="true">
          <div className={styles.iso} data-active={active}>
            {data.items.map((it, i) => (
              <div
                key={it.key}
                className={styles.layer}
                data-i={i}
                data-on={i === active || undefined}
                style={{ "--c": it.color } as React.CSSProperties}
              >
                <span className={styles.tag}>{it.name}</span>
                <span className={styles.spot} />
              </div>
            ))}
            {/* Ось сквозь слои и пин сверху: один и тот же адрес на всех картах */}
            <span className={styles.axis} />
            <span className={styles.pin}>
              <svg viewBox="0 0 32 40">
                <path d="M16 39C7 27 2 21 2 14a14 14 0 1 1 28 0c0 7-5 13-14 25Z" fill="var(--ink-950)" />
                <circle cx="16" cy="14" r="5" fill="var(--lime)" />
              </svg>
              <span className={styles.pinLabel}>{data.pin}</span>
            </span>
          </div>
        </figure>
      </div>
    </section>
  );
}
