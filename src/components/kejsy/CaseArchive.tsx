"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import HeroLead from "@/components/hero/HeroLead";
import { CASES, NEXT_CASE, formatMetric } from "@/content/cases";
import styles from "./CaseArchive.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STACK_MQ = "(min-width: 961px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)";

function Arrow() {
  return (
    <svg className="btn__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Архив дел. Наверху реестр: номера дел огромным набором, каждый ведёт к своему листу.
 * Ниже дела лежат белыми листами на тёмном столе: по скроллу каждый следующий лист
 * наезжает на стопку, у нижних видны корешки с номерами, а сами они чуть уменьшаются.
 * Последний лист чистый: дело следующего клиента с формой заявки.
 */
export default function CaseArchive() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduce) {
        gsap.from("[data-code]", { yPercent: 110, duration: 1, ease: "power4.out", stagger: 0.06, delay: 0.15 });
      }
      const mm = gsap.matchMedia();
      mm.add(STACK_MQ, () => {
        // Лист, на который наезжает следующий, уходит вглубь стопки
        const sheets = gsap.utils.toArray<HTMLElement>("[data-sheet]");
        sheets.slice(0, -1).forEach((s, i) => {
          gsap.to(s.querySelector("[data-paper]"), {
            scale: 0.95,
            ease: "none",
            scrollTrigger: { trigger: sheets[i + 1], start: "top 70%", end: "top 15%", scrub: true },
          });
        });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root}>
      <section className={styles.hero} data-surface="dark" aria-labelledby="hub-title">
        <div className="wrap">
          <nav className={styles.crumbs} aria-label="Хлебные крошки">
            <Link href="/">Корпорация</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Кейсы</span>
          </nav>
          <div className={styles.intro}>
            <h1 id="hub-title" className={styles.title}>
              Кейсы<span className={styles.dot}>.</span>
            </h1>
            <p className={styles.lead}>
              {CASES.length} дел в архиве: задача, что сделали и результат в цифрах. Номер дела ведёт к его листу.
            </p>
          </div>

          <ol className={styles.register} aria-label="Номера дел">
            {CASES.map((c) => (
              <li key={c.code}>
                <a href={`#case-${c.code}`} className={styles.regItem}>
                  <span className={styles.regMask}>
                    <span className={styles.regCode} data-code>
                      {c.code}
                    </span>
                  </span>
                  <span className={styles.regSector}>{c.sector}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.desk} data-surface="dark" aria-label="Дела">
        <ol className={`wrap ${styles.pile}`}>
          {CASES.map((c, i) => (
            <li key={c.code} id={`case-${c.code}`} className={styles.sheet} data-sheet style={{ "--i": i } as React.CSSProperties}>
              <article className={styles.paper} data-paper data-full={c.href ? true : undefined} data-surface="light">
                <header className={styles.tab}>
                  <span className={styles.tabCode}>Дело {c.code}</span>
                  <span>{c.sector}</span>
                  {c.href ? <span className={styles.tabFull}>Полное досье</span> : null}
                </header>

                <div className={styles.body}>
                  <div className={styles.side}>
                    <span className={styles.bigCode} aria-hidden="true">
                      {c.code}
                    </span>
                    {c.cover ? (
                      <div className={styles.cover}>
                        <Image src={c.cover.site} alt={c.cover.alt} sizes="(max-width: 960px) 90vw, 32vw" className={styles.coverImg} />
                      </div>
                    ) : (
                      // Снимков нет: на месте снимка главная цифра дела
                      <p className={styles.leadMetric}>
                        <b>{formatMetric(c.metrics[0])}</b>
                        {c.metrics[0].label}
                      </p>
                    )}
                  </div>

                  <div className={styles.main}>
                    <p className={styles.client}>{c.client}</p>
                    <h2 className={styles.caseTitle}>{c.title}</h2>
                    <dl className={styles.facts}>
                      <div>
                        <dt>Задача</dt>
                        <dd>{c.task}</dd>
                      </div>
                      <div>
                        <dt>Что сделали</dt>
                        <dd>{c.solution}</dd>
                      </div>
                    </dl>
                    <ul className={styles.metrics}>
                      {(c.cover ? c.metrics : c.metrics.slice(1)).map((m) => (
                        <li key={m.label}>
                          <b>{formatMetric(m)}</b>
                          {m.label}
                        </li>
                      ))}
                    </ul>
                    <footer className={styles.foot}>
                      <span className={styles.services}>{c.services}</span>
                      {c.href ? (
                        <Link href={c.href} className="btn btn--primary">
                          Открыть дело
                          <Arrow />
                        </Link>
                      ) : null}
                    </footer>
                  </div>
                </div>
              </article>
            </li>
          ))}

          {/* Последний лист чистый: дело следующего клиента */}
          <li className={styles.sheet} data-sheet style={{ "--i": CASES.length } as React.CSSProperties}>
            <article className={`${styles.paper} ${styles.blank}`} data-paper aria-labelledby="next-title">
              <header className={styles.tab}>
                <span className={styles.tabCode}>Дело {NEXT_CASE}</span>
                <span>Ваша отрасль</span>
              </header>
              <div className={styles.blankBody}>
                <span className={styles.bigCode} aria-hidden="true">
                  {NEXT_CASE}
                </span>
                <div className={styles.blankMain}>
                  <h2 id="next-title" className={styles.blankTitle}>
                    Следующее дело ваше<span className={styles.blankDot}>.</span>
                  </h2>
                  <p className={styles.blankLead}>Оставьте телефон: Максим перезвонит, договоримся о созвоне, а к нему посмотрим вашу рекламу и сайт.</p>
                  <HeroLead source="service" service="Страница кейсов" cta="Открыть дело" />
                </div>
              </div>
            </article>
          </li>
        </ol>
      </section>
    </div>
  );
}
