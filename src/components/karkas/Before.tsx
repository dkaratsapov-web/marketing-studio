"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { KARKAS } from "@/content/karkas";
import b from "./Block.module.css";
import styles from "./Before.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Было и стало. Слева шесть грехов шаблона: по скроллу каждый зачёркивается, и под ним
 * проявляется решение. Справа новый первый экран поднимается из-под линии кровли.
 */
export default function Before({ data }: { data: typeof KARKAS.before }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const el = root.current!;
      el.querySelectorAll<HTMLElement>(`.${styles.row}`).forEach((row) => {
        gsap.fromTo(row, { "--cut": 0, "--now": 0 }, { "--cut": 1, "--now": 1, ease: "none", scrollTrigger: { trigger: row, start: "top 82%", end: "top 48%", scrub: 0.6 } });
      });
      // Кадр поднимается кровлей: сначала конёк, потом скаты опускаются до прямоугольника
      gsap
        .timeline({ scrollTrigger: { trigger: el.querySelector(`.${styles.frame}`), start: "top 85%", end: "top 20%", scrub: 0.8 } })
        .fromTo(
          el.querySelector(`.${styles.shot}`),
          { clipPath: "polygon(0% 100%, 50% 100%, 100% 100%, 100% 100%, 0% 100%)" },
          { clipPath: "polygon(0% 32%, 50% 0%, 100% 32%, 100% 100%, 0% 100%)", ease: "power1.out" },
        )
        .to(el.querySelector(`.${styles.shot}`), { clipPath: "polygon(0% 0%, 50% 0%, 100% 0%, 100% 100%, 0% 100%)", ease: "power1.inOut" });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={b.section} data-surface="light" aria-labelledby="kk-before">
      <div className="wrap">
        <div className={b.head}>
          <h2 id="kk-before" className={b.title}>
            {data.title}
            <span className={b.dot}>.</span>
          </h2>
          <p className={b.lead}>{data.lead}</p>
        </div>

        <div className={styles.grid}>
          <ol className={styles.list}>
            {data.sins.map((s) => (
              <li key={s.was} className={styles.row}>
                <p className={styles.was}>
                  <span className={styles.wasText}>{s.was}</span>
                </p>
                <p className={styles.now}>{s.now}</p>
              </li>
            ))}
          </ol>

          <figure className={styles.frame}>
            <div className={styles.bar} aria-hidden="true">
              <i />
              <i />
              <i />
              <span>каркаскомфорт.рф</span>
            </div>
            <div className={styles.shot}>
              <Image src={data.shot.img} alt={data.shot.alt} sizes="(max-width: 860px) 92vw, 46vw" className={styles.img} />
            </div>
          </figure>
        </div>
      </div>
    </section>
  );
}
