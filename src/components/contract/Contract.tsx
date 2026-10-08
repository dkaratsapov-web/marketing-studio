"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { TARIFFS } from "@/content/offer";
import styles from "./Contract.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Contract() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(`.${styles.row}`, {
        y: 40,
        autoAlpha: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: {
          trigger: `.${styles.table}`,
          start: "top 80%",
          once: true,
        },
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="contract"
      className={styles.contract}
      data-surface="dark"
    >
      <div className="wrap">
        <header className={styles.head}>
          <p className="label">Приложение 1 к договору</p>
          <h2 className={styles.heading}>Условия контракта</h2>
          <p className={styles.lead}>
            Цены открыты. Точная сумма зависит от ниши и числа каналов, её
            называем после аудита.
          </p>
        </header>

        <ul className={styles.table}>
          {TARIFFS.map((t) => (
            <li
              key={t.name}
              className={styles.row}
              data-flagship={t.flagship || undefined}
            >
              <div className={styles.what}>
                <h3 className={styles.name}>{t.name}</h3>
                <p className={styles.tools}>{t.tools}</p>
              </div>
              <p className={`label ${styles.launch}`}>{t.launch}</p>
              <p className={styles.price}>
                <span className={styles.amount}>{t.price}</span>
                <span className={styles.unit}>{t.unit}</span>
              </p>
            </li>
          ))}
        </ul>

        <aside className={styles.budget}>
          <p className={styles.budgetValue}>от 50 000 ₽</p>
          <p className={styles.budgetText}>
            Минимальный рекламный бюджет в месяц. Он идёт в рекламные кабинеты и
            оплачивается отдельно от нашей работы. Ниже этой суммы алгоритмы не
            набирают данных для обучения.
          </p>
        </aside>
      </div>
    </section>
  );
}
