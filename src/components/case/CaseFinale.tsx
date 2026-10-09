"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import HeroLead from "@/components/hero/HeroLead";
import Seam from "@/components/seam/Seam";
import { CASES } from "@/content/cases";
import type { SFERA } from "@/content/sfera";
import styles from "./CaseFinale.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { data: typeof SFERA };

/**
 * Последние три блока дела одним компонентом, потому что они читаются подряд:
 * 10 — служебная часть (пульт с индикаторами), 11 — четыре правила (строки проявляются
 * и подсвечиваются по скроллу, как манифест на главной), 12 — честные результаты с печатью
 * «Период не закрыт», форма и другие дела.
 */
export default function CaseFinale({ data }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const { service, principles, results } = data;
  const others = CASES.filter((c) => c.code !== data.code).slice(0, 3);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const el = root.current!;
      const q = (cls: string) => el.querySelectorAll<HTMLElement>(`.${cls}`);

      // Пульт: индикаторы загораются по очереди
      gsap.fromTo(
        q(styles.lamp),
        { "--on": 0 },
        {
          "--on": 1,
          duration: 0.25,
          stagger: 0.12,
          scrollTrigger: {
            trigger: el.querySelector(`.${styles.board}`),
            start: "top 75%",
            once: true,
          },
        },
      );

      // Правила: каждое проявляется из-под маски и становится ярким, когда доходит до середины экрана
      q(styles.rule).forEach((row) => {
        gsap.fromTo(
          row.querySelector(`.${styles.ruleName}`),
          { yPercent: 105 },
          {
            yPercent: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: row, start: "top 85%", once: true },
          },
        );
        gsap.fromTo(
          row,
          { opacity: 0.35 },
          {
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: row,
              start: "top 70%",
              end: "top 45%",
              scrub: true,
            },
          },
        );
      });

      // Печать падает на лист
      gsap.fromTo(
        el.querySelector(`.${styles.stamp}`),
        { autoAlpha: 0, scale: 1.8, rotation: -24 },
        {
          autoAlpha: 1,
          scale: 1,
          rotation: -9,
          duration: 0.5,
          ease: "back.out(2.2)",
          scrollTrigger: {
            trigger: el.querySelector(`.${styles.results}`),
            start: "top 70%",
            once: true,
          },
        },
      );
    },
    { scope: root },
  );

  return (
    <div ref={root}>
      {/* 10. Служебная часть */}
      <section
        className={styles.service}
        data-surface="light"
        aria-labelledby="service-title"
      >
        <div className={`wrap ${styles.serviceGrid}`}>
          <header className={styles.serviceHead}>
            <h2 id="service-title" className={styles.title}>
              {service.title}
              <span className={styles.dotPink}>.</span>
            </h2>
          </header>
          <ul className={styles.board}>
            {service.items.map((it) => (
              <li key={it.name} className={styles.switch}>
                <span className={styles.lamp} aria-hidden="true" />
                <span className={styles.switchName}>{it.name}</span>
                <span className={styles.switchNote}>{it.note}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Seam from="light" to="dark" label="Правила" />

      {/* 11. Как мы работаем */}
      <section
        className={styles.principles}
        data-surface="dark"
        aria-labelledby="principles-title"
      >
        <div className={`wrap ${styles.principlesGrid}`}>
          <header className={styles.principlesHead}>
            <h2 id="principles-title" className={styles.title}>
              {principles.title}
              <span className={styles.dotLime}>.</span>
            </h2>
          </header>
          <ol className={styles.rules}>
            {principles.items.map((p, i) => (
              <li key={p.name} className={styles.rule}>
                <span className={styles.ruleNo} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={styles.ruleMask}>
                  <span className={styles.ruleName}>{p.name}</span>
                </span>
                <span className={styles.ruleText}>{p.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Seam from="dark" to="light" label="Результаты" />

      {/* 12. Результаты и финал */}
      <section
        className={styles.results}
        data-surface="light"
        aria-labelledby="results-title"
      >
        <div className={`wrap ${styles.resultsGrid}`}>
          <div className={styles.sheet}>
            <h2 id="results-title" className={styles.title}>
              {results.title}
              <span className={styles.dotPink}>.</span>
            </h2>
            <p className={styles.resultsText}>{results.text}</p>
            <span className={styles.stamp}>{results.stamp}</span>
          </div>

          <div className={styles.cta} data-surface="dark">
            <h3 className={styles.ctaTitle}>{results.ctaTitle}</h3>
            <p className={styles.ctaText}>{results.ctaText}</p>
            <HeroLead
              source="service"
              service={`Кейс «Сфера», дело ${data.code}`}
            />
          </div>

          <nav className={styles.others} aria-label={results.otherLabel}>
            <p className="label">{results.otherLabel}</p>
            <ul>
              {others.map((c) => (
                <li key={c.code}>
                  <Link href="/#dossier" className={styles.other}>
                    <span className={styles.otherCode}>Дело {c.code}</span>
                    <span className={styles.otherTitle}>{c.title}</span>
                    <span className={styles.otherSector}>{c.sector}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>
    </div>
  );
}
