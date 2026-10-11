"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CINEMATIC_MQ } from "@/components/service/SearchScene";
import type { RETAIL } from "@/content/retail";
import styles from "./HourSync.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof RETAIL)["sync"];

const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;

/**
 * Цена меняется один раз. Сначала на сайте, затем минутная стрелка проходит час до
 * синхронизации, и в тот же момент новая цена появляется в магазине в Telegram, а
 * подписчикам приходит сообщение бота. На десктопе экран закреплён и идёт за скроллом,
 * на телефоне сцена проигрывается сама, когда доезжает до экрана.
 */
export default function HourSync({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const hand = useRef<SVGLineElement>(null);
  const [phase, setPhase] = useState(2);
  const [minute, setMinute] = useState(0);

  useGSAP(
    () => {
      const apply = (p: number) => {
        const m = Math.max(0, Math.min(1, (p - 0.15) / 0.65));
        hand.current?.style.setProperty("rotate", `${m * 360}deg`);
        setMinute(Math.round(m * 60));
        setPhase(p < 0.12 ? 0 : p < 0.8 ? 1 : 2);
      };
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        apply(1);
        return;
      }
      apply(0);
      const mm = gsap.matchMedia();
      mm.add(CINEMATIC_MQ, () => {
        ScrollTrigger.create({
          trigger: root.current,
          start: "top top",
          end: "+=160%",
          pin: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => apply(self.progress),
        });
      });
      mm.add(`not all and ${CINEMATIC_MQ}`, () => {
        const v = { p: 0 };
        ScrollTrigger.create({
          trigger: "[data-clock]",
          start: "top 70%",
          once: true,
          onEnter: () => gsap.to(v, { p: 1, duration: 4, ease: "none", onUpdate: () => apply(v.p) }),
        });
      });
    },
    { scope: root },
  );

  const time = minute === 60 ? "14:00" : `13:${String(minute).padStart(2, "0")}`;
  const priceAt = (key: string) => {
    if (key === "site") return phase >= 1 ? data.after : data.before;
    return phase >= 2 ? data.after : data.before;
  };

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="sync-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="sync-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <figure className={styles.clock} data-clock aria-hidden="true">
          <svg viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="92" className={styles.face} />
            {Array.from({ length: 60 }, (_, i) => (
              <line key={i} x1="100" y1={i % 5 ? 14 : 10} x2="100" y2="20" className={i % 5 ? styles.tick : styles.tickMajor} style={{ rotate: `${i * 6}deg` }} />
            ))}
            <line x1="100" y1="100" x2="100" y2="58" className={styles.hour} style={{ rotate: `${minute / 2}deg` }} />
            <line ref={hand} x1="100" y1="100" x2="100" y2="22" className={styles.minute} />
            <circle cx="100" cy="100" r="4" className={styles.pin} />
          </svg>
          <span className={styles.time}>{time}</span>
          <span className={styles.clockLabel}>{phase === 2 ? `${data.clock}: готово` : data.clock}</span>
        </figure>

        <ul className={styles.surfaces}>
          {data.surfaces.map((s) => {
            const price = priceAt(s.key);
            const changed = price === data.after;
            return (
              <li key={s.key} className={styles.surface} data-changed={changed || undefined} data-key={s.key}>
                <span className={styles.sName}>{s.name}</span>
                <span className={styles.product}>{data.product}</span>
                <span className={styles.price}>
                  <span key={price}>{rub(price)}</span>
                </span>
                {s.key === "bot" && changed ? (
                  <span className={styles.alert}>
                    {data.alert}: {rub(data.after)}
                  </span>
                ) : null}
                <span className={styles.sText}>{s.text}</span>
              </li>
            );
          })}
        </ul>
        <p className={styles.note}>{data.note}</p>
      </div>
    </section>
  );
}
