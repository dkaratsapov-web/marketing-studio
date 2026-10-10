"use client";

import { useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { TARGET } from "@/content/target";
import styles from "./Aim.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { aim: (typeof TARGET)["aim"] };

const DOTS = 150;

/** Псевдослучайные, но одинаковые на сервере и в браузере координаты */
function seeded(n: number) {
  let s = 20210;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const pts = Array.from({ length: n }, () => {
    const x = 4 + rnd() * 92;
    const y = 4 + rnd() * 92;
    // Чем ближе к центру, тем дольше точка остаётся в прицеле; шум, чтобы не было идеального круга
    return {
      x,
      y,
      score: Math.hypot(x - 50, y - 50) / 64 + rnd() * 0.18,
      rank: 0,
    };
  });
  // Ранг — доля людей ближе к центру: на шаге с keep = 0.06 в прицеле остаётся 6% точек
  [...pts]
    .sort((a, b) => a.score - b.score)
    .forEach((p, i) => {
      p.rank = i / n;
    });
  return pts;
}

/**
 * «Аудитория, а не охват». Справа поле из точек: люди города. Пока слева листаются шаги
 * (весь город, география, интересы, поведение, возврат), прицел сужается, а точки вне
 * аудитории гаснут; на последнем шаге оставшиеся загораются розовым и подписываются сегменты.
 * Поле прилипает к экрану (sticky), шаги прокручиваются рядом: нет закрепления секции,
 * поэтому скролл не перехватывается. Переходы между шагами — CSS-переходы по смене шага.
 */
export default function Aim({ aim }: Props) {
  const root = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const dots = useMemo(() => seeded(DOTS), []);
  const keep = aim.steps[step].keep;
  const last = step === aim.steps.length - 1;

  useGSAP(
    () => {
      const blocks = gsap.utils.toArray<HTMLElement>(`.${styles.step}`);
      blocks.forEach((b, i) => {
        ScrollTrigger.create({
          trigger: b,
          start: "top 62%",
          end: "bottom 62%",
          onToggle: (self) => {
            if (self.isActive) setStep(i);
          },
        });
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className={styles.section}
      data-surface="dark"
      aria-labelledby="aim-title"
    >
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="aim-title" className={styles.title}>
            {aim.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{aim.lead}</p>
        </header>

        <div className={styles.stage}>
          <ol className={styles.steps}>
            {aim.steps.map((s, i) => (
              <li
                key={s.name}
                className={styles.step}
                data-on={i === step || undefined}
                data-past={i < step || undefined}
              >
                <span className={styles.stepNo}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className={styles.stepName}>{s.name}</h3>
                <p className={styles.stepText}>{s.text}</p>
              </li>
            ))}
          </ol>

          <figure className={styles.visual} aria-hidden="true">
            <div
              className={styles.field}
              data-last={last || undefined}
              style={{ "--r": Math.sqrt(keep) } as React.CSSProperties}
            >
              {dots.map((d, i) => (
                <span
                  key={i}
                  className={styles.person}
                  data-out={d.rank >= keep || undefined}
                  style={
                    {
                      left: `${d.x}%`,
                      top: `${d.y}%`,
                      "--delay": `${(i % 9) * 30}ms`,
                    } as React.CSSProperties
                  }
                />
              ))}
              {/* Прицел: кольцо с рисками, радиус зависит от того, сколько аудитории осталось */}
              <span className={styles.reticle}>
                <span className={styles.tick} data-side="t" />
                <span className={styles.tick} data-side="r" />
                <span className={styles.tick} data-side="b" />
                <span className={styles.tick} data-side="l" />
              </span>
              <span className={styles.stepTag}>{aim.steps[step].name}</span>
              {aim.segments.map((seg, i) => (
                <span key={seg} className={styles.segment} data-i={i}>
                  {seg}
                </span>
              ))}
            </div>
            <figcaption className={styles.note}>{aim.note}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
