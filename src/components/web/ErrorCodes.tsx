"use client";

import { useRef } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { scramble } from "@/lib/scramble";
import type { WEB } from "@/content/web";
import styles from "./ErrorCodes.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof WEB)["refusal"];

/**
 * «Ошибки, которых не будет». Причины отказа оформлены как страницы ошибок сайта:
 * крупный код, его название и что за ним стоит. Когда карточка появляется, код
 * сбоит: цифры перебираются, по краям расходятся салатовый и розовый каналы,
 * и встаёт настоящий код.
 */
export default function ErrorCodes({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const codes = gsap.utils.toArray<HTMLElement>(`.${styles.code}`, root.current);
      codes.forEach((el, i) => {
        const text = el.dataset.code ?? "";
        ScrollTrigger.create({
          trigger: el,
          start: "top 80%",
          once: true,
          onEnter: () =>
            window.setTimeout(() => {
              el.dataset.glitch = "";
              scramble(el, text, 900);
              window.setTimeout(() => delete el.dataset.glitch, 950);
            }, i * 180),
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="errors-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="errors-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <ul className={styles.list}>
          {data.errors.map((e) => (
            <li key={e.code} className={styles.card}>
              <p className={styles.code} data-code={e.code} aria-label={`Ошибка ${e.code}`}>
                {e.code}
              </p>
              <p className={styles.name}>{e.name}</p>
              <h3 className={styles.case}>{e.case}</h3>
              <p className={styles.reason}>{e.reason}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
