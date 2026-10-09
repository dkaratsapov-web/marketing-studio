"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef } from "react";
import styles from "./Lightbox.module.css";

export type Shot = {
  img: StaticImageData;
  alt: string;
  name: string;
  note?: string;
};

type Props = {
  shots: Shot[];
  /** Какой снимок открыт; null — просмотрщик закрыт */
  index: number | null;
  onChange: (i: number | null) => void;
};

/**
 * Снимок дела на весь экран: родной <dialog> (фокус, Esc и затемнение даёт браузер),
 * стрелки листают между снимками, клик по фону закрывает. Снимок показывается целиком,
 * в полную ширину окна, а если он выше экрана, его можно прокрутить.
 */
export default function Lightbox({ shots, index, onChange }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const shot = index === null ? null : shots[index];

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (index !== null && !d.open) d.showModal();
    if (index === null && d.open) d.close();
  }, [index]);

  // Стрелки клавиатуры листают снимки
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onChange((index + 1) % shots.length);
      if (e.key === "ArrowLeft")
        onChange((index - 1 + shots.length) % shots.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, onChange, shots.length]);

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-label={shot ? `Снимок: ${shot.name}` : "Снимок"}
      onClose={() => onChange(null)}
      onClick={(e) => {
        if (e.target === e.currentTarget) onChange(null);
      }}
      data-lenis-prevent
    >
      {shot ? (
        <div className={styles.inner}>
          <div className={styles.bar}>
            <p className={styles.title}>
              <span className={styles.count}>
                {String((index ?? 0) + 1).padStart(2, "0")} /{" "}
                {String(shots.length).padStart(2, "0")}
              </span>
              {shot.name}
            </p>
            <div className={styles.nav}>
              <button
                type="button"
                className={styles.btn}
                onClick={() =>
                  onChange(((index ?? 0) - 1 + shots.length) % shots.length)
                }
                aria-label="Предыдущий снимок"
              >
                ←
              </button>
              <button
                type="button"
                className={styles.btn}
                onClick={() => onChange(((index ?? 0) + 1) % shots.length)}
                aria-label="Следующий снимок"
              >
                →
              </button>
              <button
                type="button"
                className={styles.btn}
                onClick={() => onChange(null)}
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>
          </div>
          <div
            className={styles.scroller}
            data-portrait={shot.img.height > shot.img.width || undefined}
          >
            <Image
              key={shot.name}
              src={shot.img}
              alt={shot.alt}
              sizes="96vw"
              className={styles.img}
            />
          </div>
          {shot.note ? <p className={styles.note}>{shot.note}</p> : null}
        </div>
      ) : null}
    </dialog>
  );
}
