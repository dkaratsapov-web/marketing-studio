"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import HeroLead from "@/components/hero/HeroLead";
import { CINEMATIC_MQ } from "@/components/service/SearchScene";
import type { AVTO } from "@/content/avtobiznes";
import DashScene, { addDashSteps } from "./DashScene";
import ShaderBackdrop from "@/components/backdrop/ShaderBackdrop";
import { TRAILS } from "@/components/backdrop/shaders";
import styles from "./AvtoHero.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { data: typeof AVTO };

/**
 * Первый экран отраслевого решения для автобизнеса. Справа приборная панель: по скроллу
 * лампы неисправностей гаснут, стрелка проходит шкалу от поста до сделки. На десктопе экран
 * закреплён на время сцены, на телефоне сцена проигрывается сама, пока видна.
 */
export default function AvtoHero({ data }: Props) {
  const root = useRef<HTMLElement>(null);
  const scene = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = scene.current!;
      const section = root.current!;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        // Статичный кадр: все лампы погасли, табло горит
        const tl = addDashSteps(gsap.timeline({ paused: true }), el);
        tl.progress(1);
        return;
      }

      const mm = gsap.matchMedia();
      mm.add(CINEMATIC_MQ, () => {
        const steps = addDashSteps(
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
        addDashSteps(loop, el);
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
      <ShaderBackdrop frag={TRAILS} />

      <div className={`wrap ${styles.grid}`}>
        <div className={styles.top}>
          <nav className={styles.crumbs} aria-label="Хлебные крошки">
            <Link href="/">Корпорация</Link>
            <span aria-hidden="true">/</span>
            <span>{data.sector}</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{data.name}</span>
          </nav>
          <p className={`label ${styles.kicker}`}>
            {data.sector}{" "}
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
          <DashScene ref={scene} dash={data.dash} />
          <figcaption className={styles.note}>{data.dash.note}</figcaption>
        </figure>
      </div>
    </section>
  );
}
