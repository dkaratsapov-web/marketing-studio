"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { WEB } from "@/content/web";
import styles from "./DrawingEstimate.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof WEB)["estimate"];

/**
 * «Смета на чертеже». Смета оформлена как лист рабочего чертежа: рамка, спецификация
 * позиций и основная надпись (штамп) в правом нижнем углу с ценой и сроком.
 * Переключатель «Лендинг / Корпоративный сайт» меняет значения в штампе. Когда лист
 * появляется, рамка прочерчивается, строки спецификации встают по одной, а в графе
 * «Разработал» дописывается подпись.
 */
export default function DrawingEstimate({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const [v, setV] = useState(0);
  const cur = data.variants[v];

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const sheet = q(`.${styles.sheet}`)[0];
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(q("[data-draw]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut", stagger: 0.08 })
        .from(q(`.${styles.row}`), { autoAlpha: 0, x: -14, duration: 0.35, stagger: 0.09 }, "-=0.5")
        .from(q(`.${styles.stampCell}`), { autoAlpha: 0, duration: 0.3, stagger: 0.03 }, "-=0.2")
        .fromTo(q("[data-sign]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, ease: "power1.inOut" });
      ScrollTrigger.create({ trigger: sheet, start: "top 70%", once: true, onEnter: () => tl.play() });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="drawing-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="drawing-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
          <div className={styles.switch} role="group" aria-label="Вид сайта">
            {data.variants.map((x, i) => (
              <button key={x.key} type="button" className={styles.opt} aria-pressed={i === v} onClick={() => setV(i)}>
                {x.name}
              </button>
            ))}
          </div>
          <a href="#brief" className={`btn btn--primary ${styles.cta}`}>
            {data.cta}
            <svg className="btn__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </a>
        </header>

        <figure className={styles.sheet}>
          {/* Рамка листа: прочерчивается при появлении */}
          <svg className={styles.frame} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <rect data-draw x="0.6" y="0.6" width="98.8" height="98.8" pathLength={1} />
            <rect data-draw x="7" y="2.5" width="91" height="95" pathLength={1} />
          </svg>

          <div className={styles.body}>
            <p className={styles.sheetTitle}>Спецификация</p>
            <table className={styles.spec}>
              <thead>
                <tr>
                  <th scope="col">Поз.</th>
                  <th scope="col">Наименование</th>
                  <th scope="col">Кол.</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it, i) => (
                  <tr key={it} className={styles.row}>
                    <td>{i + 1}</td>
                    <td>{it}</td>
                    <td>1</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Основная надпись: цена и срок меняются переключателем */}
            <table className={styles.stamp}>
              <tbody>
                <tr>
                  <td className={styles.stampCell} colSpan={2} rowSpan={2} data-big>
                    {data.stamp.title}
                  </td>
                  <th className={styles.stampCell} scope="row">Вид</th>
                  <td className={styles.stampCell} key={`k${v}`} data-flash>
                    {cur.name}
                  </td>
                </tr>
                <tr>
                  <th className={styles.stampCell} scope="row">Объём</th>
                  <td className={styles.stampCell} key={`p${v}`} data-flash>
                    {cur.pages}
                  </td>
                </tr>
                <tr>
                  <th className={styles.stampCell} scope="row">{data.stamp.dev}</th>
                  <td className={styles.stampCell}>
                    {data.stamp.head}
                    <svg className={styles.sign} viewBox="0 0 120 30" aria-hidden="true">
                      <path
                        data-sign
                        pathLength={1}
                        d="M4 22c8-14 12-16 14-6s4 8 9-4 9-10 9 2 6 10 14-2 8-12 12-2 4 10 14 4 18-10 30-6"
                      />
                    </svg>
                  </td>
                  <th className={styles.stampCell} scope="row">Срок</th>
                  <td className={styles.stampCell} key={`t${v}`} data-flash>
                    {cur.term}
                  </td>
                </tr>
                <tr>
                  <td className={styles.stampCell} colSpan={2}>
                    {data.stamp.org}
                  </td>
                  <th className={styles.stampCell} scope="row">Цена</th>
                  <td className={styles.stampCell} key={`c${v}`} data-flash data-price>
                    {cur.price}
                  </td>
                </tr>
              </tbody>
            </table>
            <span className={styles.sheetNo}>{data.stamp.sheet}</span>
          </div>
        </figure>
      </div>
    </section>
  );
}
