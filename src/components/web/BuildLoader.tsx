"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { WEB } from "@/content/web";
import styles from "./BuildLoader.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof WEB)["build"];

/**
 * Этапы сборки сайта под полосой загрузки страницы. Полоса заполняется скроллом,
 * проценты растут, и этапы загораются по мере того, как полоса до них доходит.
 * На телефоне полоса стоит вертикально слева от этапов.
 */
export default function BuildLoader({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const n = data.stages.length;

  useGSAP(
    () => {
      const el = root.current!;
      const stages = el.querySelectorAll<HTMLElement>("[data-stage]");
      const pct = el.querySelector<HTMLElement>("[data-pct]")!;
      const render = (p: number) => {
        el.style.setProperty("--p", p.toFixed(4));
        pct.textContent = `${Math.round(p * 100)}%`;
        stages.forEach((s, i) => s.toggleAttribute("data-on", p >= (i + 0.35) / n));
      };
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        render(1);
        return;
      }
      render(0);
      ScrollTrigger.create({
        trigger: el.querySelector("[data-rail]"),
        start: "top 70%",
        end: "bottom 45%",
        scrub: 0.5,
        onUpdate: (self) => render(self.progress),
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="build-title">
      <div className="wrap">
        <header className={styles.head}>
          <h2 id="build-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.rail} data-rail>
          <div className={styles.bar} aria-hidden="true">
            <span className={styles.fill} />
            <span className={styles.pct}>
              {data.loading} <b data-pct>0%</b>
            </span>
          </div>

          <ol className={styles.stages}>
            {data.stages.map((s, i) => (
              <li key={s.name} className={styles.stage} data-stage>
                <p className={styles.no} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className={styles.name}>{s.name}</h3>
                <dl className={styles.rows}>
                  <div>
                    <dt>{data.cols.we}</dt>
                    <dd>{s.we}</dd>
                  </div>
                  <div>
                    <dt>{data.cols.you}</dt>
                    <dd>{s.you}</dd>
                  </div>
                  <div data-get>
                    <dt>{data.cols.get}</dt>
                    <dd>{s.get}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
