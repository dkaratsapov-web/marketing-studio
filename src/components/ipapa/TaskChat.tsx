"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { IPAPA } from "@/content/ipapa";
import styles from "./TaskChat.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof IPAPA)["task"];

/**
 * Задача как переписка в Telegram: владелец магазина пишет, чего хочет, агентство отвечает
 * решением. По скроллу сообщения приходят по очереди, перед каждым ответом мигает «печатает»,
 * у ответа загораются две галочки. Место под все сообщения занято сразу, блок не прыгает.
 */
export default function TaskChat({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const q = (sel: string) => gsap.utils.toArray<HTMLElement>(sel, root.current);
      const asks = q("[data-ask]");
      const answers = q("[data-answer]");
      const typing = q("[data-typing]");
      const ticks = q("[data-ticks]");
      gsap.set([...asks, ...answers], { autoAlpha: 0, y: 14, scale: 0.96 });
      gsap.set(typing, { autoAlpha: 0 });
      gsap.set(ticks, { "--read": 0 });
      const tl = gsap.timeline({
        defaults: { ease: "back.out(1.6)", duration: 0.5 },
        scrollTrigger: { trigger: root.current!.querySelector("[data-chat]"), start: "top 75%", end: "bottom 55%", scrub: 0.6 },
      });
      asks.forEach((a, i) => {
        tl.to(a, { autoAlpha: 1, y: 0, scale: 1 })
          .to(typing[i], { autoAlpha: 1, duration: 0.25, ease: "none" }, "+=0.1")
          .to(typing[i], { autoAlpha: 0, duration: 0.2, ease: "none" }, "+=0.35")
          .to(answers[i], { autoAlpha: 1, y: 0, scale: 1 }, "<")
          .to(ticks[i], { "--read": 1, duration: 0.3, ease: "none" }, "+=0.1");
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="task-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="task-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.chat} data-chat>
          <div className={styles.bar}>
            <span className={styles.ava} aria-hidden="true">а</span>
            <span>
              <b>{data.chat}</b>
              <small>в сети</small>
            </span>
          </div>
          <p className={styles.pinned}>
            <span>Закреплено</span>
            {data.done}
          </p>
          <ol className={styles.feed}>
            {data.asks.map((m) => (
              <li key={m.q} className={styles.pair}>
                <p className={styles.ask} data-ask>
                  {m.q}
                </p>
                <span className={styles.typing} data-typing aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <p className={styles.answer} data-answer>
                  {m.a}
                  <span className={styles.ticks} data-ticks aria-hidden="true">
                    <svg viewBox="0 0 18 10">
                      <path d="M1 5.5 4 8.5 10 1.5M7 8.5 8 9.5 14 1.5" />
                    </svg>
                  </span>
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
