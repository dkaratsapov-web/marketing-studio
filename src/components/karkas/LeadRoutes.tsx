"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { KARKAS } from "@/content/karkas";
import b from "./Block.module.css";
import styles from "./LeadRoutes.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Узлы схемы в координатах viewBox 600 × 320 */
const FROM = { x: 70, y: 160 };
const HUB = { x: 270, y: 160 };
const OUT_X = 450;
const outY = (i: number, n: number) => 40 + (i * 240) / Math.max(1, n - 1);

/**
 * Заявки и CRM. Схема: форма → сервер → четыре канала. По скроллу линии прочерчиваются,
 * потом по ним бегут заявки. Справа снимки админки лежат стопкой и раскладываются веером.
 */
export default function LeadRoutes({ data }: { data: typeof KARKAS.crm }) {
  const root = useRef<HTMLElement>(null);
  const n = data.routes.length;

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const el = root.current!;
      const scheme = el.querySelector(`.${styles.scheme}`)!;
      gsap.fromTo(scheme, { "--draw": 0 }, { "--draw": 1, ease: "none", scrollTrigger: { trigger: scheme, start: "top 80%", end: "center 50%", scrub: 0.6 } });
      gsap.fromTo(el.querySelectorAll(`.${styles.node}`), { autoAlpha: 0.15 }, { autoAlpha: 1, stagger: 0.15, ease: "none", scrollTrigger: { trigger: scheme, start: "top 75%", end: "center 50%", scrub: 0.6 } });
      const cards = el.querySelectorAll<HTMLElement>(`.${styles.sheet}`);
      gsap.fromTo(
        cards,
        { x: 0, y: (i) => i * 6, rotate: 0 },
        {
          x: (i) => (i - (cards.length - 1) / 2) * 22,
          y: (i) => Math.abs(i - (cards.length - 1) / 2) * 18,
          rotate: (i) => (i - (cards.length - 1) / 2) * 3,
          ease: "power1.out",
          scrollTrigger: { trigger: el.querySelector(`.${styles.deck}`), start: "top 85%", end: "center 50%", scrub: 0.8 },
        },
      );
    },
    { scope: root },
  );

  const path = (y: number) => `M${HUB.x + 46} ${HUB.y} C ${HUB.x + 110} ${HUB.y}, ${OUT_X - 70} ${y}, ${OUT_X - 8} ${y}`;

  return (
    <section ref={root} className={b.section} data-surface="dark" aria-labelledby="kk-crm">
      <div className="wrap">
        <div className={b.head}>
          <h2 id="kk-crm" className={b.title}>
            {data.title}
            <span className={b.dot}>.</span>
          </h2>
          <p className={b.lead}>{data.lead}</p>
        </div>

        <div className={styles.grid}>
          <div>
            <svg className={styles.scheme} viewBox="0 0 600 320" role="img" aria-label={`${data.from} → ${data.hub} → ${data.routes.join(", ")}`}>
              <path className={styles.wire} d={`M${FROM.x + 52} ${FROM.y} L${HUB.x - 46} ${HUB.y}`} pathLength={1} />
              <path className={styles.flow} d={`M${FROM.x + 52} ${FROM.y} L${HUB.x - 46} ${HUB.y}`} />
              {data.routes.map((r, i) => (
                <g key={r}>
                  <path className={styles.wire} d={path(outY(i, n))} pathLength={1} />
                  <path className={styles.flow} d={path(outY(i, n))} style={{ animationDelay: `${i * 0.35}s` }} />
                </g>
              ))}
              <g className={styles.node} transform={`translate(${FROM.x} ${FROM.y})`}>
                <rect x={-52} y={-22} width={104} height={44} rx={6} />
                <text textAnchor="middle" y={5}>
                  {data.from}
                </text>
              </g>
              <g className={`${styles.node} ${styles.hub}`} transform={`translate(${HUB.x} ${HUB.y})`}>
                <rect x={-46} y={-28} width={92} height={56} rx={6} />
                <text textAnchor="middle" y={5}>
                  {data.hub}
                </text>
              </g>
              {data.routes.map((r, i) => (
                <g key={r} className={styles.node} transform={`translate(${OUT_X} ${outY(i, n)})`}>
                  <circle r={6} />
                  <text x={14} y={5}>
                    {r}
                  </text>
                </g>
              ))}
            </svg>
            <ul className={styles.admin}>
              {data.admin.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>

          <figure className={styles.deckWrap}>
            <div className={styles.deck}>
              {data.shots.map((s, i) => (
                <div key={s.name} className={styles.sheet} style={{ zIndex: i }}>
                  <Image src={s.img} alt={`Админка: ${s.name}`} sizes="(max-width: 960px) 80vw, 36vw" className={styles.img} />
                  <span className={styles.tag}>{s.name}</span>
                </div>
              ))}
            </div>
            <figcaption className={styles.cap}>{data.note}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
