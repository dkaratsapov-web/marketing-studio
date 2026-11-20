"use client";

import { useEffect, useRef, useState } from "react";
import { lenisRef } from "@/components/SmoothScroll";
import styles from "./CaseRail.module.css";

type Point = { el: HTMLElement; label: string };

/** Вид рейки под тему дела: чертёж, этажи здания, дорога, точки iOS, звуковая волна */
export type RailVariant = "ruler" | "floors" | "road" | "dots" | "wave";

/** Длины засечек звуковой волны, повторяются по кругу */
const WAVE = [0.9, 1.7, 1.1, 2.1, 1.3, 0.8, 1.9, 1.2, 2, 1, 1.5, 0.7];

/**
 * Рейка справа на страницах кейсов: засечка на каждый блок, между ними мелкие деления,
 * нитка показывает, сколько прочитано. Блоки рейка находит сама: первый экран и стыки `Seam`
 * с их подписями, поэтому работает на любом деле без списка. Засечка текущего блока длиннее
 * и подписана, при наведении раскрываются все подписи, клик ведёт к блоку. Цвета подстраиваются
 * под тёмную или светлую секцию, которая сейчас под рейкой.
 */
export default function CaseRail({ first = "Начало", variant = "ruler" }: { first?: string; variant?: RailVariant }) {
  const rail = useRef<HTMLElement>(null);
  const points = useRef<Point[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [surface, setSurface] = useState<"dark" | "light">("dark");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const hero = main.querySelector<HTMLElement>("#top") ?? main.querySelector<HTMLElement>("section");
    const seams = [...main.querySelectorAll<HTMLElement>("[data-seam]")].filter((s) => s.dataset.seam);
    points.current = [...(hero ? [{ el: hero, label: first }] : []), ...seams.map((el) => ({ el, label: el.dataset.seam! }))];
    setLabels(points.current.map((p) => p.label));

    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.45;
      let idx = 0;
      points.current.forEach((p, i) => {
        if (p.el.getBoundingClientRect().top <= line) idx = i;
      });
      setActive(idx);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
      const r = rail.current?.getBoundingClientRect();
      if (r && rail.current) {
        // Какая секция под серединой рейки: саму рейку на миг убираем из-под точки
        rail.current.style.visibility = "hidden";
        const under = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest<HTMLElement>("[data-surface]");
        rail.current.style.visibility = "";
        setSurface(under?.dataset.surface === "light" ? "light" : "dark");
      }
    };
    const onScroll = () => (raf ||= requestAnimationFrame(update));
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [first]);

  const go = (i: number) => {
    const p = points.current[i];
    if (!p) return;
    // К блоку после стыка: стык почти уходит вверх, под шапкой видно начало раздела
    const r = p.el.getBoundingClientRect();
    const y = i === 0 ? 0 : r.top + window.scrollY + r.height - 90;
    if (lenisRef.current) lenisRef.current.scrollTo(y, { duration: 1.2 });
    else window.scrollTo({ top: y, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  // Элемент рейки есть с первой отрисовки: если вставить его позже, React наткнётся на
  // обёртку, которой GSAP окружает закреплённый первый экран, и страница упадёт
  return (
    <nav ref={rail} hidden={labels.length < 2} className={styles.rail} data-theme={surface} data-variant={variant} aria-label="Блоки кейса" style={{ "--p": progress } as React.CSSProperties}>
      <span className={styles.thread} aria-hidden="true" />
      <ol className={styles.list}>
        {labels.map((label, i) => (
          <li
            key={`${label}-${i}`}
            className={styles.item}
            data-on={i === active || undefined}
            data-past={i < active || undefined}
            style={{ "--i": i, "--w": `${WAVE[i % WAVE.length]}rem` } as React.CSSProperties}
          >
            <button type="button" className={styles.btn} onClick={() => go(i)} aria-current={i === active ? "location" : undefined}>
              <span className={styles.label}>
                <span className={styles.num}>{String(i + 1).padStart(2, "0")}</span>
                {label}
              </span>
              <span className={styles.tick} aria-hidden="true" />
            </button>
            {i < labels.length - 1 ? (
              <span className={styles.minor} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
