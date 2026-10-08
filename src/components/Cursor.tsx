"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import styles from "./Cursor.module.css";

const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const INTERACTIVE = "a, button, [role='button'], label, summary";
const TEXT_INPUT =
  "input:not([type='checkbox']):not([type='radio']), textarea, select";

/** Мышь с наведением и разрешённая анимация: только тогда включаем свой курсор */
function useCustomCursor() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(FINE_POINTER);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () =>
      window.matchMedia(FINE_POINTER).matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

type Mode = "default" | "link" | "label" | "text";

/**
 * Курсор сайта. Режимы:
 *  default — точка и кольцо с инерцией, цвет по поверхности под курсором;
 *  link    — над ссылками и кнопками кольцо раскрывается в салатовый круг;
 *  label   — над элементом с data-cursor-label кольцо становится значком
 *            с бегущей по кругу надписью и стрелкой в ядре;
 *  text    — над полями ввода свой курсор прячется, работает системный.
 */
export default function Cursor() {
  const enabled = useCustomCursor();
  const root = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const textPath = useRef<SVGTextPathElement>(null);

  useEffect(() => {
    if (!enabled || !root.current || !ring.current || !dot.current) return;
    const el = root.current;
    document.documentElement.classList.add("has-cursor");

    const ringX = gsap.quickTo(ring.current, "x", {
      duration: 0.38,
      ease: "power3.out",
    });
    const ringY = gsap.quickTo(ring.current, "y", {
      duration: 0.38,
      ease: "power3.out",
    });
    const dotX = gsap.quickTo(dot.current, "x", {
      duration: 0.08,
      ease: "power2.out",
    });
    const dotY = gsap.quickTo(dot.current, "y", {
      duration: 0.08,
      ease: "power2.out",
    });

    let mode: Mode = "default";
    let label = "";
    let raf = 0;
    let lastX = 0;
    let lastY = 0;

    const setMode = (next: Mode, nextLabel = "") => {
      if (next === mode && nextLabel === label) return;
      mode = next;
      label = nextLabel;
      el.dataset.mode = next;
      if (next === "label" && textPath.current) {
        textPath.current.textContent = `${nextLabel} • ${nextLabel} • `;
      }
    };

    // Поверхность под курсором: тёмная или светлая секция
    const sampleSurface = () => {
      raf = 0;
      const under = document.elementFromPoint(lastX, lastY);
      const surface =
        under?.closest<HTMLElement>("[data-surface]")?.dataset.surface ??
        "dark";
      if (el.dataset.surface !== surface) el.dataset.surface = surface;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      lastX = e.clientX;
      lastY = e.clientY;
      ringX(lastX);
      ringY(lastY);
      dotX(lastX);
      dotY(lastY);
      el.dataset.visible = "true";
      if (!raf) raf = requestAnimationFrame(sampleSurface);
    };

    const onOver = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t) return;
      const labelled = t.closest<HTMLElement>("[data-cursor-label]");
      if (labelled) return setMode("label", labelled.dataset.cursorLabel ?? "");
      if (t.closest(TEXT_INPUT)) return setMode("text");
      if (t.closest(INTERACTIVE)) return setMode("link");
      setMode("default");
    };

    const onDown = () => (el.dataset.press = "true");
    const onUp = () => delete el.dataset.press;
    const onLeave = () => (el.dataset.visible = "false");

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.documentElement.addEventListener("pointerleave", onLeave);
    // Прокрутка меняет то, что под курсором, даже если мышь стоит
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(sampleSurface);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={root}
      className={styles.cursor}
      data-mode="default"
      data-surface="dark"
      data-visible="false"
      aria-hidden="true"
    >
      <div ref={ring} className={styles.ring}>
        <div className={styles.ringBody}>
          <svg className={styles.badge} viewBox="0 0 120 120">
            <defs>
              <path
                id="site-cursor-circle"
                d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0"
              />
            </defs>
            <circle cx="60" cy="60" r="57" className={styles.orbit} />
            <text className={styles.label}>
              <textPath
                ref={textPath}
                href="#site-cursor-circle"
                textLength="285"
                lengthAdjust="spacing"
              />
            </text>
          </svg>
          <span className={styles.core}>
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M7 17 17 7M9 7h8v8"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </span>
        </div>
      </div>
      <div ref={dot} className={styles.dot}>
        <span className={styles.dotInner} />
      </div>
    </div>
  );
}
