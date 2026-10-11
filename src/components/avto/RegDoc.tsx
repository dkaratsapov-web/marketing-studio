"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { AVTO } from "@/content/avtobiznes";
import styles from "./RegDoc.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof AVTO)["doc"];

/**
 * Дело 023 как свидетельство о регистрации: документ раскрывается, как книжка, когда
 * доходит до середины экрана, строки проступают по очереди. Голограмма с номером дела
 * переливается вслед за курсором.
 */
export default function RegDoc({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const el = root.current!;
      const cover = el.querySelector<HTMLElement>("[data-cover]")!;
      const rows = el.querySelectorAll<HTMLElement>("[data-docrow]");
      gsap.set(cover, { rotationY: 0 });
      gsap.set(rows, { autoAlpha: 0, x: -8 });
      gsap
        .timeline({ scrollTrigger: { trigger: el.querySelector("[data-doc]"), start: "top 70%", once: true } })
        .to(cover, { rotationY: -178, duration: 1.1, ease: "power3.inOut" })
        .set(cover, { autoAlpha: 0 })
        .to(rows, { autoAlpha: 1, x: 0, duration: 0.35, stagger: 0.08, ease: "power2.out" }, "-=0.5");
    },
    { scope: root },
  );

  // Голограмма: угол перелива за курсором
  const tilt = (e: React.PointerEvent<HTMLElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--h", `${(((e.clientX - b.left) / b.width) * 360).toFixed(0)}deg`);
  };

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="doc-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="doc-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.client}>{data.client}</p>
          <Link href={data.href} className="btn btn--primary">
            {data.more}
            <svg className="btn__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </Link>
        </header>

        <div className={styles.doc} data-doc onPointerMove={tilt}>
          <div className={styles.page}>
            <p className={styles.docTop}>
              <span>Свидетельство о регистрации</span>
              <span>Дело {data.code}</span>
            </p>
            <dl className={styles.rows}>
              {data.rows.map((r) => (
                <div key={r.k} className={styles.row} data-docrow>
                  <dt>{r.k}</dt>
                  <dd>{r.v}</dd>
                </div>
              ))}
            </dl>
            <span className={styles.holo} aria-hidden="true">
              <b>{data.code}</b>
              <small>{data.stamp}</small>
            </span>
          </div>
          <div className={styles.cover} data-cover aria-hidden="true">
            <span className={styles.coverTitle}>Свидетельство</span>
            <span className={styles.coverCode}>{data.code}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
