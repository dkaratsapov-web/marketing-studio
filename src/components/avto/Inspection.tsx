"use client";

import { useState } from "react";
import type { AVTO } from "@/content/avtobiznes";
import styles from "./Inspection.module.css";

type Data = (typeof AVTO)["inspect"];

/**
 * Осмотр перед продажей. Машина сверху, на ней пять пульсирующих точек. Выбранную точку
 * освещает лампа осмотра (пятно света переезжает к ней), а справа открывается карточка:
 * неисправность и как её чиним. Точки — кнопки, работают с клавиатуры.
 */
export default function Inspection({ data }: { data: Data }) {
  const [on, setOn] = useState(0);
  const p = data.points[on];

  return (
    <section className={styles.section} data-surface="light" aria-labelledby="inspect-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="inspect-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.bay} style={{ "--x": `${p.x}%`, "--y": `${p.y}%` } as React.CSSProperties}>
          <svg className={styles.car} viewBox="0 0 600 260" aria-hidden="true">
            {/* Колёса */}
            {[
              [130, 28],
              [130, 206],
              [440, 28],
              [440, 206],
            ].map(([x, y]) => (
              <rect key={`${x}-${y}`} x={x - 36} y={y - 12} width="72" height="26" rx="8" className={styles.wheel} />
            ))}
            {/* Кузов */}
            <path d="M48 130C48 66 98 44 178 42L430 40C512 40 560 74 562 130C560 186 512 220 430 220L178 218C98 216 48 194 48 130Z" className={styles.body} />
            {/* Капот, лобовое, крыша, заднее стекло */}
            <path d="M150 62C120 80 112 104 112 130C112 156 120 180 150 198" className={styles.line} />
            <path d="M232 66L210 130L232 194" className={styles.glass} />
            <path d="M232 66C250 56 300 54 330 54L390 56C402 80 406 104 406 130C406 156 402 180 390 204L330 206C300 206 250 204 232 194Z" className={styles.roof} />
            <path d="M390 56L428 74C440 92 444 110 444 130C444 150 440 168 428 186L390 204" className={styles.glass} />
            {/* Зеркала */}
            <path d="M226 46l-14-16h22z M226 214l-14 16h22z" className={styles.mirror} />
          </svg>

          <span className={styles.lamp} aria-hidden="true" />

          {data.points.map((pt, i) => (
            <button
              key={pt.name}
              type="button"
              className={styles.point}
              style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
              data-left={pt.x > 70 || undefined}
              aria-pressed={i === on}
              aria-controls="inspect-card"
              onClick={() => setOn(i)}
            >
              <span className={styles.pointNo}>{i + 1}</span>
              <span className={styles.pointName}>{pt.name}</span>
            </button>
          ))}
          <p className={styles.hint} aria-hidden="true">
            {data.hint}
          </p>
        </div>

        <article id="inspect-card" className={styles.card} aria-live="polite" key={on}>
          <p className={styles.cardNo}>
            Точка {on + 1} из {data.points.length} · {p.name}
          </p>
          <div className={styles.rowBad}>
            <span>Неисправность</span>
            <p>{p.problem}</p>
          </div>
          <div className={styles.rowFix}>
            <span>Чиним</span>
            <p>{p.fix}</p>
          </div>
        </article>
      </div>
    </section>
  );
}
