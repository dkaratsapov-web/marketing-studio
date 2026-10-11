"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { SARA } from "@/content/sara";
import styles from "./ThemeFan.module.css";

type Data = (typeof SARA)["app"];

/**
 * Мини-приложение веером: в центре текущий экран, по бокам соседние, развёрнутые в глубину.
 * Листается стрелками, свайпом и клавишами ← →. Переключатель темы меняет все экраны
 * со светлой на тёмную и обратно плавным наплывом. Размеры телефонов и подписи постоянные,
 * блок не меняет высоту.
 */
export default function ThemeFan({ data }: { data: Data }) {
  const n = data.screens.length;
  const [on, setOn] = useState(0);
  const [dark, setDark] = useState(false);
  const startX = useRef<number | null>(null);
  const go = (d: number) => setOn((i) => (i + d + n) % n);

  // Кратчайшее смещение экрана от текущего по кругу: −3…3
  const offset = (i: number) => {
    let o = i - on;
    if (o > n / 2) o -= n;
    if (o < -n / 2) o += n;
    return o;
  };

  return (
    <section className={styles.section} data-surface="dark" aria-labelledby="fan-title">
      <div className="wrap">
        <header className={styles.head}>
          <h2 id="fan-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <div className={styles.headSide}>
            <p className={styles.lead}>{data.lead}</p>
            <button type="button" className={styles.theme} role="switch" aria-checked={dark} onClick={() => setDark((d) => !d)}>
              <span className={styles.themeTrack} aria-hidden="true">
                <span className={styles.themeKnob} />
              </span>
              {dark ? "Тёмная тема" : "Светлая тема"}
            </button>
          </div>
        </header>

        <div
          className={styles.stage}
          role="group"
          aria-roledescription="карусель"
          aria-label="Экраны мини-приложения"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(1);
            else if (e.key === "ArrowLeft") go(-1);
            else return;
            e.preventDefault();
          }}
          onPointerDown={(e) => {
            if (e.pointerType !== "mouse") startX.current = e.clientX;
          }}
          onPointerUp={(e) => {
            if (startX.current === null) return;
            const dx = e.clientX - startX.current;
            startX.current = null;
            if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          }}
        >
          <ul className={styles.fan}>
            {data.screens.map((s, i) => {
              const o = offset(i);
              return (
                <li key={s.name} className={styles.phone} style={{ "--o": o, "--a": Math.abs(o) } as React.CSSProperties} data-far={Math.abs(o) > 1 || undefined} aria-hidden={o !== 0}>
                  <span className={styles.screen}>
                    <Image src={s.light} alt={o === 0 ? `Сара: ${s.name.toLowerCase()}, светлая тема` : ""} className={styles.img} sizes="18rem" draggable={false} />
                    <Image src={s.dark} alt="" className={styles.img} data-dark data-on={dark || undefined} sizes="18rem" draggable={false} />
                  </span>
                </li>
              );
            })}
          </ul>

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
        </div>

        <div className={styles.captions} aria-live="polite">
          {data.screens.map((s, i) => (
            <p key={s.name} className={styles.caption} data-on={i === on || undefined} aria-hidden={i !== on}>
              <b>
                {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")} · {s.name}
              </b>
              {s.text}
            </p>
          ))}
        </div>
        <p className={styles.note}>{data.note}</p>
      </div>
    </section>
  );
}
