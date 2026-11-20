"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CINEMATIC_MQ } from "@/components/service/SearchScene";
import type { KARKAS } from "@/content/karkas";
import b from "./Block.module.css";
import styles from "./Inventory.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Состав сайта: пять счётчиков набегают при появлении, ниже снимки страниц лентой.
 * На десктопе лента закреплена и едет вбок по скроллу, на телефоне листается пальцем.
 */
export default function Inventory({ data }: { data: typeof KARKAS.content }) {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLOListElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduce) {
        el.querySelectorAll<HTMLElement>("[data-count]").forEach((n) => {
          const to = Number(n.dataset.count);
          const o = { v: 0 };
          gsap.to(o, {
            v: to,
            duration: 1.4,
            ease: "power2.out",
            scrollTrigger: { trigger: n, start: "top 88%", once: true },
            onUpdate: () => (n.textContent = String(Math.round(o.v))),
          });
        });
      }
      const mm = gsap.matchMedia();
      mm.add(`${CINEMATIC_MQ} and (prefers-reduced-motion: no-preference)`, () => {
        const t = track.current!;
        const pin = el.querySelector<HTMLElement>(`.${styles.pin}`)!;
        // Лента шире окна: едем ровно на разницу между её шириной и шириной контейнера
        const dist = () => Math.max(0, t.scrollWidth - pin.clientWidth);
        gsap.to(t, {
          x: () => -dist(),
          ease: "none",
          scrollTrigger: { trigger: pin, start: "center 52%", end: () => `+=${dist()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={b.section} data-surface="light" aria-labelledby="kk-content">
      <div className="wrap">
        <div className={b.head}>
          <h2 id="kk-content" className={b.title}>
            {data.title}
            <span className={b.dot}>.</span>
          </h2>
          <p className={b.lead}>{data.lead}</p>
        </div>

        <ul className={styles.counts}>
          {data.counts.map((c) => (
            <li key={c.label}>
              <b data-count={c.value}>{c.value}</b>
              <span>{c.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.pin}>
        <ol ref={track} className={styles.track} aria-label="Страницы сайта">
          {data.shots.map((s) => (
            <li key={s.name} className={styles.card}>
              <div className={styles.shot}>
                <Image src={s.img} alt={`${s.name}: ${s.text}`} sizes="(max-width: 860px) 80vw, 46vw" className={styles.img} />
              </div>
              <p className={styles.name}>{s.name}</p>
              <p className={styles.text}>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
