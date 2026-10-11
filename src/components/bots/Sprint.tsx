"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { BOTS } from "@/content/bots";
import styles from "./Sprint.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof BOTS)["plan"];

/** Диапазон дней из подписи этапа: «дни 3–7» → [3, 7] */
const range = (when: string) => {
  const [a, b] = when.match(/\d+/g)!.map(Number);
  return [a, b ?? a] as const;
};

/**
 * Две недели как полоса из 14 дней. По скроллу дни закрашиваются один за другим, а этап,
 * в который попал текущий день, подсвечивается. Последний день отмечен запуском.
 */
export default function Sprint({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const spans = data.steps.map((s) => range(s.when));

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const days = gsap.utils.toArray<HTMLElement>("[data-day]");
        const steps = gsap.utils.toArray<HTMLElement>("[data-step]");
        const paint = (p: number) => {
          const today = Math.min(14, Math.floor(p * 14.999));
          days.forEach((d, i) => d.toggleAttribute("data-done", i < today));
          steps.forEach((s, i) => s.toggleAttribute("data-now", today >= spans[i][0] && today <= spans[i][1]));
          root.current?.style.setProperty("--today", String(today));
        };
        paint(0);
        ScrollTrigger.create({
          trigger: "[data-strip]",
          start: "top 75%",
          end: "top 20%",
          onUpdate: (self) => paint(self.progress),
        });
        return () => paint(1);
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="sprint-title">
      <div className="wrap">
        <header className={styles.head}>
          <h2 id="sprint-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.board} data-strip>
          <ol className={styles.days} aria-hidden="true">
            {Array.from({ length: 14 }, (_, i) => (
              <li key={i} className={styles.day} data-day data-done data-launch={i === 13 || undefined}>
                <span>{i + 1}</span>
              </li>
            ))}
          </ol>

          <ol className={styles.steps}>
            {data.steps.map((s, i) => (
              <li key={s.name} className={styles.step} data-step style={{ "--from": spans[i][0], "--to": spans[i][1] + 1 } as React.CSSProperties}>
                <span className={styles.when}>{s.when}</span>
                <h3 className={styles.name}>{s.name}</h3>
                <p className={styles.text}>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
        <p className={styles.note}>{data.note}</p>

        <dl className={styles.trust}>
          {data.trust.map((t) => (
            <div key={t.label} className={styles.trustItem}>
              <dt>{t.label}</dt>
              <dd>{t.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
