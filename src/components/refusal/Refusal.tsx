"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { REFUSALS } from "@/content/offer";
import { LogoMark } from "@/components/Logo";
import styles from "./Refusal.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Штрихкод пропуска: детерминированный узор ширин полос
const BARCODE = "3121412213114123211241321231142113212413"
  .split("")
  .map(Number);

const plural = (n: number) =>
  n === 1 ? "причина" : n >= 2 && n <= 4 ? "причины" : "причин";

/**
 * «Пропуск в Корпорацию»: посетитель отмечает условия про себя,
 * пропуск справа сразу показывает вердикт. Ничего не отмечено — допущен,
 * любое условие — на пропуск падает печать «Отказано».
 */
export default function Refusal() {
  const root = useRef<HTMLElement>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const denied = checked.size > 0;
  const budgetCase = checked.has(0);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      // Пропуск «сканируется» при появлении: луч проходит сверху вниз
      ScrollTrigger.create({
        trigger: `.${styles.passWrap}`,
        start: "top 75%",
        once: true,
        onEnter: () =>
          root.current
            ?.querySelector(`.${styles.passWrap}`)
            ?.setAttribute("data-scan", ""),
      });
    },
    { scope: root },
  );

  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <section
      ref={root}
      id="refuse"
      className={styles.refusal}
      data-surface="light"
    >
      <div className={`wrap ${styles.layout}`}>
        <header className={styles.head}>
          <h2 className={styles.heading}>Когда мы откажем</h2>
          <p className={styles.lead}>
            Дешевле сказать это на первом созвоне, чем через три месяца
            объяснять, почему не сработало. Проверьте себя до брифа.
          </p>
        </header>

        <div className={styles.check}>
          <p className="label">Отметьте, что про вас</p>
          <ul className={styles.conditions}>
            {REFUSALS.map((r, i) => {
              const on = checked.has(i);
              return (
                <li
                  key={r.case}
                  className={styles.condition}
                  data-on={on || undefined}
                >
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    className={styles.switchRow}
                    onClick={() => toggle(i)}
                  >
                    <span className={styles.switch} aria-hidden="true">
                      <span className={styles.knob} />
                    </span>
                    <span className={styles.statement}>{r.case}</span>
                  </button>
                  <div className={styles.reasonWrap}>
                    <div className={styles.reasonInner}>
                      <p className={styles.reason}>{r.reason}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={styles.passWrap}>
          {/* key меняется только при смене вердикта: печать и «вздрагивание» играют один раз, дальше обновляется лишь число причин */}
          <div
            key={denied ? "denied" : "ok"}
            className={styles.pass}
            data-surface="dark"
            data-denied={denied || undefined}
            role="status"
            aria-live="polite"
          >
            <span className={styles.slot} aria-hidden="true" />
            <div className={styles.passTop}>
              <LogoMark className={styles.passMark} />
              <span className="label">Корпорация / Пропуск</span>
            </div>

            <div className={styles.verdict}>
              <span className={styles.verdictOk}>Допущен</span>
              <span className={styles.stamp}>Отказано</span>
            </div>

            <p className={styles.passNote}>
              {denied
                ? `${checked.size} ${plural(checked.size)} для отказа. Лучше узнать это сейчас.`
                : "Можно отправлять бриф. Ответим в течение часа в рабочее время."}
            </p>
            {budgetCase ? (
              <p className={styles.alt}>{REFUSALS[0].alt}</p>
            ) : null}

            {denied ? null : (
              <a href="#brief" className={`btn btn--primary ${styles.passCta}`}>
                Отправить бриф
              </a>
            )}

            <div className={styles.barcode} aria-hidden="true">
              {BARCODE.map((w, i) => (
                <span
                  key={i}
                  style={{ flexGrow: w }}
                  data-gap={i % 2 === 1 || undefined}
                />
              ))}
            </div>
          </div>
          <span className={styles.scan} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
