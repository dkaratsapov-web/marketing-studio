"use client";

import { useEffect, useId, useRef, useState } from "react";
import { gsap } from "gsap";
import HeroLead from "@/components/hero/HeroLead";
import HomeLink from "@/components/HomeLink";
import type { CONTEXT } from "@/content/services";
import styles from "./EstimateCalc.module.css";

type Calc = (typeof CONTEXT)["calc"];

export type CalcResult =
  | { refuse: true; picks: string[] }
  | { refuse: false; picks: string[]; lo: number; hi: number; months: number; budget: string };

/** 55000 -> «55 000»: неразрывный пробел между разрядами, как в чеке */
export const money = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/** Смета по ответам: (база по бюджету + надбавка за объём) × коэффициент чека, вилка до +15% */
function compute(calc: Calc, picks: number[]): CalcResult {
  const opts = calc.steps.map((s, i) => s.options[picks[i]]);
  const labels = opts.filter(Boolean).map((o) => o.label);
  if (opts[0].refuse) return { refuse: true, picks: labels };
  const raw = ((opts[0].base ?? 0) + (opts[1].add ?? 0)) * (opts[2].k ?? 1);
  const round = (n: number) => Math.round(n / calc.round) * calc.round;
  const lo = round(raw);
  return {
    refuse: false,
    picks: labels,
    lo,
    hi: round(lo * (1 + calc.spread)),
    months: calc.months,
    budget: opts[0].label,
  };
}

type Props = { calc: Calc; service: string; onResult: (r: CalcResult | null) => void };

/**
 * «Посчитать смету под ваш проект». Три вопроса кнопками, ответ сразу переводит дальше.
 * Итог показывается сразу, без телефона: вилка в месяц и сумма за минимальный контракт,
 * а чек справа перепечатывается под проект (это делает Estimate). Телефон только чтобы закрепить смету.
 * Бюджет меньше 50 000 ₽: честный отказ и предложение начать с карт, как в принципах агентства.
 */
export default function EstimateCalc({ calc, service, onResult }: Props) {
  const id = useId();
  const [picks, setPicks] = useState<number[]>([]);
  const [result, setResult] = useState<CalcResult | null>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const priceRef = useRef<HTMLSpanElement>(null);
  const moved = useRef(false);
  const step = picks.length;
  const total = calc.steps.length;

  const pick = (i: number) => {
    const next = [...picks, i];
    moved.current = true;
    const opt = calc.steps[step].options[i];
    if (opt.refuse || next.length === total) {
      const r = compute(calc, next);
      setPicks(next);
      setResult(r);
      onResult(r);
    } else {
      setPicks(next);
    }
  };

  const back = () => {
    moved.current = true;
    setPicks((p) => p.slice(0, -1));
  };

  const reset = () => {
    moved.current = true;
    setPicks([]);
    setResult(null);
    onResult(null);
  };

  // Новый вопрос получает фокус: клавиатура и скринридер не теряются после перехода
  useEffect(() => {
    if (moved.current) questionRef.current?.focus({ preventScroll: true });
  }, [step, result]);

  // Цифры сметы «досчитываются», как на кассе
  useEffect(() => {
    const el = priceRef.current;
    if (!el || !result || result.refuse) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const v = { lo: 0, hi: 0 };
    const tween = gsap.to(v, {
      lo: result.lo,
      hi: result.hi,
      duration: 1.1,
      ease: "power3.out",
      onUpdate: () => {
        const r = (n: number) => Math.round(n / 1000) * 1000;
        el.textContent = `${money(r(v.lo))}–${money(r(v.hi))}`;
      },
      onComplete: () => {
        el.textContent = `${money(result.lo)}–${money(result.hi)}`;
      },
    });
    return () => {
      tween.kill();
    };
  }, [result]);

  const progress = result ? 1 : step / total;

  return (
    <div className={styles.calc}>
      <div className={styles.head}>
        <p className={styles.title}>{calc.title}</p>
        <p className={styles.step} aria-hidden="true">
          {result ? "Готово" : `${step + 1} / ${total}`}
        </p>
      </div>
      <div className={styles.bar} aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>

      {!result ? (
        <div key={step} className={styles.question} role="group" aria-labelledby={`${id}-q`}>
          <h3 id={`${id}-q`} ref={questionRef} tabIndex={-1} className={styles.q}>
            <span className="visually-hidden">
              Вопрос {step + 1} из {total}.{" "}
            </span>
            {calc.steps[step].q}
          </h3>
          <div className={styles.options}>
            {calc.steps[step].options.map((o, i) => (
              <button key={o.label} type="button" className={styles.option} onClick={() => pick(i)}>
                {o.label}
              </button>
            ))}
          </div>
          {step > 0 ? (
            <button type="button" className={styles.linkBtn} onClick={back}>
              ← Назад
            </button>
          ) : null}
        </div>
      ) : result.refuse ? (
        <div className={styles.result}>
          <h3 ref={questionRef} tabIndex={-1} className={styles.refuseTitle}>
            {calc.refuse.title}
          </h3>
          <p className={styles.refuseText}>{calc.refuse.text}</p>
          <div className={styles.actions}>
            <HomeLink hash="#departments" className={styles.linkBtn}>
              Отдел карт и геосервисов →
            </HomeLink>
            <button type="button" className={styles.linkBtn} onClick={reset}>
              Пересчитать
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.result}>
          <h3 ref={questionRef} tabIndex={-1} className={styles.price}>
            <span className="visually-hidden">Ваша смета: </span>
            <span ref={priceRef}>
              {money(result.lo)}–{money(result.hi)}
            </span>
            <span className={styles.rub}> ₽</span>
          </h3>
          <p className={styles.per}>в месяц, работа отдела</p>
          <dl className={styles.lines}>
            <div>
              <dt>Рекламный бюджет</dt>
              <dd>отдельно, {result.budget.toLowerCase()}</dd>
            </div>
            <div>
              <dt>Контракт</dt>
              <dd>от {result.months} месяцев</dd>
            </div>
            <div>
              <dt>Работа за {result.months} месяца</dt>
              <dd>
                {money(result.lo * result.months)}–{money(result.hi * result.months)} ₽
              </dd>
            </div>
          </dl>
          <HeroLead
            source="estimate"
            service={service}
            cta="Закрепить смету"
            answers={{
              ...Object.fromEntries(calc.steps.map((s, i) => [s.q, result.picks[i]])),
              Смета: `${money(result.lo)}–${money(result.hi)} ₽ / мес, контракт от ${result.months} месяцев`,
            }}
          />
          <button type="button" className={styles.linkBtn} onClick={reset}>
            Пересчитать
          </button>
        </div>
      )}
    </div>
  );
}
