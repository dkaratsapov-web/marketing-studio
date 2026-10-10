"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { ABOUT } from "@/content/about";
import styles from "./Radar.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof ABOUT)["radar"];

/** Логарифмическая шкала: Тверь и Анталия помещаются на один экран */
const KM_MIN = 100;
const KM_MAX = 3000;
const radius = (km: number) => (km <= 0 ? 0 : 0.12 + (0.84 * Math.log(km / KM_MIN)) / Math.log(KM_MAX / KM_MIN));
const RINGS = [250, 500, 1000, 2000];
/** Период обзора радара, секунды. Вспышки городов идут с той же фазой */
const SWEEP = 5;

/**
 * География на радаре. Луч обходит круг, и каждый город вспыхивает, когда луч проходит
 * его направление: у вспышки та же длительность, а задержка равна доле пути луча.
 * При появлении блока кольца расходятся от центра. Наведение на город в списке
 * подсвечивает его отметку, и наоборот. Вне экрана радар стоит.
 */
export default function Radar({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const [hot, setHot] = useState<number | null>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const scope = el.querySelector<HTMLElement>("[data-radar]")!;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      ScrollTrigger.create({
        trigger: scope,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => scope.toggleAttribute("data-run", self.isActive),
      });
      gsap.from(el.querySelectorAll("[data-ring]"), {
        scale: 0.2,
        opacity: 0,
        duration: 1.1,
        ease: "power3.out",
        stagger: 0.12,
        transformOrigin: "50% 50%",
        scrollTrigger: { trigger: scope, start: "top 75%", once: true },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="radar-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="radar-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
          <ul className={styles.legend}>
            {data.cities.map((c, i) => (
              <li
                key={c.name}
                className={styles.city}
                data-hot={hot === i || undefined}
                onPointerEnter={() => setHot(i)}
                onPointerLeave={() => setHot(null)}
              >
                <span className={styles.cityName}>{c.name}</span>
                <span className={styles.cityKm}>{c.km ? `≈ ${c.km.toLocaleString("ru-RU")} км` : "центр"}</span>
                {c.cases ? (
                  <span className={styles.cityCases}>
                    {data.casesLabel} {c.cases}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </header>

        <figure className={styles.figure}>
          <div className={styles.radar} data-radar style={{ "--T": `${SWEEP}s` } as React.CSSProperties} aria-hidden="true">
            {RINGS.map((km) => (
              <span key={km} className={styles.ring} data-ring style={{ "--r": radius(km) } as React.CSSProperties}>
                <span className={styles.ringKm}>{km.toLocaleString("ru-RU")} км</span>
              </span>
            ))}
            <span className={styles.cross} />
            <span className={styles.sweep} />
            {["С", "В", "Ю", "З"].map((s, i) => (
              <span key={s} className={styles.compass} style={{ "--q": i } as React.CSSProperties}>
                {s}
              </span>
            ))}
            {data.cities.map((c, i) => {
              const r = radius(c.km) / 2;
              const a = (c.bearing * Math.PI) / 180;
              const x = 50 + Math.sin(a) * r * 100;
              const y = 50 - Math.cos(a) * r * 100;
              return (
                <span
                  key={c.name}
                  className={styles.blip}
                  data-center={c.km === 0 || undefined}
                  data-left={x > 62 || undefined}
                  data-hot={hot === i || undefined}
                  onPointerEnter={() => setHot(i)}
                  onPointerLeave={() => setHot(null)}
                  style={
                    {
                      left: `${x}%`,
                      top: `${y}%`,
                      "--delay": `${(c.bearing / 360 - 1) * SWEEP}s`,
                    } as React.CSSProperties
                  }
                >
                  <span className={styles.dot} />
                  <span className={styles.blipName}>{c.name}</span>
                </span>
              );
            })}
          </div>
          <figcaption className={styles.note}>{data.note}</figcaption>
        </figure>
      </div>
    </section>
  );
}
