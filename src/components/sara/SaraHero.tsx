"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import HeroLead from "@/components/hero/HeroLead";
import { CINEMATIC_MQ } from "@/components/service/SearchScene";
import type { SARA } from "@/content/sara";
import { saraState } from "./saraState";
import styles from "./SaraHero.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const VoiceOrb = dynamic(() => import("./VoiceOrb"), { ssr: false });

type Props = { data: typeof SARA };

/** Высоты столбиков голосового сообщения: постоянные, чтобы рисунок не менялся от рендера */
const BARS = [4, 7, 12, 9, 15, 11, 6, 13, 16, 10, 7, 12, 14, 8, 5, 11, 15, 9, 6, 12, 10, 7, 13, 8, 4];

/**
 * Первый экран дела «Сара». Справа сфера голоса из точек. Приходит голосовое: слова
 * расшифровки проявляются по одному, сфера всплёскивает в такт. Затем слова подсвечиваются
 * по смыслу, и те же цвета загораются в карточке: тип, клиент, когда, тема. Сфера
 * успокаивается и становится салатовой: задача записана. На десктопе экран закреплён
 * на время сцены, на телефоне сцена проигрывается по кругу, пока видна.
 */
export default function SaraHero({ data }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const words = gsap.utils.toArray<HTMLElement>("[data-word]", el);
      const rows = gsap.utils.toArray<HTMLElement>("[data-row]", el);
      const bars = el.querySelector("[data-bars]");
      const saved = el.querySelector("[data-saved]");
      const v = { voice: 0, done: 0 };
      const sync = () => {
        saraState.voice = v.voice;
        saraState.done = v.done;
      };

      const build = (tl: gsap.core.Timeline) => {
        tl.set(words, { opacity: 0.12, y: 6, "--hl": 0 })
          .set(bars, { "--played": 0 })
          .set(rows, { autoAlpha: 0, x: 18 })
          .set(saved, { autoAlpha: 0, scale: 0.8 })
          .set(v, { voice: 0, done: 0, onComplete: sync })
          .to(v, { voice: 1, duration: 0.4, onUpdate: sync })
          .to(bars, { "--played": 1, duration: words.length * 0.28, ease: "none" }, "<")
          .to(words, { opacity: 1, y: 0, duration: 0.3, stagger: 0.28, ease: "power2.out" }, "<")
          .to(v, { voice: 0, duration: 0.5, onUpdate: sync })
          .to(words.filter((w) => w.dataset.kind), { "--hl": 1, duration: 0.35, stagger: 0.12 }, "-=0.2");
        rows.forEach((r) => {
          tl.to(r, { autoAlpha: 1, x: 0, duration: 0.4, ease: "power3.out" }, "-=0.15");
        });
        tl.to(v, { done: 1, duration: 0.6, onUpdate: sync }).to(saved, { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, "<");
        return tl;
      };

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        build(gsap.timeline({ paused: true })).progress(1);
        return;
      }
      // Стартовый кадр ставим сразу: таймлайн на нулевом прогрессе его не отрисует
      gsap.set(words, { opacity: 0.12, y: 6, "--hl": 0 });
      gsap.set(rows, { autoAlpha: 0, x: 18 });
      gsap.set(saved, { autoAlpha: 0, scale: 0.8 });
      gsap.set(bars, { "--played": 0 });

      const mm = gsap.matchMedia();
      mm.add(CINEMATIC_MQ, () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: el, start: "top top", end: "+=200%", pin: true, scrub: 0.6, invalidateOnRefresh: true },
        });
        build(tl).to({}, { duration: 0.8 });
      });
      mm.add(`not all and ${CINEMATIC_MQ}`, () => {
        const loop = build(gsap.timeline({ repeat: -1, repeatDelay: 2.5, paused: true }));
        ScrollTrigger.create({ trigger: el.querySelector("[data-stage]"), start: "top bottom", end: "bottom top", onToggle: (s) => (s.isActive ? loop.play() : loop.pause()) });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="top" className={styles.hero} data-surface="dark">
      <div className={styles.grain} aria-hidden="true" />

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
            Дело {data.code} · {data.sector} <span className={styles.tools}>· {data.geo}</span>
          </p>
        </div>

        <h1 className={styles.title}>
          <span className="visually-hidden">Кейс «{data.client}», голосовой ассистент: </span>
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
          <HeroLead source="service" service={`Кейс ${data.client}`} cta="Хочу такого ассистента" />
          <dl className={styles.facts}>
            {data.hero.counters.map((f) => (
              <div key={f.label} className={styles.fact}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
          </div>
        </div>

        <figure className={styles.stage} data-stage>
          <div className={styles.orb}>
            <VoiceOrb />
          </div>

          <div className={styles.voice} aria-hidden="true">
            <span className={styles.play} />
            <span className={styles.bars} data-bars>
              {BARS.map((h, i) => (
                <i key={i} style={{ "--h": h, "--k": i / BARS.length } as React.CSSProperties} />
              ))}
            </span>
            <span className={styles.len}>0:04</span>
          </div>

          <p className={styles.transcript}>
            <span className="visually-hidden">Голосовое сообщение: «{data.hero.phrase}». </span>
            {data.hero.tokens.map((t, i) => (
              <span key={i} className={styles.word} data-word data-kind={t.kind || undefined} aria-hidden="true">
                {t.w}
              </span>
            ))}
          </p>

          <dl className={styles.card}>
            <p className={styles.cardHead}>
              <span>Новая запись</span>
              <span className={styles.saved} data-saved>
                Записано
              </span>
            </p>
            {data.hero.card.map((r) => (
              <div key={r.kind} className={styles.row} data-row data-kind={r.kind}>
                <dt>{r.k}</dt>
                <dd>{r.v}</dd>
              </div>
            ))}
          </dl>
          <figcaption className={styles.note}>{data.hero.note}</figcaption>
        </figure>
      </div>
    </section>
  );
}
