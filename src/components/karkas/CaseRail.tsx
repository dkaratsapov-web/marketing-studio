"use client";

import { useEffect, useRef, useState } from "react";
import { lenisRef } from "@/components/SmoothScroll";
import styles from "./CaseRail.module.css";

type Item = { id: string; label: string };

/**
 * Размерная рейка справа: засечка на каждый блок дела, между ними мелкие деления,
 * салатовая нитка показывает, сколько прочитано. Засечка текущего блока длиннее и подписана,
 * при наведении раскрываются все подписи. Клик ведёт к блоку. Цвета подстраиваются
 * под тёмную или светлую секцию, которая сейчас под рейкой.
 */
export default function CaseRail({ items }: { items: Item[] }) {
  const rail = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [surface, setSurface] = useState<"dark" | "light">("dark");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.4;
      let idx = 0;
      items.forEach((it, i) => {
        const el = document.getElementById(it.id);
        if (el && el.getBoundingClientRect().top <= line) idx = i;
      });
      setActive(idx);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
      const r = rail.current?.getBoundingClientRect();
      if (r) {
        // Какая секция под серединой рейки: рейку на время прячем от elementFromPoint
        rail.current!.style.pointerEvents = "none";
        const under = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest<HTMLElement>("[data-surface]");
        rail.current!.style.pointerEvents = "";
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
  }, [items]);

  const go = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - (id === "top" ? 0 : 110);
    if (lenisRef.current) lenisRef.current.scrollTo(y, { duration: 1.2 });
    else window.scrollTo({ top: y, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return (
    <nav ref={rail} className={styles.rail} data-theme={surface} aria-label="Блоки кейса" style={{ "--p": progress } as React.CSSProperties}>
      <span className={styles.thread} aria-hidden="true" />
      <ol className={styles.list}>
        {items.map((it, i) => (
          <li key={it.id} className={styles.item} data-on={i === active || undefined} data-past={i < active || undefined} style={{ "--i": i } as React.CSSProperties}>
            <button type="button" className={styles.btn} onClick={() => go(it.id)} aria-current={i === active ? "location" : undefined}>
              <span className={styles.label}>
                <span className={styles.num}>{String(i + 1).padStart(2, "0")}</span>
                {it.label}
              </span>
              <span className={styles.tick} aria-hidden="true" />
            </button>
            {i < items.length - 1 ? (
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
