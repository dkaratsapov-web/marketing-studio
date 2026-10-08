"use client";

import { Fragment, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import styles from "./Manifest.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Chunk = { text: string; mark?: "lime" | "pink" };

// Текст манифеста. Ключевые фразы выделяются маркером при прокрутке.
const PARAGRAPHS: Chunk[][] = [
  [
    { text: "Рынку хватает рекламы. Ему не хватает" },
    { text: "причин выбрать вас.", mark: "lime" },
  ],
  [
    { text: "Корпорация создаёт эти причины и превращает их в" },
    { text: "заявки, продажи и долю рынка.", mark: "pink" },
  ],
];

function Words({ text }: { text: string }) {
  const words = text.split(" ");
  return words.map((w, i) => (
    <Fragment key={i}>
      <span className={styles.word}>{w}</span>
      {i < words.length - 1 ? " " : null}
    </Fragment>
  ));
}

export default function Manifest() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          // Начинаем проявлять текст ещё на въезде секции, чтобы после вспышки не было пустого белого
          start: "top 75%",
          end: "bottom bottom",
          scrub: 0.5,
        },
      });

      // 0.00–0.70 слова проявляются, маркеры прочерчиваются вслед за своими словами,
      // 0.78 падает печать
      tl.fromTo(
        `.${styles.word}`,
        { opacity: 0.12 },
        { opacity: 1, ease: "none", stagger: 0.025, duration: 0.06 },
        0.02,
      );

      const words = gsap.utils.toArray<HTMLElement>(`.${styles.word}`);
      gsap.utils.toArray<HTMLElement>(`.${styles.mark}`).forEach((mark) => {
        const own = mark.querySelectorAll(`.${styles.word}`);
        const lastIndex = words.indexOf(own[own.length - 1] as HTMLElement);
        tl.fromTo(
          mark,
          { backgroundSize: "0% 100%" },
          { backgroundSize: "100% 100%", ease: "power2.out", duration: 0.1 },
          0.02 + lastIndex * 0.025 + 0.04,
        );
      });

      tl.fromTo(
        `.${styles.sign}`,
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, ease: "none", duration: 0.06 },
        0.72,
      )
        .fromTo(
          `.${styles.stamp}`,
          { autoAlpha: 0, scale: 2.4, rotate: -26 },
          { autoAlpha: 1, scale: 1, rotate: -9, ease: "back.out(2.2)", duration: 0.08 },
          0.78,
        )
        .set({}, {}, 1);
    },
    { scope: root },
  );

  return (
    <section ref={root} id="manifest" className={styles.manifest} data-surface="light">
      <div className={styles.stage}>
        <div className={`wrap ${styles.inner}`}>
          <p className={`label ${styles.doc}`}>Документ КРП-001 / Манифест</p>

          <div className={styles.text}>
            {PARAGRAPHS.map((chunks, pi) => (
              <p key={pi} className={styles.para}>
                {chunks.map((c, ci) => (
                  <Fragment key={ci}>
                    {c.mark ? (
                      <span className={styles.mark} data-tone={c.mark}>
                        <Words text={c.text} />
                      </span>
                    ) : (
                      <Words text={c.text} />
                    )}
                    {ci < chunks.length - 1 ? " " : null}
                  </Fragment>
                ))}
              </p>
            ))}
          </div>

          <div className={styles.footer}>
            <p className={styles.sign}>
              <span className="label">Подписано</span>
              <span className={styles.signName}>Даниил Карацапов, основатель Корпорации</span>
            </p>
            <div className={styles.stamp} aria-label="Печать: утверждено">
              <span className={styles.stampTop}>Корпорация</span>
              <span className={styles.stampMain}>Утверждено</span>
              <span className={styles.stampBottom}>Совет директоров</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
