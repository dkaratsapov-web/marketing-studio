"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { ANALYTICS } from "@/content/analytics";
import styles from "./CallTracking.module.css";

type Data = (typeof ANALYTICS)["calls"];

const STEP_MS = 2800;
const DIGITS = "0123456789".split("");

/** Номер, у которого каждая цифра — барабан: при смене источника цифры прокручиваются */
function Odometer({ value }: { value: string }) {
  return (
    <span className={styles.odo} aria-label={value} role="img">
      {value.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} className={styles.drum} aria-hidden="true">
            <span className={styles.strip} style={{ "--n": Number(ch), "--d": `${i * 35}ms` } as React.CSSProperties}>
              {DIGITS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </span>
          </span>
        ) : (
          <span key={i} className={styles.sym} aria-hidden="true">
            {ch}
          </span>
        ),
      )}
    </span>
  );
}

type Log = { id: number; src: number; time: string };

/**
 * «У каждого звонка свой источник». Слева источники, в центре шапка сайта клиента с номером:
 * при смене источника цифры номера прокручиваются, как барабаны счётчика. Справа журнал
 * звонков: каждый звонок приходит с подписью, какая реклама его привела.
 * Источники перебираются сами, пока блок на экране, и по нажатию.
 */
export default function CallTracking({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const [src, setSrc] = useState(0);
  const [auto, setAuto] = useState(false);
  const [log, setLog] = useState<Log[]>([{ id: 0, src: 0, time: "10:14" }]);
  const seq = useRef(1);
  const minute = useRef(14);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const st = ScrollTrigger.create({
      trigger: root.current,
      start: "top 65%",
      end: "bottom 35%",
      onToggle: (self) => setAuto(self.isActive),
    });
    return () => st.kill();
  }, []);

  const pick = (i: number) => {
    setSrc(i);
    minute.current = (minute.current + 7) % 60;
    const time = `10:${String(minute.current).padStart(2, "0")}`;
    setLog((l) => [{ id: seq.current++, src: i, time }, ...l].slice(0, 4));
  };

  useEffect(() => {
    if (!auto) return;
    const t = window.setTimeout(() => pick((src + 1) % data.sources.length), STEP_MS);
    return () => window.clearTimeout(t);
  }, [auto, src, data.sources.length]);

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="calls-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="calls-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.sources} role="group" aria-label="Источник перехода">
          {data.sources.map((s, i) => (
            <button
              key={s.name}
              type="button"
              className={styles.source}
              aria-pressed={i === src}
              onClick={() => {
                setAuto(false);
                pick(i);
              }}
            >
              <span className={styles.srcDot} />
              {s.name}
            </button>
          ))}
        </div>

        <figure className={styles.site}>
          <span className={styles.siteBar} aria-hidden="true">
            <span className={styles.siteBrand}>{data.site.brand}</span>
            <span className={styles.siteLinks}>
              <span />
              <span />
            </span>
          </span>
          <span className={styles.phone}>
            <Odometer value={data.sources[src].number} />
            <span className={styles.call}>{data.site.cta}</span>
          </span>
          <figcaption className={styles.note}>{data.note}</figcaption>
        </figure>

        <div className={styles.log}>
          <p className={styles.logTitle}>{data.log.title}</p>
          <ul className={styles.logList} aria-live="polite">
            {log.map((l) => (
              <li key={l.id} className={styles.entry}>
                <span className={styles.time}>{l.time}</span>
                <span className={styles.entryBody}>
                  <span>
                    {data.log.call} · {data.sources[l.src].number}
                  </span>
                  <span className={styles.from}>
                    {data.log.from}: <b>{data.sources[l.src].name}</b>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
