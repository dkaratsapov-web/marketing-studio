"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { KARKAS } from "@/content/karkas";
import b from "./Block.module.css";
import styles from "./Coverage.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = typeof KARKAS.path;
const RINGS = [50, 100, 150, 200];
const KM = 111.2;

/** Расстояние по прямой между точками, км */
function distance(a: { lat: number; lon: number }, c: { lat: number; lon: number }) {
  const r = Math.PI / 180;
  const dLat = (c.lat - a.lat) * r;
  const dLon = (c.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(c.lat * r) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/**
 * Путь к заявке. Слева карта охвата, как на сайте клиента: города по координатам, кольца
 * через каждые 50 км от Твери расходятся по скроллу, и города загораются по мере того,
 * как до них доходит кольцо. Город можно выбрать: справа расстояние по прямой.
 */
export default function Coverage({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const { center } = data;
  const cities = useMemo(() => {
    const cos = Math.cos((center.lat * Math.PI) / 180);
    return data.cities
      .map((c) => ({ ...c, x: (c.lon - center.lon) * cos * KM, y: -(c.lat - center.lat) * KM, km: Math.round(distance(center, c)) }))
      .sort((a, b) => a.km - b.km);
  }, [data.cities, center]);
  const [pick, setPick] = useState(cities.find((c) => c.name === "Клин") ?? cities[0]);

  useGSAP(
    () => {
      const el = root.current!;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const map = el.querySelector<SVGSVGElement>(`.${styles.map}`)!;
      const st = { r: 0 };
      const apply = () => {
        map.style.setProperty("--reach", String(st.r));
        map.querySelectorAll<SVGGElement>("[data-km]").forEach((g) => g.toggleAttribute("data-lit", Number(g.dataset.km) <= st.r));
      };
      apply();
      gsap.to(st, { r: 215, ease: "none", onUpdate: apply, scrollTrigger: { trigger: map, start: "top 75%", end: "bottom 55%", scrub: 0.6 } });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={b.section} data-surface="dark" aria-labelledby="kk-path">
      <div className="wrap">
        <div className={b.head}>
          <h2 id="kk-path" className={b.title}>
            {data.title}
            <span className={b.dot}>.</span>
          </h2>
          <p className={b.lead}>{data.lead}</p>
        </div>

        <div className={styles.grid}>
          <figure className={styles.mapWrap}>
            <svg className={styles.map} viewBox="-215 -135 370 250" role="group" aria-label="Карта охвата: города вокруг Твери">
              {RINGS.map((r) => (
                <g key={r} className={styles.ring} style={{ "--r": r } as React.CSSProperties}>
                  <circle r={r} />
                  <text x={r * 0.72 + 4} y={-r * 0.72}>
                    {r} км
                  </text>
                </g>
              ))}
              <line className={styles.link} x1={0} y1={0} x2={pick.x} y2={pick.y} />
              {cities.map((c) => (
                <g
                  key={c.name}
                  data-km={c.km}
                  data-lit
                  className={styles.city}
                  data-pick={pick.name === c.name || undefined}
                  transform={`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})`}
                  tabIndex={0}
                  role="button"
                  aria-label={`${c.name}, ${c.km} км от Твери`}
                  onClick={() => setPick(c)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setPick(c))}
                >
                  <circle r={9} className={styles.hit} />
                  <circle r={2.6} className={styles.pin} />
                  <text x={5} y={-5}>
                    {c.name}
                  </text>
                </g>
              ))}
              <g className={styles.home}>
                <circle r={5} />
                <text x={8} y={4}>
                  {center.name}
                </text>
              </g>
            </svg>
            <figcaption className={styles.card} aria-live="polite">
              <span className="label">Ваш участок</span>
              <b>{pick.name}</b>
              <span>
                {pick.km} км от Твери по прямой
              </span>
            </figcaption>
          </figure>

          <div className={styles.side}>
            <ol className={styles.steps}>
              {data.steps.map((s, i) => (
                <li key={s.name}>
                  <span className={styles.n}>{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <b>{s.name}</b>
                    <p>{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className={styles.shots}>
              {data.shots.map((s) => (
                <Image key={s.alt} src={s.img} alt={s.alt} sizes="(max-width: 860px) 92vw, 34vw" className={styles.shot} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
