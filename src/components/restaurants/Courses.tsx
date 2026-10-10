"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { RESTAURANTS } from "@/content/restaurants";
import styles from "./Courses.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof RESTAURANTS)["courses"];

/**
 * «Подача по курсам». Слева пять курсов ужина — пять шагов пути гостя. Справа тарелка
 * под клошем прилипает к экрану: на каждом курсе клош поднимается, и на тарелке
 * «подано» название этого шага. Курс выбирается прокруткой, без закрепления секции.
 */
export default function Courses({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);

  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>(`.${styles.item}`, root.current).forEach((el, i) => {
        ScrollTrigger.create({
          trigger: el,
          start: "top 60%",
          end: "bottom 60%",
          onToggle: (self) => {
            if (self.isActive) setStep(i);
          },
        });
      });
    },
    { scope: root },
  );

  const it = data.items[step];

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="courses-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="courses-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.stage}>
          <ol className={styles.list}>
            {data.items.map((c, i) => (
              <li key={c.course} className={styles.item} data-on={i === step || undefined}>
                <span className={styles.course}>
                  {String(i + 1).padStart(2, "0")} · {c.course}
                </span>
                <h3 className={styles.name}>{c.name}</h3>
                <p className={styles.text}>{c.text}</p>
              </li>
            ))}
          </ol>

          <figure className={styles.plate} aria-hidden="true">
            <svg viewBox="0 0 400 400" className={styles.svg}>
              <ellipse cx="200" cy="304" rx="188" ry="56" className={styles.shadow} />
              <ellipse cx="200" cy="282" rx="185" ry="64" className={styles.rim} />
              <ellipse cx="200" cy="280" rx="130" ry="42" className={styles.well} />
            </svg>
            <span key={`d${step}`} className={styles.dish}>
              <span className={styles.dishCourse}>{it.course}</span>
              <span className={styles.dishName}>{it.name}</span>
            </span>
            <svg key={`c${step}`} viewBox="0 0 400 400" className={`${styles.svg} ${styles.cloche}`}>
              <path d="M70 270 A130 130 0 0 1 330 270 Z" className={styles.dome} />
              <path d="M110 200 A95 95 0 0 1 180 150" className={styles.shine} />
              <rect x="186" y="122" width="28" height="16" rx="8" className={styles.knob} />
              <rect x="60" y="266" width="280" height="10" rx="5" className={styles.lip} />
            </svg>
          </figure>
        </div>
      </div>
    </section>
  );
}
