"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { SFERA } from "@/content/sfera";
import Lightbox from "./Lightbox";
import styles from "./AnalyticsPanel.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { panel: (typeof SFERA)["panel"] };

/**
 * Собственная аналитика: настоящие вкладки, как в самой панели. Кликаешь вкладку — показывается
 * её экран целиком и крупно, справа ровно то, что на нём видно. По клику на снимок он открывается
 * на весь экран. Анимация только служебная: окно проявляется при появлении, экраны сменяются плавно.
 */
export default function AnalyticsPanel({ panel }: Props) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const tab = panel.tabs[active];

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        `.${styles.window}`,
        { clipPath: "inset(0% 0% 100% 0%)", y: 30 },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          y: 0,
          duration: 1.1,
          ease: "power3.inOut",
          scrollTrigger: {
            trigger: `.${styles.window}`,
            start: "top 80%",
            once: true,
          },
        },
      );
    },
    { scope: root },
  );

  // Высота окна постоянная, но на всякий случай после смены вкладки пересчитываем закреплённые сцены ниже
  useEffect(() => {
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [active]);

  // Стрелки на клавиатуре переключают вкладки, как положено у tablist
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next =
      (active + (e.key === "ArrowRight" ? 1 : -1) + panel.tabs.length) %
      panel.tabs.length;
    setActive(next);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  };

  return (
    <section
      ref={root}
      className={styles.section}
      data-surface="dark"
      aria-labelledby="panel-title"
    >
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="panel-title" className={styles.title}>
            {panel.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{panel.lead}</p>
        </header>

        <div className={styles.window}>
          <div
            className={styles.tabs}
            role="tablist"
            aria-label="Вкладки аналитики"
            onKeyDown={onKey}
          >
            {panel.tabs.map((t, i) => (
              <button
                key={t.tab}
                id={`${id}-tab-${i}`}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-controls={`${id}-panel`}
                tabIndex={i === active ? 0 : -1}
                className={styles.tab}
                onClick={() => setActive(i)}
              >
                {t.tab}
              </button>
            ))}
            <span className={styles.tabOff} title="Снимка этой вкладки нет">
              {panel.noShot}
            </span>
          </div>

          <div
            id={`${id}-panel`}
            role="tabpanel"
            aria-labelledby={`${id}-tab-${active}`}
            className={styles.body}
          >
            <button
              key={tab.tab}
              type="button"
              className={styles.shot}
              onClick={() => setOpen(active)}
              data-cursor-label="Открыть"
              aria-label={`Открыть снимок вкладки «${tab.tab}» на весь экран`}
            >
              <Image
                src={tab.img}
                alt={tab.alt}
                sizes="(max-width: 960px) 92vw, 64vw"
              />
            </button>
            <div key={`${tab.tab}-copy`} className={styles.copy}>
              <p className={styles.copyTab}>
                {String(active + 1).padStart(2, "0")} · {tab.tab}
              </p>
              <h3 className={styles.copyTitle}>{tab.title}</h3>
              <p className={styles.copyText}>{tab.text}</p>
              <p className={styles.hint}>
                Нажмите на снимок, чтобы открыть его целиком
              </p>
            </div>
          </div>
          <p className={styles.note}>{panel.note}</p>
        </div>
      </div>

      <Lightbox
        shots={panel.tabs.map((t) => ({
          img: t.img,
          alt: t.alt,
          name: t.tab,
          note: panel.note,
        }))}
        index={open}
        onChange={(i) => {
          setOpen(i);
          if (i !== null) setActive(i);
        }}
      />
    </section>
  );
}
