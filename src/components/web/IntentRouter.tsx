"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { WEB } from "@/content/web";
import styles from "./IntentRouter.module.css";

type Data = (typeof WEB)["intents"];

const TOTAL = 121;
const AUTO_MS = 3800;

/**
 * Запросы и страницы «Сферы». Слева запросы, справа окно браузера: выбранный запрос
 * «едет» по проводу к окну, адресная строка набирает путь страницы, и страница
 * проявляется сверху вниз, как при загрузке. Под окном сетка из 121 клетки: каждая
 * клетка означает страницу сайта, выбранная горит. Пока блок на экране и его не трогают,
 * запросы перебираются сами.
 */
export default function IntentRouter({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const [{ idx, prev }, setSel] = useState<{ idx: number; prev: number | null }>({ idx: 0, prev: null });
  const [inView, setInView] = useState(false);
  const [hold, setHold] = useState(false);
  const n = data.items.length;

  const pick = (i: number) => setSel((s) => (i === s.idx ? s : { idx: i, prev: s.idx }));

  useEffect(() => {
    const el = root.current!;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || hold || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => {
      setSel((s) => ({ idx: (s.idx + 1) % n, prev: s.idx }));
    }, AUTO_MS);
    return () => window.clearInterval(t);
  }, [inView, hold, n]);

  const cur = data.items[idx];
  // Клетки сетки, на которых стоят названные страницы: разбросаны по сетке
  const cellOf = (i: number) => [3, 17, 38, 52, 76, 98][i] ?? i;

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="intent-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="intent-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div
          className={styles.queries}
          role="group"
          aria-label={data.label}
          onPointerEnter={() => setHold(true)}
          onPointerLeave={() => setHold(false)}
          onFocus={() => setHold(true)}
          onBlur={() => setHold(false)}
        >
          {data.items.map((it, i) => (
            <button
              key={it.query}
              type="button"
              className={styles.query}
              aria-pressed={i === idx}
              onClick={() => {
                pick(i);
                setHold(true);
              }}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="m13 13 4.5 4.5" />
              </svg>
              <span className={styles.qText}>{it.query}</span>
              <span className={styles.wire} aria-hidden="true">
                <i key={i === idx ? `on-${idx}` : "off"} />
              </span>
            </button>
          ))}
        </div>

        <figure className={styles.stage}>
          <div className={styles.browser}>
            <div className={styles.chrome} aria-hidden="true">
              <span className={styles.dots}>
                <span />
                <span />
                <span />
              </span>
              <span className={styles.url}>
                {data.domain}
                <b key={idx}>{cur.path}</b>
              </span>
            </div>
            <div className={styles.view}>
              {data.items.map((it, i) => (
                <Image
                  key={it.path}
                  src={it.shot}
                  alt={i === idx ? `Страница «${it.page}» на сайте «Сферы»` : ""}
                  aria-hidden={i !== idx}
                  className={styles.shot}
                  data-on={i === idx || undefined}
                  data-prev={i === prev || undefined}
                  sizes="(max-width: 960px) 92vw, 50vw"
                />
              ))}
              <span className={styles.badge}>{cur.page}</span>
            </div>
          </div>

          <div className={styles.map}>
            <span className={styles.cells} aria-hidden="true">
              {Array.from({ length: TOTAL }, (_, c) => {
                const named = data.items.findIndex((_, i) => cellOf(i) === c);
                return <span key={c} data-named={named >= 0 || undefined} data-on={named === idx || undefined} />;
              })}
            </span>
            <p className={styles.total}>
              <b>{data.total.value}</b>
              <span>
                {data.total.label}
                <br />
                {data.more}
              </span>
            </p>
          </div>
          <figcaption className={styles.note}>{data.note}</figcaption>
        </figure>
      </div>
    </section>
  );
}
