"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { SFERA } from "@/content/sfera";
import styles from "./Evidence.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { evidence: (typeof SFERA)["evidence"] };

/**
 * Директ, связанный с аналитикой. Сверху три источника (Директ, Метрика, сайт): от каждого
 * по скроллу тянется провод к таблице «Стыка», и таблица проявляется, когда провода дошли.
 * Ниже три улики: что было не так закрыто чёрной плашкой, плашка уезжает, и сверху падает печать «Исправлено».
 */
export default function Evidence({ evidence }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const section = root.current!;
      const q = (cls: string) =>
        section.querySelectorAll<HTMLElement>(`.${cls}`);

      // Провода от источников к таблице, затем таблица. На телефоне провода идут вниз
      const axis = window.matchMedia("(max-width: 960px)").matches
        ? "scaleY"
        : "scaleX";
      const wires = gsap.timeline({
        scrollTrigger: {
          trigger: section.querySelector(`.${styles.joint}`),
          start: "top 78%",
          once: true,
        },
      });
      wires
        .fromTo(
          q(styles.source),
          { autoAlpha: 0, x: -20 },
          { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.15 },
        )
        .fromTo(
          q(styles.wire),
          { [axis]: 0 },
          { [axis]: 1, duration: 0.6, stagger: 0.15, ease: "power2.inOut" },
          0.2,
        )
        .fromTo(
          section.querySelector(`.${styles.shot}`),
          { clipPath: "inset(0% 100% 0% 0%)" },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 0.8,
            ease: "power2.inOut",
          },
          0.75,
        );

      // Улики: плашка уезжает, печать падает. Один раз, как вскрытие конверта
      const clues = gsap.utils.toArray<HTMLElement>(`.${styles.clue}`);
      clues.forEach((clue, i) => {
        gsap.set(clue.querySelector(`.${styles.stamp}`), { autoAlpha: 0 });
        ScrollTrigger.create({
          trigger: clue,
          start: "top 75%",
          once: true,
          onEnter: () => {
            gsap
              .timeline({ delay: i * 0.15 })
              .to(clue.querySelector(`.${styles.bar}`), {
                scaleX: 0,
                duration: 0.7,
                ease: "power3.inOut",
              })
              .fromTo(
                clue.querySelector(`.${styles.stamp}`),
                { autoAlpha: 0, scale: 1.8, rotation: -20 },
                {
                  autoAlpha: 1,
                  scale: 1,
                  rotation: -8,
                  duration: 0.45,
                  ease: "back.out(2.4)",
                },
                "+=0.15",
              );
          },
        });
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className={styles.section}
      data-surface="light"
      aria-labelledby="evidence-title"
    >
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="evidence-title" className={styles.title}>
            {evidence.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{evidence.lead}</p>
        </header>

        <div className={styles.joint}>
          <ul className={styles.sources}>
            {evidence.sources.map((src) => (
              <li key={src.name} className={styles.source}>
                <span className={styles.srcName}>{src.name}</span>
                <span className={styles.srcWhat}>{src.what}</span>
                <span className={styles.wire} aria-hidden="true" />
              </li>
            ))}
          </ul>
          <figure className={styles.shot}>
            <div className={styles.shotImg}>
              <Image
                src={evidence.shot.img}
                alt={evidence.shot.alt}
                sizes="(max-width: 960px) 92vw, 60vw"
              />
            </div>
            <figcaption className={styles.shotNote}>
              {evidence.shotNote}
            </figcaption>
          </figure>
        </div>

        <div className={styles.cluesHead}>
          <p className={`label ${styles.cluesLabel}`}>{evidence.cluesLabel}</p>
          <h3 className={styles.cluesTitle}>{evidence.cluesTitle}</h3>
          <p className={styles.cluesLead}>{evidence.cluesLead}</p>
        </div>

        <ol className={styles.clues}>
          {evidence.clues.map((c, i) => (
            <li key={c.what} className={styles.clue}>
              <p className={styles.clueNo}>
                Улика {String(i + 1).padStart(2, "0")}
              </p>
              <p className={styles.what}>
                <span className={styles.whatText}>{c.what}</span>
                <span className={styles.bar} aria-hidden="true" />
              </p>
              <p className={styles.effect}>
                <span className="label">Что это ломало</span>
                {c.effect}
              </p>
              <span className={styles.stamp}>{evidence.stamp}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
