"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { ABOUT } from "@/content/about";
import styles from "./Badges.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof ABOUT)["team"];

/** Полоски штрихкода из имени: у каждого пропуска свой рисунок */
const bars = (s: string) => Array.from(s.replace(/\s/g, ""), (ch, i) => 1 + ((ch.charCodeAt(0) + i * 7) % 4));

/**
 * Команда на пропусках. Пропуска висят на шнурках под общей перекладиной: при появлении
 * блока падают сверху и раскачиваются, затухая. Если провести по пропуску курсором
 * или коснуться его, он качнётся в сторону движения. Качание идёт вокруг точки крепления
 * шнурка, поэтому шнурок и пропуск двигаются вместе.
 */
export default function Badges({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const hangers = gsap.utils.toArray<HTMLElement>("[data-hanger]");
      gsap.set(hangers, { yPercent: -60, opacity: 0, rotate: (i) => [-14, 10, -8][i % 3] });
      ScrollTrigger.create({
        trigger: root.current!.querySelector("[data-rail]"),
        start: "top 75%",
        once: true,
        onEnter: () => {
          gsap.to(hangers, { yPercent: 0, opacity: 1, duration: 0.7, ease: "power3.out", stagger: 0.12 });
          gsap.to(hangers, { rotate: 0, duration: 2.6, ease: "elastic.out(1.1, 0.18)", stagger: 0.12, delay: 0.15 });
        },
      });
    },
    { scope: root },
  );

  // Толчок: угол от скорости курсора, затем затухающее качание к нулю
  const kick = (e: React.PointerEvent<HTMLElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = e.currentTarget;
    const dir = e.pointerType === "mouse" ? Math.sign(e.movementX) || 1 : Math.random() > 0.5 ? 1 : -1;
    const power = e.pointerType === "mouse" ? Math.min(Math.abs(e.movementX) * 0.9 + 4, 13) : 9;
    gsap.fromTo(el, { rotate: dir * power }, { rotate: 0, duration: 2.2, ease: "elastic.out(1.1, 0.2)", overwrite: true });
  };

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="team-title">
      <div className="wrap">
        <header className={styles.head}>
          <h2 id="team-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.rail} data-rail aria-hidden="true" />
        <ul className={styles.people}>
          {data.people.map((p, i) => (
            <li
              key={p.name}
              className={styles.hanger}
              data-hanger
              data-tone={i % 2 ? "pink" : "lime"}
              style={{ "--len": [3, 6.5, 4.5][i % 3] } as React.CSSProperties}
              onPointerEnter={kick}
              onPointerDown={kick}
            >
              <span className={styles.strap} aria-hidden="true">
                <span>КОРПОРАЦИЯ КОРПОРАЦИЯ КОРПОРАЦИЯ</span>
              </span>
              <span className={styles.clip} aria-hidden="true" />
              <article className={styles.badge}>
                <p className={styles.badgeTop} aria-hidden="true">
                  <span>Корпорация</span>
                  <span>{data.pass}</span>
                </p>
                <div className={styles.idRow}>
                  <span className={styles.photo} aria-hidden="true">
                    {p.initial}
                  </span>
                  <div className={styles.idText}>
                    <h3 className={styles.name}>{p.name}</h3>
                    <p className={styles.role}>{p.role}</p>
                  </div>
                </div>
                <dl className={styles.meta}>
                  <div>
                    <dt>Доступ</dt>
                    <dd>{p.access}</dd>
                  </div>
                  {p.since ? (
                    <div>
                      <dt>Стаж</dt>
                      <dd>{p.since}</dd>
                    </div>
                  ) : null}
                </dl>
                <ul className={styles.does} aria-label="Ведёт">
                  {p.does.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
                <span className={styles.barcode} aria-hidden="true">
                  {bars(p.name + p.role).map((w, k) => (
                    <span key={k} style={{ "--w": w } as React.CSSProperties} />
                  ))}
                </span>
              </article>
            </li>
          ))}
        </ul>
        <p className={styles.hint} aria-hidden="true">
          {data.hint}
        </p>
      </div>
    </section>
  );
}
