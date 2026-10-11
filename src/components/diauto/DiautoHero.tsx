"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import HeroLead from "@/components/hero/HeroLead";
import { CINEMATIC_MQ } from "@/components/service/SearchScene";
import type { DIAUTO } from "@/content/diauto";
import HubScene, { addHubSteps } from "./HubScene";
import styles from "./DiautoHero.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { data: typeof DIAUTO };

const num = new Intl.NumberFormat("ru-RU");

/**
 * Первый экран дела ДиАвто69. Справа сцена: пост канала разбирается в карточку каталога,
 * и она расходится по сайту, боту, MAX и рекламным площадкам. На десктопе экран закреплён
 * на время сцены, на телефоне сцена проигрывается сама, пока видна.
 */
export default function DiautoHero({ data }: Props) {
  const root = useRef<HTMLElement>(null);
  const scene = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = scene.current!;
      const section = root.current!;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        // Статичный кадр: карточка разошлась по всем витринам
        const tl = addHubSteps(gsap.timeline({ paused: true }), el);
        tl.progress(1);
        return;
      }

      const mm = gsap.matchMedia();
      mm.add(CINEMATIC_MQ, () => {
        const steps = addHubSteps(
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
        addHubSteps(loop, el);
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
            <span aria-current="page">Дело {data.code}</span>
          </nav>
          <p className={`label ${styles.kicker}`}>
            Дело {data.code} · {data.sector}{" "}
            <span className={styles.tools}>· {data.geo}</span>
          </p>
        </div>

        <h1 className={styles.title}>
          <span className="visually-hidden">Кейс {data.client}: </span>
          {data.hero.title.map((word, i) => (
            <span key={word} className={styles.mask}>
              <span
                className={styles.line}
                style={{ "--i": i } as React.CSSProperties}
              >
                {word}
                {i === data.hero.title.length - 1 ? (
                  <span className={styles.dot}>.</span>
                ) : null}
              </span>
            </span>
          ))}
        </h1>

        <div className={styles.leadWrap}>
          <div className={styles.lead}>
            <p className={styles.leadText}>{data.hero.lead}</p>
            <HeroLead source="service" service={`Кейс ${data.client}`} cta="Хочу такую систему" />
            <dl className={styles.facts}>
              {data.hero.counters.map((f) => (
                <div key={f.label} className={styles.fact}>
                  <dt className={styles.factLabel}>{f.label}</dt>
                  <dd className={styles.factValue}>{num.format(f.value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <figure className={styles.stage}>
          <HubScene ref={scene} hub={data.hero.hub} />
          <figcaption className={styles.note}>{data.hero.hub.note}</figcaption>
        </figure>
      </div>
    </section>
  );
}
