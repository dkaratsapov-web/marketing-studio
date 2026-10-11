"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { DIAUTO } from "@/content/diauto";
import { openBrief } from "@/components/brief/briefBus";
import styles from "./Odometer.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof DIAUTO)["result"];

const DIGITS = "0123456789".split("");

/**
 * Итоги за 90 дней на одометре: каждое число собрано из барабанов с цифрами, при появлении
 * барабаны прокручиваются до своей цифры, старшие разряды останавливаются раньше младших,
 * как у настоящего счётчика пробега. Ниже надёжность, стек и ссылки дальше.
 */
export default function Odometer({ data, period, client }: { data: Data; period: string; client: string }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const drums = gsap.utils.toArray<HTMLElement>("[data-drum]");
      const to = (d: HTMLElement) => -Number(d.dataset.digit) * 10 - 100;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        drums.forEach((d) => gsap.set(d, { yPercent: to(d) / 2 }));
        return;
      }
      gsap.set(drums, { yPercent: 0 });
      ScrollTrigger.create({
        trigger: root.current!.querySelector("[data-panel]"),
        start: "top 75%",
        once: true,
        onEnter: () =>
          drums.forEach((d) => {
            const rank = Number(d.dataset.rank);
            gsap.to(d, { yPercent: to(d) / 2, duration: 1.4 + rank * 0.35, ease: "power3.out", delay: Number(d.dataset.row) * 0.15 });
          }),
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="odo-title">
      <div className="wrap">
        <header className={styles.head}>
          <h2 id="odo-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.period}>{period}</p>
        </header>

        <dl className={styles.panel} data-panel>
          {data.metrics.map((m, row) => {
            const digits = String(m.value).split("");
            return (
              <div key={m.label} className={styles.metric}>
                <dt className={styles.label}>{m.label}</dt>
                <dd className={styles.value}>
                  <span className="visually-hidden">{new Intl.NumberFormat("ru-RU").format(m.value)}</span>
                  <span className={styles.drums} aria-hidden="true">
                    {digits.map((dg, i) => (
                      <span key={i} className={styles.cell} data-last={i === digits.length - 1 || undefined}>
                        {/* Барабан: два круга цифр, чтобы при прокрутке было что крутить */}
                        <span className={styles.drum} data-drum data-digit={dg} data-rank={digits.length - 1 - i} data-row={row}>
                          {[...DIGITS, ...DIGITS].map((x, k) => (
                            <span key={k}>{x}</span>
                          ))}
                        </span>
                      </span>
                    ))}
                  </span>
                </dd>
              </div>
            );
          })}
        </dl>

        <ul className={styles.reliability}>
          {data.reliability.map((r) => (
            <li key={r.label}>
              <b>{r.value}</b>
              <span>{r.label}</span>
            </li>
          ))}
        </ul>

        <ul className={styles.stack} aria-label="Стек">
          {data.stack.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>

        <div className={styles.cta}>
          <button type="button" className="btn btn--primary" onClick={() => openBrief(`Кейс ${client}`)}>
            {data.cta}
            <svg className="btn__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <Link href={data.industry.href} className={styles.more}>
            {data.industry.text} →
          </Link>
        </div>
      </div>
    </section>
  );
}
