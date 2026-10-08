"use client";

import { useEffect, useRef } from "react";
import { LogoMark } from "@/components/Logo";
import styles from "./TypedQuote.module.css";

type Props = { text: string; author: string; role: string };

// Пауза после знака: на точках и запятых «рука» задерживается, как при живом наборе
const pauseAfter = (ch: string) =>
  ch === "." || ch === "?" || ch === "!" ? 320 : ch === "," || ch === ":" ? 160 : 0;

/**
 * Прямая речь основателя: текст набирается по буквам с мигающим курсором,
 * когда цитата попадает в экран. Место под текст занято заранее невидимой копией,
 * поэтому вёрстка не прыгает. Скринридер получает фразу целиком сразу.
 */
export default function TypedQuote({ text, author, role }: Props) {
  const root = useRef<HTMLElement>(null);
  const typed = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    const out = typed.current;
    if (!el || !out) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      out.textContent = text;
      el.dataset.state = "done";
      return;
    }

    let timer = 0;
    let i = 0;
    const tick = () => {
      i += 1;
      out.textContent = text.slice(0, i);
      if (i >= text.length) {
        el.dataset.state = "done";
        return;
      }
      // Небольшой детерминированный разброс темпа: набор не звучит как метроном
      const jitter = ((i * 37) % 11) * 3;
      timer = window.setTimeout(tick, 26 + jitter + pauseAfter(text[i - 1]));
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        el.dataset.state = "typing";
        timer = window.setTimeout(tick, 450);
      },
      { rootMargin: "0px 0px -25% 0px" },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [text]);

  return (
    <figure ref={root} className={styles.quote} data-state="idle">
      <p className="label">Прямая речь</p>
      <blockquote className={styles.body}>
        <p className={styles.text}>
          <span className={styles.ghost} aria-hidden="true">
            «{text}»
          </span>
          <span className={styles.live} aria-hidden="true">
            «<span ref={typed} />
            <span className={styles.caret} />
            <span className={styles.close}>»</span>
          </span>
          <span className="visually-hidden">«{text}»</span>
        </p>
      </blockquote>
      <figcaption className={styles.author}>
        <span className={styles.seam} aria-hidden="true" />
        <span className={styles.who}>
          <span className={styles.name}>{author}</span>
          <span className={styles.role}>{role}</span>
        </span>
        <LogoMark className={styles.sign} />
      </figcaption>
    </figure>
  );
}
