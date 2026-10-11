"use client";

import { useId, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { IPAPA } from "@/content/ipapa";
import styles from "./SerpIntent.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof IPAPA)["serp"];

/**
 * Выдача по запросу айфона в Твери. Ползунок «что важнее покупателю» перестраивает её:
 * когда важна цена, наверху маркетплейсы; когда важно получить сегодня, наверх выходит
 * объявление магазина с наличием и самовывозом, остальные гаснут. При появлении ползунок
 * один раз сам проезжает от цены к «сегодня». Объявления фиксированной высоты, перестановка
 * идёт сдвигом, блок не меняет высоту.
 */
export default function SerpIntent({ data }: { data: Data }) {
  const id = useId();
  const root = useRef<HTMLElement>(null);
  const [p, setP] = useState(0.2);
  const touched = useRef(false);
  const today = p >= 0.5;
  // Места объявлений: при «дешевле» магазин последний, при «сегодня» первый
  const slot = (key: string) => {
    const order = today ? ["ours", "mp1", "mp2"] : ["mp1", "mp2", "ours"];
    return order.indexOf(key);
  };

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setP(0.85);
        return;
      }
      const v = { p: 0.2 };
      ScrollTrigger.create({
        trigger: root.current!.querySelector("[data-serp]"),
        start: "top 65%",
        once: true,
        onEnter: () =>
          gsap.to(v, {
            p: 0.85,
            duration: 2.2,
            delay: 0.4,
            ease: "power2.inOut",
            onUpdate: () => {
              if (!touched.current) setP(v.p);
            },
          }),
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="serp-title">
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.copy}>
          <p className={`label ${styles.kicker}`}>Яндекс Директ</p>
          <h2 id="serp-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
          <ul className={styles.points}>
            {data.points.map((x) => (
              <li key={x.name}>
                <b>{x.name}</b>
                {x.text}
              </li>
            ))}
          </ul>
        </div>

        <figure className={styles.serp} data-serp>
          <div className={styles.search}>
            <span className={styles.ya} aria-hidden="true">
              Я
            </span>
            <span className={styles.query}>{data.query}</span>
          </div>

          <div className={styles.intent}>
            <label htmlFor={`${id}-intent`} className={styles.intentLabel}>
              {data.slider.label}
            </label>
            <div className={styles.rangeRow}>
              <span data-on={!today || undefined}>{data.slider.left}</span>
              <input
                id={`${id}-intent`}
                type="range"
                min={0}
                max={100}
                value={Math.round(p * 100)}
                onChange={(e) => {
                  touched.current = true;
                  setP(Number(e.target.value) / 100);
                }}
                className={styles.range}
                style={{ "--p": p } as React.CSSProperties}
                aria-valuetext={today ? data.slider.right : data.slider.left}
                data-cursor-label="Тяните"
              />
              <span data-on={today || undefined}>{data.slider.right}</span>
            </div>
          </div>

          <ol className={styles.ads} aria-live="polite">
            {data.ads.map((a) => (
              <li key={a.key} className={styles.ad} data-ours={a.ours || undefined} data-dim={(today && !a.ours) || (!today && a.ours) || undefined} style={{ "--slot": slot(a.key) } as React.CSSProperties}>
                <span className={styles.adWho}>
                  Реклама · {a.who}
                </span>
                <b className={styles.adTitle}>{a.title}</b>
                <span className={styles.adText}>{a.text}</span>
                <span className={styles.tags}>
                  {a.tags.map((t) => (
                    <i key={t}>{t}</i>
                  ))}
                </span>
                {"links" in a && a.links ? (
                  <span className={styles.links}>
                    {a.links.map((l) => (
                      <u key={l}>{l}</u>
                    ))}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
          <figcaption className={styles.note}>{data.note}</figcaption>
        </figure>
      </div>
    </section>
  );
}
