"use client";

import { forwardRef } from "react";
import { gsap } from "gsap";
import type { TURNKEY } from "@/content/turnkey";
import styles from "./MixerScene.module.css";

type Data = (typeof TURNKEY)["console"];

const LEDS = 14;
const MASTER = 0.88;

/**
 * Шаги сцены: фейдеры каналов поднимаются по очереди, рядом загораются индикаторы уровня,
 * затем общий фейдер «Заявки» уходит вверх и включается лампа «в эфире».
 * Уровни — CSS-переменные на элементах, поэтому сцену можно и проигрывать, и вести скроллом.
 */
export function addMixerSteps(tl: gsap.core.Timeline, root: HTMLElement, data: Data) {
  const strips = root.querySelectorAll<HTMLElement>("[data-strip]");
  const master = root.querySelector<HTMLElement>("[data-master]")!;
  const lamp = root.querySelector<HTMLElement>("[data-lamp]")!;
  tl.set(strips, { "--lvl": 0 })
    .set(master, { "--lvl": 0 })
    .set(lamp, { "--on": 0 });
  strips.forEach((s, i) => {
    tl.to(s, { "--lvl": data.channels[i].level, duration: 0.9, ease: "power3.out" }, i * 0.28);
  });
  tl.to(master, { "--lvl": MASTER, duration: 1.1, ease: "power2.inOut" }, "+=0.15").to(lamp, { "--on": 1, duration: 0.3 }, "-=0.3");
  return tl;
}

/** Пульт: пять каналов с фейдерами и индикаторами, справа общий канал заявок */
const MixerScene = forwardRef<HTMLDivElement, { data: Data }>(function MixerScene({ data }, ref) {
  return (
    <div ref={ref} className={styles.scene} aria-hidden="true">
      <div className={styles.top}>
        <span className={styles.lamp} data-lamp>
          {data.on}
        </span>
        <span className={styles.screws}>
          <span />
          <span />
        </span>
      </div>
      <div className={styles.desk}>
        {data.channels.map((c, i) => (
          <div key={c.name} className={styles.strip} data-strip style={{ "--lvl": c.level } as React.CSSProperties}>
            <span className={styles.knob} />
            <span className={styles.knob} data-small />
            <div className={styles.track}>
              <span className={styles.meter}>
                {Array.from({ length: LEDS }, (_, k) => (
                  <span key={k} style={{ "--k": (k + 1) / LEDS } as React.CSSProperties} />
                ))}
              </span>
              <span className={styles.rail}>
                <span className={styles.cap} />
              </span>
            </div>
            <span className={styles.name}>{c.name}</span>
            <span className={styles.no}>{String(i + 1).padStart(2, "0")}</span>
          </div>
        ))}
        <div className={styles.strip} data-master style={{ "--lvl": MASTER } as React.CSSProperties}>
          <span className={styles.knob} data-big />
          <div className={styles.track}>
            <span className={styles.meter}>
              {Array.from({ length: LEDS }, (_, k) => (
                <span key={k} style={{ "--k": (k + 1) / LEDS } as React.CSSProperties} />
              ))}
            </span>
            <span className={styles.rail}>
              <span className={styles.cap} />
            </span>
          </div>
          <span className={styles.name}>{data.master}</span>
          <span className={styles.no}>M</span>
        </div>
      </div>
    </div>
  );
});

export default MixerScene;
