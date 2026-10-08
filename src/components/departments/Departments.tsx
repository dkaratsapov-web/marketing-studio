"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { DEPARTMENTS } from "@/content/departments";
import styles from "./Departments.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Departments() {
  const root = useRef<HTMLElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const [active, setActive] = useState(0);
  const current = DEPARTMENTS[active];
  const count = DEPARTMENTS.length;

  // Секция закреплена, прогресс скролла выбирает отдел: каждому достаётся равная доля пути
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      root.current!.dataset.pinned = "true";
      trigger.current = ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const i = Math.min(count - 1, Math.floor(self.progress * count));
          setActive((prev) => (prev === i ? prev : i));
        },
      });
      gsap.from(`.${styles.heading}`, {
        yPercent: 30,
        autoAlpha: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 75%", once: true },
      });
    },
    { scope: root },
  );

  // Активная строка подъезжает под заголовок: сдвигаем ленту на высоту свёрнутых строк выше неё
  useEffect(() => {
    const ul = list.current;
    if (!ul || root.current?.dataset.pinned !== "true") return;
    const rows = Array.from(ul.children) as HTMLElement[];
    const offset = rows
      .slice(0, active)
      .reduce(
        (sum, row) =>
          sum + (row.firstElementChild as HTMLElement).offsetHeight + 1,
        0,
      );
    ul.style.transform = `translateY(${-offset}px)`;
  }, [active]);

  // Клик в закреплённом режиме прокручивает к нужной доле секции, без закрепления просто открывает
  const go = (i: number) => {
    const st = trigger.current;
    if (!st) return setActive(i);
    window.scrollTo({
      top: st.start + ((i + 0.5) / count) * (st.end - st.start),
      behavior: "smooth",
    });
  };

  return (
    <section
      ref={root}
      id="departments"
      className={styles.departments}
      data-surface="light"
      style={{ "--count": count } as React.CSSProperties}
    >
      <div className={styles.stage}>
        <div className={`wrap ${styles.grid}`}>
          <header className={styles.head}>
            <p className="label">Кто за что отвечает</p>
            <h2 className={styles.heading}>Отделы</h2>
          </header>

          <div className={styles.viewport}>
            <ul ref={list} className={styles.list}>
              {DEPARTMENTS.map((d, i) => {
                const open = i === active;
                return (
                  <li
                    key={d.name}
                    className={styles.row}
                    data-open={open}
                    data-passed={i < active}
                    data-tone={d.tone}
                  >
                    <button
                      type="button"
                      className={styles.trigger}
                      aria-expanded={open}
                      aria-controls={`dept-${i}`}
                      onClick={() => go(i)}
                    >
                      <span className={`label ${styles.owner}`}>
                        Ведёт {d.head.name.split(" ")[0]}
                      </span>
                      <span className={styles.name}>
                        <span className={styles.nameText}>{d.name}</span>
                      </span>
                    </button>
                    <div
                      id={`dept-${i}`}
                      className={styles.panel}
                      role="region"
                      aria-label={d.name}
                    >
                      <div className={styles.panelInner}>
                        <ul className={styles.services}>
                          {d.services.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                        <p className={styles.outcomeMobile}>
                          <span className="label">На выходе</span>
                          {d.outcome}
                        </p>
                        <p className={styles.headMobile}>
                          <span className="label">Руководитель</span>
                          {d.head.name}, {d.head.role}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <aside className={styles.elevator} aria-live="polite">
            <div className={styles.elevatorBox} data-tone={current.tone}>
              {/* Створки: схлопываются и расходятся при смене отдела */}
              <span key={active} className={styles.doors} aria-hidden="true">
                <span className={styles.door} />
                <span className={styles.door} />
              </span>
              <p className="label">Ведёт отдел «{current.name}»</p>
              <div key={current.id} className={styles.person}>
                <span className={styles.monogram} aria-hidden="true">
                  {current.head.name[0]}
                </span>
                <p className={styles.personText}>
                  <span className={styles.personName}>{current.head.name}</span>
                  <span className={styles.personRole}>{current.head.role}</span>
                </p>
              </div>
              <div className={styles.outcome}>
                <span className="label">На выходе</span>
                <p key={current.id} className={styles.outcomeText}>
                  {current.outcome}
                </p>
                {current.launch ? (
                  <p key={`${current.id}-launch`} className={styles.launch}>
                    {current.launch}
                  </p>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
