"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { SFERA } from "@/content/sfera";
import Lightbox from "./Lightbox";
import styles from "./ContentLine.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { content: (typeof SFERA)["content"] };

/**
 * Контент-конвейер. Карточка материала едет по ленте стадий в такт прокрутке:
 * план, текст, согласование (кнопка «Согласовать — в эфир» нажимается), согласовано, в эфире.
 * Стадия, на которой стоит карточка, подсвечена. На телефоне лента идёт сверху вниз.
 */
export default function ContentLine({ content }: Props) {
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const last = content.stages.length - 1;

  useGSAP(
    () => {
      const section = root.current!;
      const belt = section.querySelector<HTMLElement>(`.${styles.belt}`)!;
      const stages = [
        ...section.querySelectorAll<HTMLElement>(`.${styles.stage}`),
      ];
      const counters = [
        ...section.querySelectorAll<HTMLElement>("[data-count]"),
      ];
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        belt.style.setProperty("--s", String(last));
        stages.forEach((s) => s.setAttribute("data-on", ""));
        return;
      }

      // Счётчики досчитываются, когда показались
      counters.forEach((el) => {
        const v = { n: 0 };
        gsap.to(v, {
          n: Number(el.dataset.count),
          duration: 1.4,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
          onUpdate: () => {
            el.textContent = String(Math.round(v.n));
          },
        });
      });

      // Лента: позиция карточки — дробный номер стадии в CSS-переменной
      const pos = { s: 0 };
      const approve = section.querySelector(`.${styles.approve}`);
      const update = () => {
        belt.style.setProperty("--s", pos.s.toFixed(3));
        const at = Math.round(pos.s);
        stages.forEach((st, i) => {
          st.toggleAttribute("data-on", i === at);
          st.toggleAttribute("data-done", i < at);
        });
        belt.toggleAttribute("data-live", pos.s > last - 0.05);
      };
      update();
      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        scrollTrigger: {
          trigger: belt,
          start: "top 75%",
          end: "bottom 30%",
          scrub: 0.6,
        },
      });
      tl.to(pos, { s: 1, duration: 1, onUpdate: update })
        .to(pos, { s: 2, duration: 1, onUpdate: update })
        // На согласовании кнопка нажимается и загорается
        .fromTo(
          approve,
          { "--done": 0, scale: 1 },
          { "--done": 1, scale: 0.96, duration: 0.3 },
        )
        .to(approve, { scale: 1, duration: 0.2 })
        .to(pos, { s: last, duration: 2, onUpdate: update });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className={styles.section}
      data-surface="dark"
      aria-labelledby="content-title"
    >
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <p className="label">{content.label}</p>
          <h2 id="content-title" className={styles.title}>
            {content.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{content.lead}</p>
        </header>

        <dl className={styles.counters}>
          {content.counters.map((c) => (
            <div key={c.label} className={styles.counter}>
              <dt className={styles.counterLabel}>{c.label}</dt>
              <dd className={styles.counterValue} data-count={c.value}>
                {c.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className={styles.belt} aria-label="Путь материала">
          <ol className={styles.stages}>
            {content.stages.map((st, i) => (
              <li key={st} className={styles.stage}>
                <span className={styles.stageNo}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={styles.stageName}>{st}</span>
              </li>
            ))}
          </ol>
          <div className={styles.lane} aria-hidden="true">
            <div className={styles.card}>
              <p className={styles.cardWhere}>{content.card.where}</p>
              <p className={styles.cardTitle}>{content.card.title}</p>
              <span className={styles.approve}>{content.approve}</span>
              <span className={styles.liveMark}>В эфире</span>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.rule}>{content.rule}</p>
          <div className={styles.checklist}>
            <p className="label">{content.checklistLabel}</p>
            <ul>
              {content.checklist.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            className={styles.shot}
            onClick={() => setOpen(0)}
            data-cursor-label="Открыть"
            aria-label={`Открыть снимок: ${content.shot.name}`}
          >
            <Image
              src={content.shot.img}
              alt={content.shot.alt}
              sizes="(max-width: 960px) 92vw, 30vw"
            />
            <span className={styles.shotName}>{content.shot.name}</span>
          </button>
        </div>
      </div>
      <Lightbox shots={[content.shot]} index={open} onChange={setOpen} />
    </section>
  );
}
