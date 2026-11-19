"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { KARKAS } from "@/content/karkas";
import b from "./Block.module.css";
import styles from "./AdsChannels.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Реклама. Три канала столбцами, у каждого своя посадочная. Справа карточка заявки
 * выезжает из щели, как чек: строка за строкой видно, откуда пришёл человек.
 */
export default function AdsChannels({ data }: { data: typeof KARKAS.ads }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const el = root.current!;
      gsap.fromTo(el.querySelectorAll(`.${styles.channel}`), { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.12, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: el.querySelector(`.${styles.channels}`), start: "top 80%", once: true } });
      const slip = el.querySelector(`.${styles.slip}`);
      gsap
        .timeline({ scrollTrigger: { trigger: el.querySelector(`.${styles.printer}`), start: "top 80%", end: "center 45%", scrub: 0.7 } })
        .fromTo(slip, { yPercent: -100 }, { yPercent: 0, ease: "none" })
        .fromTo(el.querySelectorAll(`.${styles.line}`), { autoAlpha: 0 }, { autoAlpha: 1, stagger: 0.1, ease: "none" }, 0.2);
    },
    { scope: root },
  );

  return (
    <section ref={root} className={b.section} data-surface="light" aria-labelledby="kk-ads">
      <div className="wrap">
        <div className={b.head}>
          <h2 id="kk-ads" className={b.title}>
            {data.title}
            <span className={b.dot}>.</span>
          </h2>
          <p className={b.lead}>{data.lead}</p>
        </div>

        <div className={styles.grid}>
          <ul className={styles.channels}>
            {data.channels.map((c) => (
              <li key={c.name} className={styles.channel}>
                <b className={styles.name}>{c.name}</b>
                <p className={styles.text}>{c.text}</p>
                <p className={styles.landing}>
                  <span>Посадочная</span>
                  {c.landing}
                </p>
              </li>
            ))}
          </ul>

          <figure className={styles.printer}>
            <div className={styles.slot} aria-hidden="true" />
            <div className={styles.paper}>
              <div className={styles.slip}>
                <p className={styles.slipHead}>Заявка с сайта</p>
                <dl className={styles.rows}>
                  {data.ticket.map(([k, v]) => (
                    <div key={k} className={styles.line}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className={styles.goals}>
                  Цели Метрики:
                  {data.goals.map((g) => (
                    <span key={g}>{g}</span>
                  ))}
                </p>
              </div>
            </div>
            <figcaption className={styles.cap}>{data.ticketNote}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
