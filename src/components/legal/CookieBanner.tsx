"use client";

import { useEffect, useState } from "react";
import { LEGAL_LINKS } from "@/content/legal";
import { getConsent, setConsent, SETTINGS_EVENT } from "@/lib/consent";
import styles from "./CookieBanner.module.css";

/** Плашка про cookie: висит, пока посетитель не выберет; снова открывается из подвала («Настройки cookie») */
export default function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // показываем чуть позже первого экрана, чтобы не перебивать заставку
    const t = window.setTimeout(() => setOpen(getConsent() === null), 1200);
    const reopen = () => setOpen(true);
    window.addEventListener(SETTINGS_EVENT, reopen);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener(SETTINGS_EVENT, reopen);
    };
  }, []);

  if (!open) return null;

  const choose = (v: "all" | "necessary") => {
    setConsent(v);
    setOpen(false);
  };

  return (
    <section className={styles.banner} aria-label="Cookie на сайте" data-surface="dark">
      <p className={styles.text}>
        Сайт использует cookie и Яндекс Метрику, чтобы считать посещения и оценивать рекламу. Подробнее — в{" "}
        <a href={LEGAL_LINKS.policy.href} className="legal-link">
          политике конфиденциальности
        </a>
        .
      </p>
      <div className={styles.actions}>
        <button type="button" className={`btn btn--primary ${styles.btn}`} onClick={() => choose("all")}>
          Принять
        </button>
        <button type="button" className={`btn ${styles.btn}`} onClick={() => choose("necessary")}>
          Только необходимые
        </button>
      </div>
    </section>
  );
}
