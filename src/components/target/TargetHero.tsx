"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import HeroLead from "@/components/hero/HeroLead";
import { CINEMATIC_MQ } from "@/components/service/SearchScene";
import type { TARGET } from "@/content/target";
import FeedScene, { addFeedSteps } from "./FeedScene";
import styles from "./TargetHero.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { data: typeof TARGET };

/**
 * Первый экран отдела таргета. В отличие от контекста (там человек сам вводит запрос),
 * здесь человек ничего не ищет: он листает ленту. На десктопе экран закрепляется, и по скроллу
 * лента в телефоне несётся вверх и тормозит на нашем объявлении, шкала «скорости ленты» падает
 * до нуля, палец жмёт «Записаться», форма заполняется, заявка уходит в счётчик.
 * Текст слева стоит на месте: история целиком в телефоне. На телефоне сцена крутится сама.
 */
export default function TargetHero({ data }: Props) {
  const root = useRef<HTMLElement>(null);
  const scene = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = scene.current!;
      const section = root.current!;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        // Статичный кадр: лента стоит на объявлении, оно подсвечено
        const tl = addFeedSteps(gsap.timeline({ paused: true }), el, data.feed);
        tl.progress(0.3);
        return;
      }

      const mm = gsap.matchMedia();
      mm.add(CINEMATIC_MQ, () => {
        const steps = addFeedSteps(
          gsap.timeline({ defaults: { ease: "power2.out" } }),
          el,
          data.feed,
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
        addFeedSteps(loop, el, data.feed);
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
            <Link href="/#departments">Отделы</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{data.name}</span>
          </nav>
          <p className={`label ${styles.kicker}`}>
            {data.department}{" "}
            <span className={styles.tools}>· {data.tools}</span>
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
            <HeroLead source="service" service={data.name} />
            <dl className={styles.facts}>
              {data.facts.map((f) => (
                <div key={f.label} className={styles.fact}>
                  <dt className={styles.factLabel}>
                    {f.label} <span className={styles.factRef}>{f.ref}</span>
                  </dt>
                  <dd className={styles.factValue}>{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <figure className={styles.stage}>
          <FeedScene ref={scene} feed={data.feed} />
          <figcaption className={styles.note}>{data.feed.note}</figcaption>
        </figure>
      </div>
    </section>
  );
}
