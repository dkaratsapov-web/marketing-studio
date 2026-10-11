"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { SARA } from "@/content/sara";
import styles from "./TwoChats.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof SARA)["sync"];

/**
 * Два мессенджера, одна база. Слева чат в MAX: уходит голосовое, Сара отвечает «записала».
 * По проводу через базу бежит импульс, и справа в списке задач в Telegram появляется новая
 * строка с подсветкой. Сцена играет, когда блок появляется, и повторяется по кнопке.
 */
export default function TwoChats({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const $ = (s: string) => el.querySelector<HTMLElement>(`[data-part="${s}"]`)!;
      gsap.set([$("voice"), $("reply"), $("row")], { autoAlpha: 0 });
      const t = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
      t.set([$("voice"), $("reply"), $("row")], { autoAlpha: 0, y: 10 })
        .set($("pulse"), { "--x": 0, autoAlpha: 0 })
        .set($("db"), { "--on": 0 })
        .set($("row"), { "--hl": 1 })
        .to($("voice"), { autoAlpha: 1, y: 0, duration: 0.45, ease: "back.out(1.6)" }, 0.3)
        .to($("reply"), { autoAlpha: 1, y: 0, duration: 0.45, ease: "back.out(1.6)" }, 1.2)
        .to($("pulse"), { autoAlpha: 1, duration: 0.1 }, 1.4)
        .to($("pulse"), { "--x": 0.5, duration: 0.6, ease: "power1.in" }, 1.4)
        .to($("db"), { "--on": 1, duration: 0.25 }, ">-0.05")
        .to($("pulse"), { "--x": 1, duration: 0.6, ease: "power1.out" }, ">")
        .to($("row"), { autoAlpha: 1, y: 0, duration: 0.45, ease: "back.out(1.6)" }, ">-0.1")
        .to($("pulse"), { autoAlpha: 0, duration: 0.2 }, "<")
        .to($("row"), { "--hl": 0, duration: 1.4, ease: "power1.out" }, "+=0.8")
        .to($("db"), { "--on": 0, duration: 0.6 }, "<");
      tl.current = t;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        t.progress(1);
        return;
      }
      ScrollTrigger.create({ trigger: el.querySelector("[data-pair]"), start: "top 70%", once: true, onEnter: () => t.play(0) });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="two-title">
      <div className="wrap">
        <header className={styles.head}>
          <h2 id="two-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <div className={styles.headSide}>
            <p className={styles.lead}>{data.lead}</p>
            <button type="button" className={styles.replay} onClick={() => tl.current?.play(0)}>
              Показать ещё раз
            </button>
          </div>
        </header>

        <div className={styles.pair} data-pair>
          <figure className={styles.phone} data-app="max">
            <figcaption className={styles.app}>MAX</figcaption>
            <div className={styles.screen}>
              <p className={styles.chatHead}>Сара</p>
              <div className={styles.feed}>
                <p className={styles.out} data-part="voice">
                  <span className={styles.wave} aria-hidden="true" />
                  «{data.voice}»
                </p>
                <p className={styles.in} data-part="reply">
                  Записала задачу на пятницу
                </p>
              </div>
            </div>
          </figure>

          <div className={styles.wire} aria-hidden="true">
            <i className={styles.pulse} data-part="pulse" />
            <span className={styles.db} data-part="db">
              <b>Одна база</b>
            </span>
          </div>

          <figure className={styles.phone} data-app="tg">
            <figcaption className={styles.app}>Telegram</figcaption>
            <div className={styles.screen}>
              <p className={styles.chatHead}>Задачи</p>
              <ul className={styles.tasks}>
                <li data-part="row" className={styles.fresh}>
                  <span className={styles.box} aria-hidden="true" />
                  {data.task}
                  <em>{data.due}</em>
                </li>
                {data.list.map((x) => (
                  <li key={x}>
                    <span className={styles.box} aria-hidden="true" />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </figure>
        </div>
      </div>
    </section>
  );
}
