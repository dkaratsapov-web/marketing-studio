"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { PHONES, TELEGRAM } from "@/content/contacts";
import { QUOTE } from "@/components/Logo";
import styles from "./Footer.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const WORD = "Корпорация";

const NAV = [
  { href: "#dossier", label: "Досье" },
  { href: "#departments", label: "Отделы" },
  { href: "#protocol", label: "Протокол" },
  { href: "#contract", label: "Контракт" },
  { href: "#faq", label: "Вопросы" },
  { href: "#brief", label: "Бриф" },
];

export default function Footer() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      // Сначала по словам поднимается строка Элджея, затем буквы надписи договаривают её,
      // шов между половинами загорается последним
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: `.${styles.quote}`,
          start: "top 92%",
          once: true,
        },
      });
      tl.from(`.${styles.qWord}`, {
        yPercent: 110,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.06,
      })
        .from(`.${styles.credit}`, { autoAlpha: 0, duration: 0.6 }, 0.3)
        .from(
          `.${styles.letter}`,
          { yPercent: 105, duration: 1.1, ease: "power4.out", stagger: 0.04 },
          0.35,
        )
        .from(
          `.${styles.seam}`,
          { scaleY: 0, duration: 0.9, ease: "power3.inOut" },
          0.9,
        );
    },
    { scope: root },
  );

  const half = Math.ceil(WORD.length / 2);

  return (
    <footer ref={root} className={styles.footer} data-surface="dark">
      <div className={`wrap ${styles.top}`}>
        <div className={styles.col}>
          <p className="label">Позвонить</p>
          {PHONES.map((p) => (
            <a key={p.href} href={p.href} className={styles.big}>
              {p.display}
            </a>
          ))}
        </div>
        <div className={styles.col}>
          <p className="label">Написать</p>
          <a
            href={TELEGRAM.href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.big}
          >
            Telegram {TELEGRAM.handle}
          </a>
        </div>
        <nav className={styles.nav} aria-label="Разделы">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className={styles.navLink}>
              {n.label}
            </a>
          ))}
        </nav>
      </div>

      <div className={`wrap ${styles.wordWrap}`}>
        <p className={styles.quote}>
          <span className={styles.quoteText}>
            {QUOTE.split(" ").map((w, i) => (
              <span key={i} className={styles.qMask}>
                <span className={styles.qWord}>{w}</span>
              </span>
            ))}
          </span>
          <span className={`label ${styles.credit}`}>Элджей, «Корпорация»</span>
        </p>
        <p className={styles.word}>
          <span className="visually-hidden">{WORD}</span>
          <span className={styles.half} aria-hidden="true">
            {WORD.slice(0, half)
              .split("")
              .map((ch, i) => (
                <span key={i} className={styles.mask}>
                  <span className={styles.letter}>{ch}</span>
                </span>
              ))}
          </span>
          <span className={styles.seam} aria-hidden="true" />
          <span className={styles.half} aria-hidden="true">
            {WORD.slice(half)
              .split("")
              .map((ch, i) => (
                <span key={i} className={styles.mask}>
                  <span className={styles.letter}>{ch}</span>
                </span>
              ))}
          </span>
        </p>
      </div>

      <div className={`wrap ${styles.bottom}`}>
        <p>
          © {new Date().getFullYear()} Корпорация. Маркетинговое агентство
          Даниила Карацапова
        </p>
        <p>Работаем онлайн по всей России</p>
      </div>
    </footer>
  );
}
