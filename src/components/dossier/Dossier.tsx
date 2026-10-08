"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CASES, type Metric } from "@/content/cases";
import styles from "./Dossier.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const num = new Intl.NumberFormat("ru-RU");

const fmt = (m: Metric, v: number) => {
  if (m.text) return m.text;
  const body = m.decimals ? v.toFixed(m.decimals).replace(".", ",") : num.format(Math.round(v));
  return `${m.prefix ?? ""}${body}${m.suffix ?? ""}`;
};

function Arrow() {
  return (
    <svg className="btn__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function Dossier() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const cards = gsap.utils.toArray<HTMLElement>(`.${styles.case}`);

      const declassify = (card: HTMLElement) => {
        if (card.dataset.open) return;
        card.dataset.open = "true";
        const tl = gsap.timeline();
        tl.to(card.querySelectorAll(`.${styles.redact}`), {
          "--cover": 0,
          duration: 0.7,
          ease: "power3.inOut",
          stagger: 0.12,
        });
        card.querySelectorAll<HTMLElement>("[data-metric]").forEach((el, i) => {
          const m = JSON.parse(el.dataset.metric!) as Metric;
          if (m.text || m.value === undefined) return;
          const obj = { v: 0 };
          tl.to(
            obj,
            {
              v: m.value!,
              duration: 1.2,
              ease: "power2.out",
              onUpdate: () => {
                el.textContent = fmt(m, obj.v);
              },
            },
            0.25 + i * 0.12,
          );
        });
      };

      if (reduce) {
        cards.forEach(declassify);
        return;
      }

      // Заранее обнуляем цифры, чтобы отсчёт шёл с нуля
      gsap.utils.toArray<HTMLElement>("[data-metric]").forEach((el) => {
        el.textContent = fmt(JSON.parse(el.dataset.metric!) as Metric, 0);
      });

      const distance = () => track.current!.scrollWidth - window.innerWidth;

      const scroll = gsap.to(track.current, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      cards.forEach((card) => {
        ScrollTrigger.create({
          trigger: card,
          containerAnimation: scroll,
          // Рассекречиваем, когда карточка видна почти целиком: её центр доходит до 65% экрана
          start: "center 65%",
          onEnter: () => declassify(card),
        });
        // Лёгкий параллакс номера дела внутри карточки
        gsap.fromTo(
          card.querySelector(`.${styles.bigCode}`),
          { xPercent: 12 },
          {
            xPercent: -12,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              containerAnimation: scroll,
              start: "left right",
              end: "right left",
              scrub: true,
            },
          },
        );
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="dossier" className={styles.dossier} data-surface="dark">
      <div ref={track} className={styles.track}>
        <header className={styles.intro}>
          <p className="label">Архив Корпорации</p>
          <h2 className={styles.title}>Досье</h2>
          <p className={styles.lead}>
            22 дела с измеримым результатом. Здесь самые показательные.
          </p>
        </header>

        {CASES.map((c) => (
          <article key={c.code} className={styles.case} aria-labelledby={`case-${c.code}`}>
            <span className={styles.bigCode} aria-hidden="true">
              {c.code}
            </span>

            <div className={styles.meta}>
              <span className="label">Дело {c.code}</span>
              <span className="label">{c.sector}</span>
              <span className={`label ${styles.status}`}>
                <span className={styles.secret}>Секретно</span>
                <span className={styles.open}>Рассекречено</span>
              </span>
            </div>

            <div className={styles.body}>
              <p className={styles.client}>
                <span className={styles.redact}>{c.client}</span>
              </p>
              <h3 id={`case-${c.code}`} className={styles.caseTitle}>
                {c.title}
              </h3>
              <p className={`label ${styles.services}`}>{c.services}</p>
            </div>

            <dl className={styles.metrics}>
              {c.metrics.map((m, i) => (
                <div key={i} className={styles.metric}>
                  <dt className={styles.metricLabel}>{m.label}</dt>
                  <dd className={styles.metricValue} data-metric={JSON.stringify(m)}>
                    {fmt(m, m.value ?? 0)}
                  </dd>
                </div>
              ))}
            </dl>

            <div className={styles.notes}>
              <p className={styles.leadBy}>
                <span className="label">Вёл дело</span>
                <span>{c.lead}</span>
              </p>
              <p>
                <span className="label">Задача</span>
                <span className={styles.redact}>{c.task}</span>
              </p>
              <p>
                <span className="label">Решение</span>
                <span className={styles.redact}>{c.solution}</span>
              </p>
            </div>
          </article>
        ))}

        <aside className={styles.next}>
          <p className="label">Дело 023</p>
          <p className={styles.nextTitle}>Ваше дело следующее.</p>
          <a href="#brief" className="btn btn--primary">
            Открыть дело
            <Arrow />
          </a>
        </aside>
      </div>
    </section>
  );
}
