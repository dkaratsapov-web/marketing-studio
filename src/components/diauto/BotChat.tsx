"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { DIAUTO } from "@/content/diauto";
import styles from "./BotChat.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof DIAUTO)["bot"];

/**
 * Бот и мини-приложение. В телефоне идёт переписка с ботом: человек жмёт /start, бот
 * отвечает и даёт кнопку каталога, по нажатию снизу выезжает мини-приложение (настоящий
 * снимок). Сцена играет один раз при появлении, кнопкой её можно повторить.
 */
export default function BotChat({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const msgs = el.querySelectorAll<HTMLElement>("[data-msg]");
      const typing = el.querySelector<HTMLElement>("[data-typing]")!;
      const btn = el.querySelector<HTMLElement>("[data-open]")!;
      const app = el.querySelector<HTMLElement>("[data-app]")!;
      const t = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
      t.set(msgs, { autoAlpha: 0, y: 12 })
        .set([typing, btn], { autoAlpha: 0 })
        .set(app, { yPercent: 100 })
        .to(msgs[0], { autoAlpha: 1, y: 0, duration: 0.35 }, 0.3)
        .to(typing, { autoAlpha: 1, duration: 0.2 }, "+=0.2")
        .to(typing, { autoAlpha: 0, duration: 0.15 }, "+=0.7")
        .to(msgs[1], { autoAlpha: 1, y: 0, duration: 0.35 }, "<")
        .to(btn, { autoAlpha: 1, duration: 0.3 }, "+=0.1")
        .to(msgs[2], { autoAlpha: 1, y: 0, duration: 0.35 }, "+=0.6")
        .to(btn, { scale: 0.94, duration: 0.1, yoyo: true, repeat: 1 }, "<")
        .to(app, { yPercent: 0, duration: 0.7, ease: "power4.out" }, "+=0.2");
      tl.current = t;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        t.progress(1);
        return;
      }
      ScrollTrigger.create({ trigger: el.querySelector("[data-phone]"), start: "top 70%", once: true, onEnter: () => t.play() });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="bot-title">
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.text}>
          <h2 id="bot-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
          <p className={styles.lines}>
            <b>{data.lines.value}</b>
            <span>{data.lines.label}</span>
          </p>
          <ul className={styles.functions}>
            {data.functions.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <p className={styles.max}>
            <span className={styles.maxTag} aria-hidden="true">
              Telegram → MAX
            </span>
            {data.max}
          </p>
          <button type="button" className={styles.replay} onClick={() => tl.current?.restart()}>
            Показать ещё раз ↻
          </button>
        </div>

        <div className={styles.phone} data-phone>
          <div className={styles.chatTop} aria-hidden="true">
            <span className={styles.ava} />
            <span>
              <b>ДиАвто69 бот</b>
              <small>бот</small>
            </span>
          </div>
          <div className={styles.chat} aria-hidden="true">
            {data.chat.map((m, i) => (
              <p key={i} className={styles.msg} data-msg data-from={m.from}>
                {m.text}
              </p>
            ))}
            <p className={styles.typing} data-typing>
              <i />
              <i />
              <i />
            </p>
            <span className={styles.openBtn} data-open>
              {data.open}
            </span>
          </div>
          <div className={styles.app} data-app>
            <Image src={data.shot} alt={data.alt} className={styles.appImg} sizes="(max-width: 960px) 70vw, 22rem" />
          </div>
        </div>
      </div>
    </section>
  );
}
