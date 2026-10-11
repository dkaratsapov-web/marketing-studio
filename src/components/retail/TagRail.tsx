"use client";

import { useEffect, useRef, useState } from "react";
import type { RETAIL } from "@/content/retail";
import styles from "./TagRail.module.css";

type Data = (typeof RETAIL)["rail"];

/**
 * Шесть ценников на рейке. Лицевая сторона: где магазин теряет покупателя. Наведение или
 * нажатие переворачивает ценник: на обороте что делаем и в каком деле это уже работает.
 * Когда рейка въезжает в экран, ценники по очереди повисают и раскачиваются.
 */
export default function TagRail({ data }: { data: Data }) {
  const [flipped, setFlipped] = useState<number[]>([]);
  const [on, setOn] = useState(false);
  const rail = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es[es.length - 1].isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      // Старт, когда верх блока проходит 80% высоты экрана: не зависит от высоты блока на телефоне
      { rootMargin: "0px 0px -20% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggle = (i: number) => setFlipped((f) => (f.includes(i) ? f.filter((x) => x !== i) : [...f, i]));

  return (
    <section className={styles.section} data-surface="light" aria-labelledby="rail-title">
      <div className="wrap">
        <header className={styles.head}>
          <h2 id="rail-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <ul ref={rail} className={styles.rail} data-on={on || undefined}>
          {data.tags.map((t, i) => (
            <li key={t.lose} className={styles.slot} style={{ "--i": i } as React.CSSProperties}>
              <button type="button" className={styles.tag} aria-pressed={flipped.includes(i)} onClick={() => toggle(i)}>
                <span className={styles.inner}>
                  <span className={styles.front}>
                    <span className={styles.hole} aria-hidden="true" />
                    <span className={styles.lose}>{t.lose}</span>
                  </span>
                  <span className={styles.back}>
                    <span className={styles.hole} aria-hidden="true" />
                    <span className={styles.flip}>{data.flip}</span>
                    <span className={styles.fix}>{t.fix}</span>
                    <span className={styles.proof}>{t.proof}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
