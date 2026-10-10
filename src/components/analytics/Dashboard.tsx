"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { ANALYTICS } from "@/content/analytics";
import styles from "./Dashboard.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof ANALYTICS)["dashboard"];

/**
 * «Один экран для собственника». Настоящий дашборд «Сферы» целиком, без обрезки,
 * с пронумерованными метками поверх. Метки появляются по очереди, нажатая раскрывает
 * пояснение, тот же текст в списке рядом. Список — кнопки, им можно пройти с клавиатуры.
 */
export default function Dashboard({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(0);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const q = gsap.utils.selector(root);
      const tl = gsap.timeline({ paused: true });
      tl.from(q(`.${styles.spot}`), { scale: 0, autoAlpha: 0, duration: 0.45, ease: "back.out(2.2)", stagger: 0.15 });
      ScrollTrigger.create({ trigger: q(`.${styles.frame}`)[0], start: "top 70%", once: true, onEnter: () => tl.play() });
    },
    { scope: root },
  );

  const s = data.spots[open];

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="dash-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="dash-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <figure className={styles.frame}>
          <Image src={data.shot} alt={data.alt} className={styles.shot} sizes="(max-width: 960px) 94vw, 62vw" />
          {data.spots.map((sp, i) => (
            <button
              key={sp.title}
              type="button"
              className={styles.spot}
              style={{ left: `${sp.x}%`, top: `${sp.y}%` }}
              aria-pressed={i === open}
              aria-label={sp.title}
              onClick={() => setOpen(i)}
              tabIndex={-1}
            >
              {i + 1}
            </button>
          ))}
          <span key={open} className={styles.pop} style={{ left: `${s.x}%`, top: `${s.y}%` }} data-right={s.x > 60 || undefined} aria-hidden="true">
            <b>{s.title}</b>
            {s.text}
          </span>
          <figcaption className={styles.note}>{data.note}</figcaption>
        </figure>

        <ol className={styles.list}>
          {data.spots.map((sp, i) => (
            <li key={sp.title}>
              <button type="button" className={styles.item} aria-pressed={i === open} onClick={() => setOpen(i)}>
                <span className={styles.num}>{i + 1}</span>
                <span className={styles.itemBody}>
                  <span className={styles.itemTitle}>{sp.title}</span>
                  <span className={styles.itemText}>{sp.text}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
