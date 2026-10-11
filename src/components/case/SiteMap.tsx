"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { SFERA } from "@/content/sfera";
import { CINEMATIC_MQ } from "@/components/service/SearchScene";
import { buildState } from "./buildState";
import styles from "./SiteMap.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { map: (typeof SFERA)["map"] };

const SiteBuilding = dynamic(() => import("./SiteBuilding"), { ssr: false });

/**
 * «Карта спроса» как здание: каждая страница сайта — модуль, 121 штука. По скроллу сначала
 * прорисовывается чертёж объёма, затем кластеры застраиваются этаж за этажом (легенда слева
 * загорается вместе с ними, счётчик растёт). Первый этаж — пары: спереди 12 страниц
 * проектирования, сзади 12 парных разрешений. Пустые ячейки наверху остаются чертежом.
 * На десктопе сцена закреплена, на телефоне идёт в такт обычной прокрутке.
 * Ниже пара на примере склада: два снимка и запросы, которые их разводят.
 */
export default function SiteMap({ map }: Props) {
  const root = useRef<HTMLElement>(null);

  const counts = map.clusters.map((c) => c.count);

  useGSAP(
    () => {
      const section = root.current!;
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const stage = section.querySelector<HTMLElement>(`.${styles.stage}`)!;
      const legend = [
        ...section.querySelectorAll<HTMLElement>(`.${styles.item}`),
      ];
      const counter = section.querySelector<HTMLElement>("[data-counter]")!;
      const note = section.querySelector(`.${styles.pairNote}`);

      if (!reduce) {
        const mm = gsap.matchMedia();
        mm.add(
          { cine: CINEMATIC_MQ, small: `not all and ${CINEMATIC_MQ}` },
          (ctx) => {
            const cine = ctx.conditions!.cine;
            const shown = { n: 0 };
            const tl = gsap.timeline({
              defaults: { ease: "power2.out" },
              scrollTrigger: cine
                ? {
                    trigger: stage,
                    start: "top top",
                    end: "+=170%",
                    pin: true,
                    scrub: 0.6,
                  }
                : {
                    trigger: stage,
                    start: "top 70%",
                    end: "bottom 45%",
                    scrub: 0.6,
                  },
            });
            // Сначала чертёж здания, затем кластеры застраиваются по очереди, в конце пары
            gsap.set(legend, { opacity: 0.3 });
            const drawEnd = 0.8;
            let at = drawEnd + 0.1;
            const windows: [number, number][] = [];
            map.clusters.forEach((c, ci) => {
              const dur = 0.35 + c.count * 0.012;
              windows.push([at, at + dur]);
              tl.fromTo(legend[ci], { opacity: 0.3 }, { opacity: 1, duration: 0.2 }, at);
              at += dur + 0.15;
            });
            const pairAt = at;
            const total = pairAt + 0.7;
            buildState.drawEnd = drawEnd / total;
            buildState.windows = windows.map(([a, b]) => [a / total, b / total]);
            buildState.pairAt = pairAt / total;
            const build = { p: 0 };
            tl.to(build, { p: 1, duration: total, ease: "none", onUpdate: () => void (buildState.progress = build.p) }, 0)
              .fromTo(
                shown,
                { n: 0 },
                {
                  n: map.total,
                  duration: pairAt - drawEnd - 0.1,
                  ease: "none",
                  onUpdate: () => {
                    counter.textContent = String(Math.round(shown.n));
                  },
                },
                drawEnd + 0.1,
              )
              .fromTo(note, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.3 }, pairAt);
            return () => {
              counter.textContent = String(map.total);
              buildState.progress = 1;
            };
          },
        );
      }

      // Пара: снимки въезжают с разных сторон и расходятся по высоте при прокрутке
      if (!reduce) {
        const shots = section.querySelectorAll(`.${styles.shot}`);
        gsap.fromTo(
          shots,
          { y: (i) => (i === 0 ? 30 : 100) },
          {
            y: (i) => (i === 0 ? -30 : 0),
            ease: "none",
            scrollTrigger: {
              trigger: `.${styles.pair}`,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.6,
            },
          },
        );
        gsap.from(section.querySelectorAll(`.${styles.key}`), {
          autoAlpha: 0,
          y: 10,
          duration: 0.5,
          stagger: 0.06,
          ease: "power3.out",
          scrollTrigger: {
            trigger: `.${styles.keys}`,
            start: "top 85%",
            once: true,
          },
        });
      }
    },
    { scope: root },
  );

  const { pair } = map;

  return (
    <section
      ref={root}
      className={styles.section}
      data-surface="dark"
      aria-labelledby="map-title"
    >
      <div className={styles.stage}>
        <div className={`wrap ${styles.grid}`}>
          <div className={styles.copy}>
            <h2 id="map-title" className={styles.title}>
              {map.title}
              <span className={styles.dotMark}>.</span>
            </h2>
            <p className={styles.lead}>{map.lead}</p>
            <ul className={styles.legend}>
              {map.clusters.map((c, ci) => (
                <li key={c.key} className={styles.item} data-c={ci}>
                  <span className={styles.swatch} aria-hidden="true" />
                  <span className={styles.itemCount}>{c.count}</span>
                  <span className={styles.itemName}>
                    {c.name}
                    <span className={styles.itemNote}>{c.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <figure
            className={styles.board}
            aria-label={`Карта сайта: ${map.total} страница`}
          >
            <figcaption className={styles.boardHead}>
              <span className="label">
                Карта сайта · проектирование-под-ключ.рф
              </span>
              <span className={styles.total}>
                <span data-counter>{map.total}</span>
                <span className={styles.totalLabel}>страница</span>
              </span>
            </figcaption>
            <SiteBuilding counts={counts} />
            <p className={styles.pairNote}>
              <span className={styles.pairIcon} aria-hidden="true">
                ⇅
              </span>
              {map.pairNote}
            </p>
          </figure>
        </div>
      </div>

      <div className={`wrap ${styles.pair}`}>
        <p className={`label ${styles.pairLabel}`}>{pair.label}</p>
        <div className={styles.shots}>
          {[pair.left, pair.right].map((side, i) => (
            <figure
              key={side.name}
              className={styles.shot}
              data-side={i === 0 ? "left" : "right"}
            >
              <div className={styles.shotImg}>
                <Image
                  src={side.img}
                  alt={side.alt}
                  sizes="(max-width: 960px) 92vw, 46vw"
                />
              </div>
              <figcaption className={styles.shotCap}>
                <span className={styles.shotWho}>{side.who}</span>
                <span className={styles.shotName}>{side.name}</span>
                <span className={styles.keys}>
                  {side.keys.map((k) => (
                    <span key={k} className={styles.key}>
                      «{k}»
                    </span>
                  ))}
                </span>
              </figcaption>
            </figure>
          ))}
          <span className={styles.bridge} aria-hidden="true">
            <span>ссылаются друг на друга</span>
          </span>
        </div>
        <div className={styles.pairText}>
          <p>{pair.text}</p>
          <p>{pair.template}</p>
        </div>
      </div>
    </section>
  );
}
