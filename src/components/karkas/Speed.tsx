"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { KARKAS } from "@/content/karkas";
import b from "./Block.module.css";
import styles from "./Speed.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const R = 42;
const C = 2 * Math.PI * R;

/**
 * Замер PageSpeed. Четыре кольца оценок заполняются, когда блок доходит до экрана, и
 * перезаполняются при переключении «Телефон / Компьютер». Ниже метрики с цветом статуса
 * как в отчёте Google, справа снимок самого отчёта.
 */
export default function Speed({ data }: { data: typeof KARKAS.speed }) {
  const root = useRef<HTMLElement>(null);
  const [tab, setTab] = useState(0);
  const [shown, setShown] = useState(false);
  const d = data.devices[tab];

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setShown(true);
      ScrollTrigger.create({ trigger: root.current!.querySelector(`.${styles.rings}`), start: "top 80%", once: true, onEnter: () => setShown(true) });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={b.section} data-surface="light" aria-labelledby="kk-speed">
      <div className="wrap">
        <div className={b.head}>
          <h2 id="kk-speed" className={b.title}>
            {data.title}
            <span className={b.dot}>.</span>
          </h2>
          <p className={b.lead}>{data.lead}</p>
        </div>

        <div className={styles.tabs} role="group" aria-label="Устройство замера">
          {data.devices.map((x, i) => (
            <button key={x.key} type="button" className={styles.tab} aria-pressed={tab === i} onClick={() => setTab(i)}>
              {x.name}
            </button>
          ))}
        </div>

        <div className={styles.grid}>
          <div>
            <ul className={styles.rings}>
              {d.scores.map((v, i) => (
                <li key={data.labels[i]} className={styles.ring} data-ok={v >= 90 ? "good" : v >= 50 ? "mid" : "bad"}>
                  <svg viewBox="0 0 100 100" aria-hidden="true">
                    <circle className={styles.track} cx="50" cy="50" r={R} />
                    <circle
                      className={styles.bar}
                      cx="50"
                      cy="50"
                      r={R}
                      strokeDasharray={C}
                      strokeDashoffset={shown ? C * (1 - v / 100) : C}
                    />
                  </svg>
                  <b key={`${d.key}-${v}`}>{v}</b>
                  <span>{data.labels[i]}</span>
                </li>
              ))}
              <li className={`${styles.ring} ${styles.agent}`}>
                <span className={styles.pill}>{data.agent.value}</span>
                <span>{data.agent.name}</span>
              </li>
            </ul>

            <dl className={styles.metrics}>
              {d.metrics.map((m) => (
                <div key={m.name} className={styles.metric} data-ok={m.ok}>
                  <dt>
                    <i aria-hidden="true" />
                    {m.name}
                    <small>{m.ru}</small>
                  </dt>
                  <dd>{m.value}</dd>
                </div>
              ))}
            </dl>
            <p className={styles.note}>{data.note}</p>
          </div>

          <figure className={styles.shotWrap}>
            <Image key={d.key} src={d.shot.img} alt={d.shot.alt} sizes="(max-width: 960px) 92vw, 38vw" className={styles.shot} />
          </figure>
        </div>
      </div>
    </section>
  );
}
