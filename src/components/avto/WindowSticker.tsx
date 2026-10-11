"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import type { AVTO } from "@/content/avtobiznes";
import { openBrief } from "@/components/brief/briefBus";
import styles from "./WindowSticker.module.css";

type Data = (typeof AVTO)["sticker"];

const num = new Intl.NumberFormat("ru-RU");

/**
 * Цены листом комплектации, как наклейка на стекле нового авто. Вкладки комплектаций
 * отмечают, что входит; итог «в месяц» и «разово» досчитывается до новой суммы, позиции
 * по смете выводятся отдельной строкой. Цены из прайса.
 */
export default function WindowSticker({ data, service }: { data: Data; service: string }) {
  const [trim, setTrim] = useState(data.trims[1].key);
  const monthRef = useRef<HTMLElement>(null);
  const onceRef = useRef<HTMLElement>(null);
  const items = data.items.map((it) => ({ ...it, on: it.in.includes(trim) }));
  const monthly = items.filter((i) => i.on && i.unit === "мес").reduce((a, i) => a + i.price, 0);
  const once = items.filter((i) => i.on && i.unit === "проект").reduce((a, i) => a + i.price, 0);
  const quote = items.some((i) => i.on && i.unit === "смета");

  // Итоги досчитываются от прежней суммы к новой
  const prev = useRef({ m: monthly, o: once });
  useEffect(() => {
    const v = { ...prev.current };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tw = gsap.to(v, {
      m: monthly,
      o: once,
      duration: reduce ? 0 : 0.6,
      ease: "power2.out",
      onUpdate: () => {
        if (monthRef.current) monthRef.current.textContent = `${num.format(Math.round(v.m / 1000) * 1000)} ₽`;
        if (onceRef.current) onceRef.current.textContent = v.o ? `${num.format(Math.round(v.o / 1000) * 1000)} ₽` : "0 ₽";
      },
    });
    prev.current = { m: monthly, o: once };
    return () => {
      tw.kill();
    };
  }, [monthly, once]);

  return (
    <section className={styles.section} data-surface="dark" aria-labelledby="sticker-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="sticker-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
          <div className={styles.trims} role="group" aria-label="Комплектация">
            {data.trims.map((t) => (
              <button key={t.key} type="button" className={styles.trim} aria-pressed={trim === t.key} onClick={() => setTrim(t.key)}>
                <b>{t.name}</b>
                <span>{t.note}</span>
              </button>
            ))}
          </div>
        </header>

        {/* Наклейка на стекле */}
        <div className={styles.glass}>
          <div className={styles.sticker}>
            <p className={styles.stTop}>
              <span>Корпорация</span>
              <span>Лист комплектации</span>
            </p>
            <p className={styles.stModel}>Автобизнес · {data.trims.find((t) => t.key === trim)!.name}</p>
            <ul className={styles.items}>
              {items.map((it) => (
                <li key={it.name} className={styles.item} data-on={it.on || undefined}>
                  <span className={styles.box} aria-hidden="true" />
                  <span className={styles.itemName}>
                    {it.name}
                    <span className="visually-hidden">{it.on ? ": входит" : ": не входит"}</span>
                  </span>
                  <span className={styles.itemPrice}>{it.unit === "смета" ? data.quote : `от ${num.format(it.price)} ₽ / ${it.unit}`}</span>
                </li>
              ))}
            </ul>
            <dl className={styles.totals} aria-live="polite">
              <div>
                <dt>{data.monthly}</dt>
                <dd ref={monthRef}>{num.format(monthly)} ₽</dd>
              </div>
              <div>
                <dt>{data.once}</dt>
                <dd ref={onceRef}>{once ? `${num.format(once)} ₽` : "0 ₽"}</dd>
              </div>
              {quote ? (
                <div>
                  <dt>Каталог, бот, CRM</dt>
                  <dd>{data.quote}</dd>
                </div>
              ) : null}
            </dl>
            <span className={styles.barcode} aria-hidden="true" />
          </div>
        </div>

        <button type="button" className={`btn btn--primary ${styles.cta}`} onClick={() => openBrief(service)}>
          {data.cta}
          <svg className="btn__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
    </section>
  );
}
