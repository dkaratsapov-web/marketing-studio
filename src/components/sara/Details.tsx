"use client";

import { useRef } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import type { SARA } from "@/content/sara";
import styles from "./Details.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof SARA)["details"];
type Item = Data["items"][number];

/** Мини-демо каждой детали: показывает, как было и как стало */
function Demo({ item }: { item: Item }) {
  if (item.key === "dedup")
    return (
      <div className={styles.dedup}>
        <p className={styles.raw}>«{item.from}»</p>
        <p className={styles.row}>
          <span className={styles.box} aria-hidden="true" />
          {item.to}
          <span className={styles.tag}>{item.tag}</span>
        </p>
      </div>
    );
  if (item.key === "grammar")
    return (
      <div className={styles.grammar}>
        <p className={styles.raw}>
          <span className={styles.typo}>{item.from!.split(" ")[0]}</span> {item.from!.split(" ").slice(1).join(" ")}
        </p>
        <p className={styles.fixed}>{item.to}</p>
      </div>
    );
  if (item.key === "rows")
    return (
      <ul className={styles.rows} aria-hidden="true">
        <li>Согласовать медиаплан</li>
        <li className={styles.open}>
          <span>Подготовить отчёт по Директу</span>
          <span className={styles.btns}>
            <i>Готово</i>
            <i>Перенести</i>
            <i>Удалить</i>
          </span>
        </li>
        <li>Созвониться по оплате</li>
      </ul>
    );
  return (
    <div className={styles.tour} aria-hidden="true">
      <span className={styles.tabs}>
        <i />
        <i />
        <i />
      </span>
      <span className={styles.list}>
        <i />
        <i />
      </span>
      <span className={styles.add}>+</span>
      <span className={styles.spot} />
      <span className={styles.tip}>Нажмите, чтобы добавить задачу</span>
    </div>
  );
}

/**
 * Детали, которые видно только в работе. Каждая показана маленьким демо, которое
 * проигрывается один раз, когда карточка появляется на экране.
 */
export default function Details({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-detail]", root.current);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        cards.forEach((c) => c.setAttribute("data-play", ""));
        return;
      }
      ScrollTrigger.batch(cards, { start: "top 75%", once: true, onEnter: (els) => els.forEach((c, i) => setTimeout(() => c.setAttribute("data-play", ""), i * 250)) });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="details-title">
      <div className="wrap">
        <h2 id="details-title" className={styles.title}>
          {data.title}
          <span className={styles.dotMark}>.</span>
        </h2>
        <ul className={styles.grid}>
          {data.items.map((it) => (
            <li key={it.key} className={styles.card} data-detail data-kind={it.key}>
              <div className={styles.demo}>
                <Demo item={it} />
              </div>
              <h3>{it.name}</h3>
              <p>{it.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
