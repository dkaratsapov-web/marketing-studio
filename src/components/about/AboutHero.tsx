"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import HeroLead from "@/components/hero/HeroLead";
import { CINEMATIC_MQ } from "@/components/service/SearchScene";
import type { ABOUT } from "@/content/about";
import BuildingScene, { addBuildingSteps } from "./BuildingScene";
import styles from "./AboutHero.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { data: typeof ABOUT };

/**
 * Первый экран «О нас». Справа разрез здания: по скроллу лифт поднимается по этажам-отделам,
 * этажи загораются с именами тех, кто их ведёт, наверху зажигается вывеска. На десктопе экран
 * закреплён на время сцены, на телефоне подъём проигрывается сам, пока сцена видна.
 */
export default function AboutHero({ data }: Props) {
  const root = useRef<HTMLElement>(null);
  const scene = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = scene.current!;
      const section = root.current!;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        // Статичный кадр: все этажи горят, вывеска включена
        const tl = addBuildingSteps(gsap.timeline({ paused: true }), el);
        tl.progress(1);
        return;
      }

      const mm = gsap.matchMedia();
      mm.add(CINEMATIC_MQ, () => {
        const steps = addBuildingSteps(
          gsap.timeline({ defaults: { ease: "power2.out" } }),
          el,
        );
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "+=200%",
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });
        tl.add(steps).to({}, { duration: 0.6 });
      });

      mm.add(`not all and ${CINEMATIC_MQ}`, () => {
        const loop = gsap.timeline({
          repeat: -1,
          repeatDelay: 1.4,
          paused: true,
        });
        addBuildingSteps(loop, el);
        ScrollTrigger.create({
          trigger: el,
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
          <BuildingScene ref={scene} data={data.building} />
          <figcaption className={styles.note}>{data.building.note}</figcaption>
        </figure>
      </div>
    </section>
  );
}
