"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { SARA } from "@/content/sara";
import styles from "./NeedVoice.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof SARA)["need"];

/** Что приходится вбивать в обычную форму ради одной встречи (пример) */
const VALUES = ["Каркаскомфорт", "Созвон по медиаплану", "12 октября", "11:00", "Каркаскомфорт", "Рабочее"];

/**
 * Проблема наглядно: слева форма таск-менеджера печатает поле за полем, медленно,
 * как человек на бегу. Справа одно голосовое, и задача уже записана с галочкой, пока форма
 * ещё на третьем поле. Сцена играет один раз, когда блок появляется.
 */
export default function NeedVoice({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const fields = gsap.utils.toArray<HTMLElement>("[data-field]", el);
      const done = el.querySelector("[data-done]");
      const voice = el.querySelector("[data-voice]");
      const fill = (f: HTMLElement, i: number, p: number) => {
        const v = VALUES[i];
        f.textContent = v.slice(0, Math.round(v.length * p));
      };
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        fields.forEach((f, i) => fill(f, i, 1));
        return;
      }
      fields.forEach((f) => (f.textContent = ""));
      gsap.set([voice, done], { autoAlpha: 0, y: 12 });
      const tl = gsap.timeline({ paused: true });
      // Голос справа: пришло, разобралось, записалось
      tl.to(voice, { autoAlpha: 1, y: 0, duration: 0.4, ease: "back.out(1.6)" }, 0.2).to(done, { autoAlpha: 1, y: 0, duration: 0.4, ease: "back.out(1.6)" }, 1.1);
      // Форма слева: печатает медленно, поле за полем
      fields.forEach((f, i) => {
        const p = { v: 0 };
        // Мигающий курсор переходит в поле, которое сейчас печатается
        tl.call(() => fields.forEach((x) => x.closest("li")!.toggleAttribute("data-on", x === f)), undefined, 0.3 + i * 1.15);
        tl.to(p, { v: 1, duration: 0.9, ease: "none", onUpdate: () => fill(f, i, p.v) }, 0.3 + i * 1.15);
      });
      ScrollTrigger.create({ trigger: el.querySelector("[data-duel]"), start: "top 70%", once: true, onEnter: () => tl.play() });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="need-title">
      <div className="wrap">
        <header className={styles.head}>
          <h2 id="need-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.duel} data-duel>
          <figure className={styles.form}>
            <figcaption className={styles.cap}>{data.formTitle}</figcaption>
            <ul className={styles.fields}>
              {data.form.map((label) => (
                <li key={label}>
                  <span className={styles.label}>{label}</span>
                  <span className={styles.input}>
                    <span data-field />
                    <i className={styles.caret} aria-hidden="true" />
                  </span>
                </li>
              ))}
            </ul>
            <span className={styles.save}>Сохранить</span>
          </figure>

          <figure className={styles.voiceCol}>
            <figcaption className={styles.cap}>{data.voiceTitle}</figcaption>
            <p className={styles.bubble} data-voice>
              <span className={styles.mic} aria-hidden="true" />
              «{data.voice}»
            </p>
            <p className={styles.done} data-done>
              <span className={styles.check} aria-hidden="true" />
              Записано: встреча с Каркаскомфортом, завтра в 11:00
            </p>
            <p className={styles.enough}>{data.enough}</p>
          </figure>
        </div>
      </div>
    </section>
  );
}
