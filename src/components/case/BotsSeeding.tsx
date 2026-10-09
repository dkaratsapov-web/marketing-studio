"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { SFERA } from "@/content/sfera";
import Lightbox from "./Lightbox";
import styles from "./BotsSeeding.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { bots: (typeof SFERA)["bots"] };

/**
 * Боты и посевы. Ссылка из поста крупно, по скроллу в ней подсвечиваются две части кода:
 * канал (салатовый) и файл (розовый), к каждой тянется сноска. Ниже путь человека
 * от поста до телефона в журнале, волны посевов и два снимка, по клику на весь экран.
 */
export default function BotsSeeding({ bots }: Props) {
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<number | null>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const section = root.current!;
      const q = (cls: string) =>
        section.querySelectorAll<HTMLElement>(`.${cls}`);

      gsap
        .timeline({
          scrollTrigger: {
            trigger: section.querySelector(`.${styles.link}`),
            start: "top 78%",
            once: true,
          },
        })
        .fromTo(
          q(styles.code),
          { "--mark": 0 },
          { "--mark": 1, duration: 0.5, stagger: 0.4 },
        )
        .fromTo(
          q(styles.codeNote),
          { autoAlpha: 0, y: -8 },
          { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.4 },
          0.3,
        );

      gsap
        .timeline({
          scrollTrigger: {
            trigger: section.querySelector(`.${styles.path}`),
            start: "top 78%",
            once: true,
          },
        })
        .fromTo(
          q(styles.node),
          { autoAlpha: 0.25 },
          { autoAlpha: 1, duration: 0.3, stagger: 0.3 },
        )
        .fromTo(
          q(styles.pipe),
          { scaleX: 0 },
          { scaleX: 1, duration: 0.3, stagger: 0.3 },
          0.15,
        );

      gsap.from(q(styles.wave), {
        autoAlpha: 0,
        y: 20,
        duration: 0.6,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section.querySelector(`.${styles.waves}`),
          start: "top 85%",
          once: true,
        },
      });
    },
    { scope: root },
  );

  const { link } = bots;

  return (
    <section
      ref={root}
      className={styles.section}
      data-surface="dark"
      aria-labelledby="bots-title"
    >
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="bots-title" className={styles.title}>
            {bots.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{bots.lead}</p>
        </header>

        <figure className={styles.link}>
          <figcaption className="label">Пример ссылки из поста</figcaption>
          <p className={styles.url}>
            <span className={styles.base}>{link.base}</span>
            <span className={styles.code} data-kind="channel">
              <span className={styles.codeText}>{link.channel}</span>
              <span className={styles.codeNote}>{bots.linkNotes.channel}</span>
            </span>
            <span className={`${styles.base} ${styles.sep}`}>_</span>
            <span className={styles.code} data-kind="file">
              <span className={styles.codeText}>{link.file}</span>
              <span className={styles.codeNote}>{bots.linkNotes.file}</span>
            </span>
          </p>
        </figure>

        <ol className={styles.path}>
          {bots.path.map((p, i) => (
            <li key={p.name} className={styles.node}>
              <span className={styles.nodeNo}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className={styles.nodeName}>{p.name}</span>
              <span className={styles.nodeNote}>{p.note}</span>
              {i < bots.path.length - 1 ? (
                <span className={styles.pipe} aria-hidden="true" />
              ) : null}
            </li>
          ))}
        </ol>

        <div className={styles.bottom}>
          <div className={styles.texts}>
            <p className={styles.views}>{bots.views}</p>
            <p className={styles.manager}>{bots.manager}</p>
            <div className={styles.waves}>
              <p className="label">{bots.waves.label}</p>
              <ol>
                {bots.waves.items.map((w) => (
                  <li key={w.name} className={styles.wave}>
                    <span className={styles.waveName}>{w.name}</span>
                    <span className={styles.waveNote}>{w.note}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className={styles.shots}>
            {bots.shots.map((s, i) => (
              <button
                key={s.name}
                type="button"
                className={styles.shot}
                data-phone={s.img.height > s.img.width || undefined}
                onClick={() => setOpen(i)}
                data-cursor-label="Открыть"
                aria-label={`Открыть снимок: ${s.name}`}
              >
                <Image
                  src={s.img}
                  alt={s.alt}
                  sizes="(max-width: 960px) 80vw, 30vw"
                />
                <span className={styles.shotName}>{s.name}</span>
                <span className={styles.shotNote}>{s.note}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <Lightbox shots={bots.shots} index={open} onChange={setOpen} />
    </section>
  );
}
