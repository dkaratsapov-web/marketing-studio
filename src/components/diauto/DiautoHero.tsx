"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import HeroLead from "@/components/hero/HeroLead";
import { CINEMATIC_MQ } from "@/components/service/SearchScene";
import type { DIAUTO } from "@/content/diauto";
import { ringState } from "./ringState";
import styles from "./DiautoHero.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const RingScene = dynamic(() => import("./RingScene"), { ssr: false });

type Props = { data: typeof DIAUTO };

const num = new Intl.NumberFormat("ru-RU");

/**
 * Первый экран дела ДиАвто69. Справа WebGL-витрина: карточки из каталога клиента лежат
 * колодой, по скроллу раздаются по кругу и поворачиваются. На десктопе экран закреплён
 * на время сцены, на телефоне витрина крутится сама.
 */
export default function DiautoHero({ data }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const mm = gsap.matchMedia();
      // Десктоп: экран закреплён, скролл раздаёт колоду и поворачивает кольцо
      mm.add(CINEMATIC_MQ, () => {
        ringState.auto = false;
        ringState.progress = 0;
        ScrollTrigger.create({
          trigger: root.current,
          start: "top top",
          end: "+=200%",
          pin: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => (ringState.progress = self.progress),
        });
      });
      // Телефон и планшет: без закрепления, витрина крутится сама
      mm.add(`not all and ${CINEMATIC_MQ}`, () => {
        ringState.auto = true;
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
            <Link href="/kejsy/">Кейсы</Link>
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
          <RingScene total={data.hero.ring.total} note={data.hero.ring.note} />
          <figcaption className="visually-hidden">Карточки авто из каталога ДиАвто69 на вращающейся витрине</figcaption>
        </figure>
      </div>
    </section>
  );
}
