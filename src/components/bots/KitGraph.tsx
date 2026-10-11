"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { BOTS } from "@/content/bots";
import styles from "./KitGraph.module.css";

type Data = (typeof BOTS)["kit"];

/** Узлы по шестиугольнику вокруг бота: координаты в процентах от квадрата схемы */
const R = 37;
const POS = Array.from({ length: 6 }, (_, i) => {
  const a = ((-90 + i * 60) * Math.PI) / 180;
  return { x: 50 + R * Math.cos(a), y: 50 + R * Math.sin(a) };
});

/** Ссылка на дело из строки доказательства: «Дело 010: …» */
const CASE_HREF: Record<string, string> = { "010": "/kejsy/ipapa/", "023": "/kejsy/diauto69/", "024": "/kejsy/sara/" };

/**
 * Что собираем: бот в центре, вокруг шесть модулей. Линии вытягиваются из бота, когда
 * схема попадает в экран. Нажатый узел подключается: по его линии бегут пакеты данных,
 * а слева открывается, что это и в каком деле уже работает.
 */
export default function KitGraph({ data }: { data: Data }) {
  const [active, setActive] = useState(0);
  const [on, setOn] = useState(false);
  const map = useRef<HTMLDivElement>(null);
  const node = data.nodes[active];
  const code = node.proof.match(/Дело (\d{3})/)?.[1];

  useEffect(() => {
    const el = map.current;
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

  return (
    <section className={styles.section} data-surface="light" aria-labelledby="kit-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="kit-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <article key={node.key} className={styles.card} aria-live="polite">
          <h3 className={styles.cardName}>{node.name}</h3>
          <p className={styles.cardText}>{node.text}</p>
          <p className={styles.proof}>
            {code && CASE_HREF[code] ? <Link href={CASE_HREF[code]}>{node.proof}</Link> : node.proof}
          </p>
        </article>

        <div ref={map} className={styles.map} data-on={on || undefined}>
          <svg className={styles.lines} viewBox="0 0 100 100" aria-hidden="true">
            {POS.map((p, i) => (
              <g key={i} data-active={i === active || undefined} style={{ "--i": i } as React.CSSProperties}>
                <line className={styles.wire} x1="50" y1="50" x2={p.x} y2={p.y} pathLength={1} />
                <line className={styles.packets} x1="50" y1="50" x2={p.x} y2={p.y} pathLength={1} />
              </g>
            ))}
          </svg>

          <div className={styles.core} aria-hidden="true">
            <span>{data.center}</span>
          </div>

          <ul className={styles.nodes} aria-label="Модули бота">
            {data.nodes.map((n, i) => (
              <li key={n.key} style={{ "--x": `${POS[i].x}%`, "--y": `${POS[i].y}%`, "--i": i } as React.CSSProperties}>
                <button type="button" className={styles.node} aria-pressed={i === active} onClick={() => setActive(i)}>
                  {n.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
