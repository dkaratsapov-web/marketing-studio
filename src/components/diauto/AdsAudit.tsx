"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { DIAUTO } from "@/content/diauto";
import styles from "./AdsAudit.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof DIAUTO)["ads"];

/** Длина окружности кольца слива: r = 70 в системе 180×180 */
const C = 2 * Math.PI * 70;

/**
 * Реклама и аналитика. Три звена цепи замера разорваны: по скроллу половинки звеньев
 * сходятся, вспыхивает искра сварки, и звено становится целым. Рядом кольцо: доля
 * трафика с мобильных игр и dsp-обменников набирается до 84%, счётчик идёт вместе с ней.
 */
export default function AdsAudit({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const links = el.querySelectorAll<HTMLElement>("[data-link]");
      const arc = el.querySelector<SVGCircleElement>("[data-arc]")!;
      const count = el.querySelector<HTMLElement>("[data-count]")!;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const share = data.leak.value / 100;

      if (reduce) {
        links.forEach((l) => l.style.setProperty("--w", "1"));
        arc.style.strokeDashoffset = String(C * (1 - share));
        return;
      }

      // Сварка звеньев ведётся скроллом
      const weld = gsap.timeline({
        scrollTrigger: { trigger: el.querySelector("[data-chain]"), start: "top 75%", end: "bottom 45%", scrub: 0.5 },
      });
      links.forEach((l, i) => weld.fromTo(l, { "--w": 0 }, { "--w": 1, duration: 1, ease: "power2.inOut" }, i * 0.8));

      // Кольцо слива набирается один раз при появлении
      gsap.set(arc, { strokeDashoffset: C });
      const v = { n: 0 };
      ScrollTrigger.create({
        trigger: arc,
        start: "top 80%",
        once: true,
        onEnter: () => {
          gsap.to(arc, { strokeDashoffset: C * (1 - share), duration: 1.6, ease: "power3.out" });
          gsap.to(v, { n: data.leak.value, duration: 1.6, ease: "power3.out", onUpdate: () => (count.textContent = String(Math.round(v.n))) });
        },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="ads-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="ads-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <ul className={styles.channels}>
          {data.channels.map((c) => (
            <li key={c.name}>
              <b>{c.name}</b>
              <span>{c.note}</span>
            </li>
          ))}
        </ul>

        <div className={styles.chainBox} data-chain>
          <h3 className={styles.boxTitle}>{data.breaks.title}</h3>
          <ol className={styles.chain}>
            {data.breaks.items.map((b) => (
              <li key={b} className={styles.link} data-link>
                <span className={styles.halves} aria-hidden="true">
                  <i />
                  <i />
                  <em className={styles.spark} />
                </span>
                <span className={styles.linkName}>{b}</span>
              </li>
            ))}
          </ol>
          <p className={styles.boxText}>{data.breaks.text}</p>
        </div>

        <div className={styles.leak}>
          <div className={styles.ring}>
            <svg viewBox="0 0 180 180" aria-hidden="true">
              <circle cx="90" cy="90" r="70" className={styles.ringBase} />
              <circle cx="90" cy="90" r="70" className={styles.ringArc} data-arc strokeDasharray={C.toFixed(1)} />
            </svg>
            <p className={styles.ringValue}>
              <b data-count>{data.leak.value}</b>%
            </p>
          </div>
          <div className={styles.leakText}>
            <p className={styles.leakTitle}>{data.leak.title}</p>
            <dl className={styles.leakFacts}>
              {data.leak.facts.map((f) => (
                <div key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
            <p className={styles.boxText}>{data.leak.text}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
