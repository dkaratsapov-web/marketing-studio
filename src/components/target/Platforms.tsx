"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { TARGET } from "@/content/target";
import styles from "./Platforms.module.css";

gsap.registerPlugin(Flip, ScrollTrigger);

type Props = { platforms: (typeof TARGET)["platforms"] };

const STEP_MS = 4200;

/**
 * «Одно предложение, три площадки». Справа одна и та же карточка объявления, которая
 * перестраивается под формат площадки (GSAP Flip): пост с фото во ВКонтакте, спонсорское
 * сообщение в Telegram без картинки, карточка в выдаче Авито среди соседних объявлений.
 * Элементы карточки переезжают на новые места, а не появляются заново: видно, что это одно
 * предложение. Вкладки слева переключаются сами, пока блок на экране, и по клику.
 */
export default function Platforms({ platforms }: Props) {
  const root = useRef<HTMLElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const id = useId();
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(false);
  const first = useRef(true);
  const items = platforms.items;
  const key = items[active].key;
  const c = platforms.card;

  // Автопереключение, пока блок на экране и человек не взялся за вкладки сам
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const st = ScrollTrigger.create({
      trigger: root.current,
      start: "top 70%",
      end: "bottom 30%",
      onToggle: (self) => setAuto(self.isActive),
    });
    return () => st.kill();
  }, []);

  // Перестройка карточки: запоминаем положения до смены формата и плавно переводим в новые
  const activeRef = useRef(0);
  const flipState = useRef<Flip.FlipState | null>(null);
  const go = useCallback((i: number) => {
    if (i === activeRef.current) return;
    if (
      card.current &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      flipState.current = Flip.getState(
        card.current.querySelectorAll("[data-flip]"),
        {
          props: "backgroundColor,color,borderRadius",
        },
      );
    }
    activeRef.current = i;
    setActive(i);
  }, []);

  // Автопереключение, пока блок на экране и человек не нажал вкладку сам
  useEffect(() => {
    if (!auto) return;
    const t = window.setTimeout(
      () => go((activeRef.current + 1) % items.length),
      STEP_MS,
    );
    return () => window.clearTimeout(t);
  }, [auto, active, go, items.length]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const state = flipState.current;
    if (!state || !card.current) return;
    flipState.current = null;
    Flip.from(state, {
      targets: card.current.querySelectorAll("[data-flip]"),
      duration: 0.75,
      ease: "power3.inOut",
      absolute: true,
      nested: true,
      onEnter: (els) =>
        gsap.fromTo(
          els,
          { autoAlpha: 0, scale: 0.92 },
          { autoAlpha: 1, scale: 1, duration: 0.4, delay: 0.3 },
        ),
      onLeave: (els) =>
        gsap.to(els, { autoAlpha: 0, scale: 0.92, duration: 0.25 }),
    });
  }, [active]);

  return (
    <section
      ref={root}
      className={styles.section}
      data-surface="light"
      aria-labelledby="platforms-title"
    >
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="platforms-title" className={styles.title}>
            {platforms.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{platforms.lead}</p>
        </header>

        <div className={styles.tabs} role="tablist" aria-label="Площадки">
          {items.map((it, i) => (
            <button
              key={it.key}
              type="button"
              role="tab"
              id={`${id}-tab-${i}`}
              aria-selected={i === active}
              aria-controls={`${id}-panel`}
              className={styles.tab}
              onClick={() => {
                setAuto(false);
                go(i);
              }}
            >
              <span className={styles.tabName}>{it.name}</span>
              <span className={styles.tabWhere}>{it.where}</span>
              <span className={styles.tabText}>
                <span>{it.text}</span>
              </span>
              {/* Полоска времени до следующей вкладки */}
              <span
                key={`${active}-${auto}`}
                className={styles.tabTimer}
                data-run={(auto && i === active) || undefined}
                style={{ animationDuration: `${STEP_MS}ms` }}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>

        <div
          id={`${id}-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${active}`}
          className={styles.stage}
          data-platform={key}
        >
          <p className={styles.format}>
            <span>{items[active].name}</span> · {items[active].format}
          </p>

          <div className={styles.feedArea}>
            {/* Соседние объявления Авито: появляются только в формате выдачи */}
            <span className={styles.neighbor} aria-hidden="true" />
            <div
              ref={card}
              className={styles.card}
              data-flip="card"
              data-platform={key}
            >
              <span className={styles.who} data-flip="who">
                <span className={styles.ava} data-flip="ava" />
                <span className={styles.whoText}>
                  <span className={styles.whoName}>{c.who}</span>
                  <span className={styles.badge}>{c.badge[key]}</span>
                </span>
              </span>
              {/* Фото всегда в разметке: в формате Telegram оно скрыто стилями, и Flip плавно его убирает */}
              <span className={styles.media} data-flip="media">
                <span>{c.photo}</span>
              </span>
              <span className={styles.cardTitle} data-flip="title">
                {c.title}
              </span>
              <span className={styles.cardText} data-flip="text">
                {c.text[key]}
              </span>
              <span className={styles.cta} data-flip="cta">
                {c.cta[key]}
              </span>
            </div>
            <span className={styles.neighbor} aria-hidden="true" />
          </div>
          <p className={styles.note}>{platforms.note}</p>
        </div>
      </div>
    </section>
  );
}
