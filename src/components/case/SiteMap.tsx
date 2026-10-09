"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { SFERA } from "@/content/sfera";
import { CINEMATIC_MQ } from "@/components/service/SearchScene";
import styles from "./SiteMap.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { map: (typeof SFERA)["map"] };

const COLS = 12;

/**
 * «Карта спроса». Каждая точка — страница сайта, 121 штука в сетке 12 колонок.
 * По скроллу кластеры загораются по очереди (легенда слева загорается вместе с ними, счётчик растёт),
 * затем первые два ряда соединяются: 12 страниц проектирования и 12 парных страниц разрешений.
 * На десктопе сцена закреплена, на телефоне идёт в такт обычной прокрутке.
 * Ниже пара на примере склада: два снимка и запросы, которые их разводят.
 */
export default function SiteMap({ map }: Props) {
  const root = useRef<HTMLElement>(null);

  // Номер кластера для каждой точки по порядку раскладки
  const dots = map.clusters.flatMap((c, ci) => Array.from({ length: c.count }, () => ci));

  useGSAP(
    () => {
      const section = root.current!;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const stage = section.querySelector<HTMLElement>(`.${styles.stage}`)!;
      const all = [...section.querySelectorAll<HTMLElement>(`.${styles.dot}`)];
      const legend = [...section.querySelectorAll<HTMLElement>(`.${styles.item}`)];
      const counter = section.querySelector<HTMLElement>("[data-counter]")!;
      const links = section.querySelectorAll(`.${styles.link}`);
      const note = section.querySelector(`.${styles.pairNote}`);

      if (!reduce) {
        const mm = gsap.matchMedia();
        mm.add({ cine: CINEMATIC_MQ, small: `not all and ${CINEMATIC_MQ}` }, (ctx) => {
          const cine = ctx.conditions!.cine;
          const shown = { n: 0 };
          const tl = gsap.timeline({
            defaults: { ease: "power2.out" },
            scrollTrigger: cine
              ? { trigger: stage, start: "top top", end: "+=170%", pin: true, scrub: 0.6 }
              : { trigger: stage, start: "top 70%", end: "bottom 45%", scrub: 0.6 },
          });
          // Явный стартовый кадр: при пересчёте ScrollTrigger отматывает таймлайн к нему
          gsap.set(all, { scale: 0.45, opacity: 0.18 });
          gsap.set(legend, { opacity: 0.3 });
          let at = 0.1;
          map.clusters.forEach((c, ci) => {
            const group = all.filter((d) => Number(d.dataset.c) === ci);
            const dur = 0.35 + c.count * 0.012;
            tl.to(group, { scale: 1, opacity: 1, duration: dur, stagger: { amount: dur * 0.8 } }, at).fromTo(
              legend[ci],
              { opacity: 0.3 },
              { opacity: 1, duration: 0.2 },
              at,
            );
            at += dur + 0.15;
          });
          tl.to(
            shown,
            {
              n: map.total,
              duration: at,
              ease: "none",
              onUpdate: () => {
                counter.textContent = String(Math.round(shown.n));
              },
            },
            0,
          )
            .fromTo(links, { scaleY: 0 }, { scaleY: 1, duration: 0.5, stagger: 0.04, ease: "power2.inOut" }, at)
            .fromTo(note, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.3 }, ">-0.1")
            .to({}, { duration: 0.3 });
          return () => {
            counter.textContent = String(map.total);
          };
        });
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
            scrollTrigger: { trigger: `.${styles.pair}`, start: "top bottom", end: "bottom top", scrub: 0.6 },
          },
        );
        gsap.from(section.querySelectorAll(`.${styles.key}`), {
          autoAlpha: 0,
          y: 10,
          duration: 0.5,
          stagger: 0.06,
          ease: "power3.out",
          scrollTrigger: { trigger: `.${styles.keys}`, start: "top 85%", once: true },
        });
      }
    },
    { scope: root },
  );

  const { pair } = map;

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="map-title">
      <div className={styles.stage}>
        <div className={`wrap ${styles.grid}`}>
          <div className={styles.copy}>
            <p className="label">{map.label}</p>
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

          <figure className={styles.board} aria-label={`Карта сайта: ${map.total} страница`}>
            <figcaption className={styles.boardHead}>
              <span className="label">Карта сайта · проектирование-под-ключ.рф</span>
              <span className={styles.total}>
                <span data-counter>{map.total}</span>
                <span className={styles.totalLabel}>страница</span>
              </span>
            </figcaption>
            <div className={styles.dots} aria-hidden="true">
              <div className={styles.dotGrid}>
                {dots.map((ci, i) => (
                  <span key={i} className={styles.dot} data-c={ci} />
                ))}
              </div>
              {/* Связки пар: между первым рядом (проектирование) и вторым (разрешения) */}
              <div className={styles.links}>
                {Array.from({ length: COLS }, (_, i) => (
                  <span key={i} className={styles.link} />
                ))}
              </div>
            </div>
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
            <figure key={side.name} className={styles.shot} data-side={i === 0 ? "left" : "right"}>
              <div className={styles.shotImg}>
                <Image src={side.img} alt={side.alt} sizes="(max-width: 960px) 92vw, 46vw" />
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
