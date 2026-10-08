"use client";

import { useEffect, useRef, useState } from "react";
import { PHONES, TELEGRAM } from "@/content/contacts";
import { lenisRef } from "@/components/SmoothScroll";
import BriefForm from "./BriefForm";
import styles from "./BriefModal.module.css";

type OpenState = { service?: string; n: number } | null;

/**
 * Поп-ап брифа. Открывается любой ссылкой на #brief (без JS она просто ведёт
 * к секции брифа) и событием brief:open из кода. Закрывается крестиком,
 * Esc и кликом мимо панели; фокус остаётся внутри, страница не прокручивается.
 */
export default function BriefModal() {
  const [state, setState] = useState<OpenState>(null);
  const [closing, setClosing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const counter = useRef(0);

  const open = (service?: string) => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    counter.current += 1;
    setClosing(false);
    setState({ service, n: counter.current });
  };

  const close = () => {
    setClosing(true);
    window.setTimeout(() => {
      setState(null);
      setClosing(false);
      returnFocus.current?.focus?.();
    }, 380);
  };

  // Перехват всех кнопок заявки и события из кода
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest<HTMLAnchorElement>(
        'a[href="#brief"]',
      );
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.button !== 0)
        return;
      e.preventDefault();
      open(a.dataset.service);
    };
    const onEvent = (e: Event) =>
      open((e as CustomEvent<{ service?: string }>).detail?.service);
    document.addEventListener("click", onClick);
    window.addEventListener("brief:open", onEvent);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("brief:open", onEvent);
    };
  }, []);

  // Пока открыт: страница стоит, Esc закрывает, Tab не выходит из панели
  useEffect(() => {
    if (!state) return;
    lenisRef.current?.stop();
    document.documentElement.style.overflow = "hidden";
    const first = panel.current?.querySelector<HTMLElement>("button, a, input");
    first?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (e.key !== "Tab" || !panel.current) return;
      const items = panel.current.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), input, [tabindex]:not([tabindex='-1'])",
      );
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      lenisRef.current?.start();
    };
  }, [state]);

  if (!state) return null;

  return (
    <div
      className={styles.overlay}
      data-closing={closing || undefined}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
      data-lenis-prevent
    >
      <div
        ref={panel}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="brief-modal-title"
        data-surface="dark"
      >
        <button
          type="button"
          className={styles.close}
          onClick={close}
          aria-label="Закрыть"
        >
          <span />
          <span />
        </button>

        <header className={styles.head}>
          <p className="label">Дело 023</p>
          <h2 id="brief-modal-title" className={styles.title}>
            Отправить бриф
          </h2>
          <p className={styles.lead}>
            Четыре вопроса и контакт. Займёт меньше минуты.
          </p>
          <div className={styles.direct}>
            <p className="label">Или напрямую</p>
            {PHONES.map((p) => (
              <a key={p.href} href={p.href} className={styles.directLink}>
                {p.display}
              </a>
            ))}
            <a
              href={TELEGRAM.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.directLink}
            >
              Telegram {TELEGRAM.handle}
            </a>
          </div>
        </header>

        <div className={styles.form}>
          <BriefForm key={state.n} idPrefix="modal" service={state.service} />
        </div>
      </div>
    </div>
  );
}
