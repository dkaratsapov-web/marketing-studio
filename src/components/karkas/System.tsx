"use client";

import Image from "next/image";
import { Onest } from "next/font/google";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { KARKAS } from "@/content/karkas";
import b from "./Block.module.css";
import styles from "./System.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Шрифт клиента только для образца в этом блоке
const onest = Onest({ subsets: ["cyrillic", "latin"], display: "swap" });

/**
 * Дизайн-система «Чертёж» на синьке: размерная линия над заголовком прочерчивается,
 * цвета поднимаются столбцами, образец Onest набирает вес по скроллу, углы трёх плашек
 * скругляются до 4, 6 и 14 px, внизу ритм стоек каркаса с шагом 600 мм.
 */
export default function System({ data }: { data: typeof KARKAS.system }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const el = root.current!;
      const q = (c: string) => el.querySelector<HTMLElement>(`.${c}`);
      gsap.fromTo(q(styles.dim), { "--draw": 0 }, { "--draw": 1, ease: "none", scrollTrigger: { trigger: q(styles.dim), start: "top 85%", end: "top 55%", scrub: 0.6 } });
      gsap.fromTo(el.querySelectorAll(`.${styles.swatch}`), { scaleY: 0 }, { scaleY: 1, ease: "power3.out", duration: 1, stagger: 0.1, scrollTrigger: { trigger: q(styles.palette), start: "top 80%", once: true } });
      gsap.fromTo(q(styles.specimen), { "--w": 200 }, { "--w": 820, ease: "none", scrollTrigger: { trigger: q(styles.type), start: "top 85%", end: "bottom 45%", scrub: 0.6 } });
      el.querySelectorAll<HTMLElement>(`.${styles.radius}`).forEach((r) => {
        gsap.fromTo(r, { "--r": 0 }, { "--r": 1, ease: "none", scrollTrigger: { trigger: r, start: "top 85%", end: "top 55%", scrub: 0.6 } });
      });
      gsap.fromTo(q(styles.studs), { backgroundPositionX: "0px" }, { backgroundPositionX: "-240px", ease: "none", scrollTrigger: { trigger: q(styles.band), start: "top bottom", end: "bottom top", scrub: true } });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={`${b.section} ${styles.blue}`} data-surface="dark" aria-labelledby="kk-system">
      <div className="wrap">
        <div className={b.head}>
          <div>
            <p className={styles.dim} aria-hidden="true">
              <span className={styles.tick} />
              <span className={styles.thread} />
              <span className={styles.dimText}>надзаголовок стал размерной линией</span>
              <span className={styles.thread} />
              <span className={styles.tick} />
            </p>
            <h2 id="kk-system" className={b.title}>
              {data.title}
              <span className={b.dot}>.</span>
            </h2>
          </div>
          <p className={b.lead}>{data.lead}</p>
        </div>

        <ul className={styles.palette}>
          {data.palette.map((c) => (
            <li key={c.hex} className={styles.swatch} style={{ background: c.hex, color: c.ink }}>
              <span className={styles.swName}>{c.name}</span>
              <span className={styles.swHex}>{c.hex}</span>
            </li>
          ))}
        </ul>

        <div className={styles.pair}>
          <div className={styles.type}>
            <p className={`${styles.specimen} ${onest.className}`} aria-hidden="true">
              Аа
            </p>
            <div>
              <p className={`${styles.fontName} ${onest.className}`}>{data.font.name}</p>
              <p className={styles.note}>{data.font.note}</p>
            </div>
          </div>
          <ul className={styles.radii}>
            {data.radii.map((r) => (
              <li key={r.px} className={styles.radius} style={{ "--px": `${r.px * 3}px` } as React.CSSProperties}>
                <span className={styles.corner} />
                <b>{r.px} px</b>
                <span>{r.what}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.band}>
          <div className={styles.studs} aria-hidden="true" />
          <ul className={styles.rules}>
            {data.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>

        <figure className={styles.shotWrap}>
          <Image src={data.shot.img} alt={data.shot.alt} sizes="(max-width: 860px) 92vw, 80vw" className={styles.shot} />
          <figcaption className={styles.cap}>Блок «Почему нас выбирают» в новой системе</figcaption>
        </figure>
      </div>
    </section>
  );
}
