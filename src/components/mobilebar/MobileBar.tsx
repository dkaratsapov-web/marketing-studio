"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MAX } from "@/content/contacts";
import { METRIKA_ID } from "@/lib/seo";
import { lenisRef } from "@/components/SmoothScroll";
import MaxIcon from "@/components/MaxIcon";
import QuickLead from "@/components/protocol/QuickLead";
import styles from "./MobileBar.module.css";

// На «Спасибо» и в анкете для клиентов кнопки не нужны
const HIDDEN = ["/spasibo", "/brif"];

/**
 * Плавающие кнопки на телефоне: слева MAX, справа «Аудит» — окно с короткой заявкой.
 * Клик по MAX Метрика считает сама (цель messenger_max), открытие окна — цель audit_open.
 */
export default function MobileBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [n, setN] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  const show = () => {
    window.ym?.(METRIKA_ID, "reachGoal", "audit_open");
    setN((x) => x + 1);
    setClosing(false);
    setOpen(true);
  };
  const close = () => {
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
      opener.current?.focus();
    }, 320);
  };

  // Пока окно открыто: страница стоит, Esc закрывает, Tab не выходит из окна
  useEffect(() => {
    if (!open) return;
    lenisRef.current?.stop();
    document.documentElement.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (e.key !== "Tab" || !panel.current) return;
      const items = panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input");
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      lenisRef.current?.start();
    };
  }, [open]);

  if (HIDDEN.some((p) => pathname.startsWith(p))) return null;

  return (
    <>
      <div className={styles.bar} data-mobile-bar>
        <a href={MAX.href} target="_blank" rel="noopener noreferrer" className={styles.max} aria-label="Написать в MAX">
          <MaxIcon className={styles.icon} />
          MAX
        </a>
        <button ref={opener} type="button" className={styles.audit} onClick={show} aria-haspopup="dialog">
          Аудит
        </button>
      </div>

      {open ? (
        <div
          className={styles.overlay}
          data-closing={closing || undefined}
          onMouseDown={(e) => e.target === e.currentTarget && close()}
          data-lenis-prevent
        >
          <div ref={panel} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="audit-title" data-surface="dark">
            <button type="button" className={styles.close} onClick={close} aria-label="Закрыть">
              <span />
              <span />
            </button>
            <h2 id="audit-title" className={styles.title}>
              Записаться на аудит
            </h2>
            <p className={styles.lead}>
              Посмотрим вашу рекламу, сайт и конкурентов и скажем, где теряются заявки. Оставьте телефон: перезвоним и
              договоримся о времени.
            </p>
            <QuickLead key={n} source="audit" bare />
          </div>
        </div>
      ) : null}
    </>
  );
}
