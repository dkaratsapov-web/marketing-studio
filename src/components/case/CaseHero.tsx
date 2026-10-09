"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { SFERA } from "@/content/sfera";
import { CINEMATIC_MQ } from "@/components/service/SearchScene";
import styles from "./CaseHero.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { data: typeof SFERA };

/** Наклон папок в стопке: как сложенные от руки листы */
const TILT = [-7, 5, -3, 6, -2, 2];

/**
 * Первый экран дела. Справа стопка папок дела (снимки сайта, админки, бота), сверху «Сайт».
 * На десктопе экран закрепляется: заголовок уходит, стопка выезжает в центр и раскладывается
 * веером в сетку из шести папок, над ними встаёт «Шесть частей. Один механизм.»
 * Родственно главной (закреплённая сцена, скролл ведёт историю), но вместо монолита документы.
 */
export default function CaseHero({ data }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = root.current!;
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const $ = (cls: string) => section.querySelector<HTMLElement>(`.${cls}`)!;
      const counters = [
        ...section.querySelectorAll<HTMLElement>("[data-count]"),
      ];

      // Счётчики досчитываются при загрузке
      if (!reduce) {
        counters.forEach((el, i) => {
          const to = Number(el.dataset.count);
          const v = { n: 0 };
          gsap.to(v, {
            n: to,
            duration: 1.6,
            delay: 0.9 + i * 0.12,
            ease: "power3.out",
            onUpdate: () => {
              el.textContent = String(Math.round(v.n));
            },
          });
        });
      }
      if (reduce) return;

      const mm = gsap.matchMedia();
      mm.add(CINEMATIC_MQ, () => {
        const deck = $(styles.deck);
        const cards = gsap.utils.toArray<HTMLElement>(`.${styles.card}`);
        const n = cards.length;

        // Размер папки в стопке и в ряду считается от окна
        const W = () => deck.clientWidth;
        const H = () => deck.clientHeight;
        const cardW = () => cards[0].offsetWidth;
        const gap = () => Math.max(16, W() * 0.014);
        // Финальная раскладка: сетка 3 × 2 под заголовком финала, папки настолько крупные, насколько влезают
        const cardH = () => cards[0].offsetHeight;
        const gridScale = () =>
          Math.min(
            1,
            (W() * 0.8 - gap() * 2) / 3 / cardW(),
            (H() * 0.58 - gap()) / 2 / cardH(),
          );
        const gridX = (i: number) =>
          W() / 2 + ((i % 3) - 1) * (cardW() * gridScale() + gap());
        const gridY = (i: number) =>
          H() * 0.66 +
          (Math.floor(i / 3) - 0.5) * (cardH() * gridScale() + gap());

        // Стопка лежит справа внизу, верхняя папка («Сайт») последняя в DOM-порядке не нужна: задаём zIndex
        gsap.set(cards, {
          xPercent: -50,
          yPercent: -50,
          x: () => W() * 0.73,
          y: () => H() * 0.6,
          rotation: (i) => TILT[i % TILT.length],
          zIndex: (i) => n - i,
          autoAlpha: 1,
        });

        const tl = gsap.timeline({
          defaults: { ease: "power2.inOut" },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "+=220%",
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });

        // 1. Текст уходит вверх, стопка выезжает в центр и выпрямляется
        tl.to([$(styles.top), $(styles.title), $(styles.leadWrap)], {
          yPercent: -30,
          autoAlpha: 0,
          duration: 0.8,
          stagger: 0.06,
        })
          .to(
            cards,
            {
              x: () => W() / 2,
              y: () => H() * 0.56,
              rotation: (i) => TILT[i % TILT.length] * 0.4,
              duration: 0.8,
            },
            0.1,
          )
          // 2. Веер: папки по очереди раскладываются сеткой
          .to(
            cards,
            {
              x: (i) => gridX(i),
              y: (i) => gridY(i),
              rotation: 0,
              scale: gridScale,
              duration: 1,
              stagger: 0.06,
              ease: "power3.inOut",
            },
            0.85,
          )
          // 3. Финал
          .fromTo(
            section.querySelectorAll(`.${styles.finaleLine}`),
            { yPercent: 110 },
            { yPercent: 0, duration: 0.7, stagger: 0.1, ease: "power3.out" },
            1.7,
          )
          .to({}, { duration: 0.5 });

        gsap.set($(styles.finale), { autoAlpha: 1 });
      });
    },
    { scope: root },
  );

  const { hero } = data;

  return (
    <section
      ref={root}
      id="top"
      className={styles.hero}
      data-surface="dark"
      aria-labelledby="case-title"
    >
      <div className={styles.grain} aria-hidden="true" />
      <span className={styles.bigCode} aria-hidden="true">
        {data.code}
      </span>

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
            Дело {data.code} · {data.sector} ·{" "}
            <span className={styles.open}>Рассекречено</span>
          </p>
        </div>

        <h1 id="case-title" className={styles.title}>
          <span className="visually-hidden">{data.client}: </span>
          {hero.title.map((word, i) => (
            <span key={word} className={styles.mask}>
              <span
                className={styles.line}
                style={{ "--i": i } as React.CSSProperties}
              >
                {word}
                {i === hero.title.length - 1 ? (
                  <span className={styles.dot}>.</span>
                ) : null}
              </span>
            </span>
          ))}
        </h1>

        {/* Внешнюю обёртку двигает скрипт, внутреннюю проявляет CSS: на одном элементе они бы спорили */}
        <div className={styles.leadWrap}>
          <div className={styles.leadInner}>
            <p className={styles.client}>
              {data.client} <span className={styles.site}>{data.site}</span>
            </p>
            <p className={styles.lead}>{hero.lead}</p>
            <dl className={styles.counters}>
              {hero.counters.map((c) => (
                <div key={c.label} className={styles.counter}>
                  <dt className={styles.counterLabel}>{c.label}</dt>
                  <dd className={styles.counterValue} data-count={c.value}>
                    {c.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Стопка папок дела */}
      <div className={styles.deck} aria-label="Что внутри дела">
        {hero.parts.map((p, i) => (
          <figure
            key={p.name}
            className={styles.card}
            style={{ "--r": `${TILT[i]}deg`, "--i": i } as React.CSSProperties}
          >
            <div className={styles.cardInner}>
              <figcaption className={styles.cardTab}>
                <span>{String(i + 1).padStart(2, "0")}</span> {p.name}
              </figcaption>
              <div className={styles.cardImg}>
                <Image
                  src={p.img}
                  alt={p.alt}
                  sizes="(max-width: 960px) 80vw, 40vw"
                  priority={i < 2}
                />
                {/* Подпись читается всегда: снимок под ней работает фактурой */}
                <p className={styles.cardLabel} aria-hidden="true">
                  <span className={styles.cardName}>{p.name}</span>
                  <span className={styles.cardFact}>{p.fact}</span>
                </p>
              </div>
            </div>
          </figure>
        ))}
      </div>

      <p className={styles.finale} aria-hidden="true">
        {hero.finale.split(". ").map((line, i, all) => (
          <span key={line} className={styles.finaleMask}>
            <span className={styles.finaleLine}>
              {i < all.length - 1 ? `${line}.` : line.replace(/\.$/, "")}
              {i === all.length - 1 ? (
                <span className={styles.dot}>.</span>
              ) : null}
            </span>
          </span>
        ))}
      </p>
    </section>
  );
}
