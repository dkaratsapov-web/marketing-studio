"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { GEO } from "@/content/geo";
import styles from "./RouteEstimate.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof GEO)["estimate"];

/**
 * «Смета по маршруту». Пункты сметы — остановки на линии, как на схеме транспорта.
 * Когда блок появляется, по линии один раз проезжает салатовая метка: остановки
 * загораются по мере прохода, на конечной открывается «Итого» со сроком и ценой.
 * На телефоне линия вертикальная.
 */
export default function RouteEstimate({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const line = el.querySelector<HTMLElement>(`.${styles.line}`)!;
      const stops = gsap.utils.toArray<HTMLElement>(`.${styles.stop}`, el);
      const n = stops.length;
      const light = (p: number) =>
        stops.forEach((s, i) => s.toggleAttribute("data-lit", p >= i / (n - 1) - 0.001));
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        line.style.setProperty("--p", "1");
        light(1);
        return;
      }
      const v = { p: 0 };
      line.style.setProperty("--p", "0");
      ScrollTrigger.create({
        trigger: line,
        start: "top 70%",
        once: true,
        onEnter: () =>
          gsap.to(v, {
            p: 1,
            duration: 3.2,
            ease: "power1.inOut",
            onUpdate: () => {
              line.style.setProperty("--p", v.p.toFixed(4));
              light(v.p);
            },
          }),
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="route-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="route-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.line}>
          <span className={styles.track} aria-hidden="true">
            <span className={styles.fill} />
            <span className={styles.bus} />
          </span>
          <ol className={styles.stops}>
            {data.stops.map((s, i) => (
              <li key={s.name} className={styles.stop}>
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.stopNo}>{String(i + 1).padStart(2, "0")}</span>
                <span className={styles.stopName}>{s.name}</span>
                <span className={styles.stopWhen}>{s.when}</span>
              </li>
            ))}
            <li className={`${styles.stop} ${styles.finish}`}>
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.stopNo}>{data.finish}</span>
              <dl className={styles.totals}>
                {data.totals.map((t) => (
                  <div key={t.name}>
                    <dt>{t.name}</dt>
                    <dd>{t.value}</dd>
                  </div>
                ))}
              </dl>
            </li>
          </ol>
        </div>

        <a href="#brief" className={`btn btn--primary ${styles.cta}`}>
          {data.cta}
          <svg className="btn__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </a>
      </div>
    </section>
  );
}
