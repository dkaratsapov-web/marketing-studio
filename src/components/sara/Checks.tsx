"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import HeroLead from "@/components/hero/HeroLead";
import type { SARA } from "@/content/sara";
import styles from "./Checks.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof SARA)["checks"];

/**
 * Как устроено и что проверяется. Слева стек, справа консоль: проверки прогоняются по
 * очереди, у каждой крутится индикатор, затем загорается зелёный результат. Ниже заявка.
 */
export default function Checks({ data, client, others }: { data: Data; client: string; others: { href: string; text: string }[] }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const lines = gsap.utils.toArray<HTMLElement>("[data-line]", root.current);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        lines.forEach((l) => l.setAttribute("data-state", "ok"));
        return;
      }
      lines.forEach((l) => l.setAttribute("data-state", "wait"));
      const tl = gsap.timeline({ paused: true });
      lines.forEach((l, i) => {
        tl.call(() => l.setAttribute("data-state", "run"), undefined, i * 0.7).call(() => l.setAttribute("data-state", "ok"), undefined, i * 0.7 + 0.55);
      });
      ScrollTrigger.create({ trigger: root.current!.querySelector("[data-console]"), start: "top 75%", once: true, onEnter: () => tl.play() });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="checks-title">
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.left}>
          <h2 id="checks-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <ul className={styles.stack}>
            {data.stack.map((s) => (
              <li key={s.name}>
                <b>{s.name}</b>
                {s.text}
              </li>
            ))}
          </ul>
        </div>

        <figure className={styles.console} data-console>
          <figcaption>{data.runTitle}</figcaption>
          <ol>
            {data.run.map((r) => (
              <li key={r.name} data-line data-state="ok">
                <span className={styles.mark} aria-hidden="true" />
                <span className={styles.name}>{r.name}</span>
                <span className={styles.result}>{r.result}</span>
              </li>
            ))}
          </ol>
        </figure>

        <div className={styles.cta} data-surface="dark">
          <div className={styles.form}>
            <p className={styles.ctaTitle}>Соберём ассистента под ваши задачи: в Telegram, MAX или оба сразу</p>
            <HeroLead source="service" service={`Кейс ${client}`} cta={data.cta} />
          </div>
          <nav className={styles.more} aria-label="Другие дела">
            {others.map((o) => (
              <Link key={o.href} href={o.href}>
                {o.text}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}
