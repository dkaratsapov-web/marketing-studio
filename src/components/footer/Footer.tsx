"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { PHONES, TELEGRAM } from "@/content/contacts";
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
      // Буквы надписи поднимаются из-под линии, шов между половинами загорается последним
      gsap.from(`.${styles.letter}`, {
        yPercent: 105,
        duration: 1.1,
        ease: "power4.out",
        stagger: 0.04,
        scrollTrigger: {
          trigger: `.${styles.word}`,
          start: "top 92%",
          once: true,
        },
      });
      gsap.from(`.${styles.seam}`, {
        scaleY: 0,
        duration: 0.9,
        ease: "power3.inOut",
        delay: 0.5,
        scrollTrigger: {
          trigger: `.${styles.word}`,
          start: "top 92%",
          once: true,
        },
      });
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
