"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { RETAIL } from "@/content/retail";
import styles from "./Unboxing.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof RETAIL)["box"];

function Arrow() {
  return (
    <svg className="btn__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Дело 010 как коробка от телефона. По скроллу крышка поднимается и уходит, из коробки выезжает
 * экран магазина в Telegram, а рядом по строчкам выкладывается комплектация.
 */
export default function Unboxing({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      const lid = () =>
        gsap
          .timeline({ scrollTrigger: { trigger: "[data-box]", start: "top 75%", end: "bottom 60%", scrub: 0.7 } })
          .to("[data-lid]", { yPercent: -45, rotation: -6, ease: "power2.inOut", duration: 1 })
          .to("[data-lid]", { autoAlpha: 0, duration: 0.35 }, 0.75)
          .fromTo("[data-shot]", { yPercent: 45 }, { yPercent: 0, ease: "power2.out", duration: 1 }, 0.45);
      // Десктоп: коробка рядом со списком, комплектация выкладывается вместе с крышкой
      mm.add("(min-width: 961px) and (prefers-reduced-motion: no-preference)", () => {
        lid().fromTo("[data-kit] li", { autoAlpha: 0, x: -24 }, { autoAlpha: 1, x: 0, stagger: 0.12, duration: 0.4 }, 0.5);
      });
      // Телефон: коробка под списком, список виден сразу, открывается только коробка
      mm.add("(max-width: 960px) and (prefers-reduced-motion: no-preference)", () => {
        lid();
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="box-title">
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.copy}>
          <h2 id="box-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>

          <p className={styles.kitName}>Комплектация</p>
          <ul className={styles.kit} data-kit>
            {data.kit.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>

          <dl className={styles.results}>
            {data.results.map((r) => (
              <div key={r.label}>
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>

          <Link href={data.href} className="btn btn--primary">
            {data.more}
            <Arrow />
          </Link>
        </div>

        <div className={styles.box} data-box>
          <div className={styles.base}>
            <div className={styles.shot} data-shot>
              <Image src={data.img} alt={data.alt} sizes="(max-width: 960px) 70vw, 22rem" className={styles.img} />
            </div>
          </div>
          <div className={styles.lid} data-lid aria-hidden="true">
            <span className={styles.lidName}>{data.lid}</span>
            <span className={styles.lidCode}>Дело {data.code}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
