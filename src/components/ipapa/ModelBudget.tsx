"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { IPAPA } from "@/content/ipapa";
import styles from "./ModelBudget.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof IPAPA)["models"];

/**
 * Бюджет за моделями. Сетка кампаний: у каждой модели своя полоса бюджета. По скроллу
 * сетку проходит линия проверки окупаемости: модель получает отметку, неокупаемые гаснут
 * с пометкой «бюджет снят», их бюджет перетекает в окупаемые, и полосы тех растут.
 * Шаги слева загораются в такт. Внизу итог дела.
 */
export default function ModelBudget({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const okCount = data.items.filter((m) => m.ok).length;
  const grown = Math.min(1, (0.5 * data.items.length) / okCount);

  useGSAP(
    () => {
      const el = root.current!;
      const cells = gsap.utils.toArray<HTMLElement>("[data-cell]", el);
      const steps = gsap.utils.toArray<HTMLElement>("[data-step]", el);
      const scan = el.querySelector("[data-scan]");
      const result = el.querySelector("[data-result]");
      const final = () => {
        cells.forEach((c) => {
          c.setAttribute("data-state", c.dataset.ok ? "ok" : "off");
          c.style.setProperty("--b", c.dataset.ok ? String(grown) : "0");
        });
        steps.forEach((s) => s.setAttribute("data-on", ""));
      };
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        final();
        return;
      }
      gsap.set(cells, { "--b": 0.5 });
      gsap.set(scan, { top: "0%", autoAlpha: 0 });
      gsap.set(result, { autoAlpha: 0, y: 16 });
      const rows = Math.ceil(cells.length / 4);
      // Состояние ячеек и шагов считается от времени таймлайна: при прокрутке назад всё отматывается
      const at = (i: number) => 0.5 + ((Math.floor(i / 4) + 0.5) / rows) * 2;
      const sync = (t: number) => {
        steps.forEach((s, k) => s.toggleAttribute("data-on", t >= [0, 0.5, 2.6][k]));
        cells.forEach((c, i) => {
          const state = t < at(i) ? "idle" : c.dataset.ok ? "ok" : t < 2.6 ? "check-off" : "off";
          if (c.dataset.state !== state) c.setAttribute("data-state", state);
        });
      };
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        onUpdate: () => sync(tl.time()),
        scrollTrigger: { trigger: el.querySelector("[data-board]"), start: "top 70%", end: "bottom 45%", scrub: 0.6 },
      });
      tl.to(scan, { autoAlpha: 1, duration: 0.1 }, 0.5)
        .to(scan, { top: "100%", duration: 2 }, 0.5)
        .to(scan, { autoAlpha: 0, duration: 0.1 }, 2.5)
        .to(cells.filter((c) => !c.dataset.ok), { "--b": 0, duration: 0.8 }, 2.6)
        .to(cells.filter((c) => c.dataset.ok), { "--b": grown, duration: 0.8 }, 3)
        .to(result, { autoAlpha: 1, y: 0, duration: 0.4 }, 3.6)
        .to({}, { duration: 0.4 });
      sync(0);
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="models-title">
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.copy}>
          <p className={`label ${styles.kicker}`}>Яндекс Директ</p>
          <h2 id="models-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
          <ol className={styles.steps}>
            {data.steps.map((s, i) => (
              <li key={s} data-step>
                <span>{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <p className={styles.result} data-result>
            <b>{data.result.value}</b>
            {data.result.label}
          </p>
        </div>

        <figure className={styles.board} data-board>
          <span className={styles.scan} data-scan aria-hidden="true" />
          <ul className={styles.cells}>
            {data.items.map((m) => (
              <li key={m.name} className={styles.cell} data-cell data-ok={m.ok || undefined} data-state="idle">
                <span className={styles.name}>{m.name}</span>
                <span className={styles.bar} aria-hidden="true">
                  <i />
                </span>
                <span className={styles.status}>{m.ok ? data.on : data.off}</span>
              </li>
            ))}
          </ul>
          <figcaption className={styles.note}>{data.note}</figcaption>
        </figure>
      </div>
    </section>
  );
}
