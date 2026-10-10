"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { ANALYTICS } from "@/content/analytics";
import styles from "./Leaks.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof ANALYTICS)["leaks"];

/**
 * «Где теряются деньги». Труба от рекламы до продажи с пятью стыками, из каждого капает.
 * Когда блок появляется, на стыки по очереди защёлкиваются хомуты: капли прекращаются,
 * карточка исправления под стыком получает галочку. Когда закрыт последний, поток в трубе
 * становится ровным и загорается «Продажа».
 */
export default function Leaks({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const joints = gsap.utils.toArray<HTMLElement>(`.${styles.joint}`, el);
      const fixes = gsap.utils.toArray<HTMLElement>(`.${styles.fix}`, el);
      const all = () => {
        joints.forEach((j) => (j.dataset.fixed = ""));
        fixes.forEach((f) => (f.dataset.fixed = ""));
        el.dataset.sealed = "";
      };
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        all();
        return;
      }
      ScrollTrigger.create({
        trigger: el.querySelector(`.${styles.pipe}`),
        start: "top 70%",
        once: true,
        onEnter: () => {
          joints.forEach((j, i) =>
            window.setTimeout(() => {
              j.dataset.fixed = "";
              fixes[i].dataset.fixed = "";
              if (i === joints.length - 1) window.setTimeout(() => (el.dataset.sealed = ""), 350);
            }, 500 + i * 550),
          );
        },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="leaks-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="leaks-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.pipe} aria-hidden="true">
          <span className={styles.tube}>
            <span className={styles.flowLine} />
          </span>
          {data.stages.map((s, i) => (
            <span key={s} className={styles.stage} style={{ "--x": `${(i / (data.stages.length - 1)) * 100}%` } as React.CSSProperties} data-end={i === data.stages.length - 1 || undefined}>
              {s}
            </span>
          ))}
          {data.joints.map((j, i) => (
            <span key={j.name} className={styles.joint} style={{ "--x": `${((i + 0.5) / data.joints.length) * 100}%` } as React.CSSProperties}>
              <span className={styles.clamp} />
              <span className={styles.drop} />
              <span className={styles.drop} data-d="2" />
            </span>
          ))}
        </div>

        <ol className={styles.fixes}>
          {data.joints.map((j) => (
            <li key={j.name} className={styles.fix}>
              <span className={styles.where}>{j.name}</span>
              <span className={styles.fixName}>
                <span className={styles.tick} aria-hidden="true" />
                {j.fix}
              </span>
              <span className={styles.fixText}>{j.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
