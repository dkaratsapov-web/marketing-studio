"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import HeroLead from "@/components/hero/HeroLead";
import { CINEMATIC_MQ } from "@/components/service/SearchScene";
import type { KARKAS } from "@/content/karkas";
import { karkasState } from "./karkasState";
import styles from "./KarkasHero.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const FrameScene = dynamic(() => import("./FrameScene"), { ssr: false });

type Props = { data: typeof KARKAS };

/**
 * Первый экран дела «Каркас Комфорт». Справа 3D-каркас дома: по скроллу встают сваи,
 * стойки с шагом 600 мм, стропила, обшивка, и в окнах загорается свет. На десктопе экран
 * закреплён на время сборки, на телефоне дом собирается и разбирается сам.
 */
export default function KarkasHero({ data }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const mm = gsap.matchMedia();
      mm.add(CINEMATIC_MQ, () => {
        karkasState.auto = false;
        karkasState.progress = 0;
        ScrollTrigger.create({
          trigger: root.current,
          start: "top top",
          end: "+=220%",
          pin: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => (karkasState.progress = self.progress),
        });
      });
      mm.add(`not all and ${CINEMATIC_MQ}`, () => {
        karkasState.auto = true;
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="top" className={styles.hero} data-surface="dark">
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.paper} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />

      <div className={`wrap ${styles.grid}`}>
        <div className={styles.top}>
          <nav className={styles.crumbs} aria-label="Хлебные крошки">
            <Link href="/">Корпорация</Link>
            <span aria-hidden="true">/</span>
            <Link href="/kejsy/">Кейсы</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Дело {data.code}</span>
          </nav>
          <p className={`label ${styles.kicker}`}>
            Дело {data.code} · {data.sector} <span className={styles.tools}>· {data.geo}</span>
          </p>
        </div>

        <h1 className={styles.title}>
          <span className="visually-hidden">Кейс {data.client}: </span>
          {data.hero.title.map((word, i) => (
            <span key={word} className={styles.mask}>
              <span className={styles.line} style={{ "--i": i } as React.CSSProperties}>
                {word}
                {i === data.hero.title.length - 1 ? <span className={styles.dot}>.</span> : null}
              </span>
            </span>
          ))}
        </h1>

        <div className={styles.leadWrap}>
          <div className={styles.lead}>
            <p className={styles.leadText}>{data.hero.lead}</p>
            <HeroLead source="service" service={`Кейс ${data.client}`} cta="Хочу такой сайт" />
            <dl className={styles.facts}>
              {data.hero.counters.map((f) => (
                <div key={f.label} className={styles.fact}>
                  <dt className={styles.factLabel}>{f.label}</dt>
                  <dd className={styles.factValue}>{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <figure className={styles.stage}>
          <FrameScene stages={data.hero.stages} />
        </figure>
      </div>
    </section>
  );
}
