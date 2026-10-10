"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { RESTAURANTS } from "@/content/restaurants";
import styles from "./WineList.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof RESTAURANTS)["wine"];

/**
 * «Карта услуг». Цены отделов оформлены как винная карта: разделы, название и подпись,
 * отточие до цены. Когда карта появляется, отточия протягиваются строка за строкой,
 * рекомендация отмечена салатовым и ведёт на страницу тарифа под ключ.
 */
export default function WineList({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const q = gsap.utils.selector(root);
      // Хеш класса в CSS-модуле может начинаться с цифры: без экранирования селектор невалиден
      const c = (name: string) => `.${CSS.escape(name)}`;
      gsap.set(q(c(styles.leader)), { scaleX: 0 });
      gsap.set(q(c(styles.price)), { autoAlpha: 0 });
      const tl = gsap.timeline({ paused: true });
      q(c(styles.row)).forEach((row: Element, i: number) => {
        tl.to(row.querySelector(c(styles.leader)), { scaleX: 1, duration: 0.5, ease: "power2.out" }, i * 0.18).to(
          row.querySelector(c(styles.price)),
          { autoAlpha: 1, duration: 0.3 },
          "-=0.1",
        );
      });
      ScrollTrigger.create({ trigger: q(c(styles.card))[0], start: "top 70%", once: true, onEnter: () => tl.play() });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="wine-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="wine-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.card}>
          {data.groups.map((g) => (
            <div key={g.name} className={styles.group}>
              <p className={styles.groupName}>{g.name}</p>
              <ul className={styles.rows}>
                {g.items.map((it) => {
                  const body = (
                    <>
                      <span className={styles.name}>
                        {it.name}
                        <span className={styles.note}>{it.note}</span>
                      </span>
                      <span className={styles.leader} aria-hidden="true" />
                      <span className={styles.price}>{it.price}</span>
                    </>
                  );
                  return (
                    <li key={it.name} className={styles.row} data-best={it.href ? "" : undefined}>
                      {it.href ? (
                        <Link href={it.href} className={styles.rowLink}>
                          {body}
                        </Link>
                      ) : (
                        <span className={styles.rowLink}>{body}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <p className={styles.unit}>{data.unit}</p>
        </div>
      </div>
    </section>
  );
}
