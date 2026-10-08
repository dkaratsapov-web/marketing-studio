"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { TARIFFS } from "@/content/offer";
import styles from "./Contract.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const FINE_POINTER = "(hover: hover) and (pointer: fine)";

/** Мышь с наведением и разрешённая анимация: только тогда включаем кастомный курсор */
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
  const cursor = useRef<HTMLDivElement>(null);
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

  // Курсор догоняет мышь с инерцией
  useEffect(() => {
    if (!fine || !cursor.current) return;
    const el = cursor.current;
    const x = gsap.quickTo(el, "x", { duration: 0.45, ease: "power3.out" });
    const y = gsap.quickTo(el, "y", { duration: 0.45, ease: "power3.out" });
    const onMove = (e: PointerEvent) => {
      x(e.clientX);
      y(e.clientY);
    };
    // Нажатие: курсор пружинит
    const onDown = () => el.setAttribute("data-press", "");
    const onUp = () => el.removeAttribute("data-press");
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [fine]);

  // Открываем строку только от движения мыши, а не когда она «наехала» при прокрутке
  const hoverRow = (i: number, at: number) => {
    if (!fine) return;
    if (at - lastScroll.current < 180) return;
    setOpen(i);
  };

  const onRowClick = (i: number) => {
    if (fine) {
      document.getElementById("brief")?.scrollIntoView({ behavior: "smooth" });
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
          data-cursor={fine || undefined}
          data-has-open={open !== null || undefined}
          onPointerEnter={() => cursor.current?.setAttribute("data-on", "")}
          onPointerLeave={() => {
            cursor.current?.removeAttribute("data-on");
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
                        <a href="#brief" className="btn btn--primary">
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
      </div>

      {fine ? (
        <div
          ref={cursor}
          className={styles.cursor}
          data-active={open !== null || undefined}
          aria-hidden="true"
        >
          <span className={styles.cursorBody}>
            {/* Кольцо с бегущей по кругу надписью */}
            <svg className={styles.cursorRing} viewBox="0 0 120 120">
              <defs>
                <path
                  id="cursor-circle"
                  d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0"
                />
              </defs>
              <circle cx="60" cy="60" r="57" className={styles.cursorOrbit} />
              <text className={styles.cursorLabel}>
                <textPath href="#cursor-circle" textLength="285">
                  Обсудить проект • Обсудить проект •
                </textPath>
              </text>
            </svg>
            {/* Ядро со стрелкой */}
            <span className={styles.cursorCore}>
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 17 17 7M9 7h8v8"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </span>
          </span>
        </div>
      ) : null}
    </section>
  );
}
