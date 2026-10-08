"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { TARIFFS } from "@/content/offer";
import { openBrief } from "@/components/brief/briefBus";
import TypedQuote from "./TypedQuote";
import styles from "./Contract.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const FINE_POINTER = "(hover: hover) and (pointer: fine)";

/** Мышь с наведением: строки раскрываются наведением, клик ведёт к брифу */
function useFinePointer() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(FINE_POINTER);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () =>
      window.matchMedia(FINE_POINTER).matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export default function Contract() {
  const root = useRef<HTMLElement>(null);
  const lastScroll = useRef(0);
  const [open, setOpen] = useState<number | null>(null);

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

  const fine = useFinePointer();

  // Время последней прокрутки: чтобы строка не открывалась, когда «наехала» под неподвижную мышь
  useEffect(() => {
    const onScroll = (e: Event) => (lastScroll.current = e.timeStamp);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Открываем строку только от движения мыши, а не когда она «наехала» при прокрутке
  const hoverRow = (i: number, at: number) => {
    if (!fine) return;
    if (at - lastScroll.current < 180) return;
    setOpen(i);
  };

  const onRowClick = (i: number) => {
    if (fine) {
      openBrief(TARIFFS[i].name);
      return;
    }
    setOpen((cur) => (cur === i ? null : i));
  };

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

        <ul
          className={styles.table}
          data-has-open={open !== null || undefined}
          onPointerLeave={() => {
            if (fine) setOpen(null);
          }}
        >
          {TARIFFS.map((t, i) => {
            const isOpen = open === i;
            return (
              <li
                key={t.name}
                className={styles.row}
                data-flagship={t.flagship || undefined}
                data-open={isOpen || undefined}
                data-cursor-label="Обсудить проект"
                onPointerMove={(e) => !isOpen && hoverRow(i, e.timeStamp)}
              >
                <button
                  type="button"
                  className={styles.rowHead}
                  aria-expanded={isOpen}
                  aria-controls={`tariff-${i}`}
                  onClick={() => onRowClick(i)}
                  onFocus={() => setOpen(i)}
                >
                  <span className={styles.what}>
                    <span className={styles.name}>{t.name}</span>
                    <span className={styles.tools}>{t.tools}</span>
                  </span>
                  <span className={`label ${styles.launch}`}>{t.launch}</span>
                  <span className={styles.price}>
                    <span className={styles.amount}>{t.price}</span>
                    <span className={styles.unit}>{t.unit}</span>
                  </span>
                </button>

                <div
                  id={`tariff-${i}`}
                  className={styles.details}
                  role="region"
                  aria-label={t.name}
                >
                  <div className={styles.detailsInner}>
                    <div className={styles.card}>
                      <div className={styles.includes}>
                        <p className="label">Что входит</p>
                        <ol className={styles.includeList}>
                          {t.includes.map((item, k) => (
                            <li
                              key={item}
                              style={{ "--k": k } as React.CSSProperties}
                            >
                              {item}
                            </li>
                          ))}
                        </ol>
                      </div>
                      <div className={styles.side}>
                        <p className="label">На выходе</p>
                        <p className={styles.outcome}>{t.outcome}</p>
                        <a
                          href="#brief"
                          data-service={t.name}
                          className="btn btn--primary"
                        >
                          Обсудить
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className={styles.budget}>
          <p className={styles.budgetValue}>от 50 000 ₽</p>
          <p className={styles.budgetText}>
            Минимальный рекламный бюджет в месяц. Он идёт в рекламные кабинеты и
            оплачивается отдельно от нашей работы. Ниже этой суммы алгоритмы не
            набирают данных для обучения.
          </p>
        </aside>

        <TypedQuote
          text="Закинуть 10к и посмотреть, сколько с них будет заявок: к сожалению, так не работает. Поэтому, пожалуйста, давайте не будем тратить наше и Ваше время :)"
          author="Даниил Карацапов"
          role="Основатель Корпорации"
        />
      </div>
    </section>
  );
}
