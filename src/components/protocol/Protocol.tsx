"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { PROTOCOL, TRACK_SCALE, type Track } from "@/content/protocol";
import QuickLead from "./QuickLead";
import styles from "./Protocol.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Мини-диаграмма: каналы стартуют в один день, сплошная часть до минимального срока, штриховка до максимального */
function Tracks({ tracks }: { tracks: Track[] }) {
  return (
    <div className={styles.tracks}>
      {tracks.map((t) => (
        <div key={t.name} className={styles.track} data-tone={t.tone}>
          <span className={styles.trackName}>{t.name}</span>
          <span
            className={styles.trackBar}
            style={
              {
                "--min": t.from / TRACK_SCALE,
                "--max": t.to / TRACK_SCALE,
              } as React.CSSProperties
            }
            aria-label={`${t.from}–${t.to} дней`}
          >
            <span className={styles.trackSolid} />
            <span className={styles.trackRange} />
          </span>
          <span className={`label ${styles.trackDays}`}>
            {t.from}–{t.to} дн
          </span>
        </div>
      ))}
      <div className={styles.scale} aria-hidden="true">
        <span>День 1</span>
        <span>7</span>
        <span>14</span>
      </div>
    </div>
  );
}

export default function Protocol() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const steps = gsap.utils.toArray<HTMLElement>(`.${styles.step}`);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        steps.forEach((s) => (s.dataset.active = "true"));
        return;
      }

      // Линия заливается по мере прокрутки списка шагов
      gsap.fromTo(
        `.${styles.progress}`,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: `.${styles.steps}`,
            start: "top 60%",
            end: "bottom 60%",
            scrub: 0.4,
          },
        },
      );

      // Шаг «включается», когда до него доходит линия
      steps.forEach((step) => {
        ScrollTrigger.create({
          trigger: step,
          start: "top 60%",
          onEnter: () => (step.dataset.active = "true"),
          onLeaveBack: () => delete step.dataset.active,
        });
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="protocol"
      className={styles.protocol}
      data-surface="dark"
    >
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <p className="label">Как идёт работа</p>
          <h2 className={styles.heading}>Протокол</h2>
          <p className={styles.lead}>
            Пять шагов от заявки до отчёта. На каждом понятно, кто отвечает и
            что происходит прямо сейчас.
          </p>
          <QuickLead />
        </header>

        <div className={styles.steps}>
          <span className={styles.rail} aria-hidden="true">
            <span className={styles.progress} />
          </span>
          <ol className={styles.list}>
            {PROTOCOL.map((s, i) => (
              <li key={s.title} className={styles.step}>
                <span className={styles.num} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className={styles.body}>
                  <p className={`label ${styles.timing}`}>{s.timing}</p>
                  <h3 className={styles.title}>{s.title}</h3>
                  <p className={styles.text}>{s.text}</p>
                  {s.tracks ? <Tracks tracks={s.tracks} /> : null}
                  <p className={styles.leadBy}>
                    <span className="label">Ведёт</span> {s.lead}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
