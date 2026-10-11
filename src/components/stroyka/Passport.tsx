"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { STROYKA } from "@/content/stroyka";
import styles from "./Passport.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof STROYKA)["passport"];

/**
 * Дело 004 как паспорт объекта на заборе стройки: щит на болтах поверх профнастила.
 * Когда щит доходит до экрана, цифры объекта досчитываются от нуля.
 */
export default function Passport({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const nums = gsap.utils.toArray<HTMLElement>("[data-num]");
      ScrollTrigger.create({
        trigger: root.current!.querySelector("[data-board]"),
        start: "top 70%",
        once: true,
        onEnter: () =>
          nums.forEach((el, i) => {
            const to = Number(el.dataset.num);
            const v = { n: 0 };
            gsap.to(v, { n: to, duration: 1.4, delay: i * 0.12, ease: "power3.out", onUpdate: () => (el.textContent = String(Math.round(v.n))) });
          }),
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="passport-title">
      <div className={`wrap ${styles.fence}`}>
        <div className={styles.board} data-board data-surface="dark">
          <span className={styles.bolt} data-c="tl" aria-hidden="true" />
          <span className={styles.bolt} data-c="tr" aria-hidden="true" />
          <span className={styles.bolt} data-c="bl" aria-hidden="true" />
          <span className={styles.bolt} data-c="br" aria-hidden="true" />
          <h2 id="passport-title" className={styles.title}>
            {data.title}
          </h2>
          <dl className={styles.rows}>
            {data.rows.map((r) => (
              <div key={r.k}>
                <dt>{r.k}</dt>
                <dd>{r.v}</dd>
              </div>
            ))}
          </dl>
          <dl className={styles.specs}>
            {data.specs.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd data-num={s.value}>{s.value}</dd>
              </div>
            ))}
          </dl>
          <Link href={data.href} className={`btn btn--primary ${styles.more}`}>
            {data.more}
            <svg className="btn__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
