"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import HeroLead from "@/components/hero/HeroLead";
import { CONTEXT, type SearchQuery } from "@/content/services";
import SearchScene from "./SearchScene";
import styles from "./ServiceHero.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = {
  service: typeof CONTEXT;
  queries: SearchQuery[];
};

/**
 * Первый экран страницы отдела. Родственник главного: огромный заголовок из-под маски,
 * только справа вместо монолита живая сцена отдела. При прокрутке сцена приближается
 * и наклоняется, текст уходит вверх, как будто камера наезжает на выдачу.
 */
export default function ServiceHero({ service, queries }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const mm = gsap.matchMedia();
      // На десктопе наезд камеры заметнее, на телефоне сцена только чуть приподнимается
      mm.add("(min-width: 961px)", () => {
        gsap
          .timeline({
            scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.6 },
          })
          .to(`.${styles.stage}`, { scale: 1.08, rotateX: 8, yPercent: -6, ease: "none" }, 0)
          .to(`.${styles.text}`, { yPercent: -14, autoAlpha: 0.25, ease: "none" }, 0);
      });
      mm.add("(max-width: 960px)", () => {
        gsap.to(`.${styles.stage}`, {
          yPercent: -6,
          ease: "none",
          scrollTrigger: { trigger: `.${styles.stage}`, start: "top bottom", end: "bottom top", scrub: 0.6 },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="top" className={styles.hero} data-surface="dark">
      <div className={styles.glow} aria-hidden="true" />
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.text}>
          <nav className={styles.crumbs} aria-label="Хлебные крошки">
            <Link href="/">Корпорация</Link>
            <span aria-hidden="true">/</span>
            <Link href="/#departments">Отделы</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{service.name}</span>
          </nav>

          <p className={`label ${styles.kicker}`}>
            {service.department} <span className={styles.kickerTools}>· {service.tools}</span>
          </p>

          <h1 className={styles.title}>
            <span className="visually-hidden">{service.name}: </span>
            {service.title.map((word, i) => (
              <span key={word} className={styles.mask}>
                <span className={styles.line} style={{ "--i": i } as React.CSSProperties}>
                  {word}
                  {i === service.title.length - 1 ? <span className={styles.dot}>.</span> : null}
                </span>
              </span>
            ))}
          </h1>

          <div className={styles.lead}>
            <p className={styles.leadText}>{service.lead}</p>
            <HeroLead source="service" service={service.name} />
          </div>
        </div>

        <div className={styles.stageWrap}>
          <div className={styles.stage}>
            <SearchScene queries={queries} />
          </div>
          <p className={styles.head}>
            <span className={styles.headMark} aria-hidden="true">
              {service.head.name.charAt(0)}
            </span>
            <span>
              <span className={styles.headName}>{service.head.name}</span>
              <span className={styles.headRole}>{service.head.role}</span>
            </span>
          </p>
        </div>

        <dl className={styles.facts}>
          {service.facts.map((f) => (
            <div key={f.label} className={styles.fact}>
              <dt className={styles.factLabel}>{f.label}</dt>
              <dd className={styles.factValue}>{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
