"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { DEPARTMENTS } from "@/content/departments";
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

// В hero показываем четыре производственных отдела, без приёмной
const HERO_DEPARTMENTS = DEPARTMENTS.slice(0, 4);

const FACTS = [
  { value: "С 2019", label: "в digital-маркетинге" },
  { value: "22 кейса", label: "с измеримым результатом" },
  { value: "3+ млн ₽", label: "рекламных бюджетов в месяц" },
];

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

      // Позиции на шкале 0..1 совпадают с прогрессом скролла через hero.
      // Заголовок держится первую четверть, отделы загораются по очереди с 0.43 до 0.75.
      tl.to(`.${styles.line}`, { yPercent: -12, ease: "none", duration: 0.22 }, 0)
        .to(`.${styles.line}`, { yPercent: -60, stagger: 0.03, ease: "none", duration: 0.14 }, 0.22)
        .to(`.${styles.title}`, { autoAlpha: 0, ease: "none", duration: 0.1 }, 0.27)
        .to(`.${styles.lead}`, { y: -40, autoAlpha: 0, ease: "none", duration: 0.1 }, 0.18)
        .fromTo(`.${styles.inside}`, { autoAlpha: 0 }, { autoAlpha: 1, ease: "none", duration: 0.03 }, 0.37)
        .fromTo(
          `.${styles.insideTitle}`,
          { yPercent: 60, autoAlpha: 0 },
          { yPercent: 0, autoAlpha: 1, ease: "none", duration: 0.05 },
          0.37,
        )
        .fromTo(
          `.${styles.dept}`,
          { x: -24, autoAlpha: 0.12 },
          { x: 0, autoAlpha: 1, ease: "none", duration: 0.05, stagger: 0.065 },
          0.43,
        )
        .fromTo(
          `.${styles.deptText}`,
          { autoAlpha: 0, y: 8 },
          { autoAlpha: 1, y: 0, ease: "none", duration: 0.04, stagger: 0.065 },
          0.45,
        )
        .to(`.${styles.inside}`, { y: -40, autoAlpha: 0, ease: "none", duration: 0.05 }, 0.75)
        .to(`.${styles.kicker}`, { autoAlpha: 0, ease: "none", duration: 0.06 }, 0.74)
        .fromTo(`.${styles.flash}`, { autoAlpha: 0 }, { autoAlpha: 1, ease: "power2.in", duration: 0.12 }, 0.88)
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
          <p className={`label ${styles.kicker}`}>Маркетинговое агентство Даниила Карацапова</p>

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
              Контекст, таргет, карты и сайт запускаются параллельно, а не по очереди.
              За каждым каналом отвечает свой специалист, и вы знаете его по имени.
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
            <dl className={styles.facts}>
              {FACTS.map((f) => (
                <div key={f.value} className={styles.fact}>
                  <dt className={styles.factLabel}>{f.label}</dt>
                  <dd className={styles.factValue}>{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className={styles.inside}>
            <p className={styles.insideTitle}>
              Четыре отдела стартуют <span className={styles.insideAccent}>в одну неделю.</span>
            </p>
            <ol className={styles.depts}>
              {HERO_DEPARTMENTS.map((d) => (
                <li key={d.id} className={styles.dept}>
                  <span className={styles.deptName}>{d.short}</span>
                  <span className={styles.deptText}>{d.tagline}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
