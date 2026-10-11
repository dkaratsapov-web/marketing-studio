"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { AVTO } from "@/content/avtobiznes";
import styles from "./Showroom.module.css";

type Data = (typeof AVTO)["showroom"];

/**
 * Шоурум: настоящие экраны системы из дела 023 стоят на подиуме, как машины в салоне.
 * Листается только стрелками, свайпом и клавишами ← →: подиум разворачивается, экран уходит
 * поворотом в сторону листания и выходит следующий. Сцена фиксированной высоты, экран любой
 * формы (сайт, телефон, широкая доска) вписывается в неё, поэтому блок не прыгает.
 */
export default function Showroom({ data }: { data: Data }) {
  const [on, setOn] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const startX = useRef<number | null>(null);
  const s = data.slides[on];
  const n = data.slides.length;

  const go = (d: 1 | -1) => {
    setDir(d);
    setOn((i) => (i + d + n) % n);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
    else return;
    e.preventDefault();
  };

  // Свайп по сцене: на телефоне листать пальцем привычнее, чем попадать в кнопки
  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") startX.current = e.clientX;
  };
  const onUp = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  };

  return (
    <section className={styles.section} data-surface="dark" aria-labelledby="showroom-title">
      <div className="wrap">
        <header className={styles.head}>
          <h2 id="showroom-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.stage} role="group" aria-roledescription="карусель" aria-label="Экраны системы" onKeyDown={onKey}>
          <div className={styles.spot} aria-hidden="true" />
          <div className={styles.screen} onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => (startX.current = null)}>
            <figure key={s.key} className={styles.exhibit} data-kind={s.kind} data-dir={dir}>
              <div className={styles.frame}>
                {s.kind !== "phone" ? (
                  <span className={styles.chrome} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : null}
                <div className={styles.view}>
                  <Image src={s.img} alt={s.alt} className={styles.img} sizes="(max-width: 960px) 92vw, 58rem" draggable={false} />
                </div>
              </div>
            </figure>
            <span className={styles.podium} aria-hidden="true" />
          </div>

          <button type="button" className={styles.arrow} data-dir="prev" aria-label="Предыдущий экран" onClick={() => go(-1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 12H5M11 5l-7 7 7 7" />
            </svg>
          </button>
          <button type="button" className={styles.arrow} data-dir="next" aria-label="Следующий экран" onClick={() => go(1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12h15M13 5l7 7-7 7" />
            </svg>
          </button>

          <div className={styles.meta}>
            <p className={styles.count} aria-live="polite">
              <b>{String(on + 1).padStart(2, "0")}</b>
              <span> / {String(n).padStart(2, "0")}</span>
              <span className="visually-hidden">: {s.name}</span>
            </p>
            <ol className={styles.progress} aria-hidden="true">
              {data.slides.map((x, i) => (
                <li key={x.key} data-on={i === on || undefined} data-done={i < on || undefined} />
              ))}
            </ol>
            {/* Все подписи в одной ячейке: высоту задаёт самая длинная, блок не прыгает */}
            <div className={styles.captions}>
              {data.slides.map((x, i) => (
                <div key={x.key} className={styles.caption} data-on={i === on || undefined} aria-hidden={i !== on}>
                  <b>{x.name}</b>
                  <span>{x.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className={styles.note}>{data.note}</p>
      </div>
    </section>
  );
}
