"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo";
import styles from "./Header.module.css";

const NAV = [
  { href: "#dossier", label: "Досье" },
  { href: "#departments", label: "Отделы" },
  { href: "#protocol", label: "Протокол" },
  { href: "#contract", label: "Контракт" },
];

export default function Header() {
  const ref = useRef<HTMLElement>(null);
  const [surface, setSurface] = useState<"dark" | "light">("dark");
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  // Тема шапки повторяет поверхность секции, над которой она висит.
  useEffect(() => {
    let lastY = window.scrollY;
    let raf = 0;

    const update = () => {
      raf = 0;
      const header = ref.current;
      if (!header) return;
      const probeY = header.getBoundingClientRect().bottom - 8;
      const el = document
        .elementsFromPoint(window.innerWidth / 2, probeY)
        .find((n) => n instanceof HTMLElement && n.closest("main [data-surface]"));
      const section = el?.closest<HTMLElement>("main [data-surface]");
      if (section) setSurface(section.dataset.surface === "light" ? "light" : "dark");

      const y = window.scrollY;
      if (Math.abs(y - lastY) > 6) {
        setHidden(y > lastY && y > 160);
        lastY = y;
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      ref={ref}
      className={styles.header}
      data-surface={open ? "dark" : surface}
      data-hidden={hidden && !open}
      data-open={open}
    >
      <div className={styles.bar}>
        <a href="#top" className={styles.logo} aria-label="Корпорация, на главную">
          <Logo className={styles.logoInner} />
        </a>

        <nav className={styles.nav} aria-label="Основная навигация">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className={styles.link}>
              <span className={styles.linkText} data-text={item.label}>
                {item.label}
              </span>
            </a>
          ))}
        </nav>

        <a href="#brief" className={`btn btn--primary ${styles.cta}`}>
          Отправить бриф
        </a>

        <button
          type="button"
          className={styles.burger}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="visually-hidden">{open ? "Закрыть меню" : "Открыть меню"}</span>
          <span className={styles.burgerLine} />
          <span className={styles.burgerLine} />
        </button>
      </div>

      <div id="mobile-nav" className={styles.sheet} hidden={!open}>
        <nav className={styles.sheetNav} aria-label="Мобильная навигация">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={styles.sheetLink}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <a href="#brief" className="btn btn--primary" onClick={() => setOpen(false)}>
          Отправить бриф
        </a>
      </div>
    </header>
  );
}
