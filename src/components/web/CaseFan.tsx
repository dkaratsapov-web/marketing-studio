"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { WEB } from "@/content/web";
import styles from "./CaseFan.module.css";

type Data = (typeof WEB)["cases"];

const STEP_MS = 3200;

/**
 * «Сайты, которые работают». Страницы сайта «Сферы» лежат веером, как распечатки на столе:
 * верхняя уходит под низ колоды, и наверх выходит следующая. Колода листается сама, пока
 * блок на экране, и по нажатию. Рядом дело 014 с цифрами.
 */
export default function CaseFan({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const pages = data.sfera.pages;
  const n = pages.length;
  const [top, setTop] = useState(0);
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const st = ScrollTrigger.create({
      trigger: root.current,
      start: "top 65%",
      end: "bottom 35%",
      onToggle: (self) => setAuto(self.isActive),
    });
    return () => st.kill();
  }, []);

  useEffect(() => {
    if (!auto) return;
    const t = window.setTimeout(() => setTop((x) => (x + 1) % n), STEP_MS);
    return () => window.clearTimeout(t);
  }, [auto, top, n]);

  const s = data.sfera;
  const p = data.pack;

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="fan-title">
      <div className={`wrap ${styles.grid}`}>
        <h2 id="fan-title" className={styles.title}>
          {data.title}
          <span className={styles.dotMark}>.</span>
        </h2>

        <div className={styles.text}>
          <p className={styles.code}>
            Дело {s.code} · {s.client}
          </p>
          <p className={styles.body}>{s.text}</p>
          <dl className={styles.metrics}>
            {s.metrics.map((m) => (
              <div key={m.label}>
                <dt>{m.label}</dt>
                <dd>{m.value}</dd>
              </div>
            ))}
          </dl>
          <Link href={s.href} className={styles.more}>
            {s.more} →
          </Link>
        </div>

        <figure className={styles.fan}>
          <button
            type="button"
            className={styles.deck}
            onClick={() => {
              setAuto(false);
              setTop((x) => (x + 1) % n);
            }}
            aria-label={`${data.shuffle}. Сейчас: ${pages[top].name}`}
          >
            {pages.map((pg, i) => {
              const pos = (i - top + n) % n;
              return (
                <span key={pg.name} className={styles.page} data-pos={Math.min(pos, 4)} style={{ zIndex: n - pos }}>
                  <Image src={pg.shot} alt={pos === 0 ? `Сайт «Сферы»: ${pg.name}` : ""} className={styles.shot} sizes="(max-width: 960px) 90vw, 50vw" />
                </span>
              );
            })}
          </button>
          <figcaption className={styles.caption}>
            <span className={styles.pageName}>{pages[top].name}</span>
            <span className={styles.counter}>
              {String(top + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
            </span>
          </figcaption>
        </figure>

        <article className={styles.pack}>
          <p className={styles.code}>
            Дело {p.code} · {p.client}
          </p>
          <p className={styles.body}>{p.text}</p>
          <dl className={styles.metrics}>
            {p.metrics.map((m) => (
              <div key={m.label}>
                <dt>{m.label}</dt>
                <dd>{m.value}</dd>
              </div>
            ))}
          </dl>
        </article>
      </div>
    </section>
  );
}
