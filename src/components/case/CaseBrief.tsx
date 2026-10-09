"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { SFERA } from "@/content/sfera";
import styles from "./CaseBrief.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { brief: (typeof SFERA)["brief"]; client: string };

/**
 * Клиент и опись дела. Слева «Проектирует …» с перебором типов объектов под маской,
 * справа опись из восьми частей, как в архивной папке: строки проявляются по очереди,
 * линия под каждой прочерчивается, счётчик справа печатается штампом.
 */
export default function CaseBrief({ brief, client }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const section = root.current!;

      // Перебор объектов: слово уезжает вверх, следующее встаёт снизу
      const words = gsap.utils.toArray<HTMLElement>(`.${styles.word}`);
      gsap.set(words, { yPercent: 105 });
      gsap.set(words[0], { yPercent: 0 });
      const loop = gsap.timeline({ repeat: -1, paused: true });
      words.forEach((w, i) => {
        const next = words[(i + 1) % words.length];
        loop
          .to(
            w,
            { yPercent: -105, duration: 0.6, ease: "power3.inOut" },
            "+=1.3",
          )
          .fromTo(
            next,
            { yPercent: 105 },
            { yPercent: 0, duration: 0.6, ease: "power3.inOut" },
            "<",
          );
      });
      ScrollTrigger.create({
        trigger: section,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => (self.isActive ? loop.play() : loop.pause()),
      });

      // Опись: строки по очереди, как будто их вписывают в карточку
      const rows = gsap.utils.toArray<HTMLElement>(`.${styles.row}`);
      gsap.set(rows, { autoAlpha: 0, y: 18 });
      gsap.set(section.querySelectorAll(`.${styles.rule}`), { scaleX: 0 });
      ScrollTrigger.batch(rows, {
        start: "top 88%",
        once: true,
        onEnter: (batch) => {
          gsap.to(batch, {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.09,
            ease: "power3.out",
          });
          gsap.to(
            batch.map((r) => r.querySelector(`.${styles.rule}`)),
            { scaleX: 1, duration: 0.9, stagger: 0.09, ease: "power2.inOut" },
          );
          gsap.fromTo(
            batch.map((r) => r.querySelector(`.${styles.count}`)),
            { scale: 1.6, autoAlpha: 0, rotation: -8 },
            {
              scale: 1,
              autoAlpha: 1,
              rotation: -2,
              duration: 0.45,
              stagger: 0.09,
              delay: 0.35,
              ease: "back.out(2.2)",
            },
          );
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
      aria-labelledby="brief-title"
    >
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.about}>
          <p className="label">{brief.label}</p>
          <h2 id="brief-title" className={styles.title}>
            <span className={styles.who}>{client}</span>
            <span className={styles.verb}>проектирует</span>
            <span className={styles.rotor} aria-hidden="true">
              {brief.objects.map((o) => (
                <span key={o} className={styles.word}>
                  {o}
                </span>
              ))}
            </span>
            <span className="visually-hidden">{brief.objects.join(", ")}</span>
          </h2>
          <p className={styles.text}>{brief.text}</p>
          <dl className={styles.facts}>
            {brief.facts.map((f) => (
              <div key={f.name}>
                <dt className="label">{f.name}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={styles.inventory}>
          <p className={`label ${styles.invLabel}`}>
            <span>{brief.inventoryLabel}</span>
            <span>
              {String(brief.inventory.length).padStart(2, "0")} частей
            </span>
          </p>
          <ol className={styles.rows}>
            {brief.inventory.map((it, i) => (
              <li key={it.name} className={styles.row}>
                <span className={styles.num}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={styles.name}>
                  {it.name}
                  <span className={styles.note}>{it.note}</span>
                </span>
                <span className={styles.count}>{it.count}</span>
                <span className={styles.rule} aria-hidden="true" />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
