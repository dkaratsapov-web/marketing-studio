"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { CONTEXT } from "@/content/services";
import styles from "./MinusWords.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { minus: (typeof CONTEXT)["minus"] };

function plural(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "запрос";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "запроса";
  return "запросов";
}

/**
 * «Найдите мусорные запросы». Человек сам отмечает запросы, за которые не стоит платить:
 * минус-слово подсвечивается и улетает чипом в список справа (на телефоне список прилипает сверху),
 * счётчик растёт. Целевой запрос не вычёркивается: под ним появляется «это покупатель».
 * Пример настоящий по смыслу: реклама магазина техники Apple в Твери (дело 010).
 */
export default function MinusWords({ minus }: Props) {
  const root = useRef<HTMLElement>(null);
  const [found, setFound] = useState<number[]>([]);
  const [kept, setKept] = useState<number[]>([]);
  // Откуда летит чип: координаты минус-слова в строке на момент клика
  const pending = useRef(new Map<number, { rect: DOMRect; delay: number }>());
  const total = minus.queries.filter((q) => q.minus).length;
  const done = found.length === total;

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(`.${styles.row}`, {
        y: 24,
        autoAlpha: 0,
        duration: 0.7,
        stagger: 0.06,
        ease: "power3.out",
        scrollTrigger: { trigger: `.${styles.list}`, start: "top 80%", once: true },
      });
    },
    { scope: root },
  );

  useLayoutEffect(() => {
    const section = root.current;
    if (!section || pending.current.size === 0) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    pending.current.forEach(({ rect, delay }, i) => {
      const chip = section.querySelector<HTMLElement>(`[data-chip="${i}"]`);
      if (!chip || reduce) return;
      const to = chip.getBoundingClientRect();
      gsap.fromTo(
        chip,
        { x: rect.left - to.left, y: rect.top - to.top, autoAlpha: 0.9 },
        { x: 0, y: 0, autoAlpha: 1, duration: 0.8, delay, ease: "power3.inOut" },
      );
      gsap.fromTo(chip, { "--flash": 1 }, { "--flash": 0, duration: 0.6, delay: delay + 0.75, ease: "power2.out" });
    });
    pending.current.clear();
  }, [found]);

  const wordRect = (i: number) =>
    root.current!.querySelector<HTMLElement>(`[data-word="${i}"]`)!.getBoundingClientRect();

  const toggle = (i: number) => {
    const q = minus.queries[i];
    if (!q.minus) {
      setKept((k) => (k.includes(i) ? k : [...k, i]));
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const row = root.current!.querySelector(`[data-row="${i}"]`);
        gsap.fromTo(row, { x: 0 }, { keyframes: { x: [0, -7, 6, -3, 0] }, duration: 0.45, ease: "power2.out" });
      }
      return;
    }
    if (found.includes(i)) {
      setFound((f) => f.filter((x) => x !== i));
      return;
    }
    pending.current.set(i, { rect: wordRect(i), delay: 0 });
    setFound((f) => [...f, i]);
  };

  const showAll = () => {
    const rest = minus.queries.map((q, i) => (q.minus && !found.includes(i) ? i : -1)).filter((i) => i >= 0);
    rest.forEach((i, n) => pending.current.set(i, { rect: wordRect(i), delay: n * 0.12 }));
    setFound((f) => [...f, ...rest]);
  };

  const reset = () => {
    setFound([]);
    setKept([]);
  };

  const status = done
    ? `Все ${total} мусорных ${plural(total)} найдены`
    : `Найдено ${found.length} из ${total}`;

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="minus-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <p className="label">{minus.label}</p>
          <h2 id="minus-title" className={styles.title}>
            {minus.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{minus.lead}</p>
        </header>

        <div className={styles.body}>
          <aside className={styles.panel} aria-label="Список минус-слов">
            <div className={styles.panelHead}>
              <p className={styles.panelLabel}>
                Минус-слова<br />
                iPhone 15, Тверь
              </p>
              <p className={styles.counter}>
                <span className={styles.counterValue}>{found.length}</span>
                <span className={styles.counterTotal}>/ {total}</span>
              </p>
            </div>
            <ul className={styles.chips}>
              {found.length === 0 ? <li className={styles.empty}>Пока пусто. Отметьте лишний запрос.</li> : null}
              {found.map((i) => (
                <li key={i} className={styles.chip} data-chip={i}>
                  −{minus.queries[i].minus}
                </li>
              ))}
            </ul>
            <div className={styles.panelFoot}>
              {done ? (
                <>
                  <p className={styles.done}>{minus.done}</p>
                  <button type="button" className={styles.linkBtn} onClick={reset}>
                    Начать заново
                  </button>
                </>
              ) : (
                <button type="button" className={styles.linkBtn} onClick={showAll}>
                  Показать все
                </button>
              )}
            </div>
          </aside>

          <ul className={styles.list}>
            {minus.queries.map((q, i) => {
              const isFound = found.includes(i);
              const isKept = kept.includes(i);
              const [before, after] = q.minus ? q.q.split(q.minus) : [q.q, ""];
              return (
                <li key={q.q} className={styles.row} data-row={i}>
                  <button
                    type="button"
                    className={styles.query}
                    aria-pressed={q.minus ? isFound : undefined}
                    data-state={isFound ? "found" : isKept ? "kept" : undefined}
                    onClick={() => toggle(i)}
                  >
                    <span className={styles.loupe} aria-hidden="true" />
                    <span className={styles.qText}>
                      {before}
                      {q.minus ? (
                        <span className={styles.word} data-word={i}>
                          {q.minus}
                        </span>
                      ) : null}
                      {after}
                    </span>
                    <span className={styles.tag} aria-hidden="true">
                      {isFound ? `−${q.minus}` : isKept ? "оставляем" : "отметить"}
                    </span>
                  </button>
                  {isKept ? <p className={styles.keep}>{minus.keep}</p> : null}
                </li>
              );
            })}
          </ul>
        </div>

        <p className="visually-hidden" aria-live="polite">
          {status}
        </p>
      </div>
    </section>
  );
}
