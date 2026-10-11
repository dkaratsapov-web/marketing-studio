"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import HeroLead from "@/components/hero/HeroLead";
import { CINEMATIC_MQ } from "@/components/service/SearchScene";
import type { ABOUT } from "@/content/about";
import dynamic from "next/dynamic";
import { aboutState } from "./aboutState";
import styles from "./AboutHero.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const MarkScene = dynamic(() => import("./MarkScene"), { ssr: false });

type Props = { data: typeof ABOUT };

/**
 * Первый экран «О нас». Справа знак «Этажи» в 3D: бруски буквы К разбросаны по сцене
 * и по скроллу собираются волнами снизу вверх, каждая волна — отдел со своей подписью.
 * Здесь только прогресс сборки (aboutState), рисует WebGL-сцена. На десктопе экран
 * закреплён на время подъёма, на телефоне подъём проигрывается сам, пока сцена видна.
 */
export default function AboutHero({ data }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = root.current!;
      const v = { p: 0 };
      const write = () => (aboutState.progress = v.p);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        aboutState.progress = 1;
        return;
      }

      const mm = gsap.matchMedia();
      mm.add(CINEMATIC_MQ, () => {
        gsap.timeline({
          scrollTrigger: { trigger: section, start: "top top", end: "+=200%", pin: true, scrub: 0.8, invalidateOnRefresh: true },
        })
          .to(v, { p: 1, duration: 1, ease: "none", onUpdate: write })
          .to({}, { duration: 0.15 });
      });

      mm.add(`not all and ${CINEMATIC_MQ}`, () => {
        v.p = 0;
        write();
        const loop = gsap.timeline({ repeat: -1, repeatDelay: 1.6, paused: true });
        loop.to(v, { p: 1, duration: 6, ease: "none", onUpdate: write }).to(v, { p: 1, duration: 1.5 });
        ScrollTrigger.create({
          trigger: section.querySelector("figure"),
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => (self.isActive ? loop.play() : loop.pause()),
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="top" className={styles.hero} data-surface="dark">
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />

      <div className={`wrap ${styles.grid}`}>
        <div className={styles.top}>
          <nav className={styles.crumbs} aria-label="Хлебные крошки">
            <Link href="/">Корпорация</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{data.sector}</span>
          </nav>
          <p className={`label ${styles.kicker}`}>
            {data.sector}{" "}
            <span className={styles.tools}>· маркетинговое агентство Даниила Карацапова</span>
          </p>
        </div>

        <h1 className={styles.title}>
          <span className="visually-hidden">{data.name}: </span>
          {data.title.map((word, i) => (
            <span key={word} className={styles.mask}>
              <span
                className={styles.line}
                style={{ "--i": i } as React.CSSProperties}
              >
                {word}
                {i === data.title.length - 1 ? (
                  <span className={styles.dot}>.</span>
                ) : null}
              </span>
            </span>
          ))}
        </h1>

        <div className={styles.leadWrap}>
          <div className={styles.lead}>
            <p className={styles.leadText}>{data.lead}</p>
            <HeroLead source="hero" />
            <dl className={styles.facts}>
              {data.facts.map((f) => (
                <div key={f.label} className={styles.fact}>
                  <dt className={styles.factLabel}>{f.label}</dt>
                  <dd className={styles.factValue}>{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <figure className={styles.stage}>
          <MarkScene floors={data.building.floors} />
          <figcaption className={styles.note}>{data.building.note}</figcaption>
        </figure>
      </div>
    </section>
  );
}
