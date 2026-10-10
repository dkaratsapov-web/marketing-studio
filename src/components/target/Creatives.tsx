"use client";

import Image, { type StaticImageData } from "next/image";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { TARGET } from "@/content/target";
import adMain from "@/assets/target/ad-main.webp";
import crPalette from "@/assets/target/cr-palette.webp";
import crSingle from "@/assets/target/cr-single.webp";
import crFlatlay from "@/assets/target/cr-flatlay.webp";
import styles from "./Creatives.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof TARGET)["creatives"];
type Item = Data["items"][number];

const PHOTO: Record<Item["photo"], StaticImageData> = {
  palette: crPalette,
  single: crSingle,
  flatlay: crFlatlay,
  main: adMain,
};

/**
 * «Креатив выбирает аудитория». Сетка на выбывание, как в турнире: четыре креатива
 * в первом круге, по паре проходят двое, в финале остаётся один. Проигравший гаснет,
 * получает штамп «отключён» и подпись, почему; линия сетки дорисовывается к победителю,
 * и он въезжает в следующий круг. Сетка играет один раз при появлении, кнопка повторяет.
 */
export default function Creatives({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const { items, rounds, final } = data;
  const semi = rounds.map((r) => r.win);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const card = (sel: string) => q(`[data-card="${sel}"]`)[0];
      const t = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });

      t.from(q("[data-card^='r1']"), { autoAlpha: 0, y: 24, duration: 0.6, stagger: 0.08 });
      rounds.forEach((r, i) => {
        const lose = r.pair.find((p) => p !== r.win)!;
        t.to(card(`r1-${lose}`), { "--out": 1, duration: 0.5 }, `+=${i ? 0.15 : 0.35}`)
          .fromTo(q(`[data-joint="r1-${i}"]`), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.5, ease: "power2.inOut" }, "<0.15")
          .from(card(`r2-${r.win}`), { autoAlpha: 0, x: -36, duration: 0.55 }, "<0.35");
      });
      const loseFinal = semi.find((s) => s !== final.win)!;
      t.to(card(`r2-${loseFinal}`), { "--out": 1, duration: 0.5 }, "+=0.35")
        .fromTo(q("[data-joint='r2']"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.5, ease: "power2.inOut" }, "<0.15")
        .from(card("r3"), { autoAlpha: 0, x: -36, scale: 0.94, duration: 0.6 }, "<0.35")
        .to(card("r3"), { "--win": 1, duration: 0.5 }, "<0.3");
      tl.current = t;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        t.progress(1);
        return;
      }
      ScrollTrigger.create({
        trigger: q(`.${styles.bracket}`)[0],
        start: "top 72%",
        once: true,
        onEnter: () => t.play(),
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="creatives-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="creatives-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.bracket}>
          {data.columns.map((c, i) => (
            <span key={c} className={styles.colName} data-col={i}>
              {c}
            </span>
          ))}

          {rounds.flatMap((r, ri) =>
            r.pair.map((p, k) => (
              <div key={p} className={styles.cell} data-at="r1" style={{ gridRow: ri * 2 + k + 2 }}>
                <Card it={items[p]} out={data.out} at={`r1-${p}`} why={p === r.win ? undefined : r.why} />
              </div>
            )),
          )}
          {rounds.map((r, ri) => (
            <span
              key={`j${ri}`}
              className={styles.joint}
              data-joint={`r1-${ri}`}
              data-col="1"
              style={{ gridRow: `${ri * 2 + 2} / span 2` }}
              aria-hidden="true"
            />
          ))}
          {rounds.map((r, ri) => (
            <div key={`s${ri}`} className={styles.cell} data-at="r2" style={{ gridRow: `${ri * 2 + 2} / span 2` }}>
              <Card it={items[r.win]} out={data.out} at={`r2-${r.win}`} why={r.win === final.win ? undefined : final.why} />
            </div>
          ))}
          <span className={styles.joint} data-joint="r2" data-col="3" aria-hidden="true" />
          <div className={styles.cell} data-at="r3">
            <figure className={styles.card} data-card="r3" data-winner>
              <span className={styles.photoWrap}>
                <Image src={PHOTO[items[final.win].photo]} alt={items[final.win].alt} className={styles.photo} sizes="(max-width: 960px) 90vw, 320px" />
              </span>
              <figcaption className={styles.body}>
                <span className={styles.badge}>{data.winner}</span>
                <span className={styles.idea}>{items[final.win].idea}</span>
                <span className={styles.headline}>{items[final.win].headline}</span>
              </figcaption>
            </figure>
          </div>
        </div>

        <div className={styles.foot}>
          <button type="button" className={`btn ${styles.replay}`} onClick={() => tl.current?.restart()}>
            {data.replay}
            <svg className="btn__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M13 8a5 5 0 1 1-1.5-3.5M13 2v3h-3" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <p className={styles.note}>{data.note}</p>
        </div>
      </div>
    </section>
  );
}

function Card({ it, at, why, out }: { it: Item; at: string; why?: string; out: string }) {
  return (
    <figure className={styles.card} data-card={at}>
      <span className={styles.photoWrap}>
        <Image src={PHOTO[it.photo]} alt={it.alt} className={styles.photo} sizes="(max-width: 960px) 45vw, 160px" />
        <span className={styles.stamp} aria-hidden="true">
          {out}
        </span>
      </span>
      <figcaption className={styles.body}>
        <span className={styles.idea}>{it.idea}</span>
        <span className={styles.headline}>{it.headline}</span>
        {why ? <span className={styles.why}>{why}</span> : null}
      </figcaption>
    </figure>
  );
}
