"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { STROYKA } from "@/content/stroyka";
import styles from "./WorkLog.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof STROYKA)["log"];

/**
 * Журнал работ одного заказа: записи вписываются в разлинованный журнал по мере прокрутки,
 * в конце скобка собирает все касания в одну заявку. Рядом акт скрытых работ: каждый
 * дефект замера закрыт «штукатуркой», она осыпается, когда акт доходит до экрана.
 */
export default function WorkLog({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const el = root.current!;
      const rows = el.querySelectorAll<HTMLElement>("[data-entry]");
      const brace = el.querySelector<HTMLElement>("[data-brace]")!;
      const plaster = el.querySelectorAll<HTMLElement>("[data-plaster]");
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el.querySelector("[data-book]"),
          start: "top 70%",
          end: "bottom 55%",
          scrub: 0.5,
        },
      });
      tl.fromTo(
        rows,
        { clipPath: "inset(0 100% 0 0)" },
        {
          clipPath: "inset(0 0% 0 0)",
          duration: 1,
          stagger: 0.8,
          ease: "none",
        },
      ).fromTo(
        brace,
        { scaleY: 0, autoAlpha: 0 },
        { scaleY: 1, autoAlpha: 1, duration: 0.8, ease: "power2.out" },
      );
      gsap.fromTo(
        plaster,
        { yPercent: 0, autoAlpha: 1 },
        {
          yPercent: 110,
          autoAlpha: 0,
          duration: 0.8,
          ease: "power2.in",
          stagger: 0.35,
          scrollTrigger: {
            trigger: el.querySelector("[data-act]"),
            start: "top 65%",
            once: true,
          },
        },
      );
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className={styles.section}
      data-surface="light"
      aria-labelledby="log-title"
    >
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="log-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.book} data-book>
          <p className={styles.bookHead}>
            <span>Дата</span>
            <span>Что сделал клиент</span>
            <span>Где</span>
          </p>
          <ol className={styles.entries}>
            {data.entries.map((e, i) => (
              <li
                key={e.day}
                className={styles.entry}
                data-entry
                data-last={i === data.entries.length - 1 || undefined}
              >
                <span className={styles.day}>{e.day}</span>
                <span className={styles.what}>{e.what}</span>
                <span className={styles.where}>{e.where}</span>
              </li>
            ))}
          </ol>
          <span className={styles.brace} data-brace aria-hidden="true">
            <b>Все касания в одном отчёте</b>
          </span>
          <p className={styles.note}>{data.note}</p>
        </div>

        <aside className={styles.act} data-act>
          <p className={styles.actHead}>{data.hidden.title}</p>
          <p className={styles.actLead}>{data.hidden.lead}</p>
          <ol className={styles.defects}>
            {data.hidden.items.map((d, i) => (
              <li key={d.what} className={styles.defect}>
                <span className={styles.no}>{i + 1}</span>
                <div>
                  <p className={styles.defWhat}>{d.what}</p>
                  <p className={styles.defEffect}>{d.effect}</p>
                  <span className={styles.fixed}>{data.hidden.fixed}</span>
                </div>
                <span
                  className={styles.plaster}
                  data-plaster
                  aria-hidden="true"
                />
              </li>
            ))}
          </ol>
        </aside>

        <figure className={styles.shot}>
          <div className={styles.shotFrame}>
            <Image
              src={data.hidden.shot}
              alt={data.hidden.shotAlt}
              className={styles.shotImg}
              sizes="(max-width: 960px) 92vw, 80vw"
            />
          </div>
          <figcaption>
            Раздел «Стык» в аналитике дела 004: суммы скрыты, цифры
            демонстрационные
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
