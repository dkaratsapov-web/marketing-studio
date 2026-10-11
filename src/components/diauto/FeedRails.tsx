"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { DIAUTO } from "@/content/diauto";
import { CARS } from "@/content/diauto";
import styles from "./FeedRails.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof DIAUTO)["feeds"];

const num = new Intl.NumberFormat("ru-RU");
/** Три авто из каталога, которые едут в фиды: Kia K3, Jetta VS5, Toyota RAV4 */
const PICK = [CARS[1], CARS[7], CARS[9]];
const SOLD = 2;

/**
 * Фиды. Слева каталог сайта, посередине проверка данных, справа четыре дорожки площадок.
 * Скролл ведёт историю: авто проходят проверку и встают на все дорожки разом; карточка
 * с потерянным нулём в цене упирается в проверку и дальше не идёт; проданный RAV4
 * зачёркивается и исчезает со всех площадок одновременно. Блок не закреплён.
 */
export default function FeedRails({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const chips = (car: number) => el.querySelectorAll<HTMLElement>(`[data-chip="${car}"]`);
      const strikes = el.querySelectorAll<HTMLElement>("[data-strike]");
      const typo = el.querySelector<HTMLElement>("[data-typo]")!;
      const gate = el.querySelector<HTMLElement>("[data-gate]")!;
      const sold = el.querySelector<HTMLElement>("[data-sold]")!;
      const blocked = el.querySelector<HTMLElement>("[data-blocked]")!;

      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      tl.set(PICK.map((_, i) => [...chips(i)]).flat(), { autoAlpha: 0, x: -30 })
        .set(strikes, { scaleX: 0 })
        .set([sold, blocked], { autoAlpha: 0 })
        .set(typo, { x: 0, autoAlpha: 1 })
        .set(gate, { "--alarm": 0 });
      // Авто одно за другим встают на все четыре дорожки
      PICK.forEach((_, i) => tl.to(chips(i), { autoAlpha: 1, x: 0, duration: 0.5, stagger: 0.06 }, i * 0.45));
      // Карточка с опечаткой упирается в проверку
      tl.to(typo, { x: () => gate.getBoundingClientRect().left - typo.getBoundingClientRect().right + 14, duration: 0.6, ease: "power1.in" }, "+=0.2")
        .to(gate, { "--alarm": 1, duration: 0.2 })
        .to(typo, { x: "-=18", duration: 0.25, ease: "power2.out" })
        .to(blocked, { autoAlpha: 1, duration: 0.3 }, "<")
        // Продано: зачёркивается и уходит со всех площадок разом
        .to(strikes, { scaleX: 1, duration: 0.35, ease: "power3.inOut" }, "+=0.4")
        .to(chips(SOLD), { autoAlpha: 0, y: 10, duration: 0.45 }, "+=0.15")
        .to(sold, { autoAlpha: 1, duration: 0.3 }, "<");

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        tl.progress(1);
        return;
      }
      ScrollTrigger.create({ trigger: el.querySelector("[data-yard]"), start: "top 70%", end: "bottom 45%", scrub: 0.6, animation: tl });
    },
    { scope: root },
  );

  const chip = (car: number, extra?: { strike?: boolean }) => (
    <span className={styles.chip} data-chip={car}>
      <b>{PICK[car].name}</b>
      <span>{num.format(PICK[car].price)} ₽</span>
      {extra?.strike ? <i className={styles.chipStrike} data-strike /> : null}
    </span>
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="feeds-title">
      <div className="wrap">
        <header className={styles.head}>
          <h2 id="feeds-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.yard} data-yard>
          {/* Каталог сайта */}
          <div className={styles.source}>
            <p className={styles.label}>{data.source}</p>
            <div className={styles.stack} aria-hidden="true">
              {PICK.map((c, i) => (
                <Image key={i} src={c.img} alt="" className={styles.stackCard} style={{ "--i": i } as React.CSSProperties} sizes="10rem" />
              ))}
            </div>
            <span className={styles.typo} data-typo aria-hidden="true">
              <b>Jetta VS5</b>
              <span>194 000 ₽</span>
            </span>
          </div>

          {/* Проверка данных */}
          <div className={styles.gate} data-gate>
            <span className={styles.gateBar} aria-hidden="true" />
            <p className={styles.gateName}>{data.gate}</p>
            <p className={styles.blocked} data-blocked>
              {data.blocked}
            </p>
          </div>

          {/* Дорожки площадок */}
          <ul className={styles.rails}>
            {data.rails.map((r) => (
              <li key={r.name} className={styles.rail}>
                <p className={styles.railName}>
                  {r.name}
                  <span>{r.note}</span>
                </p>
                <span className={styles.track} aria-hidden="true">
                  {chip(0)}
                  {chip(1)}
                  {chip(2, { strike: true })}
                </span>
              </li>
            ))}
          </ul>
          <p className={styles.sold} data-sold>
            {data.sold}
          </p>
        </div>
      </div>
    </section>
  );
}
