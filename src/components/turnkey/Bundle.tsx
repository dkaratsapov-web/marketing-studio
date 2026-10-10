"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { TURNKEY } from "@/content/turnkey";
import styles from "./Bundle.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof TURNKEY)["bundle"];

const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;

/**
 * «Одна смета вместо пяти». Слева отделы с ценами по отдельности и их сумма, справа коробка.
 * Когда блок появляется, строки отделов по одной улетают в коробку, крышка закрывается,
 * и на коробке появляется ценник тарифа под ключ. Под коробкой то, что входит в тариф.
 */
export default function Bundle({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const sum = data.parts.reduce((s, p) => s + p.price, 0);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const box = q(`.${styles.box}`)[0] as HTMLElement;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        box.dataset.closed = "";
        return;
      }
      const rows = q(`.${styles.part}`) as HTMLElement[];
      const tl = gsap.timeline({ paused: true });
      gsap.set(q(`.${styles.tag}`), { autoAlpha: 0 });
      rows.forEach((r, i) => {
        const chip = r.querySelector(`.${styles.chip}`);
        tl.to(
          chip,
          {
            x: () => {
              const a = r.getBoundingClientRect();
              const b = box.getBoundingClientRect();
              return b.left + b.width / 2 - (a.left + a.width / 2);
            },
            y: () => {
              const a = r.getBoundingClientRect();
              const b = box.getBoundingClientRect();
              return b.top + b.height * 0.35 - (a.top + a.height / 2);
            },
            scale: 0.4,
            autoAlpha: 0,
            duration: 0.7,
            ease: "power3.in",
          },
          i * 0.25,
        )
          // Строка остаётся в списке бледной: отдел уже в коробке
          .set(chip, { x: 0, y: 0, scale: 1 })
          .to(chip, { autoAlpha: 0.4, duration: 0.3 });
      });
      tl.add(() => box.toggleAttribute("data-closed", true), "+=0.05")
        .fromTo(q(`.${styles.tag}`), { autoAlpha: 0, rotate: -20, y: -20 }, { autoAlpha: 1, rotate: -6, y: 0, duration: 0.6, ease: "back.out(2)", immediateRender: false }, "+=0.35");
      ScrollTrigger.create({ trigger: box, start: "top 70%", once: true, onEnter: () => tl.play() });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="bundle-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="bundle-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.parts}>
          <p className={styles.partsLabel}>{data.separate}</p>
          <ul className={styles.list}>
            {data.parts.map((p) => (
              <li key={p.name} className={styles.part}>
                <span className={styles.chip}>{p.name}</span>
                <span className={styles.dots} aria-hidden="true" />
                <span className={styles.price}>от {rub(p.price)}</span>
              </li>
            ))}
          </ul>
          <p className={styles.sum}>
            <span>Сумма по отдельности</span>
            <span className={styles.sumValue}>от {rub(sum)}</span>
          </p>
        </div>

        <figure className={styles.boxWrap}>
          <div className={styles.box}>
            <span className={styles.lid} aria-hidden="true" />
            <span className={styles.body}>
              <span className={styles.boxName}>{data.total.name}</span>
              <span className={styles.tape} aria-hidden="true" />
            </span>
            <span className={styles.tag}>
              <span className={styles.tagPrice}>от {rub(data.total.price)}</span>
              <span className={styles.tagUnit}>{data.total.unit}</span>
            </span>
          </div>
          <figcaption className={styles.note}>{data.note}</figcaption>
        </figure>

        <ul className={styles.includes}>
          {data.includes.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>

        <a href="#brief" className={`btn btn--primary ${styles.cta}`}>
          {data.cta}
          <svg className="btn__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </a>
      </div>
    </section>
  );
}
