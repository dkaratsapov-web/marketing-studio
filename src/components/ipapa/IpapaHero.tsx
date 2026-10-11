"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import HeroLead from "@/components/hero/HeroLead";
import { CINEMATIC_MQ } from "@/components/service/SearchScene";
import type { IPAPA } from "@/content/ipapa";
import { ipapaState } from "./ipapaState";
import styles from "./IpapaHero.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const ExplodeScene = dynamic(() => import("./ExplodeScene"), { ssr: false });

type Props = { data: typeof IPAPA };

/**
 * Первый экран дела айпапа.рф. Справа WebGL-телефон в разнесённом виде: по скроллу он
 * поворачивается, и экраны мини-приложения по одному отслаиваются от корпуса. На десктопе
 * экран закреплён на время сцены, на телефоне сцена разбирает и собирает телефон сама.
 */
export default function IpapaHero({ data }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const mm = gsap.matchMedia();
      mm.add(CINEMATIC_MQ, () => {
        ipapaState.auto = false;
        ipapaState.progress = 0;
        ScrollTrigger.create({
          trigger: root.current,
          start: "top top",
          end: "+=200%",
          pin: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => (ipapaState.progress = self.progress),
        });
      });
      mm.add(`not all and ${CINEMATIC_MQ}`, () => {
        ipapaState.auto = true;
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
            <Link href="/#dossier">Досье</Link>
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
            <HeroLead source="service" service={`Кейс ${data.client}`} cta="Хочу такой магазин" />
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
          <ExplodeScene layers={data.hero.layers} />
          <figcaption className={styles.note}>{data.hero.note}</figcaption>
        </figure>
      </div>
    </section>
  );
}
