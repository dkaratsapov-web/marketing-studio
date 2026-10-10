"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { TARGET } from "@/content/target";
import styles from "./StoryEstimate.module.css";

type Data = (typeof TARGET)["estimate"];

const SLIDE_MS = 5200;

/**
 * «Смета отдела» в формате историй: тот же язык, на котором таргет говорит с людьми.
 * Каждый пункт сметы — отдельная история с полоской времени сверху; истории листаются
 * сами, пока блок на экране, касание справа или слева листает вручную, наведение
 * ставит на паузу. Слева тот же список целиком: смету видно и без просмотра историй.
 */
export default function StoryEstimate({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const [hold, setHold] = useState(false);
  const n = data.items.length;
  const it = data.items[active];
  const playing = visible && !hold;

  useEffect(() => {
    // Без анимаций истории не листаются сами: полоски стоят, листает человек
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const st = ScrollTrigger.create({
      trigger: root.current,
      start: "top 65%",
      end: "bottom 35%",
      onToggle: (self) => setVisible(self.isActive),
    });
    return () => st.kill();
  }, []);

  const go = (i: number) => setActive((i + n) % n);

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="estimate-title">
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.text}>
          <h2 id="estimate-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>

          <ol className={styles.list}>
            {data.items.map((x, i) => (
              <li key={x.name}>
                <button
                  type="button"
                  className={styles.row}
                  aria-current={i === active || undefined}
                  onClick={() => go(i)}
                >
                  <span className={styles.rowNo}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={styles.rowName}>{x.name}</span>
                  <span className={styles.rowWhen}>{x.when}</span>
                </button>
              </li>
            ))}
          </ol>

          <dl className={styles.totals}>
            {data.totals.map((t) => (
              <div key={t.name} className={styles.total}>
                <dt>{t.name}</dt>
                <dd>{t.value}</dd>
              </div>
            ))}
          </dl>

          <a href="#brief" className={`btn btn--primary ${styles.cta}`}>
            {data.cta}
            <svg className="btn__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </a>
        </div>

        <figure
          className={styles.phone}
          onPointerEnter={(e) => e.pointerType === "mouse" && setHold(true)}
          onPointerLeave={() => setHold(false)}
          onFocus={() => setHold(true)}
          onBlur={() => setHold(false)}
        >
          <div className={styles.story} data-slide={active % 3}>
            <div className={styles.bars} aria-hidden="true">
              {data.items.map((x, i) => (
                <span key={x.name} className={styles.barTrack}>
                  <span
                    key={i === active ? `run-${active}` : "idle"}
                    className={styles.barFill}
                    data-state={i < active ? "past" : i === active ? "now" : "next"}
                    style={{
                      animationDuration: `${SLIDE_MS}ms`,
                      animationPlayState: playing ? "running" : "paused",
                    }}
                    onAnimationEnd={i === active ? () => go(active + 1) : undefined}
                  />
                </span>
              ))}
            </div>

            <div className={styles.storyHead}>
              <span className={styles.storyAva} aria-hidden="true">
                Т
              </span>
              <span className={styles.storyWho}>Отдел таргета</span>
              <span className={styles.storyWhen}>{it.when}</span>
            </div>

            <span key={`g${active}`} className={styles.ghost} aria-hidden="true">
              {String(active + 1).padStart(2, "0")}
            </span>
            <div key={active} className={styles.slide} aria-live="polite">
              <span className={styles.slideNo}>
                {String(active + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
              </span>
              <p className={styles.slideName}>{it.name}</p>
              <p className={styles.slideText}>{it.text}</p>
            </div>

            <button type="button" className={styles.tap} data-side="prev" onClick={() => go(active - 1)} aria-label="Предыдущий пункт сметы" />
            <button type="button" className={styles.tap} data-side="next" onClick={() => go(active + 1)} aria-label="Следующий пункт сметы" />
          </div>
          <figcaption className={styles.hint}>{data.hint}</figcaption>
        </figure>
      </div>
    </section>
  );
}
