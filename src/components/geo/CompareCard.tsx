"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import coffeeMain from "@/assets/geo/coffee-main.webp";
import type { GEO } from "@/content/geo";
import styles from "./CompareCard.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof GEO)["card"];

/**
 * «Карточка, которую выбирают». Две версии одной карточки на карте лежат друг на друге,
 * между ними ползунок: слева пустая карточка, справа заполненная. Ползунок — обычный
 * input range, поэтому работает с клавиатуры. Когда блок появляется, ползунок сам
 * проезжает от «было» к середине, показывая, что его можно двигать.
 */
export default function CompareCard({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const [pos, setPos] = useState(50);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const v = { p: 50 };
      ScrollTrigger.create({
        trigger: root.current!.querySelector(`.${styles.frame}`),
        start: "top 70%",
        once: true,
        onEnter: () => {
          gsap.timeline()
            .set(v, { p: 92 })
            .add(() => setPos(92))
            .to(v, { p: 18, duration: 1.4, ease: "power2.inOut", onUpdate: () => setPos(v.p) }, "+=0.3")
            .to(v, { p: 50, duration: 0.8, ease: "power2.out", onUpdate: () => setPos(v.p) });
        },
      });
    },
    { scope: root },
  );

  const { before: b, after: a } = data;

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="card-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="card-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
          <ul className={styles.diff}>
            {b.empty.map((e, i) => (
              <li key={e}>
                <span className={styles.diffOld}>{e}</span>
                <span className={styles.diffNew}>{data.fixed[i]}</span>
              </li>
            ))}
          </ul>
        </header>

        <figure className={styles.figure}>
          <div className={styles.frame} style={{ "--pos": `${pos}%` } as React.CSSProperties}>
            {/* Было: пустая карточка */}
            <div className={styles.card} data-v="before" aria-hidden="true">
              <span className={styles.photoEmpty}>{b.empty[0]}</span>
              <span className={styles.name}>{b.name}</span>
              <span className={styles.kind}>{b.kind}</span>
              <span className={styles.missing}>
                {b.empty.slice(1).map((e) => (
                  <span key={e}>{e}</span>
                ))}
              </span>
            </div>

            {/* Стало: заполненная карточка, видна справа от ползунка */}
            <div className={styles.card} data-v="after" aria-hidden="true">
              <Image src={coffeeMain} alt="" className={styles.photo} sizes="(max-width: 960px) 90vw, 420px" />
              <span className={styles.name}>{a.name}</span>
              <span className={styles.kind}>{a.kind}</span>
              <span className={styles.open}>{a.open}</span>
              <span className={styles.actions}>
                {a.actions.map((x, i) => (
                  <span key={x} className={styles.action} data-main={i === 0 || undefined}>
                    {x}
                  </span>
                ))}
              </span>
              <span className={styles.prices}>
                {a.prices.map((p) => (
                  <span key={p.name} className={styles.price}>
                    <span>{p.name}</span>
                    <span>{p.price}</span>
                  </span>
                ))}
              </span>
              <span className={styles.reply}>{a.reply}</span>
            </div>

            <span className={styles.labels} aria-hidden="true">
              <span>{b.label}</span>
              <span>{a.label}</span>
            </span>
            <span className={styles.handle} aria-hidden="true">
              <span className={styles.knob}>
                <svg viewBox="0 0 24 24">
                  <path d="M9 6 3 12l6 6M15 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </span>
            </span>
            <label htmlFor={`${id}-r`} className="visually-hidden">
              {data.handle}
            </label>
            <input
              id={`${id}-r`}
              type="range"
              min={0}
              max={100}
              value={Math.round(pos)}
              onChange={(e) => setPos(Number(e.target.value))}
              className={styles.range}
            />
          </div>
          <figcaption className={styles.note}>{data.note}</figcaption>
        </figure>
      </div>
    </section>
  );
}
