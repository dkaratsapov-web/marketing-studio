"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { SARA } from "@/content/sara";
import styles from "./LockScreen.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof SARA)["remind"];

/**
 * Напоминания на экране блокировки. Пока блок прокручивается, часы на экране идут по дню,
 * и в нужное время сверху падает уведомление Сары: утренняя сводка, дедлайн, встреча,
 * день рождения клиента. Новые ложатся сверху, старые сдвигаются вниз.
 */
export default function LockScreen({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const clock = el.querySelector<HTMLElement>("[data-clock]")!;
      const notes = gsap.utils.toArray<HTMLElement>("[data-note]", el);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        clock.textContent = data.items.at(-1)!.t;
        return;
      }
      gsap.set(notes, { autoAlpha: 0, y: -30, scale: 0.92 });
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el.querySelector("[data-phone]"), start: "top 75%", end: "bottom 45%", scrub: 0.6 },
      });
      // В списке новые сверху: уведомления в DOM в обратном порядке, появляются с конца
      [...notes].reverse().forEach((n, i) => {
        tl.call(() => void (clock.textContent = data.items[i].t), undefined, i)
          .to(n, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.4)" }, i + 0.05);
      });
      tl.to({}, { duration: 0.5 });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="remind-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="remind-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
          <p className={styles.note}>{data.note}</p>
        </header>

        <div className={styles.phone} data-phone>
          <p className={styles.date}>суббота, 11 октября</p>
          <p className={styles.clock} data-clock>
            {data.items[0].t}
          </p>
          <ol className={styles.notes}>
            {[...data.items].reverse().map((n) => (
              <li key={n.t} className={styles.notice} data-note>
                <span className={styles.ico} aria-hidden="true">
                  С
                </span>
                <span className={styles.body}>
                  <span className={styles.top}>
                    <b>{n.title}</b>
                    <time>{n.t}</time>
                  </span>
                  {n.text}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
