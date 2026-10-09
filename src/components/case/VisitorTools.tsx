"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { SFERA } from "@/content/sfera";
import Lightbox from "./Lightbox";
import styles from "./VisitorTools.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { tools: (typeof SFERA)["tools"] };

/**
 * Инструменты для посетителя. Калькулятор показан своей главной мыслью: в центре «коробка»
 * (то, что покрывает цена за квадрат), вокруг неё по скроллу встают статьи затрат за периметром.
 * Рядом снимки калькулятора, по клику на весь экран. Чат-ассистент — путь вопроса по шагам,
 * лид-магниты — шесть файлов.
 */
export default function VisitorTools({ tools }: Props) {
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const { calc, chat } = tools;

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const section = root.current!;
      const q = (cls: string) =>
        section.querySelectorAll<HTMLElement>(`.${cls}`);

      // Коробка и всё, что за её периметром
      gsap
        .timeline({
          scrollTrigger: {
            trigger: section.querySelector(`.${styles.plan}`),
            start: "top 78%",
            once: true,
          },
        })
        .fromTo(
          section.querySelector(`.${styles.box}`),
          { scale: 0.6, autoAlpha: 0 },
          { scale: 1, autoAlpha: 1, duration: 0.5 },
        )
        .fromTo(
          section.querySelector(`.${styles.perimeter}`),
          { scale: 0.7, autoAlpha: 0 },
          { scale: 1, autoAlpha: 1, duration: 0.5 },
          0.35,
        )
        .fromTo(
          q(styles.part),
          { autoAlpha: 0, scale: 0.8 },
          { autoAlpha: 1, scale: 1, duration: 0.3, stagger: 0.12 },
          0.6,
        );

      // Путь вопроса: шаги загораются по очереди, стрелки дорисовываются
      gsap
        .timeline({
          scrollTrigger: {
            trigger: section.querySelector(`.${styles.flow}`),
            start: "top 78%",
            once: true,
          },
        })
        .fromTo(
          q(styles.step),
          { autoAlpha: 0.25, y: 10 },
          { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.35 },
        );

      // Лид-магниты: файлы раскладываются веером
      gsap.from(q(styles.file), {
        autoAlpha: 0,
        y: 30,
        rotation: (i) => (i % 2 ? 6 : -6),
        duration: 0.6,
        stagger: 0.08,
        ease: "back.out(1.6)",
        scrollTrigger: {
          trigger: section.querySelector(`.${styles.files}`),
          start: "top 85%",
          once: true,
        },
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className={styles.section}
      data-surface="light"
      aria-labelledby="tools-title"
    >
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="tools-title" className={styles.title}>
            {tools.title}
            <span className={styles.dotMark}>.</span>
          </h2>
        </header>

        {/* Калькулятор */}
        <div className={styles.calc}>
          <div className={styles.calcCopy}>
            <h3 className={styles.toolName}>{calc.name}</h3>
            <p className={styles.toolText}>{calc.text}</p>
            <p className={styles.idea}>{calc.idea}</p>
          </div>

          <div className={styles.plan} aria-hidden="true">
            <div className={styles.perimeter}>
              {calc.parts.slice(1).map((p) => (
                <span key={p} className={styles.part}>
                  {p}
                </span>
              ))}
            </div>
            <div className={styles.box}>
              <span className={styles.boxName}>{calc.parts[0]}</span>
              <span className={styles.boxNote}>цена за м²</span>
            </div>
            <span className={styles.perimeterLabel}>за периметром</span>
          </div>

          <div className={styles.shots}>
            {calc.shots.map((s, i) => (
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
                  sizes="(max-width: 960px) 60vw, 26vw"
                />
                <span className={styles.shotName}>{s.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Чат-ассистент */}
        <div className={styles.chat}>
          <div className={styles.chatCopy}>
            <h3 className={styles.toolName}>{chat.name}</h3>
            <p className={styles.bigCount}>
              {chat.count}
              <span>{chat.countLabel}</span>
            </p>
            <p className={styles.toolText}>{chat.text}</p>
            <p className={styles.chatLead}>{chat.lead}</p>
          </div>
          <ol className={styles.flow}>
            {chat.flow.map((f, i) => (
              <li
                key={f.name}
                className={styles.step}
                data-hand={i === 2 || undefined}
              >
                <span className={styles.stepNo}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={styles.stepName}>{f.name}</span>
                <span className={styles.stepNote}>{f.note}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Лид-магниты */}
        <div className={styles.magnets}>
          <div className={styles.magnetsHead}>
            <h3 className={styles.toolName}>{tools.magnetsLabel}</h3>
          </div>
          <ul className={styles.files}>
            {tools.magnets.map((m, i) => (
              <li key={m} className={styles.file}>
                <span className={styles.fileType}>
                  PDF · {String(i + 1).padStart(2, "0")}
                </span>
                <span className={styles.fileName}>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Lightbox shots={calc.shots} index={open} onChange={setOpen} />
    </section>
  );
}
