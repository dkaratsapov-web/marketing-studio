"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import HeroLead from "@/components/hero/HeroLead";
import { CASES, NEXT_CASE, formatMetric, type Case } from "@/content/cases";
import styles from "./CaseArchive.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const ALL = "Все";

/** Дела с полным досье идут первыми и крупно, остальные в картотеке */
const FULL = CASES.filter((c) => c.href);

function Arrow() {
  return (
    <svg className="btn__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** Крупная карточка досье: снимок сайта и телефон поверх, карточка наклоняется за курсором */
function Feature({ c, i }: { c: Case; i: number }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const move = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const r = ref.current!.getBoundingClientRect();
    ref.current!.style.setProperty("--rx", `${(((e.clientY - r.top) / r.height) - 0.5) * -8}deg`);
    ref.current!.style.setProperty("--ry", `${(((e.clientX - r.left) / r.width) - 0.5) * 10}deg`);
  };
  const leave = () => {
    ref.current!.style.setProperty("--rx", "0deg");
    ref.current!.style.setProperty("--ry", "0deg");
  };
  return (
    <Link ref={ref} href={c.href!} className={styles.feature} data-feature data-wide={i === 0 || undefined} onPointerMove={move} onPointerLeave={leave} data-cursor-label="Открыть">
      {c.cover ? (
        <span className={styles.shots} aria-hidden="true">
          <span className={styles.site}>
            <Image src={c.cover.site} alt="" sizes="(max-width: 960px) 92vw, 50vw" className={styles.siteImg} />
          </span>
          {c.cover.phone ? (
            <span className={styles.phone}>
              <Image src={c.cover.phone} alt="" sizes="10rem" className={styles.phoneImg} />
            </span>
          ) : null}
        </span>
      ) : null}
      <span className={styles.fBody}>
        <span className={styles.fMeta}>
          <b>Дело {c.code}</b> {c.sector}
        </span>
        <span className={styles.fTitle}>{c.title}</span>
        <span className={styles.fClient}>{c.client}</span>
        <span className={styles.fMetrics}>
          {c.metrics.map((m) => (
            <span key={m.label}>
              <b>{formatMetric(m)}</b>
              {m.label}
            </span>
          ))}
        </span>
        <span className={styles.fOpen}>
          Открыть дело <Arrow />
        </span>
      </span>
    </Link>
  );
}

/**
 * Архив дел. Сверху полные досье крупными карточками, ниже картотека всех дел с фильтром
 * по отраслям. На строке картотеки за курсором плывёт превью: снимок дела или его главная
 * цифра. Дела без своей страницы раскрываются прямо в строке.
 */
export default function CaseArchive() {
  const root = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const [sector, setSector] = useState(ALL);
  const [open, setOpen] = useState<string | null>(null);
  const [hover, setHover] = useState<Case | null>(null);

  const sectors = useMemo(() => {
    const m = new Map<string, number>();
    CASES.forEach((c) => m.set(c.sector, (m.get(c.sector) ?? 0) + 1));
    return [[ALL, CASES.length] as const, ...[...m.entries()]];
  }, []);
  const list = sector === ALL ? CASES : CASES.filter((c) => c.sector === sector);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from("[data-feature]", { y: 60, autoAlpha: 0, rotateX: 8, duration: 1, ease: "power3.out", stagger: 0.12, delay: 0.3 });
      ScrollTrigger.batch("[data-row]", {
        start: "top 92%",
        once: true,
        onEnter: (els) => gsap.from(els, { y: 24, autoAlpha: 0, duration: 0.6, ease: "power3.out", stagger: 0.06 }),
      });
    },
    { scope: root },
  );

  // Превью едет за курсором с лёгкой задержкой
  useEffect(() => {
    const el = preview.current;
    if (!el || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const x = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
    const y = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
    const move = (e: PointerEvent) => {
      x(e.clientX + 24);
      y(e.clientY - 90);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  return (
    <div ref={root}>
      <section className={styles.hero} data-surface="dark" aria-labelledby="hub-title">
        <div className={styles.grain} aria-hidden="true" />
        <div className={`wrap ${styles.heroGrid}`}>
          <nav className={styles.crumbs} aria-label="Хлебные крошки">
            <Link href="/">Корпорация</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Кейсы</span>
          </nav>
          <h1 id="hub-title" className={styles.title}>
            <span className="visually-hidden">Кейсы агентства «Корпорация»: </span>
            <span className={styles.mask}>
              <span className={styles.line}>Архив</span>
            </span>
            <span className={styles.mask}>
              <span className={styles.line} style={{ "--i": 1 } as React.CSSProperties}>
                дел<span className={styles.dot}>.</span>
              </span>
            </span>
          </h1>
          <p className={styles.lead}>Каждое дело с задачей, решением и результатом в цифрах. У трёх открыто полное досье со снимками работы, остальные коротко в картотеке.</p>
          <dl className={styles.stats}>
            <div>
              <dt>дел в архиве</dt>
              <dd>{CASES.length}</dd>
            </div>
            <div>
              <dt>отраслей</dt>
              <dd>{sectors.length - 1}</dd>
            </div>
            <div>
              <dt>полных досье</dt>
              <dd>{FULL.length}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className={styles.features} data-surface="dark" aria-labelledby="full-title">
        <div className="wrap">
          <h2 id="full-title" className={styles.h2}>
            Полные досье<span className={styles.dot}>.</span>
          </h2>
          <div className={styles.featureGrid}>
            {FULL.map((c, i) => (
              <Feature key={c.code} c={c} i={i} />
            ))}
          </div>
        </div>
      </section>

      <section className={styles.index} data-surface="light" aria-labelledby="index-title">
        <div className="wrap">
          <header className={styles.indexHead}>
            <h2 id="index-title" className={styles.h2}>
              Картотека<span className={styles.dot}>.</span>
            </h2>
            <div className={styles.filters} role="group" aria-label="Отрасль">
              {sectors.map(([name, count]) => (
                <button key={name} type="button" className={styles.chip} aria-pressed={sector === name} onClick={() => setSector(name)}>
                  {name}
                  <span>{count}</span>
                </button>
              ))}
            </div>
          </header>

          <ol className={styles.rows} onPointerLeave={() => setHover(null)}>
            {list.map((c) => {
              const isOpen = open === c.code;
              const top = c.metrics[0];
              return (
                <li key={`${sector}-${c.code}`} className={styles.row} data-row data-open={isOpen || undefined} onPointerEnter={() => setHover(c)}>
                  <div className={styles.rowHead}>
                    <span className={styles.code}>{c.code}</span>
                    <span className={styles.sector}>{c.sector}</span>
                    <span className={styles.what}>
                      <b>{c.title}</b>
                      <span>{c.client}</span>
                    </span>
                    <span className={styles.top}>
                      <b>{formatMetric(top)}</b>
                      {top.label}
                    </span>
                    {c.href ? (
                      <Link href={c.href} className={styles.go} aria-label={`Открыть дело ${c.code}`}>
                        Досье <Arrow />
                      </Link>
                    ) : (
                      <button type="button" className={styles.go} aria-expanded={isOpen} aria-controls={`case-${c.code}`} onClick={() => setOpen(isOpen ? null : c.code)}>
                        {isOpen ? "Свернуть" : "Подробнее"}
                        <span className={styles.plus} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  {!c.href ? (
                    <div id={`case-${c.code}`} className={styles.more} role="region" aria-label={c.title}>
                      <div className={styles.moreInner}>
                        <dl className={styles.facts}>
                          <div>
                            <dt>Задача</dt>
                            <dd>{c.task}</dd>
                          </div>
                          <div>
                            <dt>Что сделали</dt>
                            <dd>{c.solution}</dd>
                          </div>
                          <div>
                            <dt>Каналы</dt>
                            <dd>{c.services}</dd>
                          </div>
                        </dl>
                        <ul className={styles.metrics}>
                          {c.metrics.map((m) => (
                            <li key={m.label}>
                              <b>{formatMetric(m)}</b>
                              {m.label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>

        {/* Превью у курсора: снимок дела или его главная цифра */}
        <div ref={preview} className={styles.preview} data-on={hover ? true : undefined} aria-hidden="true">
          {hover?.cover ? (
            <Image key={hover.code} src={hover.cover.site} alt="" sizes="20rem" className={styles.previewImg} />
          ) : hover ? (
            <span key={hover.code} className={styles.previewMetric}>
              <b>{formatMetric(hover.metrics[0])}</b>
              {hover.metrics[0].label}
            </span>
          ) : null}
        </div>
      </section>

      <section className={styles.next} data-surface="dark" aria-labelledby="next-title">
        <div className={`wrap ${styles.nextGrid}`}>
          <div>
            <p className={`label ${styles.nextCode}`}>Дело {NEXT_CASE}</p>
            <h2 id="next-title" className={styles.nextTitle}>
              Ваше дело следующее<span className={styles.dot}>.</span>
            </h2>
          </div>
          <div className={styles.nextForm}>
            <p className={styles.nextLead}>Оставьте телефон: Максим перезвонит, договоримся о созвоне, а к нему посмотрим вашу рекламу и сайт.</p>
            <HeroLead source="service" service="Страница кейсов" cta="Обсудить проект" />
          </div>
        </div>
      </section>
    </div>
  );
}
