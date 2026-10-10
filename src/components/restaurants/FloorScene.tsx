"use client";

import { forwardRef } from "react";
import { gsap } from "gsap";
import type { RESTAURANTS } from "@/content/restaurants";
import styles from "./FloorScene.module.css";

type Floor = (typeof RESTAURANTS)["floor"];

/** Столы зала: круглые на двоих-четверых и прямоугольные банкетные, координаты схемы 600×420 */
const TABLES: { x: number; y: number; kind: "round" | "long"; seats: number }[] = [
  { x: 110, y: 120, kind: "round", seats: 4 },
  { x: 220, y: 120, kind: "round", seats: 4 },
  { x: 330, y: 120, kind: "round", seats: 2 },
  { x: 110, y: 230, kind: "round", seats: 2 },
  { x: 220, y: 230, kind: "round", seats: 4 },
  { x: 330, y: 230, kind: "round", seats: 4 },
  { x: 110, y: 335, kind: "round", seats: 4 },
  { x: 220, y: 335, kind: "round", seats: 2 },
  { x: 330, y: 335, kind: "round", seats: 4 },
  { x: 485, y: 115, kind: "long", seats: 6 },
  { x: 485, y: 230, kind: "long", seats: 6 },
  { x: 485, y: 345, kind: "round", seats: 2 },
];
/** Порядок, в котором столы бронируются за вечер: вразброс, а не рядами */
const ORDER = [4, 9, 1, 6, 11, 2, 7, 0, 10, 5, 3];

/**
 * Шаги сцены: часы идут с 18:00 до 22:00, столы на схеме один за другим загораются
 * салатовым с меткой «бронь», счётчик занятых столов растёт. Состояние считается
 * из прогресса, поэтому сцену можно и проигрывать, и вести скроллом в обе стороны.
 */
export function addFloorSteps(tl: gsap.core.Timeline, root: HTMLElement) {
  const tables = root.querySelectorAll<SVGGElement>("[data-table]");
  const clock = root.querySelector<HTMLElement>("[data-clock]")!;
  const count = root.querySelector<HTMLElement>("[data-count]")!;
  const v = { p: 0 };
  const sync = () => {
    const minutes = Math.round(v.p * 240);
    clock.textContent = `${18 + Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0").replace(/\d$/, "0")}`;
    const booked = Math.floor(v.p * (ORDER.length + 0.999));
    tables.forEach((t, i) => {
      const at = ORDER.indexOf(i);
      t.toggleAttribute("data-on", at >= 0 && at < booked);
    });
    count.textContent = String(Math.min(booked, ORDER.length));
  };
  tl.set(v, { p: 0, onComplete: sync }).to(v, { p: 1, duration: 3.2, ease: "none", onUpdate: sync });
  return tl;
}

/** Схема зала: стены, бар, вход и столы со стульями */
const FloorScene = forwardRef<HTMLDivElement, { floor: Floor }>(function FloorScene({ floor }, ref) {
  return (
    <div ref={ref} className={styles.scene} aria-hidden="true">
      <div className={styles.bar}>
        <span className={styles.clock}>
          <span className={styles.dot} />
          <span data-clock>{floor.from}</span>
        </span>
        <span className={styles.counter}>
          {floor.label}{" "}
          <b>
            <span data-count>0</span> / {TABLES.length}
          </b>
        </span>
      </div>
      <svg viewBox="0 0 600 420" className={styles.svg}>
        <rect x="8" y="8" width="584" height="404" rx="14" className={styles.wall} />
        <rect x="30" y="30" width="18" height="360" rx="4" className={styles.counterBar} />
        <path d="M250 412 v-12 a40 40 0 0 1 80 0 v12" className={styles.door} />
        {TABLES.map((t, i) => {
          const chairs = Array.from({ length: t.seats }, (_, k) => {
            if (t.kind === "long") {
              const side = k % 2 ? 1 : -1;
              const col = Math.floor(k / 2);
              return { cx: t.x - 34 + col * 34, cy: t.y + side * 30 };
            }
            const a = (k / t.seats) * Math.PI * 2 + Math.PI / 4;
            return { cx: t.x + Math.cos(a) * 34, cy: t.y + Math.sin(a) * 34 };
          });
          return (
            <g key={i} data-table className={styles.table}>
              {chairs.map((c, k) => (
                <circle key={k} cx={c.cx} cy={c.cy} r="7" className={styles.chair} />
              ))}
              {t.kind === "long" ? (
                <rect x={t.x - 52} y={t.y - 18} width="104" height="36" rx="8" className={styles.top} />
              ) : (
                <circle cx={t.x} cy={t.y} r={t.seats > 2 ? 22 : 17} className={styles.top} />
              )}
              <text x={t.x} y={t.y} className={styles.tag}>
                {floor.booked}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
});

export default FloorScene;
