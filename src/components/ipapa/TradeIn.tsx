"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import type { IPAPA } from "@/content/ipapa";
import styles from "./TradeIn.module.css";

type Data = (typeof IPAPA)["tradein"];

const rub = (n: number) => new Intl.NumberFormat("ru-RU").format(n);

/** Трещины и царапины на силуэте телефона: чем хуже состояние, тем больше их проступает */
const DAMAGE = [
  [],
  ["M30 40 l14 6", "M110 210 l-10 12"],
  ["M30 40 l14 6", "M110 210 l-10 12", "M70 120 l18 -22 l10 8 l14 -20", "M40 260 l22 -6"],
  ["M30 40 l14 6", "M110 210 l-10 12", "M70 120 l18 -22 l10 8 l14 -20", "M40 260 l22 -6", "M88 90 l-30 40 l20 18 l-26 44 l14 24", "M88 90 l34 26 l-8 30", "M88 90 l-10 -46", "M58 190 l-26 30"],
];

/**
 * Калькулятор трейд-ина как в мини-приложении: модель и память уже выбраны, человек
 * выбирает состояние, на силуэте телефона проступают царапины и трещины, а цена досчитывается
 * до новой. Цены сняты с экрана калькулятора клиента.
 */
export default function TradeIn({ data }: { data: Data }) {
  const [on, setOn] = useState(0);
  const priceRef = useRef<HTMLSpanElement>(null);
  const shown = useRef(data.states[0].price);
  const max = data.states[0].price;
  const price = data.states[on].price;

  useEffect(() => {
    const el = priceRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = rub(price);
      shown.current = price;
      return;
    }
    const v = { n: shown.current };
    const tw = gsap.to(v, {
      n: price,
      duration: 0.7,
      ease: "power3.out",
      onUpdate: () => {
        el.textContent = rub(Math.round(v.n / 100) * 100);
        shown.current = v.n;
      },
    });
    return () => void tw.kill();
  }, [price]);

  return (
    <section className={styles.section} data-surface="dark" aria-labelledby="tradein-title">
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.copy}>
          <h2 id="tradein-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
          <ol className={styles.steps}>
            {data.steps.map((s, i) => (
              <li key={s} data-done={i < 2 || undefined} data-on={i === 2 || undefined}>
                <span>{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>

        <div className={styles.panel}>
          <svg className={styles.device} viewBox="0 0 160 320" aria-hidden="true" data-state={on}>
            <rect x="6" y="6" width="148" height="308" rx="28" className={styles.body} />
            <rect x="16" y="16" width="128" height="288" rx="20" className={styles.screen} />
            <rect x="60" y="24" width="40" height="10" rx="5" className={styles.island} />
            {DAMAGE[on].map((d, i) => (
              <path key={`${on}-${i}`} d={d} className={styles.crack} style={{ "--i": i } as React.CSSProperties} />
            ))}
          </svg>

          <div className={styles.form}>
            <p className={styles.model}>
              {data.model} <span>· {data.memory}</span>
            </p>
            <fieldset className={styles.states}>
              <legend className="label">Состояние</legend>
              {data.states.map((s, i) => (
                <label key={s.name} className={styles.state} data-on={i === on || undefined}>
                  <input type="radio" name="tradein-state" checked={i === on} onChange={() => setOn(i)} />
                  <span>{s.name}</span>
                  <em>до {rub(s.price)} ₽</em>
                </label>
              ))}
            </fieldset>

            <div className={styles.result} aria-live="polite">
              <span className="label">Предварительная оценка</span>
              <p className={styles.price}>
                до <span ref={priceRef}>{rub(data.states[0].price)}</span> ₽
              </p>
              <span className={styles.meter} aria-hidden="true">
                <i style={{ width: `${(price / max) * 100}%` }} />
              </span>
            </div>
          </div>
        </div>
        <p className={styles.note}>{data.note}</p>
      </div>
    </section>
  );
}
