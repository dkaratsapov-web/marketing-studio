"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo";
import { HOURS, PHONES, TELEGRAM } from "@/content/contacts";
import Link from "next/link";
import { usePathname } from "next/navigation";
import HomeLink from "@/components/HomeLink";
import { SERVICE_MENU } from "@/content/services";
import styles from "./Header.module.css";

const NAV = [
  { href: "#dossier", label: "Досье" },
  { href: "#departments", label: "Отделы" },
  { href: "#protocol", label: "Протокол" },
  { href: "#contract", label: "Контракт" },
];

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.4 3.6 2.9 10.7c-1.3.5-1.3 1.2-.2 1.6l4.7 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.8-.4l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.7c.3-1.3-.5-1.9-1.4-1.5ZM8.6 13.4l9.3-5.9c.4-.3.8-.1.5.2l-7.8 7-.3 3.3-1.7-4.6Z" />
    </svg>
  );
}

export default function Header() {
  const ref = useRef<HTMLElement>(null);
  const [surface, setSurface] = useState<"dark" | "light">("dark");
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Тема шапки повторяет поверхность секции, над которой она висит.
  useEffect(() => {
    let lastY = window.scrollY;
    let raf = 0;

    const update = () => {
      raf = 0;
      const header = ref.current;
      if (!header) return;
      // Высота шапки без учёта сдвига: когда она спрятана, проверка всё равно смотрит под неё
      const probeY = header.offsetHeight - 8;
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
        <HomeLink hash="#top" className={styles.logo} aria-label="Корпорация, на главную">
          <Logo className={styles.logoInner} />
        </HomeLink>

        <nav className={styles.nav} aria-label="Основная навигация">
          {NAV.map((item) =>
            item.href === "#departments" ? (
              // «Отделы» раскрываются меню страниц отделов: по наведению и по фокусу с клавиатуры
              <div key={item.href} className={styles.navItem}>
                <HomeLink hash={item.href} className={styles.link} aria-haspopup="true">
                  <span className={styles.linkText} data-text={item.label}>
                    {item.label}
                  </span>
                  <svg className={styles.chevron} viewBox="0 0 10 6" aria-hidden="true">
                    <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </HomeLink>
                <div className={styles.menu} data-surface="dark">
                  <p className={`label ${styles.menuLabel}`}>Страницы отделов</p>
                  <ul className={styles.menuList}>
                    {SERVICE_MENU.map((s) => (
                      <li key={s.name}>
                        {s.href ? (
                          <Link
                            href={s.href}
                            className={styles.menuLink}
                            aria-current={pathname === s.href ? "page" : undefined}
                          >
                            <span className={styles.menuName}>{s.name}</span>
                            <span className={styles.menuNote}>{s.note}</span>
                            <span className={styles.menuArrow} aria-hidden="true">
                              →
                            </span>
                          </Link>
                        ) : (
                          <span className={`${styles.menuLink} ${styles.menuSoon}`}>
                            <span className={styles.menuName}>{s.name}</span>
                            <span className={styles.menuNote}>{s.note}</span>
                            <span className={styles.soonTag}>скоро</span>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <HomeLink hash="#departments" className={styles.menuAll}>
                    Все отделы на главной
                  </HomeLink>
                </div>
              </div>
            ) : (
              <HomeLink key={item.href} hash={item.href} className={styles.link}>
                <span className={styles.linkText} data-text={item.label}>
                  {item.label}
                </span>
              </HomeLink>
            ),
          )}
        </nav>

        <div className={styles.phones}>
          {PHONES.map((p) => (
            <a key={p.href} href={p.href} className={styles.phone}>
              {p.display}
            </a>
          ))}
        </div>

        <a
          href={TELEGRAM.href}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.tg}
          aria-label={`Написать в Telegram ${TELEGRAM.handle}`}
          title={`Telegram ${TELEGRAM.handle}`}
        >
          <TelegramIcon />
        </a>

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
            <div key={item.href} className={styles.sheetItem}>
              <HomeLink hash={item.href} className={styles.sheetLink} onClick={() => setOpen(false)}>
                {item.label}
              </HomeLink>
              {item.href === "#departments"
                ? SERVICE_MENU.filter((s) => s.href).map((s) => (
                    <Link
                      key={s.name}
                      href={s.href!}
                      className={styles.sheetSub}
                      onClick={() => setOpen(false)}
                    >
                      {s.name} →
                    </Link>
                  ))
                : null}
            </div>
          ))}
        </nav>
        <div className={styles.sheetContacts}>
          {PHONES.map((p) => (
            <a key={p.href} href={p.href} className={styles.sheetPhone}>
              {p.display}
            </a>
          ))}
          <span className={styles.sheetHours}>{HOURS}</span>
          <a
            href={TELEGRAM.href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.sheetTg}
          >
            <TelegramIcon />
            Telegram {TELEGRAM.handle}
          </a>
        </div>
        <a href="#brief" className="btn btn--primary" onClick={() => setOpen(false)}>
          Отправить бриф
        </a>
      </div>
    </header>
  );
}
