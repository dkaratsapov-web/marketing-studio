"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { heroState } from "./heroState";
import styles from "./Hero.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

function Arrow() {
  return (
    <svg className="btn__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      heroState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      heroState.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: "bottom bottom",
        scrub: reduce ? false : true,
        onUpdate: (self) => {
          heroState.progress = self.progress;
        },
      });

      if (reduce) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
        },
      });

      // Позиции на шкале 0..1 совпадают с прогрессом скролла через hero
      tl.to(`.${styles.line}`, { yPercent: -35, stagger: 0.03, ease: "none", duration: 0.3 }, 0.02)
        .to(`.${styles.title}`, { autoAlpha: 0, ease: "none", duration: 0.18 }, 0.12)
        .to(`.${styles.lead}`, { y: -40, autoAlpha: 0, ease: "none", duration: 0.16 }, 0.02)
        .fromTo(
          `.${styles.inside}`,
          { y: 60, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, ease: "none", duration: 0.12 },
          0.33,
        )
        .to(`.${styles.inside}`, { y: -40, autoAlpha: 0, ease: "none", duration: 0.08 }, 0.6)
        .to(`.${styles.kicker}`, { autoAlpha: 0, ease: "none", duration: 0.08 }, 0.55)
        .fromTo(`.${styles.flash}`, { autoAlpha: 0 }, { autoAlpha: 1, ease: "power2.in", duration: 0.16 }, 0.84)
        .set({}, {}, 1);
    },
    { scope: root },
  );

  return (
    <section ref={root} id="top" className={styles.hero} data-surface="dark">
      <div className={styles.stage}>
        <div className={styles.backdrop} aria-hidden="true" />
        <div className={styles.canvas}>
          <HeroScene />
        </div>
        <div className={styles.grain} aria-hidden="true" />
        <div className={styles.flash} aria-hidden="true" />

        <div className={`wrap ${styles.content}`}>
          <p className={`label ${styles.kicker}`}>Маркетинговое агентство полного цикла</p>

          <h1 className={styles.title}>
            <span className={styles.mask}>
              <span className={styles.line} style={{ "--i": 0 } as React.CSSProperties}>
                Производим
              </span>
            </span>
            <span className={styles.mask}>
              <span className={styles.line} style={{ "--i": 1 } as React.CSSProperties}>
                спрос<span className={styles.dot}>.</span>
              </span>
            </span>
          </h1>

          <div className={styles.lead}>
            <p className={styles.leadText}>
              Стратегия, креатив и перформанс под одной крышей. Работаем с компаниями,
              которым нужен рост выручки, а не отчёт об охватах.
            </p>
            <div className={styles.actions}>
              <a href="#brief" className="btn btn--primary">
                Отправить бриф
                <Arrow />
              </a>
              <a href="#dossier" className="btn">
                Открыть досье
              </a>
            </div>
          </div>

          <div className={styles.inside}>
            <p className="label">Внутри</p>
            <p className={styles.insideText}>
              Четыре отдела и одна цель. Стратегия находит, за что вас выбирают. Креатив
              делает это заметным. Перформанс превращает внимание в заявки. Аналитика
              считает каждый рубль.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
